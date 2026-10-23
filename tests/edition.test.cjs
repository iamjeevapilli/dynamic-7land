'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore, validate, DEFAULTS } = require('../services-config.cjs');
const { createHub, PORT } = require('../claude-code-hooks.cjs');

test('service preferences persist independently and invalid edits keep the previous configuration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-edition-'));
  try {
    const store = createStore(path.join(dir, 'Dynamic7land'));
    assert.deepEqual(store.get(), { ...DEFAULTS });
    assert.equal(fs.existsSync(path.join(dir, 'Dynamic7land')), false);
    const config = store.set({ ownerName: 'Jeeva Pilli', spotifyClientId: 'abcdef0123456789abcdef0123456789', companionEndpoint: 'https://example.com/api/companion/' });
    assert.equal(config.companionEndpoint, 'https://example.com/api/companion');
    assert.deepEqual(createStore(path.join(dir, 'Dynamic7land')).get(), config);
    assert.deepEqual(createStore(path.join(dir, 'TwoCode')).get(), { ...DEFAULTS });
    assert.throws(() => store.set({ spotifyClientId: 'invalid' }), /32 hexadecimal/);
    assert.deepEqual(store.get(), config);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('service URL validation rejects executable schemes, embedded credentials and malformed repositories', () => {
  for (const url of ['javascript:alert(1)', 'file:///C:/private', 'http://example.com', 'https://user:secret@example.com', 'https://example.com?token=secret', 'https://example.com/#fragment']) {
    assert.throws(() => validate({ companionEndpoint: url }));
  }
  for (const repo of ['../secret', 'owner/repo/extra', 'https://github.com/owner/repo', 'owner/repo?x=1']) {
    assert.throws(() => validate({ updatesRepository: repo }));
  }
  assert.equal(validate({ updatesRepository: 'Jeeva-Pilli/Dynamic7land' }).updatesRepository, 'Jeeva-Pilli/Dynamic7land');
});

test('Dynamic7land hook installation and removal preserve an existing TwoCode integration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-coexist-'));
  try {
    const settingsFile = path.join(dir, 'claude-settings.json');
    const oldHook = { hooks: [{ type: 'http', url: 'http://127.0.0.1:47823/twocode-hook?v=2', headers: { 'X-TwoCode-Token': 'original' } }] };
    const oldStatus = { type: 'command', command: 'node C:/TwoCode/twocode-statusline.cjs original' };
    const original = { hooks: { Stop: [oldHook] }, statusLine: oldStatus };
    fs.writeFileSync(settingsFile, JSON.stringify(original));
    const hub = createHub({ userData: path.join(dir, 'data'), settingsFile, codexHome: path.join(dir, 'codex') });
    assert.equal(PORT, 47825);
    hub.install();
    const installed = JSON.parse(fs.readFileSync(settingsFile));
    assert.deepEqual(installed.hooks.Stop[0], oldHook);
    assert.deepEqual(installed.statusLine, oldStatus);
    assert.ok(installed.hooks.Stop.some(group => group.hooks.some(hook => hook.url?.includes(':47825/dynamic7land-hook'))));
    hub.uninstall();
    assert.deepEqual(JSON.parse(fs.readFileSync(settingsFile)), original);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
