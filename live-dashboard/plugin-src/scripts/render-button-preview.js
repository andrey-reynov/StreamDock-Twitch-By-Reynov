const path = require('node:path');
const sharp = require('sharp');
const { keySvg } = require('../src/ui');

const samples = [
  keySvg('VIEWERS', '1,2k', 'LIVE NOW'),
  keySvg('CHAT', '17', 'THIS STREAM'),
  keySvg('STREAM', 'STOP', 'LIVE', '#ef4444'),
  keySvg('VIEWERS', 'RECONNECT', 'TWITCH')
];

const svgBuffer = uri => Buffer.from(decodeURIComponent(uri.split(',')[1]));

(async () => {
  const images = await Promise.all(samples.map(sample => sharp(svgBuffer(sample)).png().toBuffer()));
  await sharp({ create: { width: 304, height: 304, channels: 4, background: '#050814' } })
    .composite(images.map((input, index) => ({ input, left: 8 + (index % 2) * 152, top: 8 + Math.floor(index / 2) * 152 })))
    .png()
    .toFile(path.resolve(__dirname, '../../button-preview.png'));
})();
