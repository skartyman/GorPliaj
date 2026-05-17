const https = require('https');
https.get('https://gorpliaj.pp.ua/admin/assets/index-B_LMBBtk.js', { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    // Search for the pattern: path.startsWith("/admin/map-editor") || path === "/admin/map"
    // After minification it might be: path.startsWith("...")||path==="..."
    // Or with the variable being just a letter
    // Search for "/admin/map-editor" near "/admin/map" in a single expression
    const idx1 = data.indexOf('"/admin/map-editor"');
    if (idx1 >= 0) {
      const after = data.substring(idx1, idx1 + 100);
      console.log('Context 1:', after);
    }
    // Also search for the pattern around sidebar-collapsed
    const scIdx = data.indexOf('sidebar-collapsed');
    if (scIdx >= 0) {
      console.log('sidebar-collapsed context:', data.substring(Math.max(0, scIdx - 150), scIdx + 30));
    }
    
    // Check for the map-editor-shell class
    const mesIdx = data.indexOf('map-editor-shell');
    if (mesIdx >= 0) {
      console.log('map-editor-shell context:', data.substring(Math.max(0, mesIdx - 80), mesIdx + 30));
    }
  });
});
