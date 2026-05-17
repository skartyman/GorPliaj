const https = require('https');
const url = 'https://gorpliaj.pp.ua/admin/assets/index-B_LMBBtk.js';
https.get(url, { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    console.log('has map-editor check:', data.includes('/admin/map-editor'));
    console.log('has map check:', data.includes('"/admin/map"'));
    const i = data.indexOf('/admin/map');
    console.log('context:', data.substring(Math.max(0, i - 40), i + 50));
  });
});
