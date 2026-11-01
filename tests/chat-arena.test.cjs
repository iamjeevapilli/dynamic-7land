'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
test('the notch opens the Arena terminal for restricted keys and keeps API chat available for other routes', async t => {
  const dom = new JSDOM('<body></body>', { runScripts: 'outside-only', url: 'file:///mascot.html' });
  t.after(() => dom.window.close());
  const frames = [], calls = [], settings = [];
  let current = 'arena', restricted = true;
  const info = () => ({ current, arenaInteractiveOnly: restricted, agents: [{ id: 'arena', name: 'Arena' }, { id: 'codex', name: 'Codex' }] });
  dom.window.requestAnimationFrame = fn => frames.push(fn);
  dom.window.__dynamic7landPage = { contentX: 0, place: () => {} };
  dom.window.__dynamic7landPrefs = () => ({ lang: 'en' });
  dom.window.dynamic7land = {
    buddyAi: async () => info(), buddyUseAi: async id => { current = id; return info(); },
    buddyAsk: async (...args) => { calls.push(args); return { ok: true, answer: 'Test answer' }; },
    openArenaChat: async () => { calls.push('open-arena'); return { ok: true, message: 'Arena chat window opened.' }; }, settingsOpen: tab => settings.push(tab)
  };
  dom.window.eval("var currentView = 'chat', mode = 'expanded', projectInputFocused = false, leaveStartedAt = null; var islandBounds = {x:0,y:0,width:600,height:400}; function contentRect(){return {x:0,y:50,width:600,height:350}} function sendInteractive(){};");
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../chat-ui.js'), 'utf8'));
  frames.shift()(); await new Promise(setImmediate);
  const root = dom.window.document.querySelector('#dynamic7land-chat');
  assert.equal(root.querySelector('input').disabled, true); assert.equal(root.querySelector('[data-do="send"]').disabled, true);
  assert.equal(root.querySelector('[data-kind]'), null);
  root.querySelector('input').value = 'Hello'; root.querySelector('input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(calls.length, 0, 'Restricted chat never sends a direct API request');
  root.querySelector('[data-do="arena-launch"]').click(); await new Promise(setImmediate);
  assert.deepEqual(calls, ['open-arena']); assert.match(root.querySelector('[role="status"]').textContent, /window opened/);
  root.querySelector('[data-do="arena-setup"]').click(); assert.deepEqual(settings, ['providers']);
  root.querySelector('[data-ai="codex"]').click(); await new Promise(setImmediate);
  assert.equal(root.querySelector('input').disabled, false);
  root.querySelector('input').value = 'Hello'; root.querySelector('[data-do="send"]').click(); await new Promise(setImmediate);
  assert.equal(calls.length, 2);
  restricted = false; root.querySelector('[data-ai="arena"]').click(); await new Promise(setImmediate);
  assert.equal(root.querySelector('input').disabled, false); assert.equal(root.querySelector('[data-do="arena-launch"]'), null);
});
