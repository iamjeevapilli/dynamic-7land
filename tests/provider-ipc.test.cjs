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
    for (const [channel, handler] of handlers) { if (channel === 'agent-connections:open-arena' && url.endsWith('/mascot.html')) continue; const value = await handler(event(url), channel.endsWith(':action') ? 'arena-website' : { provider: 'off' }); assert.equal(value.ok, false); assert.equal(value.error, 'Access denied.'); }
  }
  assert.equal(opened.length, 0);
  assert.equal((await handlers.get('agent-connections:get')(valid)).ok, true);
  assert.equal((await handlers.get('agent-connections:set')(valid, { provider: 'off' })).ok, true);
  assert.equal(events[0][0], 'dynamic7land-provider-changed');
  assert.equal((await handlers.get('agent-connections:action')(valid, 'arena-website')).ok, true);
  assert.deepEqual(opened, ['https://arena.ai/agent']);
  assert.equal((await handlers.get('agent-connections:action')(valid, 'unknown-action')).ok, false);
});

test('Arena launches pass secrets only in the child environment and retired installers cannot launch', async t => {
  const { EventEmitter } = require('node:events');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-arena-ipc-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const bin = path.join(directory, '.local', 'bin'); fs.mkdirSync(bin, { recursive: true }); fs.writeFileSync(path.join(bin, 'claude.exe'), 'test fixture');
  const handlers = new Map(), opened = [], spawned = [], root = path.resolve(__dirname, '..');
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: s => Buffer.from(s), decryptString: b => b.toString() };
  const electron = { app: { getPath: () => directory, emit: () => {} }, ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, safeStorage, shell: { openExternal: async url => opened.push(url) } };
  const context = { require: name => name === 'electron' ? electron : name === 'node:os' ? { ...os, homedir: () => directory } : name === 'node:child_process' ? { spawn: (file, args, options) => {
    spawned.push({ file, args, options }); const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => {}; queueMicrotask(() => { child.stdout.emit('data', Buffer.from('Dynamic7landTerminal:1234')); child.emit('close', 0); }); return child;
  } } : name.startsWith('./') ? require(path.join(root, name)) : require(name),
  module: { exports: {} }, __dirname: root, process: { platform: 'win32', env: { PATH: '', ELECTRON_RUN_AS_NODE: '1', ANTHROPIC_API_KEY: 'conflicting-key', ANTHROPIC_DEFAULT_SONNET_MODEL: 'other-model', CLAUDE_CODE_USE_VERTEX: '1' } }, URL, Buffer };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'agent-connections-main.cjs'), 'utf8'), context);
  const valid = { senderFrame: { url: pathToFileURL(path.join(root, 'settings-app.html')).href } };
  const foreign = { senderFrame: { url: 'https://example.invalid/settings-app.html' } };
  const act = handlers.get('agent-connections:action'), secret = 'test-only-arena-token';
  await handlers.get('agent-connections:set')(valid, { provider: 'arena', key: secret, model: 'workspace-model' });
  assert.equal((await act(foreign, 'claude-arena')).ok, false); assert.equal(spawned.length, 0);
  assert.equal((await act(valid, 'claude-arena')).ok, true);
  const call = spawned[0]; assert.equal(call.file, 'powershell.exe'); assert.equal(call.options.shell, false); assert.equal(call.options.env.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(call.options.env.ANTHROPIC_AUTH_TOKEN, secret); assert.equal(call.options.env.ANTHROPIC_MODEL, 'workspace-model');
  for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'CLAUDE_CODE_USE_VERTEX']) assert.equal(call.options.env[name], undefined);
  assert.equal(JSON.stringify(call.args).includes(secret), false); assert.equal(call.args.includes('-ExecutionPolicy'), false);
  const bootstrap = Buffer.from(call.args.at(-1), 'base64').toString('utf16le');
  assert.match(bootstrap, /Start-Process/); assert.doesNotMatch(bootstrap, /NoNewWindow|RedirectStandardInput|test-only-arena-token/);
  const inner = Buffer.from(bootstrap.match(/-NoExit -EncodedCommand ([A-Za-z0-9+/=]+)/)[1], 'base64').toString('utf16le');
  assert.match(inner, /--permission-mode default/); assert.match(inner, /Dynamic7land-Chat/);
  const notch = { senderFrame: { url: pathToFileURL(path.join(root, 'mascot.html')).href } };
  assert.equal((await handlers.get('agent-connections:open-arena')(foreign)).ok, false);
  assert.equal((await handlers.get('agent-connections:open-arena')(notch)).ok, true);
  assert.equal(spawned.length, 2);
  for (const name of ['get', 'set', 'models', 'test', 'action']) assert.equal((await handlers.get('agent-connections:' + name)(notch, { provider: 'off' })).error, 'Access denied.');
  for (const action of ['setup-ollama', 'setup-ollama-vision', 'setup-freellmapi', 'setup-omniroute', 'omniroute-dashboard', 'freellmapi-dashboard', 'openrouter-keys', 'ollama-download', 'setup-omniroute; anything', ['claude-arena'], {}, null]) assert.equal((await act(valid, action)).ok, false);
  assert.equal(spawned.length, 2); assert.deepEqual(opened, []);
});
