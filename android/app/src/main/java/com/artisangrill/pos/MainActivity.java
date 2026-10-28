package com.artisangrill.pos;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * BiteDash POS - Main Android Host Activity with Capacitor-Native Silent Hot Updates (OTA).
 *
 * Uses Capacitor's official bridge.setServerBasePath() API:
 * 1. Serves from https://localhost/ (eliminates FileUriExposedException and CORS issues).
 * 2. If an OTA update bundle exists in getFilesDir()/www, Capacitor serves from it.
 * 3. Background thread checks Supabase OTA endpoint silently and unzips hot updates.
 * 4. Preserves 100% compatibility with Bluetooth thermal printer & native plugins.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "BiteDashOTA";
    private static final String PREFS_NAME = "bitedash_ota";
    private static final String KEY_BUNDLE_VERSION = "app_bundle_version";

    /**
     * Remote endpoint for silent version checking.
     * Host this JSON on your Supabase Storage (bitedash-updates bucket), S3, or custom server.
     */
    public static final String OTA_VERSION_URL = "https://giyfjerwbkcbdtvgghjp.supabase.co/storage/v1/object/public/bitedash-updates/bitedash_version.json";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiteDashPrinterPlugin.class);
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();

            // 1. Hardware acceleration for smooth POS UI rendering
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // 2. Configure WebSettings
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // 3. Ensure hardware bridge is bound before loading
            BluetoothPrinterBridge printerBridge = new BluetoothPrinterBridge(this);
            webView.addJavascriptInterface(printerBridge, "AndroidBridge");
            webView.addJavascriptInterface(this, "Android");

            // 4. Capacitor-native local server path handling
            File localWebDir = new File(getFilesDir(), "www");
            File indexFile = new File(localWebDir, "index.html");

            if (indexFile.exists()) {
                Log.i(TAG, "OTA bundle found in local storage. Serving from: " + localWebDir.getAbsolutePath());
                this.bridge.setServerBasePath(localWebDir.getAbsolutePath());
            } else {
                Log.i(TAG, "No OTA bundle downloaded yet. Serving bundled APK assets.");
            }

            // 5. Trigger silent OTA update check on background thread
            checkForSilentOtaUpdate(webView, localWebDir);
        }
    }

    /**
     * Silent background OTA update worker.
     * Queries remote version, downloads zip bundle, extracts over localWebDir,
     * updates SharedPreferences, and switches Capacitor base path seamlessly.
     */
    private void checkForSilentOtaUpdate(WebView webView, File localWebDir) {
        new Thread(() -> {
            try {
                // Allow network & app initialization to settle (3 seconds)
                Thread.sleep(3000);

                if (!isNetworkAvailable()) {
                    Log.d(TAG, "OTA: Network unavailable, skipping silent update check.");
                    return;
                }

                if (OTA_VERSION_URL == null || OTA_VERSION_URL.contains("your-api-or-supabase.com")) {
                    Log.d(TAG, "OTA: Default placeholder URL detected. Skipping remote fetch.");
                    return;
                }

                Log.i(TAG, "OTA: Checking for updates from " + OTA_VERSION_URL);
                URL url = new URL(OTA_VERSION_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("Accept", "application/json");
                conn.setRequestProperty("User-Agent", "BiteDashPOS-OTA/1.0");

                if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    Log.w(TAG, "OTA: Version check HTTP response: " + conn.getResponseCode());
                    conn.disconnect();
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                conn.disconnect();

                JSONObject json = new JSONObject(sb.toString());
                int remoteVersion = json.optInt("version_code", 0);
                String zipUrl = json.optString("zip_url", "");

                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                int localVersion = prefs.getInt(KEY_BUNDLE_VERSION, 1);

                Log.i(TAG, "OTA: Local bundle version=" + localVersion + ", Remote version=" + remoteVersion);

                if (remoteVersion > localVersion && !zipUrl.isEmpty()) {
                    Log.i(TAG, "OTA: Higher version found! Starting silent download from: " + zipUrl);

                    File tempZip = new File(getCacheDir(), "ota_bundle_v" + remoteVersion + ".zip");
                    downloadFile(zipUrl, tempZip);

                    Log.i(TAG, "OTA: Download finished. Unpacking into " + localWebDir.getAbsolutePath());
                    unzipFile(tempZip, localWebDir);

                    // Clean up downloaded zip
                    if (tempZip.exists()) {
                        tempZip.delete();
                    }

                    // Save new version code
                    prefs.edit().putInt(KEY_BUNDLE_VERSION, remoteVersion).apply();
                    Log.i(TAG, "OTA: Hot update to version " + remoteVersion + " successful!");

                    // Switch Capacitor base path to localWebDir and notify frontend
                    runOnUiThread(() -> {
                        try {
                            if (this.bridge != null) {
                                this.bridge.setServerBasePath(localWebDir.getAbsolutePath());
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to switch server base path", e);
                        }

                        webView.evaluateJavascript(
                            "if (window.onAppUpdated && typeof window.onAppUpdated === 'function') { window.onAppUpdated(); }",
                            null
                        );
                    });
                }
            } catch (Exception e) {
                Log.w(TAG, "OTA: Silent check/update encountered non-fatal error: " + e.getMessage());
            }
        }).start();
    }

    private void downloadFile(String fileUrl, File destination) throws IOException {
        URL url = new URL(fileUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("User-Agent", "BiteDashPOS-OTA/1.0");
        conn.connect();

        if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
            throw new IOException("Download HTTP error: " + conn.getResponseCode() + " " + conn.getResponseMessage());
        }

        try (InputStream input = conn.getInputStream();
             OutputStream output = new FileOutputStream(destination)) {
            byte[] data = new byte[8192];
            int count;
            while ((count = input.read(data)) != -1) {
                output.write(data, 0, count);
            }
            output.flush();
        } finally {
            conn.disconnect();
        }
    }

    /**
     * Unzips a bundle into target directory with Zip-Slip path traversal protection.
     */
    private void unzipFile(File zipFile, File targetDir) throws IOException {
        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }
        String canonicalDest = targetDir.getCanonicalPath();

        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];
            while ((entry = zis.getNextEntry()) != null) {
                // Normalize Windows backslashes to forward slashes if any
                String normalizedName = entry.getName().replace('\\', '/');
                File targetFile = new File(targetDir, normalizedName);
                String canonicalTarget = targetFile.getCanonicalPath();

                // Zip Slip protection
                if (!canonicalTarget.startsWith(canonicalDest + File.separator) && !canonicalTarget.equals(canonicalDest)) {
                    throw new IOException("Zip entry attempted directory traversal: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    targetFile.mkdirs();
                } else {
                    File parent = targetFile.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }
                    try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                        fos.flush();
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
                return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not check network state", e);
        }
        return false;
    }

    @JavascriptInterface
    public void openBluetoothSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallback);
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    /**
     * Dedicated native bridge interface exposed to JavaScript as window.AndroidBridge.
     */
    public static class BluetoothPrinterBridge {
        private final MainActivity activity;

        public BluetoothPrinterBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void openBluetoothSettings() {
            if (activity != null) {
                activity.openBluetoothSettings();
            }
        }

        @JavascriptInterface
        public String getBridgeVersion() {
            return "2.3.0-capacitor-ota";
        }

        @JavascriptInterface
        public int getLocalBundleVersion() {
            if (activity != null) {
                SharedPreferences prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                return prefs.getInt(KEY_BUNDLE_VERSION, 1);
            }
            return 1;
        }
    }
}
