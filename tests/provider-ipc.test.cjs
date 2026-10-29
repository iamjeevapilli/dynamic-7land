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

test('Windows setup actions launch only fixed local scripts and router dashboards use the validated loopback port', async t => {
  const { EventEmitter } = require('node:events');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-setup-ipc-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const handlers = new Map(), opened = [], spawned = [], root = path.resolve(__dirname, '..');
  const electron = { app: { getPath: () => directory, emit: () => {} }, ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, safeStorage: {}, shell: { openExternal: async url => opened.push(url) } };
  const context = { require: name => name === 'electron' ? electron : name === 'node:child_process' ? { spawn: (file, args, options) => {
    spawned.push({ file, args, options }); const child = new EventEmitter(); child.unref = () => {}; queueMicrotask(() => child.emit('spawn')); return child;
  } } : name.startsWith('./') ? require(path.join(root, name)) : require(name),
  module: { exports: {} }, __dirname: root, process: { ...process, platform: 'win32', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }, URL, Buffer };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'agent-connections-main.cjs'), 'utf8'), context);
  const valid = { senderFrame: { url: pathToFileURL(path.join(root, 'settings-app.html')).href } };
  const foreign = { senderFrame: { url: 'https://example.invalid/settings-app.html' } };
  const act = handlers.get('agent-connections:action');
  for (const [action, tool] of [['setup-ollama', 'ollama'], ['setup-ollama-vision', 'ollama-vision'], ['setup-freellmapi', 'freellmapi'], ['setup-omniroute', 'omniroute']]) {
    assert.equal((await act(foreign, action)).ok, false);
    assert.equal((await act(valid, action)).ok, true);
    const call = spawned.at(-1); assert.equal(call.file, 'powershell.exe'); assert.equal(call.options.shell, false);
    assert.equal(call.options.env.ELECTRON_RUN_AS_NODE, undefined);
    assert.ok(call.args.includes('-ExecutionPolicy')); assert.match(call.args.at(-1), new RegExp('AI-SETUP\\.ps1.* -Tool ' + tool + '$'));
  }
  assert.equal(spawned.length, 4);
  for (const invalid of ['setup-omniroute; anything', ['setup-ollama'], {}, null]) assert.equal((await act(valid, invalid)).ok, false);
  assert.equal(spawned.length, 4);
  await handlers.get('agent-connections:set')(valid, { provider: 'freellmapi', gatewayPort: 31416 });
  assert.equal((await act(valid, 'freellmapi-dashboard')).ok, true);
  assert.equal((await act(valid, 'omniroute-dashboard')).ok, true);
  assert.deepEqual(opened, ['http://127.0.0.1:31416', 'http://127.0.0.1:20128']);
});
