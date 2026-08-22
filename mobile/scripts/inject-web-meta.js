const { copyFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { CARD, metaTagsFor } = require('./ogCard');

const MARKER = '<!-- og:card -->';

function injectInto(html, baseUrl) {
  if (html.includes(MARKER)) return html;

  const head = html.indexOf('</head>');
  if (head === -1) {
    throw new Error('dist/index.html has no </head> — the export shape changed');
  }

  const block = `    ${MARKER}\n    ${metaTagsFor(baseUrl)}\n  `;
  return html.slice(0, head) + block + html.slice(head);
}

function main() {
  const distDir = process.argv[2] ?? join(__dirname, '..', 'dist');
  const baseUrl = process.env.LARGATA_WEB_BASE_URL;

  if (!baseUrl) {
    console.error(
      'LARGATA_WEB_BASE_URL is required: og:image must be an absolute URL or no crawler will fetch it.',
    );
    process.exit(1);
  }

  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.error(`no export found at ${indexPath} — run \`expo export --platform web\` first`);
    process.exit(1);
  }

  const source = join(__dirname, '..', 'assets', CARD.file);
  if (!existsSync(source)) {
    console.error(`no card image at ${source} — run \`node scripts/build-og-card.js\``);
    process.exit(1);
  }

  writeFileSync(indexPath, injectInto(readFileSync(indexPath, 'utf8'), baseUrl));
  copyFileSync(source, join(distDir, CARD.file));

  console.log(`injected og:card meta into ${indexPath} (base ${baseUrl})`);
}

if (require.main === module) main();

module.exports = { MARKER, injectInto };
