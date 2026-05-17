const { chromium } = require('playwright');

const BASE = 'https://gorpliaj.pp.ua';
const EMAIL = 'admin@gorpliaj.local';
const PASSWORD = 'GpOdessaPLIAJ';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Current URL:', page.url());

  // Visit map-editor
  console.log('\n=== MAP EDITOR ===');
  await page.goto(`${BASE}/admin/map-editor`);
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());

  const editorHTML = await page.evaluate(() => document.querySelector('.map-editor-canvas')?.innerHTML?.length || 'no canvas');
  console.log('Canvas content length:', editorHTML);

  const editorObjects = await page.evaluate(() => {
    const rnds = document.querySelectorAll('.map-editor-rnd');
    console.log('Found RNDs:', rnds.length);
    return Array.from(rnds).map((el, i) => {
      const rect = el.getBoundingClientRect();
      return {
        i,
        x: el.style.left,
        y: el.style.top,
        w: el.style.width,
        h: el.style.height,
        rect: { l: rect.left, t: rect.top, w: rect.width, h: rect.height }
      };
    });
  });
  console.log('Editor objects:', JSON.stringify(editorObjects, null, 2));

  await page.screenshot({ path: 'editor.png', fullPage: false });

  // Visit map preview
  console.log('\n=== MAP PREVIEW ===');
  await page.goto(`${BASE}/admin/map`);
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());

  const previewHTML = await page.evaluate(() => document.querySelector('.interactive-map-world')?.innerHTML?.length || 'no world');
  console.log('World content length:', previewHTML);

  const transform = await page.evaluate(() => {
    const world = document.querySelector('.interactive-map-world');
    const vp = document.querySelector('.interactive-map-viewport');
    return {
      worldStyle: world?.getAttribute('style'),
      vpStyle: vp?.getAttribute('style'),
      vpRect: vp?.getBoundingClientRect(),
      worldRect: world?.getBoundingClientRect()
    };
  });
  console.log('Transform:', JSON.stringify(transform, null, 2));

  const previewObjects = await page.evaluate(() => {
    const els = document.querySelectorAll('.interactive-map-object, .interactive-map-table');
    console.log('Found objects:', els.length);
    return Array.from(els).map((el, i) => {
      const rect = el.getBoundingClientRect();
      return {
        i,
        cls: el.className,
        left: el.style.left,
        top: el.style.top,
        w: el.style.width,
        h: el.style.height,
        rect: { l: rect.left, t: rect.top, w: rect.width, h: rect.height }
      };
    });
  });
  console.log('Preview objects:', JSON.stringify(previewObjects, null, 2));

  await page.screenshot({ path: 'preview.png', fullPage: false });

  await browser.close();
  console.log('\nDone. Screenshots: editor.png, preview.png');
})();
