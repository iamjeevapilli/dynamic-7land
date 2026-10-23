'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { brand } = require('./brand-exe.cjs');
async function main() {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Run this build on Windows x64.');
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'dist', 'Dynamic7land');
  // Electron 44 installs its pinned runtime lazily when the Node package is loaded.
  const electron = path.dirname(require('electron'));
  if (!fs.existsSync(path.join(electron, 'electron.exe'))) throw new Error('The Electron Windows runtime is unavailable.');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(electron, out, { recursive: true });
  const appDir = path.join(out, 'resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.claude', '.codex', 'provider-connections.json', 'provider-conversations.json', 'services.json'].includes(entry.name) || entry.name.startsWith('.env') || /\.(log|pem|key|pfx)$/.test(entry.name)) continue;
    fs.cpSync(path.join(root, entry.name), path.join(appDir, entry.name), { recursive: true });
  }
  for (const module of ['@openai/codex', '@openai/codex-win32-x64']) {
    const from = path.join(root, 'node_modules', module);
    if (!fs.existsSync(from)) throw new Error('Missing ' + module + '. Install optional dependencies with npm ci --include=optional.');
    fs.cpSync(from, path.join(appDir, 'node_modules', module), { recursive: true });
  }
  await brand(path.join(out, 'electron.exe'), path.join(out, 'Dynamic7land.exe'), path.join(root, 'assets', 'icon.ico'));
  fs.unlinkSync(path.join(out, 'electron.exe'));
  for (const file of ['README.md', 'READ-ME-FIRST.txt', 'CREDITS.md', 'LICENSE-DYNAMIC7LAND.txt']) fs.copyFileSync(path.join(root, file), path.join(out, file));
  fs.writeFileSync(path.join(out, 'Dynamic7land-Settings.cmd'), '@echo off\r\ncd /d "%~dp0"\r\nstart "" "Dynamic7land.exe" --settings\r\n');
  fs.writeFileSync(path.join(out, 'CHECK-WINDOWS.cmd'), '@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\nset ELECTRON_RUN_AS_NODE=1\r\n"Dynamic7land.exe" "resources\\app\\check-windows.cjs"\r\npause\r\n');
  console.log('Portable build: ' + out);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
