const fs = require('fs');

const cssPath = 'C:\\Users\\Administrator\\GorPliaj\\admin-frontend\\src\\styles.css';
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');

console.log('=== SEARCH RESULTS IN styles.css ===');
lines.forEach((line, idx) => {
  if (line.includes('object-status-badge') || line.includes('object-code-text') || line.includes('object-countdown') || line.includes('table-countdown')) {
    console.log(`Line ${idx + 1}: ${line}`);
    // Print 5 lines after for context
    for (let i = 1; i <= 8; i++) {
      if (lines[idx + i] !== undefined) {
        console.log(`  +${i}: ${lines[idx + i]}`);
      }
    }
  }
});
