const { chromium } = require('playwright');

const BASE = 'https://gorpliaj.pp.ua';
const EMAIL = 'admin@gorpliaj.local';
const PASSWORD = 'GpOdessaPLIAJ';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard');

  // Visit map-editor
  await page.goto(`${BASE}/admin/map-editor`);
  await page.waitForTimeout(3000);

  const editorInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.map-editor-canvas');
    const canvasStyle = canvas?.getAttribute('style');
    const shell = document.querySelector('.map-editor-v2');
    const viewport = document.querySelector('.map-editor-viewport');
    const container = document.querySelector('.map-editor-canvas-container');

    // Get first few RND objects
    const rnds = document.querySelectorAll('.map-editor-rnd');
    const objects = Array.from(rnds).slice(0, 10).map((el, i) => ({
      i,
      left: el.style.left,
      top: el.style.top,
      w: el.style.width,
      h: el.style.height,
      rect: el.getBoundingClientRect()
    }));

    return {
      shell: shell?.getBoundingClientRect(),
      viewport: viewport?.getBoundingClientRect(),
      container: container?.getBoundingClientRect(),
      canvas: {
        style: canvasStyle,
        rect: canvas?.getBoundingClientRect()
      },
      totalRnds: rnds.length,
      objects
    };
  });
  console.log('=== EDITOR ===');
  console.log(JSON.stringify(editorInfo, null, 2));

  // Visit map preview
  await page.goto(`${BASE}/admin/map`);
  await page.waitForTimeout(3000);

  const previewInfo = await page.evaluate(() => {
    const vp = document.querySelector('.interactive-map-viewport');
    const world = document.querySelector('.interactive-map-world');
    const bg = document.querySelector('.interactive-map-background');
    const shell = document.querySelector('.interactive-map-shell');

    const objects = document.querySelectorAll('.interactive-map-object, .interactive-map-table');
    const objData = Array.from(objects).slice(0, 10).map((el, i) => ({
      i,
      cls: el.className,
      left: el.style.left,
      top: el.style.top,
      w: el.style.width,
      h: el.style.height,
      rect: el.getBoundingClientRect()
    }));

    return {
      shell: shell?.getBoundingClientRect(),
      viewport: vp?.getBoundingClientRect(),
      world: {
        style: world?.getAttribute('style'),
        rect: world?.getBoundingClientRect()
      },
      totalObjects: objects.length,
      objects: objData
    };
  });
  console.log('=== PREVIEW ===');
  console.log(JSON.stringify(previewInfo, null, 2));

  await browser.close();
})();
