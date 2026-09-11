import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://attack-on-titan-jet.vercel.app/';
const OUTPUT_DIR = '/workspace/0a976afa-9d91-494d-85d2-5832b5541cb3/sessions/agent_555e133b-86a8-4e6b-8eaa-c864ba81275e/output-re';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    ignoreDefaultArgs: ['--headless=new'],
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const apiCalls = [];
  page.on('request', request => {
    const url = request.url();
    if (/\/api\/|\/graphql|\/rpc|\/rest|\/_next\/data/.test(url)) {
      apiCalls.push({
        url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() || null,
      });
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (/\/api\/|\/graphql|\/rpc|\/rest|\/_next\/data/.test(url)) {
      try {
        const json = await response.json();
        apiCalls.push({
          url,
          status: response.status(),
          responseBody: json,
        });
      } catch (e) {
        apiCalls.push({
          url,
          status: response.status(),
          responseText: await response.text().catch(() => '[binary]'),
        });
      }
    }
  });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });

  const html = await page.content();
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src || null,
      text: s.textContent ? s.textContent.slice(0, 5000) : null,
    }));
  });

  const inlineScripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent);
  });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: a.textContent?.trim().slice(0, 200) || null,
    }));
  });

  const title = await page.title();
  const screenshot = await page.screenshot({ path: path.join(OUTPUT_DIR, 'page.png'), fullPage: true });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'page.html'), html);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'title.txt'), title);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'scripts.json'), JSON.stringify(scripts, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'inline-scripts.js'), inlineScripts.join('\n\n/* --- SCRIPT SEPARATOR --- */\n\n'));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'links.json'), JSON.stringify(links, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'api-calls.json'), JSON.stringify(apiCalls, null, 2));

  await browser.close();
  console.log('Title:', title);
  console.log('HTML length:', html.length);
  console.log('Script tags:', scripts.length);
  console.log('Inline scripts:', inlineScripts.length);
  console.log('Links:', links.length);
  console.log('API calls captured:', apiCalls.length);
  console.log('Output saved to', OUTPUT_DIR);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
