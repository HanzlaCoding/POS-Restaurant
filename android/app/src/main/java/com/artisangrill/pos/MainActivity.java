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
 * BiteDash POS - Main Android Host Activity with Silent In-App Hot Updates (OTA).
 *
 * Architecture:
 * 1. Internal Writable Web Directory:
 *    Instead of read-only apk assets, the WebView loads from an internal writable
 *    sandbox directory (getFilesDir()/www/). On first launch, APK assets/public are
 *    copied here automatically.
 * 2. Silent OTA Update Checker:
 *    A non-blocking background thread queries the remote version endpoint. When a higher
 *    version_code is available, it downloads the zip bundle, safely unzips and overwrites
 *    local files, updates SharedPreferences, and triggers window.onAppUpdated() in WebView.
 * 3. Native Hardware Bridge:
 *    Exposes AndroidBridge & Android interfaces to JavaScript before loading so thermal
 *    printer and system Bluetooth settings remain 100% accessible.
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

            // 1. Hardware Acceleration for smooth POS UI rendering
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // 2. Configure WebSettings for local writable sandbox execution
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);

            // 3. Ensure hardware bridge is bound BEFORE loading
            BluetoothPrinterBridge printerBridge = new BluetoothPrinterBridge(this);
            webView.addJavascriptInterface(printerBridge, "AndroidBridge");
            webView.addJavascriptInterface(this, "Android");

            // 4. Initialize writable web directory (getFilesDir()/www)
            File localWebDir = new File(getFilesDir(), "www");
            ensureLocalWebDirInitialized(localWebDir);

            // 5. Load WebView from the writable local directory
            File indexFile = new File(localWebDir, "index.html");
            if (indexFile.exists()) {
                String localUrl = "file://" + indexFile.getAbsolutePath();
                Log.i(TAG, "Loading local writable WebView from: " + localUrl);
                webView.loadUrl(localUrl);
            } else {
                Log.w(TAG, "index.html missing in localWebDir! Falling back to bundled assets.");
                webView.loadUrl("file:///android_asset/public/index.html");
            }

            // 6. Trigger silent OTA update check on background thread
            checkForSilentOtaUpdate(webView, localWebDir);
        }
    }

    /**
     * Copies all assets from APK assets/public to the writable localWebDir
     * if it has not yet been initialized or if index.html is missing.
     */
    private void ensureLocalWebDirInitialized(File localWebDir) {
        File indexHtml = new File(localWebDir, "index.html");
        if (!localWebDir.exists() || !indexHtml.exists()) {
            Log.i(TAG, "First run: extracting bundled assets/public to writable www directory...");
            localWebDir.mkdirs();
            try {
                copyAssetFolder("public", localWebDir);
                Log.i(TAG, "Bundled assets extracted successfully to: " + localWebDir.getAbsolutePath());
            } catch (Exception e) {
                Log.e(TAG, "Error copying assets to writable www directory", e);
            }
        }
    }

    /**
     * Recursively copies an Android asset directory into a target file directory.
     */
    private void copyAssetFolder(String srcAssetPath, File destDir) throws IOException {
        String[] files = getAssets().list(srcAssetPath);
        if (files == null || files.length == 0) {
            // It is a file: copy directly
            copyAssetFile(srcAssetPath, destDir);
        } else {
            if (!destDir.exists()) {
                destDir.mkdirs();
            }
            for (String file : files) {
                String subSrc = srcAssetPath.isEmpty() ? file : (srcAssetPath + "/" + file);
                File subDest = new File(destDir, file);
                String[] subList = getAssets().list(subSrc);
                if (subList != null && subList.length > 0) {
                    copyAssetFolder(subSrc, subDest);
                } else {
                    copyAssetFile(subSrc, subDest);
                }
            }
        }
    }

    private void copyAssetFile(String assetFilePath, File destFile) throws IOException {
        File parent = destFile.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }
        try (InputStream in = getAssets().open(assetFilePath);
             OutputStream out = new FileOutputStream(destFile)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        }
    }

    /**
     * Silent background OTA update worker.
     * Queries remote version, downloads zip bundle, extracts over localWebDir,
     * updates SharedPreferences, and alerts frontend via window.onAppUpdated().
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
                    Log.d(TAG, "OTA: Default placeholder URL detected. Skipping remote fetch until endpoint is configured.");
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

                    // Post update notification to WebView on UI thread
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (window.onAppUpdated && typeof window.onAppUpdated === 'function') { window.onAppUpdated(); }",
                            null
                        );
                    });
                }
            } catch (Exception e) {
                Log.w(TAG, "OTA: Silent check/update encountered a non-fatal exception: " + e.getMessage());
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
                File targetFile = new File(targetDir, entry.getName());
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
            return "2.2.0-silent-ota";
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
