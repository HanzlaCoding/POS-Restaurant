# 🍔 BiteDash POS — Restaurant & Food Stall Point of Sale

> **High-speed, offline-first Point of Sale terminal designed for food stalls, burger points, and quick-service restaurants (QSR).**  
> Built for Android tablets & phones with 58mm Bluetooth thermal printing, silent Over-The-Air (OTA) hot updates, and anti-theft controls.

---

## ⚡ Highlights & Key Features

### 🖨️ 1. 58mm ESC/POS Thermal Printing
- **Zero-lag Bluetooth Printing:** Native Android Bluetooth SPP (Classic) bridge + Web Bluetooth BLE fallback.
- **Speedx M450 & Standard 58mm Roll Support:** Auto-calculates 32-column fixed receipt grid with Urdu/English item layouts.
- **Tear-Off Blade Protection:** Post-print 5-line feed (`[0x1B, 0x64, 0x05]`) ensures receipts clear the physical casing teeth with zero footer slicing.
- **Duplicate Receipts:** Instant reprint from history with bold `*** DUPLICATE RECEIPT ***` watermark.

### 🔊 2. Synthetic Audio Feedback Engine (`sound-helper.js`)
- Zero external MP3/WAV assets; sounds are synthesized in real-time via the browser **Web Audio API**.
- **Tap Click (800 Hz):** Instant haptic-like audio on item selection, stepper adjustments, and keypad taps.
- **Success Chime (1200–1800 Hz):** Ascending chime on successful order printing and PIN unlocks.
- **Warning Buzzer (220 Hz):** Low-frequency sawtooth alert on order cancellation, cart reset, and unauthorized attempts.

### 🛡️ 3. Anti-Theft Void & Order History System
- **Top Bar History Trigger (`📜`):** Fast access to all completed tickets for the current shift.
- **Instant Search:** Filter orders in real time by Token # (e.g. `001`) or customer/item name.
- **PIN-Protected Void System:** Cashiers **cannot** cancel or pocket cash after issuing a ticket. Voiding an order requires the **4-digit Owner PIN** (`1234` default).
- **Audit-Accurate:** Voided orders are immediately deducted from active sales and galla (cash drawer) calculations, preserving a tamper-proof audit trail.

### 🚀 4. Silent In-App Hot Updates (OTA)
- Deploy frontend changes (HTML, CSS, JS) instantly to physical stall devices **without rebuilding or reinstalling APKs**.
- Powered by Supabase Storage bucket (`bitedash-updates`) and Capacitor's dynamic local server bridge (`setServerBasePath`).
- Automated bundler script generates versioned zip packages in seconds:
  ```bash
  node make_ota_bundle.js 8
  ```

### 📊 5. Daily Hisaab (Z-Report) & Expenses
- **End-of-Shift Reconciliation:** Tracks Gross Sales, Cash, Online (Raast/EasyPaisa), and Daily Kharcha (Expenses).
- **Physical Z-Slip:** One-tap thermal printing of the shift summary report.
- **WhatsApp Dispatch:** Send instant structured end-of-day sales summaries directly to the owner's WhatsApp.

---

## 🏗️ Architecture & Project Structure

```text
POS-Restaurant/
├── index.html                   # High-performance single-page POS interface
├── app.js                       # Core state machine, cart, hisaab, and cloud sync
├── sound-helper.js              # Synthetic Web Audio API feedback engine
├── printer-helper.js            # 58mm ESC/POS byte generator & duplicate watermarking
├── android-bridge.js            # JavaScript-to-Android native Bluetooth bridge
├── make_ota_bundle.js           # Automated zip packager for OTA hot deployments
├── ota_releases/                # Release directory for version descriptors & bundles
│   └── bitedash_version.json    # Remote version descriptor (version_code & zip_url)
├── android/                     # Native Android Capacitor wrapper
│   └── app/src/main/
│       ├── java/.../MainActivity.java # Native OTA background updater & bridge
│       └── assets/public/       # Bundled offline fallback assets
└── sw.js                        # Service worker for offline caching
```

---

## 🛠️ Quick Start & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Android Studio](https://developer.android.com/studio) (for APK builds)
- Connected thermal printer (e.g., Speedx M450, MPT-II, POS-58)

### 1. Run in Browser
Serve the root folder with any static HTTP server:
```bash
npx serve -l 3000 .
```
Open `http://localhost:3000` in Google Chrome or Edge.

---

## 📲 Android Deployment

### Build Debug APK
```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Install directly to connected device:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔄 Deploying Silent OTA Updates

1. Make your code changes in `index.html`, `app.js`, `style.css`, etc.
2. Run the OTA bundler with an incremented version code:
   ```bash
   node make_ota_bundle.js 8
   ```
3. Upload the generated files from `ota_releases/` into your Supabase Storage bucket (`bitedash-updates`):
   - `bundle_v8.zip`
   - `bitedash_version.json`
4. The POS app will detect the higher version code in the background, download the bundle, extract it into internal storage, and seamlessly reload with zero downtime.

---

## 🔐 Default Access PINs
- **Owner Mode PIN:** `1234` (Can be modified inside Shop Settings)
- **Master Override PIN:** `9999`

---

## 📄 License
Private & Proprietary — Developed for BiteDash POS Terminals.
