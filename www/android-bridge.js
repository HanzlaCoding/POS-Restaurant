/**
 * The Artisan Grill & Co. • Native Android POS Bluetooth Bridge
 * Architecture for Capacitor & Cordova Hybrid Android Packaging (Vyapar-Style)
 *
 * Capabilities:
 * - Native Android Auto-Connection on App Launch (No User-Gesture required)
 * - Native Bluetooth Classic Serial (RFCOMM / SPP) & BLE Writable Socket Support
 * - Fallback to Standard Web Bluetooth API for Browser-based POS Terminals
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AndroidPOSBridge = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const PRINTER_PREFIXES = ['YD583', 'MPT', 'RPP', 'POS', 'ZJ', 'MTP', 'BT'];
  let isConnecting = false;
  let activeNativeConnection = null;

  const Bridge = {
    // 1. Detection of Native Android Container
    isNative: function () {
      if (typeof window === 'undefined') return false;
      const hasCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
      const hasCordova = !!(window.cordova && window.bluetoothSerial);
      const hasCustomAndroidBridge = !!(window.AndroidPrinter || window.AndroidBridge);
      return hasCapacitor || hasCordova || hasCustomAndroidBridge;
    },

    getNativeType: function () {
      if (window.AndroidPrinter || window.AndroidBridge) return 'webview-interface';
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return 'capacitor';
      if (window.cordova && window.bluetoothSerial) return 'cordova-serial';
      return 'web-bluetooth';
    },

    /**
     * Vyapar-Style Background Auto-Connection on Launch
     * Native Android permits background connection to paired devices without a user prompt
     */
    autoConnectOnLaunch: async function (onStatusChange) {
      if (!this.isNative()) {
        console.log('[Android Bridge] Running in Web Browser mode. Auto-connect deferred to On-Demand gesture.');
        return false;
      }

      console.log(`[Android Bridge] Native Android runtime detected (${this.getNativeType()}). Initiating background auto-connect...`);
      if (onStatusChange) onStatusChange('connecting', 'Auto-Connecting...');

      const savedMac = localStorage.getItem('pos_printer_mac') || localStorage.getItem('pos_printer_id');
      const savedName = localStorage.getItem('pos_printer_name') || 'YD583';

      try {
        // Strategy A: BluetoothSerial (Capacitor/Cordova SPP RFCOMM)
        if (window.bluetoothSerial) {
          const isEnabled = await new Promise((res) => window.bluetoothSerial.isEnabled(res, () => res(false)));
          if (!isEnabled) {
            console.warn('[Android Bridge] Bluetooth is turned OFF on Android device.');
            if (onStatusChange) onStatusChange('disconnected', 'Bluetooth Disabled');
            return false;
          }

          // If we have a saved MAC address, connect directly:
          if (savedMac && savedMac.includes(':')) {
            console.log(`[Android Bridge] Connecting to saved MAC: ${savedMac}...`);
            await new Promise((resolve, reject) => {
              window.bluetoothSerial.connect(savedMac, resolve, reject);
            });
            activeNativeConnection = { type: 'serial', mac: savedMac, name: savedName };
            if (onStatusChange) onStatusChange('ready', `${savedName} (Native)`);
            return true;
          }

          // Otherwise, list paired devices and find a matching thermal printer:
          const pairedDevices = await new Promise((resolve, reject) => {
            window.bluetoothSerial.list(resolve, reject);
          });

          const matched = pairedDevices.find(dev => {
            const name = (dev.name || '').toUpperCase();
            return PRINTER_PREFIXES.some(prefix => name.includes(prefix));
          }) || (pairedDevices.length > 0 ? pairedDevices[0] : null);

          if (matched) {
            console.log(`[Android Bridge] Auto-pairing to bonded printer: ${matched.name} (${matched.address})`);
            await new Promise((resolve, reject) => {
              window.bluetoothSerial.connect(matched.address, resolve, reject);
            });
            localStorage.setItem('pos_printer_mac', matched.address);
            localStorage.setItem('pos_printer_name', matched.name);
            activeNativeConnection = { type: 'serial', mac: matched.address, name: matched.name };
            if (onStatusChange) onStatusChange('ready', `${matched.name} (Native)`);
            return true;
          }
        }

        // Strategy B: Android WebView JavascriptInterface
        if (window.AndroidPrinter && typeof window.AndroidPrinter.autoConnect === 'function') {
          const success = window.AndroidPrinter.autoConnect();
          if (success) {
            activeNativeConnection = { type: 'webview-interface', name: savedName };
            if (onStatusChange) onStatusChange('ready', `${savedName} (Native)`);
            return true;
          }
        }

        // Strategy C: Capacitor BluetoothLe Plugin
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BluetoothLe) {
          const Ble = window.Capacitor.Plugins.BluetoothLe;
          await Ble.initialize();
          if (savedMac) {
            await Ble.connect({ deviceId: savedMac });
            activeNativeConnection = { type: 'ble', deviceId: savedMac, name: savedName };
            if (onStatusChange) onStatusChange('ready', `${savedName} (Native)`);
            return true;
          }
        }

      } catch (err) {
        console.warn('[Android Bridge] Background auto-connect note:', err);
        if (onStatusChange) onStatusChange('disconnected', 'Tap to Connect');
        return false;
      }

      return false;
    },

    /**
     * Dispatch raw ESC/POS binary data to the thermal printer
     */
    sendEscPosBytes: async function (uint8Array) {
      if (!this.isNative()) {
        throw new Error('Native Android runtime not active; use Web Bluetooth.');
      }

      // 1. BluetoothSerial SPP Socket
      if (window.bluetoothSerial) {
        return new Promise((resolve, reject) => {
          // Send as ArrayBuffer or Uint8Array
          window.bluetoothSerial.write(uint8Array.buffer, resolve, reject);
        });
      }

      // 2. Android WebView JavascriptInterface
      if (window.AndroidPrinter) {
        // Base64 encode byte buffer for Android native Java interface
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const b64 = window.btoa(binary);
        if (typeof window.AndroidPrinter.printBase64 === 'function') {
          window.AndroidPrinter.printBase64(b64);
          return true;
        }
      }

      // 3. Capacitor BluetoothLe Plugin
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BluetoothLe) {
        const Ble = window.Capacitor.Plugins.BluetoothLe;
        const savedMac = localStorage.getItem('pos_printer_mac') || localStorage.getItem('pos_printer_id');
        // Convert to base64 for Capacitor BLE plugin
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const value = window.btoa(binary);
        return Ble.writeWithoutResponse({
          deviceId: savedMac,
          service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3',
          value: value
        });
      }

      throw new Error('No matching native Android Bluetooth pipeline available');
    },

    /**
     * Query bonded/paired devices on Android
     */
    listBondedDevices: async function () {
      if (window.bluetoothSerial) {
        return new Promise((resolve, reject) => window.bluetoothSerial.list(resolve, reject));
      }
      return [];
    },

    /**
     * Disconnect socket cleanly
     */
    disconnect: async function () {
      if (window.bluetoothSerial) {
        return new Promise((resolve) => window.bluetoothSerial.disconnect(resolve, resolve));
      }
      activeNativeConnection = null;
      return true;
    }
  };

  return Bridge;
}));
