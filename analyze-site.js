import { chromium } from 'playwright';
import fs from 'fs';

const TARGET_URL = process.argv[2] || 'https://www.paperroute.lol/';
const OUTPUT_DIR = process.argv[3] || './output';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
const page = await browser.newPage({ ignoreHTTPSErrors: true });

const apiCalls = [];
page.on('request', request => {
  apiCalls.push({
    url: request.url(),
    method: request.method(),
    resourceType: request.resourceType(),
  });
});

const responses = [];
page.on('response', async response => {
  if (response.status() >= 400) {
    responses.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'],
    });
  }
});

try {
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
} catch (e) {
  console.error('Primary URL failed, trying fallback...', e.message);
  await page.goto(TARGET_URL.replace('https://www.', 'https://'), { waitUntil: 'networkidle', timeout: 60000 });
}

const html = await page.content();
const scripts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('script'))
    .map(s => ({ src: s.src, content: s.textContent ? s.textContent.substring(0, 5000) : null }));
});

const stylesheets = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(s => ({ href: s.href }));
});

const frameworks = await page.evaluate(() => {
  const detect = () => {
    const frameworks = [];
    if (window.__NEXT_DATA__) frameworks.push('Next.js');
    if (window.__NUXT__) frameworks.push('Nuxt.js');
    if (window._reactRootContainer) frameworks.push('React');
    if (document.querySelector('[data-reactroot]')) frameworks.push('React');
    if (document.querySelector('[data-v-]')) frameworks.push('Vue');
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) frameworks.push('Vue');
    if (window.gsap) frameworks.push('GSAP');
    if (window.Phaser) frameworks.push('Phaser');
    if (window.BABYLON) frameworks.push('Babylon.js');
    if (window.THREE) frameworks.push('Three.js');
    if (window.matter) frameworks.push('Matter.js');
    if (window.pixi) frameworks.push('PixiJS');
    return frameworks;
  };
  return detect();
});

fs.writeFileSync(`${OUTPUT_DIR}/page.html`, html);
fs.writeFileSync(`${OUTPUT_DIR}/scripts.json`, JSON.stringify(scripts, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/stylesheets.json`, JSON.stringify(stylesheets, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/responses.json`, JSON.stringify(responses, null, 2));
fs.writeFileSync(`${OUTPUT_DIR}/frameworks.json`, JSON.stringify(frameworks, null, 2));

const screenshotPath = `${OUTPUT_DIR}/screenshot.png`;
await page.screenshot({ path: screenshotPath, fullPage: true });

await browser.close();
console.log(`HTML length: ${html.length}`);
console.log(`Scripts found: ${scripts.length}`);
console.log(`Stylesheets found: ${stylesheets.length}`);
console.log(`API calls captured: ${apiCalls.length}`);
console.log(`Framework detection: ${frameworks.join(', ')}`);
console.log(`Output saved to ${OUTPUT_DIR}/`);
