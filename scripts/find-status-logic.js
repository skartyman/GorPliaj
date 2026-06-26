const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(fullPath);
      }
    } else {
      if (/\.(jsx?|tsx?)$/.test(file)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('getTableDisplayStatus')) {
          console.log(`Found in: ${fullPath}`);
          // Find the lines containing the definition
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('function getTableDisplayStatus') || line.includes('const getTableDisplayStatus')) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
              for (let i = 1; i <= 25; i++) {
                if (lines[idx + i] !== undefined) {
                  console.log(`    +${i}: ${lines[idx + i]}`);
                }
              }
            }
          });
        }
      }
    }
  }
}

walk('C:\\Users\\Administrator\\GorPliaj');
