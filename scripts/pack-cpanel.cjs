const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'build-cpanel-zip.ps1');
try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Failed to pack cPanel zip:', error.message);
  process.exit(1);
}
