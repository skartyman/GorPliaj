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

  // --- COMPARE object 4 (a small table at 1602, 830) between both pages ---
  const results = {};

  // Preview
  await page.goto(`${BASE}/admin/map`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  results.preview = await page.evaluate(() => {
    const objects = document.querySelectorAll('.interactive-map-object');
    const obj4 = objects[4]; // small table at ~1602,830
    if (!obj4) return 'no objects';
    const cs = getComputedStyle(obj4);
    return {
      left: obj4.style.left,
      top: obj4.style.top,
      w: obj4.style.width,
      h: obj4.style.height,
      rect: obj4.getBoundingClientRect(),
      computed: {
        border: cs.border,
        borderLeft: cs.borderLeft,
        boxShadow: cs.boxShadow,
        outline: cs.outline,
        position: cs.position,
        display: cs.display,
        background: cs.background,
        margin: cs.margin,
        padding: cs.padding,
        opacity: cs.opacity,
        transform: cs.transform,
        zIndex: cs.zIndex,
        overflow: cs.overflow,
        borderRadius: cs.borderRadius,
        width: cs.width,
        height: cs.height
      }
    };
  });

  // Editor
  await page.goto(`${BASE}/admin/map-editor`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  results.editor = await page.evaluate(() => {
    const rnds = document.querySelectorAll('.map-editor-rnd');
    const obj4 = rnds[4]; // small table at transform(1602px, 830px)
    if (!obj4) return 'no objects';
    const cs = getComputedStyle(obj4);
    // Also get inner elements
    const draggable = obj4.querySelector('.react-draggable');
    const resizable = obj4.querySelector('.react-resizable');
    const rndCs = draggable ? getComputedStyle(draggable) : null;
    return {
      style: obj4.getAttribute('style'),
      draggableStyle: draggable?.getAttribute('style'),
      rect: obj4.getBoundingClientRect(),
      computed: {
        border: cs.border,
        borderLeft: cs.borderLeft,
        boxShadow: cs.boxShadow,
        outline: cs.outline,
        position: cs.position,
        display: cs.display,
        background: cs.background,
        margin: cs.margin,
        padding: cs.padding,
        opacity: cs.opacity,
        transform: cs.transform,
        zIndex: cs.zIndex,
        overflow: cs.overflow,
        borderRadius: cs.borderRadius,
        width: cs.width,
        height: cs.height
      },
      draggableComputed: rndCs ? {
        transform: rndCs.transform,
        width: rndCs.width,
        height: rndCs.height,
        position: rndCs.position,
        left: rndCs.left,
        top: rndCs.top
      } : null
    };
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
