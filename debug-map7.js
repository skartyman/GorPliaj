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

  // Preview world CSS details
  await page.goto(`${BASE}/admin/map`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const previewCSS = await page.evaluate(() => {
    const world = document.querySelector('.interactive-map-world');
    const vp = document.querySelector('.interactive-map-viewport');
    if (!world) return null;
    const cs = getComputedStyle(world);
    return {
      worldStyle: world.getAttribute('style'),
      worldRect: world.getBoundingClientRect(),
      computed: {
        transformOrigin: cs.transformOrigin,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        left: cs.left,
        top: cs.top
      },
      vpRect: vp?.getBoundingClientRect(),
      vpComputed: vp ? {
        transformOrigin: getComputedStyle(vp).transformOrigin,
        display: getComputedStyle(vp).display
      } : null
    };
  });

  console.log('=== PREVIEW WORLD CSS ===');
  console.log(JSON.stringify(previewCSS, null, 2));

  // Editor canvas CSS for comparison
  await page.goto(`${BASE}/admin/map-editor`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const editorCSS = await page.evaluate(() => {
    const canvas = document.querySelector('.map-editor-canvas');
    const vp = document.querySelector('.map-editor-viewport');
    if (!canvas) return null;
    const cs = getComputedStyle(canvas);
    return {
      canvasStyle: canvas.getAttribute('style'),
      canvasRect: canvas.getBoundingClientRect(),
      computed: {
        transformOrigin: cs.transformOrigin,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        left: cs.left,
        top: cs.top
      },
      vpRect: vp?.getBoundingClientRect(),
      vpComputed: vp ? {
        transformOrigin: getComputedStyle(vp).transformOrigin,
        display: getComputedStyle(vp).display
      } : null
    };
  });

  console.log('=== EDITOR CANVAS CSS ===');
  console.log(JSON.stringify(editorCSS, null, 2));

  await browser.close();
})();
