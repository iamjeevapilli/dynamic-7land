// Draws the Dynamic7land app icon: Dynamic7land's sketched face, the same mark as in the website footer
// (round head, dark visor, two eyes, antenna with a rust light). No background, just the face.
// Writes PNGs + a Windows .ico + a small tray icon. Run: node_modules\electron\dist\electron.exe tools\make-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const OUT = process.env.ICON_OUT || path.join(__dirname, '..', 'assets');
const SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512];
// One vector master for all icon sizes, also used by the Windows executable.
const MASTER = fs.readFileSync(path.join(__dirname, '..', 'assets', 'dynamic7land.svg'), 'utf8');
function svg(size) { return MASTER.replace('width="512" height="512"', `width="${size}" height="${size}"`); }

const render = `(${function render(markup, size) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = size; cv.getContext('2d').drawImage(img, 0, 0, size, size); resolve(cv.toDataURL('image/png').split(',')[1]); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  });
}})`;

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body></body>');
  const pngs = {};
  for (const s of SIZES) {
    pngs[s] = Buffer.from(await win.webContents.executeJavaScript(`${render}(${JSON.stringify(svg(s))}, ${s})`), 'base64');
    fs.writeFileSync(path.join(OUT, `icon-${s}.png`), pngs[s]);
  }
  fs.copyFileSync(path.join(OUT, 'icon-512.png'), path.join(OUT, 'icon.png'));
  // tray: 16 px plus a 32 px @2x version for high-DPI screens (Electron picks it up by name)
  fs.copyFileSync(path.join(OUT, 'icon-16.png'), path.join(OUT, 'tray.png'));
  fs.copyFileSync(path.join(OUT, 'icon-32.png'), path.join(OUT, 'tray@2x.png'));
  // .ico with PNG entries (Windows Vista+)
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256], head = Buffer.alloc(6 + 16 * sizes.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = head.length; const bodies = [];
  sizes.forEach((s, i) => { const b = pngs[s], e = 6 + i * 16; head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(b.length, e + 8); head.writeUInt32LE(offset, e + 12); offset += b.length; bodies.push(b); });
  fs.writeFileSync(path.join(OUT, 'icon.ico'), Buffer.concat([head, ...bodies]));
  fs.copyFileSync(path.join(OUT, 'icon.ico'), path.join(OUT, 'settings-icon.ico'));
  fs.copyFileSync(path.join(OUT, 'icon-64.png'), path.join(OUT, 'settings-icon-64.png'));
  fs.copyFileSync(path.join(OUT, 'icon-512.png'), path.join(OUT, 'settings-icon.png'));
  console.log('icons ok', SIZES.join(','));
  app.exit(0);
});
