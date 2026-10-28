/**
 * BiteDash POS - Automated OTA Release Bundler
 * Usage: node make_ota_bundle.js [version_code]
 * Example: node make_ota_bundle.js 2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = parseInt(process.argv[2] || '2', 10);
const outDir = path.join(__dirname, 'ota_releases');
const bundleZip = path.join(outDir, `bundle_v${version}.zip`);
const versionJsonPath = path.join(outDir, 'bitedash_version.json');

// Your Supabase Storage bucket URL (Bucket name: bitedash-updates)
const SUPABASE_PROJECT_ID = 'giyfjerwbkcbdtvgghjp';
const BUCKET_NAME = 'bitedash-updates';
const PUBLIC_STORAGE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}`;

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Files to bundle
const filesToBundle = [
  'index.html',
  'app.js',
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

console.log(`📦 Packaging OTA Bundle v${version}...`);

// Use PowerShell Compress-Archive for zip generation on Windows
const itemsList = filesToBundle.map(f => `'${f}'`).join(', ');
const psCmd = `powershell -Command "Compress-Archive -Path ${itemsList} -DestinationPath '${bundleZip}' -Force"`;

try {
  execSync(psCmd, { stdio: 'inherit' });
  console.log(`✅ Created: ${bundleZip}`);

  // Create bitedash_version.json
  const versionData = {
    version_code: version,
    zip_url: `${PUBLIC_STORAGE_URL}/bundle_v${version}.zip`
  };

  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');
  console.log(`✅ Created: ${versionJsonPath}`);
  console.log('\n--------------------------------------------------------------');
  console.log('🚀 READY TO DEPLOY:');
  console.log(`1. Supabase Storage mein jao aur bucket banao: "${BUCKET_NAME}" (Public: YES)`);
  console.log(`2. Yeh dono files "ota_releases/" folder se Supabase bucket mein upload kar do:`);
  console.log(`   - bundle_v${version}.zip`);
  console.log(`   - bitedash_version.json`);
  console.log(`3. MainActivity.java line 65 par yeh URL paste karein:`);
  console.log(`   ${PUBLIC_STORAGE_URL}/bitedash_version.json`);
  console.log('--------------------------------------------------------------\n');
} catch (e) {
  console.error('❌ Failed to package OTA bundle:', e);
}
