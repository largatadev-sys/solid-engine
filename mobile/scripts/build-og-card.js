const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { chromium } = require('playwright');
const { CARD, cardMarkup } = require('./ogCard');

const OUTPUT = join(__dirname, '..', 'assets', CARD.file);

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: CARD.width, height: CARD.height },
      deviceScaleFactor: 1,
    });

    await page.setContent(cardMarkup(), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const png = await page.screenshot({ type: 'png' });
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, png);

    console.log(`wrote ${OUTPUT} (${CARD.width}x${CARD.height}, ${png.length} bytes)`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
