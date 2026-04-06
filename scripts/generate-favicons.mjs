/**
 * Erzeugt PNG-Größen und favicon.ico aus public/favicon.svg.
 * Ausführen: npm run generate:favicons
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

async function png(size) {
  return sharp(svgBuffer).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

const png16 = await png(16);
const png32 = await png(32);
const png48 = await png(48);

writeFileSync(join(publicDir, 'favicon-16x16.png'), png16);
writeFileSync(join(publicDir, 'favicon-32x32.png'), png32);
writeFileSync(join(publicDir, 'favicon-48x48.png'), png48);
writeFileSync(join(publicDir, 'apple-touch-icon.png'), await png(180));
writeFileSync(join(publicDir, 'icon-192.png'), await png(192));
writeFileSync(join(publicDir, 'icon-512.png'), await png(512));

const icoBuffer = await toIco([png16, png32, png48]);
writeFileSync(join(publicDir, 'favicon.ico'), icoBuffer);

console.log('Favicons generiert: favicon.ico, PNGs (16–512), apple-touch-icon.');
