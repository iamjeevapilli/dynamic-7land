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

test('free cloud requests reject paid models and ignore paid routing, plugins and model overrides', async t => {
  const f = fixture(t, () => ({ choices: [{ message: { content: 'Free answer' }, finish_reason: 'stop' }] }));
  const state = f.service.set({ provider: 'openrouter', key: token });
  assert.equal(state.model, 'openrouter/free'); assert.equal(state.freeOnly, true);
  assert.equal(JSON.stringify(state).includes(token), false);
  assert.equal(fs.readFileSync(path.join(f.directory, 'provider-connections.json'), 'utf8').includes(token), false);
  assert.throws(() => f.service.set({ model: 'paid/model' }), /Paid models are blocked/);
  const config = f.service.resolve();
  await f.service.apiRequest(config, '/responses', { model: 'paid/model', models: ['paid/fallback'], plugins: [{ id: 'web' }],
    provider: { max_price: { prompt: 99 } }, input: 'Hello', instructions: 'Help me' });
  const call = f.calls[0];
  assert.equal(call.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(call.body.model, 'openrouter/free'); assert.equal(call.body.models, undefined); assert.equal(call.body.plugins, undefined);
  assert.deepEqual(call.body.provider.max_price, { prompt: 0, completion: 0, request: 0, image: 0 });
  assert.equal(call.body.provider.allow_fallbacks, false); assert.equal(call.redirect, 'error');
  assert.equal(call.headers.Authorization, 'Bearer ' + token);
  await assert.rejects(f.service.apiRequest({ ...config, model: 'paid/model' }, '/responses', { input: 'Hello' }), /Paid models are blocked/);
  assert.equal(f.calls.length, 1);
});

test('free cloud model discovery excludes missing prices, non-free IDs and any nonzero price', async t => {
  const f = fixture(t, () => ({ data: [
    { id: 'vendor/free:free', name: 'Free', pricing: { prompt: '0', completion: '0', request: '0' } },
    { id: 'vendor/paid', pricing: { prompt: '0', completion: '0' } },
    { id: 'vendor/missing:free', pricing: { prompt: '0' } },
    { id: 'vendor/image:free', pricing: { prompt: '0', completion: '0', image: '0.01' } },
    { id: 'vendor/unknown:free', pricing: { prompt: '0', completion: '0', request: 'unknown' } }
  ] }));
  f.service.set({ provider: 'openrouter', key: token });
  assert.deepEqual((await f.service.models()).map(m => m.id), ['openrouter/free', 'vendor/free:free']);
});

test('free cloud images, schemas and conversation history reach the free route without a paid retry', async t => {
  const f = fixture(t, () => ({ choices: [{ message: { content: '{"answer":"Ready"}' }, finish_reason: 'stop' }] }));
  f.service.set({ provider: 'openrouter', key: token, model: 'vendor/model:free' });
  const config = f.service.resolve(), schema = { type: 'object', properties: { answer: { type: 'string' } } };
  const { id } = await f.service.apiRequest(config, '/conversations', {});
  const input = [{ role: 'user', content: [{ type: 'input_text', text: 'Read this.' }, { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' }] }];
  await f.service.apiRequest(config, '/responses', { conversation: id, input, text: { format: { schema } } });
  assert.deepEqual(f.calls[0].body.response_format.json_schema.schema, schema);
  assert.equal(f.calls[0].body.messages[0].content[1].image_url.url, 'data:image/png;base64,aGVsbG8=');
  await f.service.apiRequest(config, '/responses', { conversation: id, input: 'Follow up' });
  assert.equal(f.calls[1].body.messages.length, 3);
  const limited = fixture(t, () => ({ _status: 429, error: { message: 'Quota' } }));
  limited.service.set({ provider: 'openrouter', key: token });
  await assert.rejects(limited.service.answer('Hello'), /Paid fallback is blocked/); assert.equal(limited.calls.length, 1);
});

function localReply(url, call) {
  if (url.endsWith('/api/tags')) return { models: [
    { name: 'small:latest', size: 2000000 }, { name: 'vision:latest', size: 4000000 },
    { name: 'remote:latest', size: 100, remote_host: 'https://ollama.com' }, { name: 'gemma4:cloud', size: 100 }, { name: 'empty', size: 0 }
  ] };
  if (url.endsWith('/api/show')) return { details: { format: 'gguf' }, model_info: { 'general.architecture': 'test' }, capabilities: call.body.model === 'vision:latest' ? ['completion', 'vision'] : ['completion'] };
  return { message: { content: 'Local answer' }, done_reason: 'stop' };
}

test('local AI works without key storage or API secrets and exposes only downloaded local models', async t => {
  const f = fixture(t, localReply); f.safeStorage.isEncryptionAvailable = () => false;
  const config = f.service.set({ provider: 'ollama', model: 'small' });
  assert.equal(config.active, true); assert.equal(config.hasKey, false); assert.equal(config.local, true);
  assert.deepEqual((await f.service.models()).map(m => m.id), ['small:latest', 'vision:latest']);
  assert.equal(await f.service.answer('Hello'), 'Local answer');
  for (const call of f.calls) {
    assert.ok(call.url.startsWith('http://127.0.0.1:11434/api/')); assert.equal(call.headers.Authorization, undefined);
    assert.equal(call.headers['x-api-key'], undefined); assert.equal(call.redirect, 'error');
  }
  assert.throws(() => f.service.set({ key: token }), /does not use an API key/);
  assert.throws(() => f.service.set({ model: 'gemma4:cloud' }), /Cloud models are blocked/);
});

test('local screenshot support is checked before sending images and local project schemas are preserved', async t => {
  const f = fixture(t, localReply); f.service.set({ provider: 'ollama', model: 'small' });
  const input = [{ role: 'user', content: [{ type: 'input_text', text: 'Read this.' }, { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' }] }];
  await assert.rejects(f.service.apiRequest(f.service.resolve(), '/responses', { input }), /cannot read screenshots/);
  assert.equal(f.calls.some(call => call.url.endsWith('/api/chat')), false);
  f.service.set({ model: 'vision:latest' });
  const schema = { type: 'object', properties: { answer: { type: 'string' } } };
  await f.service.apiRequest(f.service.resolve(), '/responses', { input, instructions: 'Review only', text: { format: { schema } } });
  const sent = f.calls.at(-1).body;
  assert.deepEqual(sent.format, schema); assert.equal(sent.messages[0].role, 'system');
  assert.deepEqual(sent.messages[1].images, ['aGVsbG8=']); assert.equal(sent.stream, false);
});

test('a local-looking alias for a remote model is rejected without sending a prompt or screenshot', async t => {
  const f = fixture(t, (url, call) => url.endsWith('/api/show') ? { ...localReply(url, call), remote_model: 'remote-model' } : localReply(url, call));
  f.service.set({ provider: 'ollama', model: 'small' });
  await assert.rejects(f.service.answer('private text'), /could not be verified/);
  assert.equal(f.calls.some(call => JSON.stringify(call.body || {}).includes('private text')), false);
  f.service.set({ model: 'not-downloaded' });
  await assert.rejects(f.service.answer('private text'), /Download this local model/);
});

test('offline local AI gives setup guidance and unknown providers cannot fall through to a paid provider', async t => {
  const f = fixture(t, () => { throw new Error('Connection refused'); }); f.service.set({ provider: 'ollama', model: 'small' });
  await assert.rejects(f.service.answer('Hello'), /Open Ollama/); assert.equal(f.calls.length, 1);
  await assert.rejects(f.service.apiRequest({ provider: 'unknown', ready: true }, '/responses', { input: 'Hello' }), /Unsupported AI provider/);
  assert.equal(f.calls.length, 1);
});
