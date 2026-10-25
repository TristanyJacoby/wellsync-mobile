// Renders the SVG sources in assets/ to the PNGs @capacitor/assets expects.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

for (const file of readdirSync('assets').filter((f) => f.endsWith('.svg'))) {
  const out = `assets/${file.replace('.svg', '.png')}`;
  await sharp(`assets/${file}`, { density: 144 }).png().toFile(out);
  console.log('wrote', out);
}
