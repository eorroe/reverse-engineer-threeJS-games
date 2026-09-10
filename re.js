import { chromium } from 'playwright';
import fs from 'fs';

const TARGET_URL = 'https://doodleshooter.vercel.app/';
const OUTPUT_DIR = './doodleshooter-output';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

const apiCalls = [];
page.on('request', request => {
  const url = request.url();
  if (url.includes('/api/') || url.match(/\/\d{4}\//)) {
    apiCalls.push({
      url,
      method: request.method(),
      headers: request.headers()
    });
  }
});

await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });

const html = await page.content();
const scripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('script'))
    .map(s => ({
      src: s.src || null,
      textContent: s.textContent ? s.textContent.substring(0, 5000) : null,
      type: s.type || 'text/javascript'
    }));
});

const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link')).map(l => ({
    rel: l.rel,
    href: l.href,
    type: l.type
  }));
});

fs.writeFileSync(`${OUTPUT_DIR}/page.html`, html);
fs.writeFileSync(`${OUTPUT_DIR}/scripts.json`, JSON.stringify(scripts, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/links.json`, JSON.stringify(links, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));

await browser.close();
console.log(`Extracted ${html.length} bytes of HTML`);
console.log(`Found ${scripts.length} script tags`);
console.log(`Found ${links.length} link tags`);
console.log(`Captured ${apiCalls.length} API calls`);
console.log(`Output saved to ${OUTPUT_DIR}/`);
