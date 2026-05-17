const https = require('https');
https.get('https://gorpliaj.pp.ua/admin/assets/index-B_LMBBtk.js', { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    // Search for the collapsed sidebar detection logic
    // It should contain the pattern: startsWith("/admin/map-editor") || path === "/admin/map"
    // After minification it could be: startsWith("/admin/map-editor")||"/admin/map"===path
    const patterns = [
      'startsWith("/admin/map-editor")',
      '"/admin/map"===path',
      'path==="/admin/map"'
    ];
    patterns.forEach(p => console.log(p + ':', data.includes(p)));
    
    // Search around the startsWith area
    const idx = data.indexOf('startsWith');
    if (idx >= 0) {
      console.log('Found startsWith context:', data.substring(idx, idx + 120));
    }
    
    // Search for "fullscreen" or renamed variable patterns
    const fsIdx = data.indexOf('Fullscreen');
    if (fsIdx >= 0) console.log('Fullscreen found');
    
    // Check for map-editor and map in close proximity
    const meIdx = data.indexOf('map-editor');
    if (meIdx >= 0) {
      const after = data.substring(meIdx, meIdx + 80);
      console.log('After map-editor:', after);
    }
  });
});
