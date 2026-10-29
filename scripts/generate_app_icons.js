import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Official Dalani Brand Vector Paths
const logoPaths = `
  <!-- Outer Dark Navy 'D' Frame with Top Roof Peak and Sweeping Loop -->
  <path d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z" fill="#16324F"/>
  <!-- Inner Navy Roof Beam (Gable contour framing the towers) -->
  <path d="M 52 76 L 88 46 L 134 78 L 124 86 L 88 56 L 60 84 Z" fill="#16324F"/>
  <!-- Left Skyscraper Tower -->
  <polygon points="63,90 81,78 81,146 63,146" fill="#16324F"/>
  <!-- Right Skyscraper Tower -->
  <polygon points="88,64 108,78 108,136 88,136" fill="#16324F"/>
  <!-- Bottom-Right Navy Crescent -->
  <path d="M 108 186 C 146 186 182 162 186 124 C 188 100 174 74 152 56 C 170 76 174 102 172 124 C 168 152 140 176 108 186 Z" fill="#16324F"/>
  <!-- Emerald Green Curving Highway -->
  <path d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186 Z" fill="#12A889"/>
  <!-- Emerald Green Geolocation Pin Marker -->
  <path d="M 144 97 C 138.5 97 134 101.5 134 107 C 134 113.5 141.5 122 144 125 C 146.5 122 154 113.5 154 107 C 154 101.5 149.5 97 144 97 Z" fill="#12A889"/>
  <circle cx="144" cy="107" r="3.2" fill="#FFFFFF"/>
`;

// 1. Raw Logo SVG
const rawLogoSvg = `<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
${logoPaths}
</svg>`;

// 2. Square App Launcher Icon with Crisp White Card Background & subtle soft gradient border
const createSquareIconSvg = (size) => {
  const scale = (size * 0.72) / 200;
  const offset = (size - 200 * scale) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#FFFFFF"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    ${logoPaths}
  </g>
</svg>`;
};

// 3. Round App Launcher Icon
const createRoundIconSvg = (size) => {
  const scale = (size * 0.70) / 200;
  const offset = (size - 200 * scale) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#FFFFFF"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    ${logoPaths}
  </g>
</svg>`;
};

// 4. Android Adaptive Icon Foreground (Canvas 108dp, Safe Zone 72dp)
const createAdaptiveForegroundSvg = (size) => {
  // Center logo within safe circle (60% of size)
  const scale = (size * 0.56) / 200;
  const offset = (size - 200 * scale) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    ${logoPaths}
  </g>
</svg>`;
};

// 5. Elegant Splash Screen
const createSplashSvg = (width, height) => {
  const logoTargetSize = Math.min(width * 0.38, height * 0.28, 220);
  const scale = logoTargetSize / 200;
  const offsetX = (width - 200 * scale) / 2;
  const offsetY = (height - 200 * scale) / 2 - 25;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#16324F"/>
  <g transform="translate(${offsetX}, ${offsetY}) scale(${scale})">
    <!-- White / Teal version for Dark Splash -->
    <path d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z" fill="#FFFFFF"/>
    <path d="M 52 76 L 88 46 L 134 78 L 124 86 L 88 56 L 60 84 Z" fill="#FFFFFF"/>
    <polygon points="63,90 81,78 81,146 63,146" fill="#FFFFFF"/>
    <polygon points="88,64 108,78 108,136 88,136" fill="#FFFFFF"/>
    <path d="M 108 186 C 146 186 182 162 186 124 C 188 100 174 74 152 56 C 170 76 174 102 172 124 C 168 152 140 176 108 186 Z" fill="#FFFFFF"/>
    <path d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186 Z" fill="#12A889"/>
    <path d="M 144 97 C 138.5 97 134 101.5 134 107 C 134 113.5 141.5 122 144 125 C 146.5 122 154 113.5 154 107 C 154 101.5 149.5 97 144 97 Z" fill="#12A889"/>
    <circle cx="144" cy="107" r="3.2" fill="#16324F"/>
  </g>
  <text x="${width / 2}" y="${offsetY + 200 * scale + 42}" font-family="sans-serif" font-weight="bold" font-size="28" fill="#FFFFFF" text-anchor="middle">دلنّـي</text>
  <text x="${width / 2}" y="${offsetY + 200 * scale + 72}" font-family="sans-serif" font-weight="normal" font-size="14" fill="#12A889" text-anchor="middle">المنصة العقارية اليمنية</text>
</svg>`;
};

async function main() {
  console.log('Generating Dalani application icons and splash screens...');

  // 1. Web Public Icons
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), rawLogoSvg);

  await sharp(Buffer.from(createSquareIconSvg(512)))
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(Buffer.from(createSquareIconSvg(192)))
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(Buffer.from(createSquareIconSvg(180)))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(Buffer.from(createSquareIconSvg(64)))
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('✓ Public Web & PWA icons generated.');

  // 2. Android Mipmap Icons
  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  const resDir = path.resolve('android/app/src/main/res');

  for (const m of mipmaps) {
    const targetDir = path.join(resDir, m.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png (square)
    await sharp(Buffer.from(createSquareIconSvg(m.iconSize)))
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png (round)
    await sharp(Buffer.from(createRoundIconSvg(m.iconSize)))
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (adaptive foreground)
    await sharp(Buffer.from(createAdaptiveForegroundSvg(m.fgSize)))
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`✓ Generated ${m.dir} icons.`);
  }

  // 3. Android Splash Screens
  const splashes = [
    { dir: 'drawable', w: 480, h: 320 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  ];

  for (const s of splashes) {
    const targetDir = path.join(resDir, s.dir);
    if (fs.existsSync(targetDir)) {
      await sharp(Buffer.from(createSplashSvg(s.w, s.h)))
        .png()
        .toFile(path.join(targetDir, 'splash.png'));
      console.log(`✓ Generated ${s.dir}/splash.png (${s.w}x${s.h})`);
    }
  }

  console.log('All icons and splash screens successfully generated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
