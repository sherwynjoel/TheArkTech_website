import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const urls = [
  { url: 'https://harsjewellery.in', name: 'harsjewellery.png' },
  { url: 'https://zetraelectronics.com', name: 'zetraelectronics.png' },
  { url: 'https://www.opalmediaproductions.com/', name: 'opalmediaproductions.png' },
  { url: 'https://dralamdermcentre.com/', name: 'dralamdermcentre.png' },
  { url: 'https://learnmoreprojects.in/', name: 'learnmoreprojects.png' },
  { url: 'https://axisupgraders.com/', name: 'axisupgraders.png' },
  { url: 'https://devaseafood.com/', name: 'devaseafood.png' },
  { url: 'https://southerngoc.com/', name: 'southerngoc.png' },
  { url: 'https://fdsports.in/', name: 'fdsports.png' },
  { url: 'https://www.gracedentalcarekovai.com/', name: 'gracedentalcarekovai.png' }
];

const dir = path.join(process.cwd(), 'public', 'portfolio');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const item of urls) {
    console.log(`Capturing ${item.url}...`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000)); // wait extra 2s for animations
      await page.screenshot({ path: path.join(dir, item.name), clip: { x: 0, y: 0, width: 1280, height: 800 } });
      await page.close();
      console.log(`Saved ${item.name}`);
    } catch (err) {
      console.error(`Error capturing ${item.url}:`, err.message);
    }
  }
  await browser.close();
  console.log("Done capturing all screenshots.");
})();
