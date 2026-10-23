'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const { createProviderService } = require('../provider-connections.cjs');
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
test('API keys persist encrypted, remain outside renderer settings, and blank edits retain them', t => {
  const f = fixture(t), config = f.service.set({ provider: 'arena', key: token });
  assert.equal(config.model, 'coding-router-preview'); assert.equal(config.active, true);
  assert.equal(JSON.stringify(config).includes(token), false);
  assert.equal(fs.readFileSync(path.join(f.directory,'provider-connections.json'),'utf8').includes(token), false);
  f.service.set({ key: '', model: 'another-model' }); assert.equal(f.service.resolve().key, token);
  f.service.set({ clearKey: true }); assert.equal(f.service.resolve().ready, false);
});
test('key storage fails closed when secure storage is unavailable', t => {
  const f = fixture(t); f.safeStorage.isEncryptionAvailable = () => false;
  assert.throws(() => f.service.set({ provider: 'arena', key: token }), /not saved/);
  assert.equal(fs.existsSync(path.join(f.directory,'provider-connections.json')), false);
});
test('Arena chat, model discovery and project conversations use the official Responses API', async t => {
  const f = fixture(t, url => url.endsWith('/models') ? { data: [{ id: 'model-one', display_name: 'Model One' }] } : { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'Answer' }] }] });
  f.service.set({ provider: 'arena', key: token });
  assert.deepEqual(await f.service.models(), [{ id: 'model-one', name: 'Model One' }]);
  assert.equal(await f.service.answer('Hello'), 'Answer');
  const config = f.service.resolve(), { id } = await f.service.apiRequest(config, '/conversations', {});
  await f.service.apiRequest(config, '/responses', { conversation: id, model: config.model, input: 'First turn', store: true });
  await f.service.apiRequest(config, '/responses', { conversation: id, model: config.model, input: 'Follow-up' });
  for (const call of f.calls) { assert.ok(call.url.startsWith('https://api.arena.ai/v1/')); assert.equal(call.headers.Authorization, 'Bearer ' + token); assert.equal(call.redirect, 'error'); }
  const last = f.calls.at(-1); assert.equal(last.body.store, false); assert.equal(last.body.conversation, undefined);
  assert.equal(last.body.input.length, 3); assert.equal(last.body.input[0].content, 'First turn'); assert.equal(last.body.input[1].role, 'assistant');
});
test('Claude API converts project schemas, text and screenshot data to Messages format', async t => {
  const f = fixture(t, () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"summary":"Ready"}' }] }));
  f.service.set({ provider: 'anthropic', key: token, model: 'account-selected-model' });
  const config = f.service.resolve(), response = await f.service.apiRequest(config, '/responses', {
    model: config.model, instructions: 'Help with this project.', max_output_tokens: 99999,
    text: { format: { schema: { type: 'object', properties: { summary: { type: 'string' } } } } },
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'Please inspect.' }, { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' }] }]
  });
  const call = f.calls[0]; assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.headers['x-api-key'], token); assert.equal(call.headers.Authorization, undefined);
  assert.equal(call.body.max_tokens, 16384); assert.match(call.body.system, /"summary"/);
  assert.equal(call.body.messages[0].content[1].source.media_type, 'image/png');
  assert.equal(response.output[0].content[0].type, 'output_text'); assert.equal(response.status, 'completed');
});
test('restricted Arena keys are blocked locally and provider restrictions are explained without retry', async t => {
  const f = fixture(t, () => ({ _status: 403, error: { code: 'organization_client_restricted' } }));
  f.service.set({ provider: 'arena', key: token, arenaAccess: 'claude-code-only' });
  await assert.rejects(f.service.answer('Hello'), /Configure/); assert.equal(f.calls.length, 0);
  assert.equal(f.service.claudeEnvironment().ANTHROPIC_AUTH_TOKEN, token);
  f.service.set({ arenaAccess: 'api' });
  await assert.rejects(f.service.answer('Hello'), /interactive Claude Code/); assert.equal(f.calls.length, 1);
});
test('provider errors hide the active key and network failures reveal no credential headers', async t => {
  const f = fixture(t, () => ({ _status: 401, error: { message: 'Rejected ' + token } }));
  f.service.set({ provider: 'arena', key: token });
  await assert.rejects(f.service.answer('Hello'), e => !e.message.includes(token) && /HTTP 401/.test(e.message));
  const offline = createProviderService({ directory: f.directory, safeStorage: f.safeStorage, env: {}, fetch: async () => { throw new Error('Internal headers: ' + token); } });
  await assert.rejects(offline.answer('Hello'), e => !e.message.includes(token) && /internet connection/.test(e.message));
});
test('Arena launches use gateway root and do not inherit the selected Anthropic model', t => {
  const f = fixture(t); f.service.set({ provider: 'arena', key: token });
  f.service.set({ provider: 'anthropic', model: 'claude-model-from-account' });
  const env = f.service.claudeEnvironment(); assert.equal(env.ANTHROPIC_BASE_URL, 'https://api.arena.ai');
  assert.equal(env.ANTHROPIC_MODEL, 'coding-router-preview'); assert.equal(env.CLAUDE_CODE_MODEL_CAPABILITIES, 'coding-router-preview=-effort');
});
