const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  const logoPath = 'public/icons/Logo.png';
  
  // Blue background for client
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#10344d' } })
    .composite([{ input: await sharp(logoPath).resize({ width: 360, height: 360, fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } }).toBuffer() }])
    .png()
    .toFile('public/icons/icon-512.png');
    
  await sharp({ create: { width: 192, height: 192, channels: 4, background: '#10344d' } })
    .composite([{ input: await sharp(logoPath).resize({ width: 135, height: 135, fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } }).toBuffer() }])
    .png()
    .toFile('public/icons/icon-192.png');

  // Brown background for admin
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#5c3a21' } })
    .composite([{ input: await sharp(logoPath).resize({ width: 360, height: 360, fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } }).toBuffer() }])
    .png()
    .toFile('public/icons/admin-favicon-512.png');
    
  await sharp({ create: { width: 192, height: 192, channels: 4, background: '#5c3a21' } })
    .composite([{ input: await sharp(logoPath).resize({ width: 135, height: 135, fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } }).toBuffer() }])
    .png()
    .toFile('public/icons/admin-favicon-192.png');
    
  console.log('Icons generated!');
}

generate().catch(console.error);
