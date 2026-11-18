/**
 * BiteDash POS - Automated OTA Release Bundler
 * Usage: node make_ota_bundle.js [version_code]
 * Example: node make_ota_bundle.js 2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rawVersion = String(process.argv[2] || '0.8').trim().replace(/^v/i, '');
// Extract integer version_code (e.g. "0.8" -> 8) so Android MainActivity.java (optInt("version_code") > localVersion) triggers OTA
const parsedInt = parseInt(rawVersion.includes('.') ? rawVersion.split('.').pop() : rawVersion, 10);
const versionCode = Number.isNaN(parsedInt) || parsedInt <= 0 ? 8 : parsedInt;
const outDir = path.join(__dirname, 'ota_releases');
const bundleZip = path.join(outDir, `bundle_v${rawVersion}.zip`);
const versionJsonPath = path.join(outDir, 'bitedash_version.json');

// Vercel static OTA base URL (served from committed ota_releases/ directory)
const PUBLIC_STORAGE_URL = 'https://pos-restaurant-dun.vercel.app/ota_releases';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Files to bundle
const filesToBundle = [
  'index.html',
  'app.js',
  'sound-helper.js',
  'printer-helper.js',
  'android-bridge.js',
  'sw.js',
  'manifest.json'
];

if (fs.existsSync('style.css')) filesToBundle.push('style.css');
if (fs.existsSync('assets')) filesToBundle.push('assets');

if (fs.existsSync(bundleZip)) {
  fs.unlinkSync(bundleZip);
}

console.log(`📦 Packaging OTA Bundle v${rawVersion} (version_code: ${versionCode})...`);

// Use PowerShell Compress-Archive for zip generation on Windows
const itemsList = filesToBundle.map(f => `'${f}'`).join(', ');
const psCmd = `powershell -Command "Compress-Archive -Path ${itemsList} -DestinationPath '${bundleZip}' -Force"`;

try {
  execSync(psCmd, { stdio: 'inherit' });
  console.log(`✅ Created: ${bundleZip}`);

  // Create bitedash_version.json
  const versionData = {
    version: `v${rawVersion}`,
    version_code: versionCode,
    zip_url: `${PUBLIC_STORAGE_URL}/bundle_v${rawVersion}.zip`
  };

  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');
  console.log(`✅ Created: ${versionJsonPath}`);
  console.log('\n--------------------------------------------------------------');
  console.log('🚀 READY TO DEPLOY (Vercel Static OTA):');
  console.log(`1. Commit & push "ota_releases/" folder to your Vercel repo:`);
  console.log(`   - bundle_v${rawVersion}.zip`);
  console.log(`   - bitedash_version.json`);
  console.log(`2. Live OTA Manifest URL:`);
  console.log(`   ${PUBLIC_STORAGE_URL}/bitedash_version.json`);
  console.log('--------------------------------------------------------------\n');
} catch (e) {
  console.error('❌ Failed to package OTA bundle:', e);
}
