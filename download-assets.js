import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const OUTPUT_DIR = './apex-club-output';
const BASE_URL = 'https://apex-club-racing.mauve-ibex-1793.chatgpt.site';

const jsFiles = JSON.parse(fs.readFileSync(`${OUTPUT_DIR}/js-files.json`, 'utf8'));

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadAll() {
  for (const file of jsFiles) {
    try {
      const content = await fetch(file.url);
      const relative = file.url.replace(BASE_URL + '/', '');
      const outPath = path.join(OUTPUT_DIR, 'downloaded', relative);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content);
      console.log(`Downloaded: ${relative} (${content.length} bytes)`);
    } catch (e) {
      console.error(`Failed: ${file.url}`, e.message);
    }
  }
}

downloadAll();
