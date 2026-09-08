import { chromium } from 'playwright';
import fs from 'fs';

const TARGET_URL = process.argv[2] || 'https://exilum.vercel.app/';
const OUTPUT_DIR = process.argv[3] || './exilum-output';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

const apiCalls = [];
page.on('request', request => {
  apiCalls.push({
    url: request.url(),
    method: request.method(),
    headers: request.headers()
  });
});

page.on('response', async response => {
  const url = response.url();
  if (url.includes('/api/') || url.match(/\.(json|xml)(\?.*)?$/)) {
    try {
      const body = await response.text();
      apiCalls.push({
        url,
        status: response.status(),
        contentType: response.headers()['content-type'],
        body: body.slice(0, 2000)
      });
    } catch (e) {
      // ignore
    }
  }
});

console.log(`Navigating to ${TARGET_URL}...`);
await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000, ignoreHTTPSErrors: true });

const html = await page.content();
const scripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('script'))
    .map(s => s.src || s.textContent);
});

const stylesheets = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(s => s.href);
});

const metaTags = await page.evaluate(() => {
  const meta = {};
  document.querySelectorAll('meta').forEach(m => {
    if (m.name) meta[m.name] = m.content;
    if (m.property) meta[m.property] = m.content;
  });
  return meta;
});

const pageInfo = await page.evaluate(() => ({
  title: document.title,
  url: location.href
}));

fs.writeFileSync(`${OUTPUT_DIR}/page.html`, html);
fs.writeFileSync(`${OUTPUT_DIR}/scripts.json`, JSON.stringify(scripts, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/stylesheets.json`, JSON.stringify(stylesheets, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/meta.json`, JSON.stringify({ ...pageInfo, metaTags }, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));

await browser.close();
console.log(`Done!`);
console.log(`  HTML length: ${html.length} bytes`);
console.log(`  Script tags: ${scripts.length}`);
console.log(`  Stylesheets: ${stylesheets.length}`);
console.log(`  API calls: ${apiCalls.length}`);
console.log(`  Output saved to ${OUTPUT_DIR}/`);
