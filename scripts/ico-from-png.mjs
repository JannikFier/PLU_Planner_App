/**
 * Baut eine Windows-Vista-kompatible .ico aus PNG-Buffern (PNG eingebettet, kein BMP).
 * Ersetzt to-ico/jimp/request – nur für generate:favicons.
 */

/** @param {Buffer} png */
function readPngDimensions(png) {
  if (png.length < 24) return null;
  if (png.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
}

/**
 * @param {Buffer[]} pngBuffers – PNG-Rohdaten (z. B. 16, 32, 48 px)
 * @returns {Buffer}
 */
export function buildIcoFromPngBuffers(pngBuffers) {
  const count = pngBuffers.length;
  if (count === 0 || count > 255) {
    throw new Error('ICO: 1–255 PNG-Bilder erwartet');
  }
  const headerSize = 6 + 16 * count;
  const parts = [];

  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(count, 4);
  parts.push(dir);

  let dataOffset = headerSize;
  for (const png of pngBuffers) {
    const dim = readPngDimensions(png) ?? { w: 256, h: 256 };
    const entry = Buffer.alloc(16);
    entry[0] = dim.w >= 256 ? 0 : dim.w;
    entry[1] = dim.h >= 256 ? 0 : dim.h;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(0, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    parts.push(entry);
    dataOffset += png.length;
  }

  for (const png of pngBuffers) {
    parts.push(png);
  }

  return Buffer.concat(parts);
}
