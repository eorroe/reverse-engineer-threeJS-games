import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://dream-loop-demo.anshu.dev/';
const OUTPUT_DIR = path.join(process.cwd(), 're-output');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

const apiCalls = [];
const assets = [];

page.on('request', request => {
  const url = request.url();
  assets.push({
    url,
    method: request.method(),
    resourceType: request.resourceType(),
    headers: request.headers()
  });
  if (url.includes('/api/') || url.includes('graphql') || url.includes('rpc')) {
    apiCalls.push({
      url,
      method: request.method(),
      headers: request.headers()
    });
  }
});

page.on('response', async response => {
  const url = response.url();
  const ct = response.headers()['content-type'] || '';
  if (ct.includes('javascript') || ct.includes('text/html') || ct.includes('application/json')) {
    try {
      const body = await response.text();
      const fname = path.basename(new URL(url).pathname) || 'index';
      fs.writeFileSync(path.join(OUTPUT_DIR, `resp_${fname}`), body);
    } catch (e) {}
  }
});

await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

await page.waitForTimeout(5000);

const html = await page.content();
fs.writeFileSync(path.join(OUTPUT_DIR, 'page.html'), html);

try {
  const screenshot = await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot.png'), fullPage: true, timeout: 10000 });
} catch (e) {
  console.error('Screenshot failed:', e.message);
}

const scripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('script'))
    .map(s => ({ src: s.src, type: s.type, text: s.textContent ? s.textContent.substring(0, 500) : null }));
});

fs.writeFileSync(path.join(OUTPUT_DIR, 'scripts.json'), JSON.stringify(scripts, null, 2));
fs.writeFileSync(path.join(OUTPUT_DIR, 'api-calls.json'), JSON.stringify(apiCalls, null, 2));
fs.writeFileSync(path.join(OUTPUT_DIR, 'assets.json'), JSON.stringify(assets, null, 2));

const meta = await page.evaluate(() => {
  const m = {};
  document.querySelectorAll('meta').forEach(el => {
    const k = el.getAttribute('name') || el.getAttribute('property');
    if (k) m[k] = el.getAttribute('content');
  });
  return m;
});
fs.writeFileSync(path.join(OUTPUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

const canvasInfo = await page.evaluate(() => {
  const c = document.getElementById('scene');
  return {
    id: c ? c.id : null,
    width: c ? c.width : null,
    height: c ? c.height : null,
    parent: c ? c.parentElement?.tagName : null
  };
});
fs.writeFileSync(path.join(OUTPUT_DIR, 'canvas-info.json'), JSON.stringify(canvasInfo, null, 2));

await browser.close();
console.log('Done. Output in', OUTPUT_DIR);
