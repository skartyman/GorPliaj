const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://gorpliaj.pp.ua';
const EMAIL = 'admin@gorpliaj.local';
const PASSWORD = 'GpOdessaPLIAJ';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  // Login
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard');
  console.log('Logged in, URL:', page.url());

  // Visit map preview
  await page.goto(`${BASE}/admin/map`, { waitUntil: 'networkidle' });
  console.log('Preview URL after nav:', page.url());

  // Check if redirected
  if (!page.url().includes('/admin/map')) {
    console.log('PREVIEW REDIRECTED to:', page.url());
  }

  // Wait for map to render
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'preview3.png', fullPage: true });

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
      currentUrl: window.location.href,
      shell: shell?.getBoundingClientRect(),
      viewport: vp?.getBoundingClientRect(),
      world: world ? {
        style: world.getAttribute('style'),
        rect: world.getBoundingClientRect()
      } : null,
      totalObjects: objects.length,
      objects: objData
    };
  });
  console.log('=== PREVIEW ===');
  console.log(JSON.stringify(previewInfo, null, 2));

  // Now check editor
  await page.goto(`${BASE}/admin/map-editor`, { waitUntil: 'networkidle' });
  console.log('Editor URL after nav:', page.url());
  if (!page.url().includes('/admin/map-editor')) {
    console.log('EDITOR REDIRECTED to:', page.url());
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'editor3.png', fullPage: true });

  const editorInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.map-editor-canvas');
    const shell = document.querySelector('.map-editor-v2');
    const viewport = document.querySelector('.map-editor-viewport');
    const container = document.querySelector('.map-editor-canvas-container');

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
      currentUrl: window.location.href,
      shell: shell?.getBoundingClientRect(),
      viewport: viewport?.getBoundingClientRect(),
      container: container?.getBoundingClientRect(),
      canvas: canvas ? {
        style: canvas.getAttribute('style'),
        rect: canvas.getBoundingClientRect()
      } : null,
      totalRnds: rnds.length,
      objects
    };
  });
  console.log('=== EDITOR ===');
  console.log(JSON.stringify(editorInfo, null, 2));

  await browser.close();
})();
