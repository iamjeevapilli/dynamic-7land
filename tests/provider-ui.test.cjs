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
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: s => Buffer.from(s.split('').reverse().join('')), decryptString: b => b.toString().split('').reverse().join('') };
  const service = createProviderService({ directory, safeStorage, env: {}, fetch: async (url, options) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : null, headers: options.headers });
    return { ok: true, status: 200, json: async () => url.endsWith('/models') ? { data: [{ id: 'workspace-model', name: '<img src=x onerror=alert(1)>' }] } : { output_text: 'Connection successful.', status: 'completed' } };
  } });
  const wrap = fn => async (...args) => { try { return { ok: true, ...await fn(...args) }; } catch (e) { return { ok: false, error: e.message }; } };
  const api = { get: wrap(() => service.publicConfig()), set: wrap(p => service.set(p)), models: wrap(async p => ({ models: await service.models(p) })),
    test: wrap(async () => ({ answer: await service.answer('Connection test') })), action: wrap(async action => { actions.push({ action, saved: service.publicConfig(), key: service.resolve()?.key }); return {}; }) };
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../provider-settings-ui.js'), 'utf8'));
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  await dom.window.DynamicProviderUI.mount({ api, paint: html => { dom.window.document.querySelector('#root').innerHTML = html; }, esc: escape, toast: () => {}, current: () => true });
  const find = suffix => dom.window.document.querySelector('#connection-' + suffix);
  async function click(selector) {
    const button = dom.window.document.querySelector(selector); assert.ok(button, selector); button.click();
    for (let i = 0; button.disabled && i < 30; i++) await new Promise(setImmediate);
    assert.equal(button.disabled, false, 'The action completed');
  }
  function change(id, value) { find(id).value = value; find(id).dispatchEvent(new dom.window.Event('change')); }
  return { dom, service, calls, actions, find, click, change };
}
test('Arena settings expose only Arena and existing accounts, with a safe interactive default', async t => {
  const f = await mounted(t);
  assert.deepEqual(Array.from(f.find('provider').options, x => x.value), ['arena', 'off']);
  assert.equal(f.find('access').value, 'claude-code-only'); assert.equal(f.find('key').type, 'password'); assert.equal(f.find('model').value, 'coding-router-preview');
  assert.equal(f.dom.window.document.querySelector('[data-provider-command="test"]').hidden, true);
  assert.doesNotMatch(f.dom.window.document.body.textContent, /OpenRouter|Ollama|OmniRoute|FreeLLMAPI/);
  f.change('provider', 'off'); assert.equal(f.find('api-fields').hidden, true);
  await f.click('[data-provider-command="save"]'); assert.equal(f.service.resolve(), null); assert.match(f.find('result').textContent, /Existing account setup/);
});
test('one Arena launcher saves the pasted key before opening Claude and retains it after the input clears', async t => {
  const f = await mounted(t), secret = 'test-only-arena-key';
  f.find('key').value = secret;
  await f.click('[data-provider-command="launch-arena"]');
  assert.equal(f.actions.length, 1); assert.equal(f.actions[0].action, 'claude-arena'); assert.equal(f.actions[0].key, secret);
  assert.equal(f.find('key').value, ''); assert.match(f.find('key-help').textContent, /A key is saved/);
  assert.match(f.find('result').textContent, /terminal to verify/); assert.equal(f.calls.length, 0);
  await f.click('[data-provider-command="save"]'); assert.equal(f.service.resolve().key, secret);
  await f.click('[data-provider-command="clear"]'); assert.equal(f.service.publicConfig().hasKey, false);
});
test('API-enabled Arena setup loads escaped models, preserves the key and performs a live test through the service', async t => {
  const f = await mounted(t), secret = 'test-only-arena-workspace-key';
  f.find('key').value = secret; f.change('access', 'api');
  assert.equal(f.find('key').value, secret); assert.equal(f.dom.window.document.querySelector('[data-provider-command="test"]').hidden, false);
  await f.click('[data-provider-command="models"]');
  assert.equal(f.find('models').children.length, 1); assert.equal(f.find('models').querySelector('img'), null); assert.equal(f.find('key').value, '');
  f.find('model').value = 'workspace-model';
  await f.click('[data-provider-command="test"]');
  assert.match(f.find('result').textContent, /Connection successful. Arena returned an answer/);
  assert.equal(f.calls.at(-1).headers.Authorization, 'Bearer ' + secret); assert.equal(f.calls.at(-1).body.model, 'workspace-model');
});
