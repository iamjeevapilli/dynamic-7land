'use strict';
// Establish this fork's identity before any module reads Electron's paths or locks.
const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
app.setName('Dynamic 7land');
const data = path.join(app.getPath('appData'), 'Dynamic7land');
fs.mkdirSync(data, { recursive: true });
app.setPath('userData', data);

const firstRun = path.join(data, 'welcome-seen');
if (!fs.existsSync(firstRun)) {
  app.whenReady().then(() => {
    setTimeout(() => {
      app.emit('dynamic7land-open-settings');
      try { fs.writeFileSync(firstRun, '1\n'); } catch {}
    }, 1500);
  });
}
