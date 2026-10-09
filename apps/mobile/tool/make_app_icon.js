// Renders the Viralkar K (apps/mobile/assets/images/viralkar_icon.svg) into the launcher icon sources.
// Usage, from the repo root: node apps/mobile/tool/make_app_icon.js .
// then, in apps/mobile: dart run flutter_launcher_icons
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const sharp = require(require.resolve('sharp', { paths: [root] }));

const svgPath = path.join(root, 'apps/mobile/assets/images/viralkar_icon.svg');
const outDir = path.join(root, 'apps/mobile/assets/icon');
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 1024;
const svg = fs.readFileSync(svgPath);

/** The K at `width` pixels wide (its own aspect ratio), centred on a SIZE x SIZE canvas. */
async function render(width, background, file) {
  const logo = await sharp(svg, { density: 1200 }).resize({ width }).png().toBuffer();
  const { height } = await sharp(logo).metadata();
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background } })
    .composite([{ input: logo, left: Math.round((SIZE - width) / 2), top: Math.round((SIZE - height) / 2) }])
    .png()
    .toFile(path.join(outDir, file));
  console.log(`${file}: logo ${width}x${height} on ${SIZE}x${SIZE}`);
}

(async () => {
  // Legacy icon (Android 7 and older, and the Play Store listing): the K on white, with breathing room.
  await render(700, { r: 255, g: 255, b: 255, alpha: 1 }, 'app_icon.png');
  // Adaptive icon foreground: flutter_launcher_icons shrinks it by a further 16% inset, and Android crops to a circle or
  // squircle showing the middle 66%. 740 px keeps the K's corners inside even a circle; the white is a separate layer.
  await render(740, { r: 0, g: 0, b: 0, alpha: 0 }, 'app_icon_foreground.png');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
