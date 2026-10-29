'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { JSDOM } = require('jsdom');
const { createProviderService } = require('../provider-connections.cjs');

async function mounted(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-ui-'));
  const dom = new JSDOM('<main id="root"></main>', { runScripts: 'outside-only' });
  t.after(() => { dom.window.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const calls = [], actions = [];
  // An opaque test codec; production uses Electron safeStorage. Encryption itself
  // is tested separately with AES-GCM in providers.test.cjs.
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: s => Buffer.from(s.split('').reverse().join('')), decryptString: b => b.toString().split('').reverse().join('') };
  const service = createProviderService({ directory, safeStorage, env: {}, fetch: async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null; calls.push({ url, body, headers: options.headers });
    let data;
    if (url.endsWith('/api/tags')) data = { models: [{ name: 'llama3.2:1b', size: 1000 }] };
    else if (url.endsWith('/api/show')) data = { details: { format: 'gguf' }, model_info: { architecture: 'test' }, capabilities: ['completion'] };
    else if (url.endsWith('/api/chat')) data = { message: { content: 'Connection successful.' } };
    else if (url.includes('/models')) data = { data: [{ id: 'auto', name: '<img src=x onerror=alert(1)>' }] };
    else data = { choices: [{ message: { content: 'Connection successful.' }, finish_reason: 'stop' }] };
    return { ok: true, status: 200, json: async () => data };
  } });
  const wrap = fn => async (...args) => { try { return { ok: true, ...await fn(...args) }; } catch (e) { return { ok: false, error: e.message }; } };
  const api = { get: wrap(() => service.publicConfig()), set: wrap(p => service.set(p)), models: wrap(async p => ({ models: await service.models(p) })),
    test: wrap(async () => ({ answer: await service.answer('Connection test') })),
    action: wrap(async a => { actions.push(a); return { message: 'Setup opened. Wait for installation to finish, then save and test.' }; }) };
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../provider-settings-ui.js'), 'utf8'));
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  await dom.window.DynamicProviderUI.mount({ api, paint: html => { dom.window.document.querySelector('#root').innerHTML = html; }, esc: escape, toast: () => {}, current: () => true });
  const find = suffix => dom.window.document.querySelector('#connection-' + suffix);
  async function click(selector) {
    const button = dom.window.document.querySelector(selector); assert.ok(button, selector); button.click();
    for (let i = 0; button.disabled && i < 30; i++) await new Promise(setImmediate);
    assert.equal(button.disabled, false, 'The action completed');
  }
  return { dom, service, calls, actions, find, click };
}

test('router setup UI saves the right port and key, loads models, tests and retains the saved key when its box clears', async t => {
  const f = await mounted(t);
  for (const [provider, port] of [['freellmapi', '31415'], ['omniroute', '20128']]) {
    await f.click('[data-provider-choice="' + provider + '"]');
    assert.equal(f.find('provider').value, provider); assert.equal(f.find('port').value, port);
    assert.equal(f.find('port-field').hidden, false); assert.equal(f.find('key').type, 'password');
    assert.match(f.find('key-label').textContent, /Connection key/); assert.match(f.find('key-help').textContent, /Copy the router/);
    const secret = 'test-only-connection-key-' + provider;
    f.find('key').value = secret;
    await f.click('[data-provider-command="save"]');
    assert.equal(f.find('key').value, ''); assert.match(f.find('key-help').textContent, /A key is saved/);
    assert.equal(f.service.resolve().key, secret);
    await f.click('[data-provider-command="models"]');
    assert.equal(f.find('models').children.length, 1); assert.equal(f.find('models').querySelector('img'), null);
    await f.click('[data-provider-command="test"]');
    assert.match(f.find('result').textContent, /Connection successful/);
    assert.equal(f.calls.at(-1).headers.Authorization, 'Bearer ' + secret);
    await f.click('[data-provider-action="setup-' + provider + '"]');
    assert.match(f.find('result').textContent, /Wait for installation to finish/);
  }
  f.find('port').value = '99999';
  await f.click('[data-provider-command="save"]');
  assert.match(f.find('result').textContent, /gateway port/); assert.equal(f.service.publicConfig().gatewayPorts.omniroute, 20128);
});

test('the no-key local setup hides router fields and works without forwarding a previously saved gateway key', async t => {
  const f = await mounted(t);
  f.service.set({ provider: 'freellmapi', key: 'test-only-saved-router-key' });
  await f.click('[data-provider-choice="ollama"]');
  assert.equal(f.find('key-field').hidden, true); assert.equal(f.find('key').disabled, true); assert.equal(f.find('port-field').hidden, true);
  assert.equal(f.find('model').value, 'llama3.2:1b');
  await f.click('[data-provider-action="setup-ollama"]');
  assert.deepEqual(f.actions, ['setup-ollama']);
  await f.click('[data-provider-command="models"]');
  await f.click('[data-provider-command="test"]');
  assert.match(f.find('result').textContent, /Connection successful/);
  for (const call of f.calls) { assert.ok(call.url.startsWith('http://127.0.0.1:11434/')); assert.equal(call.headers.Authorization, undefined); }
  f.find('provider').value = 'off'; f.find('provider').dispatchEvent(new f.dom.window.Event('change'));
  assert.equal(f.find('api-fields').hidden, true);
});
