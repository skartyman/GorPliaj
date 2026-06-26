const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // We can use powershell to list zip contents on Windows
  const cmd = `powershell -Command "Expand-Archive -Path 'C:\\Users\\Administrator\\GorPliaj\\live-snapshot-2026-06-22.zip' -DestinationPath 'C:\\Users\\Administrator\\GorPliaj\\temp-zip-extract' -Force"`;
  console.log('Extracting zip file...');
  execSync(cmd);
  
  console.log('Zip extracted. Listing contents of temp-zip-extract recursively:');
  function listFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        console.log(`[DIR] ${fullPath}`);
        listFiles(fullPath);
      } else {
        console.log(`[FILE] ${fullPath} (${stat.size} bytes)`);
      }
    }
  }
  listFiles('C:\\Users\\Administrator\\GorPliaj\\temp-zip-extract');
} catch (err) {
  console.error('Error:', err);
}
