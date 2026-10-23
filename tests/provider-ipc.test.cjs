'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const { pathToFileURL } = require('node:url');
test('only the local settings page can read provider status, change routing or launch account actions', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-ipc-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const handlers = new Map(), opened = [], events = [], root = path.resolve(__dirname, '..');
  const electron = { app: { getPath: () => directory, emit: (...args) => events.push(args) },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, safeStorage: {}, shell: { openExternal: async url => opened.push(url) } };
  const context = { require: name => name === 'electron' ? electron : name.startsWith('./') ? require(path.join(root, name)) : require(name),
    module: { exports: {} }, __dirname: root, process, URL, Buffer };
  vm.runInNewContext(fs.readFileSync(path.join(root,'agent-connections-main.cjs'),'utf8'), context);
  const event = file => ({ senderFrame: { url: file }, sender: { getURL: () => file } });
  const valid = event(pathToFileURL(path.join(root,'settings-app.html')).href + '?tab=providers');
  for (const url of ['https://example.com/settings-app.html', pathToFileURL(path.join(root,'mascot.html')).href, 'file:///untrusted/settings-app.html']) {
    for (const [channel, handler] of handlers) { const value = await handler(event(url), channel.endsWith(':action') ? 'arena-website' : { provider: 'off' }); assert.equal(value.ok, false); assert.equal(value.error, 'Access denied.'); }
  }
  assert.equal(opened.length, 0);
  assert.equal((await handlers.get('agent-connections:get')(valid)).ok, true);
  assert.equal((await handlers.get('agent-connections:set')(valid, { provider: 'off' })).ok, true);
  assert.equal(events[0][0], 'dynamic7land-provider-changed');
  assert.equal((await handlers.get('agent-connections:action')(valid, 'arena-website')).ok, true);
  assert.deepEqual(opened, ['https://arena.ai/agent']);
  assert.equal((await handlers.get('agent-connections:action')(valid, 'unknown-action')).ok, false);
});
