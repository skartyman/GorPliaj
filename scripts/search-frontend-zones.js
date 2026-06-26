const fs = require('fs');
const path = require('path');

const keywords = [/лівий/i, /лівого/i, /центр/i, /тераса/i, /тераси/i, /пірс/i, /пірсу/i, /ресторан/i];

function walk(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build' && file !== 'temp-zip-extract') {
        walk(fullPath, results);
      }
    } else {
      if (/\.(jsx?|tsx?|html|css|json)$/.test(file)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const frontendDirs = [
  'C:\\Users\\Administrator\\GorPliaj\\admin-frontend\\src',
  'C:\\Users\\Administrator\\GorPliaj\\public-frontend\\src',
  'C:\\Users\\Administrator\\GorPliaj\\src'
];

console.log('Searching for zone keywords...');
for (const dir of frontendDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = walk(dir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      for (const kw of keywords) {
        if (kw.test(line)) {
          console.log(`${file}:${index + 1}: ${line.trim()}`);
          break;
        }
      }
    });
  }
}
console.log('Done searching.');
