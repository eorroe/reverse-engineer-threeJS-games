import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const GAMES_DIR = '/tmp/bench-portal/games';
const OUTPUT_DIR = './reverse-engineering-output';
const GAMES = fs.readdirSync(GAMES_DIR).filter(d => fs.statSync(path.join(GAMES_DIR, d)).isDirectory());

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function extractGame(gameName) {
  const gameDir = path.join(GAMES_DIR, gameName);
  const indexPath = path.join(gameDir, 'index.html');
  const outputDir = path.join(OUTPUT_DIR, gameName);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n=== Extracting ${gameName} ===`);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      headers: request.headers()
    });
  });

  // Capture errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  try {
    await page.goto(`file://${indexPath}`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for game to initialize
    await page.waitForTimeout(3000);

    // Extract HTML
    const html = await page.content();
    fs.writeFileSync(path.join(outputDir, 'page.html'), html);

    // Extract all scripts
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script'))
        .map(s => ({
          src: s.src || null,
          text: s.textContent || null,
          id: s.id || null,
          type: s.type || null
        }));
    });
    fs.writeFileSync(path.join(outputDir, 'scripts.json'), JSON.stringify(scripts, null, 2));

    // Extract computed styles for key elements
    const computedStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('body, canvas, #app, #game, .game-container, .hud, .menu');
      const styles = {};
      elements.forEach(el => {
        const id = el.id || el.className || el.tagName.toLowerCase();
        styles[id] = {
          display: getComputedStyle(el).display,
          position: getComputedStyle(el).position,
          width: getComputedStyle(el).width,
          height: getComputedStyle(el).height,
          backgroundColor: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
          fontFamily: getComputedStyle(el).fontFamily,
          zIndex: getComputedStyle(el).zIndex,
          overflow: getComputedStyle(el).overflow,
          visibility: getComputedStyle(el).visibility
        };
      });
      return styles;
    });
    fs.writeFileSync(path.join(outputDir, 'computed-styles.json'), JSON.stringify(computedStyles, null, 2));

    // Extract WebGL info
    const webglInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        canvasSize: { width: canvas.width, height: canvas.height },
        webglVersion: gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1',
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        extensions: gl.getSupportedExtensions() || []
      };
    });
    fs.writeFileSync(path.join(outputDir, 'webgl-info.json'), JSON.stringify(webglInfo, null, 2));

    // Extract exposed globals
    const exposedGlobals = await page.evaluate(() => {
      const globals = {};
      for (const key of Object.keys(window)) {
        if (key.startsWith('_') || key === 'game' || key === 'Game' || key === 'app' || key === 'App') {
          try {
            const value = window[key];
            globals[key] = {
              type: typeof value,
              constructor: value?.constructor?.name || null,
              keys: value && typeof value === 'object' ? Object.keys(value).slice(0, 20) : null
            };
          } catch (e) {
            globals[key] = { error: e.message };
          }
        }
      }
      return globals;
    });
    fs.writeFileSync(path.join(outputDir, 'exposed-globals.json'), JSON.stringify(exposedGlobals, null, 2));

    // Extract game state if accessible
    const gameState = await page.evaluate(() => {
      const state = {};
      // Try common game state objects
      const candidates = ['game', 'Game', 'app', 'App', 'state', 'State', '__game', '_game'];
      for (const key of candidates) {
        if (window[key] && typeof window[key] === 'object') {
          state[key] = {
            keys: Object.keys(window[key]),
            sample: JSON.stringify(window[key]).slice(0, 1000)
          };
        }
      }
      return state;
    });
    fs.writeFileSync(path.join(outputDir, 'game-state.json'), JSON.stringify(gameState, null, 2));

    // Extract all links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link')).map(l => ({
        rel: l.rel,
        href: l.href,
        type: l.type,
        media: l.media
      }));
    });
    fs.writeFileSync(path.join(outputDir, 'links.json'), JSON.stringify(links, null, 2));

    // Extract body text
    const bodyText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(outputDir, 'body-text.txt'), bodyText);

    // Take screenshot
    await page.screenshot({ path: path.join(outputDir, 'screenshot.png'), fullPage: false });

    // Network requests summary
    const uniqueDomains = [...new Set(networkRequests.map(r => new URL(r.url).hostname))];
    fs.writeFileSync(path.join(outputDir, 'network-summary.json'), JSON.stringify({
      totalRequests: networkRequests.length,
      uniqueDomains: uniqueDomains,
      requestsByType: networkRequests.reduce((acc, r) => {
        acc[r.resourceType] = (acc[r.resourceType] || 0) + 1;
        return acc;
      }, {})
    }, null, 2));

    console.log(`  ✓ Extracted ${html.length} bytes HTML`);
    console.log(`  ✓ Found ${scripts.length} script tags`);
    console.log(`  ✓ ${networkRequests.length} network requests`);
    console.log(`  ✓ ${consoleLogs.length} console logs`);
    console.log(`  ✓ ${pageErrors.length} page errors`);
    console.log(`  ✓ WebGL: ${webglInfo?.webglVersion || 'none'}`);
    console.log(`  ✓ Saved to ${outputDir}`);

  } catch (error) {
    console.error(`  ✗ Error extracting ${gameName}: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Run extraction for all games
console.log(`Starting extraction of ${GAMES.length} games...`);
for (const game of GAMES) {
  await extractGame(game);
}
console.log('\n✓ Extraction complete!');
