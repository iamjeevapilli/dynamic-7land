'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const { createProviderService, ROOTS } = require('../provider-connections.cjs');
const token = 'test-key-never-a-real-provider-secret';
function fixture(t, respond = () => ({ output_text: 'Connected', status: 'completed' })) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic7land-provider-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const encryptionKey = crypto.randomBytes(32);
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString(value) { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv); return Buffer.concat([iv, cipher.update(value), cipher.final(), cipher.getAuthTag()]); },
    decryptString(data) { const cipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, data.subarray(0,12)); cipher.setAuthTag(data.subarray(-16)); return Buffer.concat([cipher.update(data.subarray(12,-16)), cipher.final()]).toString(); }
  };
  const calls = [];
  const request = async (url, options) => { calls.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined }); const data = await respond(url, calls.at(-1)); return { ok: data._status ? data._status < 400 : true, status: data._status || 200, json: async () => data }; };
  const service = createProviderService({ directory, safeStorage, fetch: request, env: {} });
  return { directory, service, calls, safeStorage };
}
test('Arena keys persist encrypted, stay outside renderer settings, and blank edits retain them', t => {
  const f = fixture(t), config = f.service.set({ provider: 'arena', key: token, arenaAccess: 'api' });
  assert.equal(config.model, 'coding-router-preview'); assert.equal(config.active, true);
  assert.equal(JSON.stringify(config).includes(token), false);
  assert.equal(fs.readFileSync(path.join(f.directory, 'provider-connections.json'), 'utf8').includes(token), false);
  f.service.set({ key: '', model: 'another-model' }); assert.equal(f.service.resolve().key, token);
  f.service.set({ clearKey: true }); assert.equal(f.service.resolve().ready, false);
});
test('key storage fails closed when secure storage is unavailable', t => {
  const f = fixture(t); f.safeStorage.isEncryptionAvailable = () => false;
  assert.throws(() => f.service.set({ provider: 'arena', key: token }), /not saved/);
  assert.equal(fs.existsSync(path.join(f.directory, 'provider-connections.json')), false);
});
test('Arena chat, model discovery and project conversations use its fixed Responses endpoint', async t => {
  const f = fixture(t, url => url.endsWith('/models') ? { data: [{ id: 'model-one', display_name: 'Model One' }] } : { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'Answer' }] }] });
  f.service.set({ provider: 'arena', key: token, arenaAccess: 'api' });
  assert.deepEqual(await f.service.models(), [{ id: 'model-one', name: 'Model One' }]);
  assert.equal(await f.service.answer('Hello'), 'Answer');
  const config = f.service.resolve(), { id } = await f.service.apiRequest(config, '/conversations', {});
  await f.service.apiRequest(config, '/responses', { conversation: id, input: 'First turn', store: true });
  await f.service.apiRequest(config, '/responses', { conversation: id, input: 'Follow-up' });
  for (const call of f.calls) { assert.ok(call.url.startsWith('https://api.arena.ai/v1/')); assert.equal(call.headers.Authorization, 'Bearer ' + token); assert.equal(call.redirect, 'error'); }
  const last = f.calls.at(-1); assert.equal(last.body.store, false); assert.equal(last.body.conversation, undefined);
  assert.equal(last.body.input.length, 3); assert.equal(last.body.input[0].content, 'First turn'); assert.equal(last.body.input[1].role, 'assistant');
});
test('Arena preserves screenshots and project schemas without accepting another model or fallback overrides', async t => {
  const f = fixture(t); f.service.set({ provider: 'arena', key: token, arenaAccess: 'api', model: 'workspace-model' });
  const schema = { type: 'object', properties: { summary: { type: 'string' } } };
  const input = [{ role: 'user', content: [{ type: 'input_text', text: 'Review this.' }, { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' }] }];
  await f.service.apiRequest(f.service.resolve(), '/responses', { input, instructions: 'Review only', max_output_tokens: 99999,
    model: 'other-model', fallbacks: ['other-model'], plugins: [{ id: 'web' }], text: { format: { type: 'json_schema', schema } } });
  const body = f.calls[0].body;
  assert.equal(body.model, 'workspace-model'); assert.deepEqual(body.input, input); assert.deepEqual(body.text.format.schema, schema);
  assert.equal(body.max_output_tokens, 16384); assert.equal(body.fallbacks, undefined); assert.equal(body.plugins, undefined); assert.equal(body.stream, false);
});
test('free-router setup defaults to interactive Claude Code and never makes a desktop API test', async t => {
  const f = fixture(t); assert.equal(f.service.publicConfig().provider, 'arena');
  f.service.set({ key: token });
  assert.equal(f.service.publicConfig().arenaAccess, 'claude-code-only'); assert.equal(f.service.resolve().ready, false);
  await assert.rejects(f.service.answer('Hello'), /interactive Claude Code only/); assert.equal(f.calls.length, 0);
  assert.equal(f.service.claudeEnvironment().ANTHROPIC_AUTH_TOKEN, token);
});
test('Arena client restrictions are explained without retrying through another provider', async t => {
  const f = fixture(t, () => ({ _status: 403, error: { code: 'organization_client_restricted' } }));
  f.service.set({ provider: 'arena', key: token, arenaAccess: 'api' });
  await assert.rejects(f.service.answer('Hello'), /restricted to interactive Claude Code/); assert.equal(f.calls.length, 1);
});
test('Arena errors redact the key and network failures reveal no credential headers', async t => {
  const f = fixture(t, () => ({ _status: 401, error: { message: 'Rejected ' + token } }));
  f.service.set({ provider: 'arena', key: token, arenaAccess: 'api' });
  await assert.rejects(f.service.answer('Hello'), e => !e.message.includes(token) && /HTTP 401/.test(e.message));
  const offline = createProviderService({ directory: f.directory, safeStorage: f.safeStorage, env: {}, fetch: async () => { throw new Error('Internal headers: ' + token); } });
  await assert.rejects(offline.answer('Hello'), e => !e.message.includes(token) && /internet connection/.test(e.message));
});
test('upgrading retired connections selects Arena, retains its encrypted key and preserves conversations', t => {
  for (const provider of ['openrouter', 'ollama', 'omniroute', 'freellmapi', 'anthropic']) {
    const f = fixture(t), file = path.join(f.directory, 'provider-connections.json'), history = path.join(f.directory, 'provider-conversations.json');
    const encrypted = f.safeStorage.encryptString(token).toString('base64');
    fs.writeFileSync(file, JSON.stringify({ provider, model: 'retired-model', arenaAccess: 'api', gatewayPorts: { omniroute: 1234 }, keys: { arena: encrypted, [provider]: 'retired-encrypted-key' } }));
    fs.writeFileSync(history, '{"existing-conversation":[]}');
    const state = f.service.publicConfig(); assert.equal(state.provider, 'arena'); assert.equal(state.model, 'coding-router-preview'); assert.equal(state.arenaAccess, 'api');
    assert.equal(f.service.resolve().key, token); assert.deepEqual(JSON.parse(fs.readFileSync(file)).keys, { arena: encrypted });
    assert.equal(JSON.parse(fs.readFileSync(file)).gatewayPorts, undefined); assert.equal(fs.readFileSync(history, 'utf8'), '{"existing-conversation":[]}');
    assert.equal(f.calls.length, 0);
  }
});
test('retired settings never reuse other provider keys and unsupported requests cannot fall through', async t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.directory, 'provider-connections.json'), JSON.stringify({ provider: 'openrouter', keys: { openrouter: 'another-encrypted-key' }, arenaAccess: 'api' }));
  assert.equal(f.service.publicConfig().hasKey, false); assert.equal(f.service.publicConfig().arenaAccess, 'claude-code-only');
  assert.deepEqual(Object.keys(ROOTS), ['arena']);
  for (const provider of ['openrouter', 'ollama', 'omniroute', 'freellmapi', 'anthropic', 'unknown']) {
    assert.equal(f.service.supports(provider), false);
    assert.throws(() => f.service.set({ provider }), /Choose Arena/);
    await assert.rejects(f.service.models(provider), /Select Arena/);
    await assert.rejects(f.service.apiRequest({ provider, ready: true }, '/responses', { input: 'Hello' }), /Unsupported AI provider/);
  }
  assert.equal(f.calls.length, 0);
});
test('existing account selection and Arena launches retain their intended route', t => {
  const f = fixture(t); f.service.set({ key: token, model: 'workspace-model' });
  assert.equal(f.service.claudeEnvironment().ANTHROPIC_MODEL, 'workspace-model');
  f.service.set({ provider: 'off' }); assert.equal(f.service.resolve(), null);
  const env = f.service.claudeEnvironment(); assert.equal(env.ANTHROPIC_BASE_URL, 'https://api.arena.ai');
  assert.equal(env.ANTHROPIC_MODEL, 'coding-router-preview'); assert.equal(env.CLAUDE_CODE_MODEL_CAPABILITIES, 'coding-router-preview=-effort');
});
