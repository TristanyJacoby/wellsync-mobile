// Builds every icon/splash image from the one logo: assets/logo.png (2000x2000, yellow background).
// Run after changing the logo: node scripts/make-assets.mjs
import sharp from 'sharp';

const YELLOW = { r: 0xff, g: 0xde, b: 0x59, alpha: 1 }; // the logo's own background, #ffde59
const logo = () => sharp('assets/logo.png');

const resized = (size) => logo().resize(size, size).png().toBuffer();

// Legacy (non-adaptive) icon: the logo as it is.
await logo().resize(1024, 1024).png().toFile('assets/icon-only.png');

// Adaptive icon: Android crops the outer third, so the logo sits in the safe middle, on the same
// yellow as the background layer - the two layers blend into one picture.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: YELLOW } }).png().toFile('assets/icon-background.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await resized(700), gravity: 'center' }])
  .png()
  .toFile('assets/icon-foreground.png');

// Launch screen: the logo as a rounded tile on the default theme's navy (what the app opens in).
const NAVY = { r: 0x16, g: 0x21, b: 0x2e, alpha: 1 };
const tile = async (size) => {
  const radius = Math.round(size * 0.24);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`);
  return sharp(await resized(size)).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
};
for (const name of ['splash', 'splash-dark']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: NAVY } })
    .composite([{ input: await tile(900), gravity: 'center' }])
    .png()
    .toFile(`assets/${name}.png`);
}

// Web: the in-app splash and the browser tab icon.
await logo().resize(512, 512).png({ compressionLevel: 9 }).toFile('public/logo.png');
console.log('assets regenerated');
