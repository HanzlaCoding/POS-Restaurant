/**
 * Prepares the clean `www/` directory for Capacitor Android sync
 * without duplicating `node_modules/` or `android/` into APK assets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const FILES_TO_COPY = [
  'index.html',
  'android-bridge.js',
  'manifest.json',
  'sw.js',
  'style.css',
  'app.js'
];

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.mkdirSync(WWW, { recursive: true });

for (const file of FILES_TO_COPY) {
  const srcFile = path.join(ROOT, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(WWW, file));
  }
}

copyDirRecursive(path.join(ROOT, 'assets'), path.join(WWW, 'assets'));

console.log('[prepare-www] Copied web assets to www/');
