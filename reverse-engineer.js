import { chromium } from 'playwright';
import fs from 'fs';

const TARGET_URL = 'https://apex-club-racing.mauve-ibex-1793.chatgpt.site/';
const OUTPUT_DIR = './apex-club-output';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true, args: ['--ignore-certificate-errors'] });
const page = await browser.newPage();

const apiCalls = [];
const jsFiles = [];

page.on('response', async response => {
  const url = response.url();
  if (url.includes('.js') || url.endsWith('.js')) {
    try {
      const text = await response.text();
      if (text.length > 0 && text.length < 10 * 1024 * 1024) {
        jsFiles.push({ url, length: text.length });
      }
    } catch (e) {
      // skip
    }
  }
});

page.on('request', request => {
  const url = request.url();
  if (url.includes('/api/') || url.includes('api.')) {
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
    .map(s => ({ src: s.src, text: s.textContent ? s.textContent.substring(0, 500) : null }));
});

fs.writeFileSync(`${OUTPUT_DIR}/page.html`, html);
fs.writeFileSync(`${OUTPUT_DIR}/scripts.json`, JSON.stringify(scripts, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/js-files.json`, JSON.stringify(jsFiles, null, 2));

await browser.close();
console.log(`Extracted ${html.length} bytes of HTML`);
console.log(`Found ${scripts.length} script tags`);
console.log(`Captured ${apiCalls.length} API calls`);
console.log(`Found ${jsFiles.length} JS files`);
console.log(`Output saved to ${OUTPUT_DIR}/`);
