import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://smashroyale.io/';
const OUTPUT_DIR = './smashroyale-output';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

const apiCalls = [];
page.on('request', request => {
  const url = request.url();
  if (url.includes('/api/') || url.includes('api.') || url.match(/\/v\d+\//)) {
    apiCalls.push({
      url: url,
      method: request.method(),
      headers: request.headers()
    });
  }
});

page.on('response', async response => {
  const url = response.url();
  if (url.includes('/api/') || url.includes('api.') || url.match(/\/v\d+\//)) {
    try {
      const body = await response.text();
      apiCalls.push({
        url: url,
        status: response.status(),
        bodySnippet: body.substring(0, 500)
      });
    } catch (e) {
      // ignore
    }
  }
});

console.log('Navigating to', TARGET_URL);
await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });

await page.waitForTimeout(3000);

const html = await page.content();
const scripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('script'))
    .map(s => ({
      src: s.src || null,
      text: s.textContent ? s.textContent.substring(0, 2000) : null
    }));
});

const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link')).map(l => ({
    rel: l.rel,
    href: l.href
  }));
});

const meta = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('meta')).map(m => ({
    name: m.name || m.property,
    content: m.content
  }));
});

fs.writeFileSync(`${OUTPUT_DIR}/page.html`, html);
fs.writeFileSync(`${OUTPUT_DIR}/scripts.json`, JSON.stringify(scripts, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/links.json`, JSON.stringify(links, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/meta.json`, JSON.stringify(meta, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));

await page.screenshot({ path: `${OUTPUT_DIR}/page.png`, fullPage: true });

console.log('Extracted', html.length, 'bytes of HTML');
console.log('Found', scripts.length, 'script tags');
console.log('Found', links.length, 'link tags');
console.log('Found', meta.length, 'meta tags');
console.log('Captured', apiCalls.length, 'API-related calls');
console.log('Output saved to', OUTPUT_DIR);

await browser.close();
