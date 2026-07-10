const fs = require('fs');
const sharp = require('sharp');

async function processIcon(inFile, outFile) {
  const { data, info } = await sharp(inFile).raw().toBuffer({ resolveWithObject: true });
  
  // Background: 92, 58, 33 (#5c3a21) -> Target: 16, 52, 77 (#10344d)
  const bg = [92, 58, 33];
  const target = [16, 52, 77];
  // Foreground: 245, 237, 224
  const fg = [245, 237, 224];
  
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Estimate alpha (how much of foreground is present vs background)
    // We can just use the difference in R channel
    // r is between bg[0]=92 and fg[0]=245
    let alpha = (r - bg[0]) / (fg[0] - bg[0]);
    alpha = Math.max(0, Math.min(1, alpha));
    
    // New pixel color = target * (1 - alpha) + fg * alpha
    data[i] = Math.round(target[0] * (1 - alpha) + fg[0] * alpha);
    data[i+1] = Math.round(target[1] * (1 - alpha) + fg[1] * alpha);
    data[i+2] = Math.round(target[2] * (1 - alpha) + fg[2] * alpha);
  }
  
  await sharp(data, { raw: info }).png().toFile(outFile);
}

Promise.all([
  processIcon('public/icons/admin-favicon-192.png', 'public/icons/icon-192.png'),
  processIcon('public/icons/admin-favicon-512.png', 'public/icons/icon-512.png')
]).then(() => console.log('Recolored successfully!'));
