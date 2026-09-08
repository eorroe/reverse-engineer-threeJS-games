import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET = 'https://squall01337.github.io/savannah/';
const OUT = './savannah-runtime-capture';

fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage({ viewport: { width: 1920, height: 1080 } });
  
  // Capture all network requests
  const requests = [];
  const responses = [];
  
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('.js') && !url.includes('.css')) {
      requests.push({
        url,
        method: req.method(),
        resourceType: req.resourceType(),
        headers: req.headers()
      });
    }
  });
  
  page.on('response', async res => {
    const url = res.url();
    const ct = res.headers()['content-type'];
    if (ct && !ct.includes('javascript') && !ct.includes('css')) {
      try {
        const body = await res.text().catch(() => null);
        if (body && body.length < 100000) {
          responses.push({ url, status: res.status(), contentType: ct, body });
        }
      } catch {}
    }
  });
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  
  // Navigate and wait for network idle
  console.log('Navigating to', TARGET);
  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 120000 });
  
  // Wait for game to load (up to 2 minutes)
  console.log('Waiting for game to load...');
  try {
    await page.waitForSelector('#enter:not([disabled])', { timeout: 120000 });
    console.log('Game loaded!');
  } catch (e) {
    console.log('Game did not finish loading in time:', e.message);
  }
  
  // Take screenshot of loading/menu state
  await page.screenshot({ path: path.join(OUT, '01-menu.png'), fullPage: false });
  
  // Get final HTML
  const html = await page.content();
  fs.writeFileSync(path.join(OUT, '02-final-dom.html'), html);
  
  // Extract all script tags and their src/content
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      type: s.type,
      text: s.textContent?.substring(0, 200) || null
    }));
  });
  fs.writeFileSync(path.join(OUT, '03-scripts.json'), JSON.stringify(scripts, null, 2));
  
  // Extract all link tags (CSS, preload)
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link')).map(l => ({
      rel: l.rel,
      href: l.href,
      type: l.type,
      media: l.media
    }));
  });
  fs.writeFileSync(path.join(OUT, '04-links.json'), JSON.stringify(links, null, 2));
  
  // Get all text content from body
  const bodyText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUT, '05-body-text.txt'), bodyText);
  
  // Check for WebGL support
  const webglInfo = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        webgl2: !!canvas.getContext('webgl2'),
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
      };
    } catch (e) {
      return { error: e.message };
    }
  });
  fs.writeFileSync(path.join(OUT, '06-webgl-info.json'), JSON.stringify(webglInfo, null, 2));
  
  // Save network requests
  fs.writeFileSync(path.join(OUT, '07-requests.json'), JSON.stringify(requests, null, 2));
  
  // Save console logs
  fs.writeFileSync(path.join(OUT, '08-console-logs.json'), JSON.stringify(consoleLogs, null, 2));
  
  // Try to access game object if available
  const gameState = await page.evaluate(() => {
    return {
      hasWindowGame: typeof window.__game !== 'undefined',
      hasWindowSavana: typeof window.__savana !== 'undefined',
      gameKeys: typeof window.__game !== 'undefined' ? Object.keys(window.__game) : [],
      savanaKeys: typeof window.__savana !== 'undefined' ? Object.keys(window.__savana) : []
    };
  });
  fs.writeFileSync(path.join(OUT, '09-game-state.json'), JSON.stringify(gameState, null, 2));
  
  await browser.close();
  console.log('Capture complete. Files saved to', OUT);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
