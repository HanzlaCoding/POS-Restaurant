const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'www');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'style.css',
  'app.js',
  'android-bridge.js',
  'manifest.json',
  'sw.js'
];

for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  const dest = path.join(targetDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copy assets folder if exists
const assetsSrc = path.join(__dirname, 'assets');
const assetsDest = path.join(targetDir, 'assets');
if (fs.existsSync(assetsSrc)) {
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });
}

console.log('[Build] Successfully staged web assets into ./www for Capacitor packaging.');
