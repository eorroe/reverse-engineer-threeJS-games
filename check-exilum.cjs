const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  await page.goto('https://exilum.vercel.app/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const globals = await page.evaluate(() => {
    const result = {};
    for (const key of Object.getOwnPropertyNames(window)) {
      try {
        const val = window[key];
        if (val && typeof val === 'object' && (val.constructor?.name?.includes('Game') || val.constructor?.name?.includes('App') || val.constructor?.name?.includes('World') || val.constructor?.name?.includes('Player'))) {
          result[key] = val.constructor?.name || typeof val;
        }
      } catch (e) {}
    }
    
    const knownPatterns = ['__game', '__app', '__world', '__player', 'game', 'app', 'world', 'player', 'EXILIUM', 'exilum'];
    for (const pattern of knownPatterns) {
      if (window[pattern]) {
        result[pattern] = typeof window[pattern];
      }
    }
    
    return result;
  });
  
  console.log('Global game objects:', JSON.stringify(globals, null, 2));
  
  const allKeys = await page.evaluate(() => {
    const keys = [];
    for (const key of Object.getOwnPropertyNames(window)) {
      keys.push(key);
    }
    return keys.filter(k => k.length > 2 && k.length < 50);
  });
  
  fs.writeFileSync('/workspace/0a976afa-9d91-494d-85d2-5832b5541cb3/sessions/agent_62030cec-215d-4ac8-8a5f-54e15780ec86/exilum/globals.json', JSON.stringify({ globals, allKeys: allKeys.slice(0, 200) }, null, 2));
  console.log('Saved globals.json');
  
  await browser.close();
})();
