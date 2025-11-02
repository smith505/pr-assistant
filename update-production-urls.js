// Update Extension URLs for Production Deployment
// Usage: node update-production-urls.js https://your-production-url.railway.app

const fs = require('fs');
const path = require('path');

const productionUrl = process.argv[2];

if (!productionUrl) {
  console.error('\n❌ Error: Please provide your production URL');
  console.log('\nUsage: node update-production-urls.js https://your-production-url.railway.app\n');
  process.exit(1);
}

// Validate URL format
if (!productionUrl.startsWith('http://') && !productionUrl.startsWith('https://')) {
  console.error('\n❌ Error: URL must start with http:// or https://');
  process.exit(1);
}

// Remove trailing slash if present
const cleanUrl = productionUrl.replace(/\/$/, '');

console.log(`\n🔄 Updating extension URLs to: ${cleanUrl}\n`);

// Files to update
const filesToUpdate = [
  {
    path: 'src/popup/popup.js',
    oldPattern: /const BACKEND_URL = ['"]http:\/\/localhost:3001['"]/,
    newValue: `const BACKEND_URL = '${cleanUrl}'`,
    description: 'Popup script'
  },
  {
    path: 'src/scripts/background.js',
    oldPattern: /const BACKEND_URL = ['"]http:\/\/localhost:3001['"]/,
    newValue: `const BACKEND_URL = '${cleanUrl}'`,
    description: 'Background service worker'
  },
  {
    path: 'src/scripts/subscription.js',
    oldPattern: /backendUrl: ['"]http:\/\/localhost:3001['"]/,
    newValue: `backendUrl: '${cleanUrl}'`,
    description: 'Subscription manager'
  }
];

let updatedCount = 0;
let errors = [];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file.path);

  try {
    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${file.path}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    if (file.oldPattern.test(content)) {
      content = content.replace(file.oldPattern, file.newValue);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${file.description} (${file.path})`);
      updatedCount++;
    } else {
      errors.push(`Pattern not found in ${file.path} - may already be updated or file format changed`);
    }
  } catch (error) {
    errors.push(`Error updating ${file.path}: ${error.message}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updatedCount} file(s)`);
console.log(`   Errors: ${errors.length}\n`);

if (errors.length > 0) {
  console.log('⚠️  Warnings/Errors:');
  errors.forEach(err => console.log(`   - ${err}`));
  console.log('');
}

if (updatedCount === filesToUpdate.length) {
  console.log('✨ All files updated successfully!\n');
  console.log('📝 Next steps:');
  console.log('   1. Reload the extension in Chrome (chrome://extensions)');
  console.log('   2. Test login/register with production backend');
  console.log('   3. Test PR analysis functionality');
  console.log('   4. Test Stripe checkout flow');
  console.log('   5. Package for Chrome Web Store:\n');
  console.log('      powershell -Command "Compress-Archive -Path manifest.json,src,assets -DestinationPath \'pr-assistant-v1.0.0.zip\' -Force"\n');
} else {
  console.log('⚠️  Some files were not updated. Please review the warnings above.\n');
}
