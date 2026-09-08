import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'reverse-output');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('https://kjlkurt.github.io/waterslide-game-astra/', { waitUntil: 'networkidle', timeout: 120000 });

const html = await page.content();
fs.writeFileSync(path.join(outDir, 'rendered.html'), html);

const screenshot = await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });

const assets = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent);
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(s => s.href);
  const modules = Array.from(document.querySelectorAll('link[rel="modulepreload"]')).map(s => s.href);
  return { scripts, styles, modules };
});
fs.writeFileSync(path.join(outDir, 'asset-map.json'), JSON.stringify(assets, null, 2));

console.log('Done. HTML length:', html.length);
await browser.close();
