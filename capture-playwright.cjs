const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const TARGET_URL = 'https://exilum.vercel.app/';
  const OUTPUT_DIR = path.join(__dirname, 'exilum');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'assets'), { recursive: true });

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  const apiCalls = [];
  const resourceCalls = [];

  page.on('request', request => {
    const url = request.url();
    resourceCalls.push({
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      headers: request.headers()
    });
    if (url.includes('/api/') || url.includes('/graphql') || url.includes('/rpc') || url.match(/\/v\d+\//)) {
      apiCalls.push({
        url,
        method: request.method(),
        headers: request.headers()
      });
    }
  });

  console.log('Loading page...');
  await page.goto(TARGET_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Extracting HTML...');
  const html = await page.content();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'page.html'), html);
  console.log(`HTML length: ${html.length}`);

  console.log('Extracting scripts...');
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script'))
      .map(s => ({
        src: s.src || null,
        type: s.type || 'text/javascript',
        textContent: s.textContent ? s.textContent.substring(0, 100000) : null
      }));
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'scripts.json'), JSON.stringify(scripts, null, 2));
  console.log(`Found ${scripts.length} script tags`);

  // Extract inline scripts
  for (const script of scripts) {
    if (script.textContent && script.textContent.length > 100) {
      const safeName = script.src ? path.basename(new URL(script.src).pathname) : `inline-${Math.random().toString(36).slice(2, 8)}.js`;
      fs.writeFileSync(path.join(OUTPUT_DIR, safeName), script.textContent);
      console.log(`Saved inline script: ${safeName}`);
    }
  }

  console.log('Extracting CSS...');
  const cssLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(s => s.href);
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'css-links.json'), JSON.stringify(cssLinks, null, 2));
  console.log(`Found ${cssLinks.length} CSS files`);

  // Download CSS files
  for (const cssUrl of cssLinks) {
    try {
      const urlObj = new URL(cssUrl);
      const filename = path.basename(urlObj.pathname) || 'style.css';
      const response = await page.evaluate(async (url) => {
        const res = await fetch(url);
        return await res.text();
      }, cssUrl);
      if (response) {
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), response);
        console.log(`Saved CSS: ${filename} (${response.length} bytes)`);
      }
    } catch (e) {
      console.error(`Failed to fetch CSS ${cssUrl}:`, e.message);
    }
  }

  // Extract computed styles for key elements
  console.log('Extracting computed styles...');
  const computedStyles = await page.evaluate(() => {
    const elements = document.querySelectorAll('body, #viewport, #ui-root, #boot, canvas');
    const styles = {};
    elements.forEach(el => {
      const computed = getComputedStyle(el);
      styles[el.id || el.tagName] = {
        display: computed.display,
        position: computed.position,
        width: computed.width,
        height: computed.height,
        background: computed.background,
        color: computed.color,
        fontFamily: computed.fontFamily,
        overflow: computed.overflow,
        zIndex: computed.zIndex,
        opacity: computed.opacity,
        pointerEvents: computed.pointerEvents
      };
    });
    return styles;
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'computed-styles.json'), JSON.stringify(computedStyles, null, 2));

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot.png'), fullPage: false });

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  // Try to trigger any initialization
  await page.evaluate(() => {
    const bootEl = document.getElementById('boot');
    if (bootEl) {
      bootEl.classList.add('done');
    }
  });

  await page.waitForTimeout(2000);

  // Capture network requests after page load
  await page.evaluate(() => {
    window.dispatchEvent(new Event('click'));
  });

  await page.waitForTimeout(1000);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'api-calls.json'), JSON.stringify(apiCalls, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'resource-calls.json'), JSON.stringify(resourceCalls, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'console-messages.json'), JSON.stringify(consoleMessages, null, 2));

  // Extract page metadata
  const metadata = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || null,
      viewport: document.querySelector('meta[name="viewport"]')?.content || null,
      canvasSize: {
        width: document.getElementById('viewport')?.width || null,
        height: document.getElementById('viewport')?.height || null
      },
      bodyClasses: document.body.className,
      bodyAttrs: Array.from(document.body.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {})
    };
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

  console.log(`\nExtracted:`);
  console.log(`  - ${apiCalls.length} API calls`);
  console.log(`  - ${resourceCalls.length} total resources`);
  console.log(`  - ${cssLinks.length} CSS files`);
  console.log(`  - ${scripts.length} script tags`);
  console.log(`  - Screenshot saved`);
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);

  await browser.close();
})();
