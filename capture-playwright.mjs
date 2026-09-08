import { chromium } from 'playwright';
import fs from 'fs';

const TARGET_URL = 'https://mosswing-quiet-flight.jack-514.chatgpt.site/';
const OUTPUT_DIR = './mosswing-capture';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors', '--ignore-ssl-errors', '--no-sandbox'] });
const page = await browser.newPage();
await page.setExtraHTTPHeaders({ 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' });

const apiCalls = [];
const resources = [];
page.on('request', request => {
  const url = request.url();
  resources.push({ url, type: request.resourceType(), method: request.method() });
  if (url.includes('/api/')) {
    apiCalls.push({ url, method: request.method(), headers: request.headers() });
  }
});

page.on('response', async response => {
  const url = response.url();
  const type = response.headers()['content-type'] || '';
  if (type.includes('javascript') || type.includes('text/html') || type.includes('application/json')) {
    try {
      const body = await response.text();
      fs.appendFileSync(`${OUTPUT_DIR}/responses.log`, `${url}\n${body.substring(0, 2000)}\n---\n`);
    } catch (e) {}
  }
});

await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000, ignoreHTTPSErrors: true });

// Wait for game to potentially initialize
await page.waitForTimeout(3000);

const html = await page.content();
const scripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('script'))
    .map(s => ({ src: s.src, text: (s.textContent || '').substring(0, 500) }));
});

const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link'))
    .map(l => ({ href: l.href, rel: l.rel, type: l.type }));
});

fs.writeFileSync(`${OUTPUT_DIR}/page.html`, html);
fs.writeFileSync(`${OUTPUT_DIR}/scripts.json`, JSON.stringify(scripts, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/links.json`, JSON.stringify(links, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/resources.json`, JSON.stringify(resources, null, 2));

// Screenshots
await page.screenshot({ path: `${OUTPUT_DIR}/screenshot.png`, fullPage: true });

// Check for WebGL canvas
const canvasInfo = await page.evaluate(() => {
  const canvas = document.getElementById('game');
  if (!canvas) return null;
  const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
  return gl ? 'WebGL available' : 'No WebGL';
});
fs.writeFileSync(`${OUTPUT_DIR}/canvas-info.txt`, canvasInfo || 'No canvas');

await browser.close();
console.log(`Extracted ${html.length} bytes of HTML`);
console.log(`Found ${scripts.length} script tags`);
console.log(`Found ${links.length} link tags`);
console.log(`Captured ${apiCalls.length} API calls`);
console.log(`Found ${resources.length} resources`);
console.log(`Output saved to ${OUTPUT_DIR}/`);
