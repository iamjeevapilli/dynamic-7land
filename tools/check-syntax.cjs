'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'upstream-notices', '.git', 'dist'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (/\.(js|cjs)$/.test(file)) { new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file }); count++; }
    if (/\.html$/.test(file)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/.test(match[1])) continue;
        new vm.Script(match[2], { filename: file + ':inline' }); count++;
      }
    }
  }
}
walk(root);
console.log('Syntax verified for ' + count + ' JavaScript files / inline scripts.');
