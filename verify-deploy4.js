const https = require('https');
https.get('https://gorpliaj.pp.ua/admin/assets/index-B_LMBBtk.js', { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    // Search for the path detection using startsWith
    // The minified code should have: startsWith("/admin/map-editor") || path === "/admin/map"
    // or: path.startsWith("/admin/map-editor") || path === "/admin/map"
    // After minification, variable names are single letters
    
    // Look for startsWith pattern near map-editor
    const sw = data.indexOf('.startsWith');
    const occurrences = [];
    let idx = -1;
    while ((idx = data.indexOf('.startsWith', idx + 1)) >= 0) {
      const ctx = data.substring(Math.max(0, idx - 30), idx + 60);
      if (ctx.includes('map') || ctx.includes('admin')) {
        occurrences.push(ctx);
      }
    }
    console.log('startsWith occurrences with map/admin:');
    occurrences.forEach(o => console.log('  ', o));
    
    // Also check for the combined condition (||)
    const orIdx = data.indexOf('||');
    if (orIdx >= 0) {
      // Find || near path comparisons
      const orPatterns = [];
      let oi = -1;
      while ((oi = data.indexOf('||', oi + 1)) >= 0) {
        const ctx = data.substring(Math.max(0, oi - 40), oi + 60);
        if (ctx.includes('map') || ctx.includes('path')) {
          orPatterns.push(ctx);
        }
      }
      console.log('\n|| patterns with map/path:');
      orPatterns.forEach(o => console.log('  ', o));
    }
  });
});
