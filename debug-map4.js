const { chromium } = require('playwright');

const BASE = 'https://gorpliaj.pp.ua';
const EMAIL = 'admin@gorpliaj.local';
const PASSWORD = 'GpOdessaPLIAJ';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard');

  // --- PREVIEW ---
  await page.goto(`${BASE}/admin/map`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const previewInfo = await page.evaluate(() => {
    const vp = document.querySelector('.interactive-map-viewport');
    const world = document.querySelector('.interactive-map-world');

    const objects = document.querySelectorAll('.interactive-map-object');
    // Get positions from the object list (first 10 and a sample from middle/end)
    const indices = [0,1,2,3,4,5,50,100,150,200,205,206,207,208];
    const objData = Array.from(objects).filter((_,i) => indices.includes(i)).map(el => ({
      i: Array.from(el.parentNode.children).indexOf(el),
      left: el.style.left,
      top: el.style.top,
      w: el.style.width,
      h: el.style.height,
      rect: el.getBoundingClientRect()
    }));

    return {
      viewport: { w: vp?.offsetWidth, h: vp?.offsetHeight },
      world: world ? {
        style: world.getAttribute('style')
      } : null,
      totalObjects: objects.length,
      objects: objData
    };
  });
  console.log('=== PREVIEW ===');
  console.log(JSON.stringify(previewInfo, null, 2));

  // --- EDITOR ---
  await page.goto(`${BASE}/admin/map-editor`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const editorInfo = await page.evaluate(() => {
    const vp = document.querySelector('.map-editor-viewport');
    const canvas = document.querySelector('.map-editor-canvas');
    // Get the actual positions from react-rnd's inner draggable transforms
    const rnds = document.querySelectorAll('.map-editor-rnd');
    const indices = [0,1,2,3,4,5,50,100,150,200,205,206,207,208];
    const objData = Array.from(rnds).filter((_,i) => indices.includes(i)).map(el => {
      // React-rnd uses inner div with transform: translate(x,y) for position
      const draggable = el.querySelector('.react-draggable');
      const resizable = el.querySelector('.react-resizable');
      return {
        i: Array.from(el.parentNode.children).indexOf(el),
        elStyle: el.getAttribute('style'),
        transform: draggable?.style.transform,
        transformOrigin: draggable?.style.transformOrigin,
        draggableRect: draggable?.getBoundingClientRect(),
        w: el.style.width,
        h: el.style.height,
        rect: el.getBoundingClientRect()
      };
    });

    return {
      viewport: { w: vp?.offsetWidth, h: vp?.offsetHeight },
      canvas: canvas ? { style: canvas.getAttribute('style') } : null,
      totalObjects: rnds.length,
      objects: objData
    };
  });
  console.log('=== EDITOR ===');
  console.log(JSON.stringify(editorInfo, null, 2));

  await browser.close();
})();
