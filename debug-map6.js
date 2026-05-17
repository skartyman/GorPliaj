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

  // Check page LAYOUT structure for both pages
  const results = {};

  // Preview layout
  await page.goto(`${BASE}/admin/map`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  results.previewLayout = await page.evaluate(() => ({
    window: { w: window.innerWidth, h: window.innerHeight },
    viewport: document.querySelector('.interactive-map-viewport')?.getBoundingClientRect(),
    shell: document.querySelector('.interactive-map-shell')?.getBoundingClientRect(),
    allChildren: Array.from(document.body.children).map(el => ({
      tag: el.tagName,
      id: el.id,
      cls: el.className?.toString()?.substring(0, 80),
      rect: el.getBoundingClientRect()
    })),
    // Find sidebar / nav elements
    sidebars: Array.from(document.querySelectorAll('aside, nav, .sidebar, .admin-sidebar, [class*=sidebar], [class*=nav-], [class*=Nav]')).map(el => ({
      tag: el.tagName,
      id: el.id,
      cls: el.className?.toString()?.substring(0, 80),
      rect: el.getBoundingClientRect()
    }))
  }));

  // Editor layout
  await page.goto(`${BASE}/admin/map-editor`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  results.editorLayout = await page.evaluate(() => ({
    window: { w: window.innerWidth, h: window.innerHeight },
    viewport: document.querySelector('.map-editor-viewport')?.getBoundingClientRect(),
    shell: document.querySelector('.map-editor-v2')?.getBoundingClientRect(),
    allChildren: Array.from(document.body.children).map(el => ({
      tag: el.tagName,
      id: el.id,
      cls: el.className?.toString()?.substring(0, 80),
      rect: el.getBoundingClientRect()
    })),
    sidebars: Array.from(document.querySelectorAll('aside, nav, .sidebar, .admin-sidebar, [class*=sidebar], [class*=nav-], [class*=Nav]')).map(el => ({
      tag: el.tagName,
      id: el.id,
      cls: el.className?.toString()?.substring(0, 80),
      rect: el.getBoundingClientRect()
    }))
  }));

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
