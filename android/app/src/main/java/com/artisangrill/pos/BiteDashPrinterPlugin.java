package com.artisangrill.pos;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * BiteDash Native Bluetooth Classic SPP (RFCOMM) Printer Plugin for Capacitor Android.
 *
 * Uses the standard Bluetooth SIG Serial Port Profile UUID:
 * 00001101-0000-1000-8000-00805F9B34FB
 *
 * Designed for 58mm portable ESC/POS thermal printers (e.g., Speed-X M450 / BT-450M / MPT-II).
 * Initial pairing is performed in Android System Settings.
 */
@CapacitorPlugin(
    name = "BiteDashPrinter",
    permissions = {
        @Permission(
            alias = BiteDashPrinterPlugin.PERM_BT_CONNECT,
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class BiteDashPrinterPlugin extends Plugin {

    private static final String TAG = "BiteDashPrinter";
    public static final String PERM_BT_CONNECT = "bluetoothConnect";

    /** Standard Bluetooth SIG Serial Port Profile (SPP) UUID */
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    /** 256-byte chunks prevent overflowing 2KB-4KB UART buffers on 58mm portable printers */
    private static final int WRITE_CHUNK_SIZE = 256;
    private static final long CHUNK_DELAY_MS = 15L;
    private static final long POST_FLUSH_VERIFY_MS = 120L;

    private static final String[] PRINTER_NAME_HINTS = {
        "SPEEDX", "SPEED-X", "M450", "BT-450", "MPT", "MPII", "MTP", "RPP", "POS", "ZJ", "THERMAL", "PRINTER"
    };

    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private final Object socketLock = new Object();

    private BluetoothSocket activeSocket = null;
    private OutputStream activeOutputStream = null;
    private InputStream activeInputStream = null;
    private String connectedAddress = null;
    private String connectedName = null;
    private Thread monitorThread = null;
    private boolean receiverRegistered = false;

    private final BroadcastReceiver bluetoothReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || intent.getAction() == null) return;
            String action = intent.getAction();

            if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(action)) {
                int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                if (state == BluetoothAdapter.STATE_OFF || state == BluetoothAdapter.STATE_TURNING_OFF) {
                    closeActiveSocketInternal("Bluetooth turned off on phone");
                }
            } else if (BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(action)) {
                BluetoothDevice device;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice.class);
                } else {
                    device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                }
                if (device != null && device.getAddress() != null) {
                    synchronized (socketLock) {
                        if (connectedAddress != null && connectedAddress.equalsIgnoreCase(device.getAddress())) {
                            closeActiveSocketInternal("Printer disconnected (" + device.getAddress() + ")");
                        }
                    }
                }
            } else if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(action)) {
                BluetoothDevice device;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice.class);
                } else {
                    device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                }
                if (device != null && device.getAddress() != null) {
                    JSObject payload = new JSObject();
                    payload.put("state", "acl_connected");
                    payload.put("name", device.getName() != null ? device.getName() : device.getAddress());
                    payload.put("address", device.getAddress());
                    payload.put("message", "Bluetooth device reached (" + device.getAddress() + ")");
                    notifyListeners("printerStateChanged", payload);
                }
            }
        }
    };

    @Override
    public void load() {
        super.load();
        registerBluetoothReceiver();
    }

    @Override
    protected void handleOnDestroy() {
        unregisterBluetoothReceiver();
        closeActiveSocketInternal("App destroyed");
        ioExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    private void registerBluetoothReceiver() {
        if (receiverRegistered || getContext() == null) return;
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(bluetoothReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(bluetoothReceiver, filter);
        }
        receiverRegistered = true;
    }

    private void unregisterBluetoothReceiver() {
        if (!receiverRegistered || getContext() == null) return;
        try {
            getContext().unregisterReceiver(bluetoothReceiver);
        } catch (Exception ignored) {
        }
        receiverRegistered = false;
    }

    private BluetoothAdapter getBluetoothAdapter() {
        Context ctx = getContext();
        if (ctx == null) return null;
        BluetoothManager manager = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : BluetoothAdapter.getDefaultAdapter();
    }

    private boolean hasBluetoothConnectPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        Context ctx = getContext();
        if (ctx == null) return false;
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean ensurePermissionOrRequest(PluginCall call, String callbackMethod) {
        if (hasBluetoothConnectPermission()) {
            return true;
        }
        requestPermissionForAlias(PERM_BT_CONNECT, call, callbackMethod);
        return false;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        boolean supported = adapter != null;
        boolean permGranted = hasBluetoothConnectPermission();
        boolean enabled = supported && adapter.isEnabled();

        JSObject res = new JSObject();
        res.put("bluetoothSupported", supported);
        res.put("permissionGranted", permGranted);
        res.put("bluetoothEnabled", enabled);

        synchronized (socketLock) {
            boolean isConn = activeSocket != null && activeSocket.isConnected() && activeOutputStream != null;
            res.put("connected", isConn);
            res.put("deviceAddress", isConn ? connectedAddress : null);
            res.put("deviceName", isConn ? connectedName : null);
        }
        call.resolve(res);
    }

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        if (hasBluetoothConnectPermission()) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }
        requestPermissionForAlias(PERM_BT_CONNECT, call, "onPermissionResult");
    }

    @PermissionCallback
    private void onPermissionResult(PluginCall call) {
        boolean granted = hasBluetoothConnectPermission();
        JSObject res = new JSObject();
        res.put("granted", granted);
        if (granted) {
            call.resolve(res);
        } else {
            call.reject("Bluetooth permission (BLUETOOTH_CONNECT) was denied.", "PERMISSION_DENIED");
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (getActivity() != null) {
                    getActivity().startActivity(fallback);
                } else {
                    getContext().startActivity(fallback);
                }
                call.resolve();
            } catch (Exception ex) {
                call.reject("Could not open Android Bluetooth Settings: " + e.getMessage(), "SETTINGS_FAILED");
            }
        }
    }

    @PluginMethod
    public void listBondedDevices(PluginCall call) {
        if (!ensurePermissionOrRequest(call, "onListBondedPermissionResult")) {
            return;
        }
        resolveBondedDevices(call);
    }

    @PermissionCallback
    private void onListBondedPermissionResult(PluginCall call) {
        if (!hasBluetoothConnectPermission()) {
            call.reject("Bluetooth permission denied. Allow Nearby Devices permission in Android Settings.", "PERMISSION_DENIED");
            return;
        }
        resolveBondedDevices(call);
    }

    @SuppressLint("MissingPermission")
    private void resolveBondedDevices(PluginCall call) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null) {
            call.reject("Bluetooth is not supported on this device.", "BT_UNSUPPORTED");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth is turned OFF. Please enable Bluetooth first.", "BT_DISABLED");
            return;
        }

        Set<BluetoothDevice> bonded = adapter.getBondedDevices();
        JSArray devicesArray = new JSArray();

        if (bonded != null) {
            for (BluetoothDevice device : bonded) {
                String name = device.getName() != null ? device.getName() : "Unknown Device";
                String address = device.getAddress();
                int majorClass = 0;
                if (device.getBluetoothClass() != null) {
                    majorClass = device.getBluetoothClass().getMajorDeviceClass();
                }

                boolean isImagingClass = (majorClass == BluetoothClass.Device.Major.IMAGING);
                boolean nameMatchesHint = false;
                String upperName = name.toUpperCase(Locale.ROOT);
                for (String hint : PRINTER_NAME_HINTS) {
                    if (upperName.contains(hint)) {
                        nameMatchesHint = true;
                        break;
                    }
                }

                JSObject item = new JSObject();
                item.put("name", name);
                item.put("address", address);
                item.put("majorClass", majorClass);
                item.put("isLikelyPrinter", isImagingClass || nameMatchesHint);
                synchronized (socketLock) {
                    boolean isCurr = activeSocket != null
                        && activeSocket.isConnected()
                        && address != null
                        && address.equalsIgnoreCase(connectedAddress);
                    item.put("connected", isCurr);
                }
                devicesArray.put(item);
            }
        }

        JSObject res = new JSObject();
        res.put("devices", devicesArray);
        call.resolve(res);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!ensurePermissionOrRequest(call, "onConnectPermissionResult")) {
            return;
        }
        performConnect(call);
    }

    @PermissionCallback
    private void onConnectPermissionResult(PluginCall call) {
        if (!hasBluetoothConnectPermission()) {
            call.reject("Bluetooth permission denied.", "PERMISSION_DENIED");
            return;
        }
        performConnect(call);
    }

    @SuppressLint("MissingPermission")
    private void performConnect(PluginCall call) {
        final String address = call.getString("address");
        if (address == null || !BluetoothAdapter.checkBluetoothAddress(address.trim().toUpperCase(Locale.ROOT))) {
            call.reject("A valid Bluetooth MAC address is required.", "INVALID_ADDRESS");
            return;
        }
        final String normalizedAddress = address.trim().toUpperCase(Locale.ROOT);

        final BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null) {
            call.reject("Bluetooth is not supported on this device.", "BT_UNSUPPORTED");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth is turned OFF. Please turn on Bluetooth.", "BT_DISABLED");
            return;
        }

        ioExecutor.execute(() -> {
            try {
                BluetoothDevice device = adapter.getRemoteDevice(normalizedAddress);
                if (device == null) {
                    call.reject("Bluetooth device not found for address " + normalizedAddress, "DEVICE_NOT_FOUND");
                    return;
                }

                if (device.getBondState() != BluetoothDevice.BOND_BONDED) {
                    call.reject(
                        "Device is not paired in Android Settings. Please pair the printer in Android Bluetooth Settings first.",
                        "NOT_BONDED"
                    );
                    return;
                }

                // If already connected to this exact address, verify socket health
                synchronized (socketLock) {
                    if (activeSocket != null
                        && activeSocket.isConnected()
                        && activeOutputStream != null
                        && normalizedAddress.equalsIgnoreCase(connectedAddress)) {
                        JSObject res = new JSObject();
                        res.put("connected", true);
                        res.put("address", connectedAddress);
                        res.put("name", connectedName);
                        call.resolve(res);
                        return;
                    }
                }

                // Close any previous socket before opening a new one
                closeActiveSocketInternal("Switching printer connection");

                if (adapter.isDiscovering()) {
                    adapter.cancelDiscovery();
                }

                BluetoothSocket socket = null;
                IOException firstException = null;

                // 1. Try standard secure RFCOMM socket to SPP UUID
                try {
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                } catch (IOException secureErr) {
                    firstException = secureErr;
                    if (socket != null) {
                        try { socket.close(); } catch (IOException ignored) {}
                    }
                    // 2. Fallback to insecure RFCOMM socket to SPP UUID (common on MPT-II / Speed-X clones)
                    try {
                        socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                        socket.connect();
                    } catch (IOException insecureErr) {
                        if (socket != null) {
                            try { socket.close(); } catch (IOException ignored) {}
                        }
                        throw firstException;
                    }
                }

                if (socket == null || !socket.isConnected()) {
                    call.reject("Failed to establish SPP connection with printer.", "CONNECT_FAILED");
                    return;
                }

                OutputStream out = socket.getOutputStream();
                InputStream in = socket.getInputStream();
                String devName = device.getName() != null ? device.getName() : normalizedAddress;

                synchronized (socketLock) {
                    activeSocket = socket;
                    activeOutputStream = out;
                    activeInputStream = in;
                    connectedAddress = normalizedAddress;
                    connectedName = devName;
                }

                startSocketMonitorThread(socket, in, normalizedAddress, devName);
                emitPrinterState("ready", devName, normalizedAddress, "Connected to " + devName);

                JSObject res = new JSObject();
                res.put("connected", true);
                res.put("address", normalizedAddress);
                res.put("name", devName);
                call.resolve(res);

            } catch (SecurityException se) {
                call.reject("Bluetooth permission denied: " + se.getMessage(), "PERMISSION_DENIED");
            } catch (IOException ioe) {
                Log.e(TAG, "SPP connection failed to " + normalizedAddress, ioe);
                call.reject(
                    "Could not connect to printer (" + normalizedAddress + "). Make sure the printer is turned ON, within range, and not connected to another phone.",
                    "CONNECT_FAILED"
                );
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error during connect", e);
                call.reject("Unexpected Bluetooth error: " + e.getMessage(), "CONNECT_FAILED");
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        ioExecutor.execute(() -> {
            closeActiveSocketInternal("User requested disconnect");
            JSObject res = new JSObject();
            res.put("connected", false);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void writeBase64(PluginCall call) {
        final String base64Data = call.getString("data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Missing Base64 ESC/POS payload ('data').", "INVALID_DATA");
            return;
        }

        final byte[] rawBytes;
        try {
            rawBytes = Base64.decode(base64Data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid Base64 ESC/POS payload.", "INVALID_DATA");
            return;
        }

        if (rawBytes == null || rawBytes.length == 0) {
            call.reject("Decoded ESC/POS payload is empty.", "INVALID_DATA");
            return;
        }

        ioExecutor.execute(() -> {
            BluetoothSocket socket;
            OutputStream out;
            String devName;
            String devAddr;

            synchronized (socketLock) {
                socket = activeSocket;
                out = activeOutputStream;
                devName = connectedName;
                devAddr = connectedAddress;
            }

            if (socket == null || !socket.isConnected() || out == null) {
                closeActiveSocketInternal("Socket not connected before write");
                call.reject("Printer is not connected. Please connect to the printer first.", "NOT_CONNECTED");
                return;
            }

            try {
                int offset = 0;
                while (offset < rawBytes.length) {
                    int length = Math.min(WRITE_CHUNK_SIZE, rawBytes.length - offset);
                    out.write(rawBytes, offset, length);
                    out.flush();
                    offset += length;

                    if (offset < rawBytes.length) {
                        Thread.sleep(CHUNK_DELAY_MS);
                    }
                }

                // Wait briefly after final flush so immediate broken-pipe / power-off errors surface
                Thread.sleep(POST_FLUSH_VERIFY_MS);

                synchronized (socketLock) {
                    if (activeSocket == null || !activeSocket.isConnected()) {
                        throw new IOException("Printer connection dropped during transmission.");
                    }
                }

                JSObject res = new JSObject();
                res.put("status", "SUCCESS");
                res.put("bytesWritten", rawBytes.length);
                res.put("address", devAddr);
                res.put("name", devName);
                call.resolve(res);

            } catch (IOException ioe) {
                Log.e(TAG, "ESC/POS write failed", ioe);
                closeActiveSocketInternal("Write failed: " + ioe.getMessage());
                call.reject(
                    "Failed while sending data to printer: " + ioe.getMessage(),
                    "WRITE_FAILED"
                );
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                call.reject("Print job interrupted.", "WRITE_INTERRUPTED");
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error during writeBase64", e);
                closeActiveSocketInternal("Unexpected write error");
                call.reject("Unexpected error during printing: " + e.getMessage(), "WRITE_FAILED");
            }
        });
    }

    private void startSocketMonitorThread(
        final BluetoothSocket socket,
        final InputStream inputStream,
        final String address,
        final String name
    ) {
        if (monitorThread != null) {
            monitorThread.interrupt();
        }
        monitorThread = new Thread(() -> {
            byte[] buffer = new byte[64];
            try {
                while (!Thread.currentThread().isInterrupted() && socket.isConnected()) {
                    int read = inputStream.read(buffer);
                    if (read == -1) {
                        break;
                    }
                }
            } catch (IOException ignored) {
                // Expected when printer powers off, goes out of range, or socket closes locally
            } finally {
                synchronized (socketLock) {
                    if (activeSocket == socket) {
                        closeActiveSocketInternal("Printer connection closed (" + name + ")");
                    }
                }
            }
        }, "BiteDash-SPP-Monitor");
        monitorThread.setDaemon(true);
        monitorThread.start();
    }

    private void closeActiveSocketInternal(String reason) {
        boolean wasConnected = false;
        String prevName;
        String prevAddr;

        synchronized (socketLock) {
            wasConnected = (activeSocket != null);
            prevName = connectedName;
            prevAddr = connectedAddress;

            if (activeInputStream != null) {
                try { activeInputStream.close(); } catch (IOException ignored) {}
                activeInputStream = null;
            }
            if (activeOutputStream != null) {
                try { activeOutputStream.close(); } catch (IOException ignored) {}
                activeOutputStream = null;
            }
            if (activeSocket != null) {
                try { activeSocket.close(); } catch (IOException ignored) {}
                activeSocket = null;
            }
            connectedAddress = null;
            connectedName = null;
        }

        if (wasConnected) {
            Log.i(TAG, "Disconnected printer (" + prevName + "): " + reason);
            emitPrinterState("disconnected", prevName, prevAddr, reason);
        }
    }

    private void emitPrinterState(String state, String name, String address, String message) {
        JSObject payload = new JSObject();
        payload.put("state", state);
        payload.put("name", name);
        payload.put("address", address);
        payload.put("message", message);
        notifyListeners("printerStateChanged", payload);
    }
}
