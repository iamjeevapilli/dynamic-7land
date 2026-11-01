'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOTS = Object.freeze({ arena: 'https://api.arena.ai/v1' });
const PROVIDER_NAMES = Object.freeze({ arena: 'Arena' });
const DEFAULT_MODEL = 'coding-router-preview';
const supports = provider => provider === 'arena';
const read = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
function createProviderService({ directory, safeStorage, fetch: request = globalThis.fetch, env = process.env }) {
  const file = path.join(directory, 'provider-connections.json');
  const historyFile = path.join(directory, 'provider-conversations.json');
  const write = (target, value) => { fs.mkdirSync(directory, { recursive: true }); const temp = target + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(temp, target); };
  function raw() {
    const saved = read(file, null);
    const provider = saved?.provider === 'off' ? 'off' : 'arena';
    const hadArena = saved?.provider === 'arena' || !!saved?.keys?.arena;
    const config = { provider, model: provider === 'arena' ? (saved?.provider === 'arena' && saved.model || DEFAULT_MODEL) : '',
      arenaAccess: hadArena && ['api', 'claude-code-only'].includes(saved?.arenaAccess) ? saved.arenaAccess : 'claude-code-only',
      keys: saved?.keys?.arena ? { arena: saved.keys.arena } : {} };
    // Drop retired routes and their unused encrypted keys during an upgrade.
    // Keep the Arena key and conversation file; no external accounts are changed.
    if (saved && JSON.stringify(saved) !== JSON.stringify(config)) write(file, config);
    return config;
  }
  function key(config = raw()) {
    if (config.keys.arena) { try { return safeStorage.decryptString(Buffer.from(config.keys.arena, 'base64')); } catch { return ''; } }
    return env.ARENA_API_KEY || '';
  }
  const ready = config => supports(config.provider) && !!config.model && !!key(config) && config.arenaAccess === 'api';
  function publicConfig() {
    const config = raw();
    return { provider: config.provider, providerName: PROVIDER_NAMES[config.provider] || 'Existing account setup', model: config.model, arenaAccess: config.arenaAccess,
      hasKey: !!key(config), active: ready(config), keyStatus: { arena: !!key(config) } };
  }
  function set(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid connection settings.');
    const config = raw(), provider = patch.provider ?? config.provider;
    if (provider !== 'off' && !supports(provider)) throw new Error('Choose Arena or your existing Claude / Codex account.');
    const model = String(patch.model ?? (provider === config.provider ? config.model : provider === 'arena' ? DEFAULT_MODEL : '')).trim();
    if (model.length > 200 || /[\r\n\x00-\x1f]/.test(model)) throw new Error('Invalid model ID.');
    const access = patch.arenaAccess ?? config.arenaAccess;
    if (!['api', 'claude-code-only'].includes(access)) throw new Error('Invalid Arena access type.');
    const next = { provider, model, arenaAccess: access, keys: { ...config.keys } };
    if (patch.clearKey === true) delete next.keys.arena;
    else if (typeof patch.key === 'string' && patch.key.trim()) {
      const token = patch.key.trim();
      if (!supports(provider) || token.length < 8 || token.length > 4000 || /[\r\n\x00-\x1f]/.test(token)) throw new Error('Enter a valid Arena API key.');
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure Windows key storage is unavailable. The key was not saved.');
      next.keys.arena = safeStorage.encryptString(token).toString('base64');
    }
    write(file, next); return publicConfig();
  }
  function resolve() {
    const config = raw(); if (!supports(config.provider)) return null;
    const token = key(config);
    return { provider: 'arena', name: PROVIDER_NAMES.arena, key: token, ready: ready(config), model: config.model, source: 'personal-api-key',
      fingerprint: crypto.createHash('sha256').update('arena:' + config.model + ':' + config.arenaAccess + ':' + token).digest('hex').slice(0, 20) };
  }
  async function http(endpoint, method = 'GET', body) {
    if (!['/models', '/responses'].includes(endpoint)) throw new Error('Unsupported Arena endpoint.');
    const token = key(); if (!token) throw new Error('Save your Arena key in AI connections first.');
    let response;
    try { response = await request(ROOTS.arena + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      redirect: 'error', signal: AbortSignal.timeout(method === 'GET' ? 15000 : 180000), ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch (error) { throw new Error(error.name === 'TimeoutError' ? 'The Arena request timed out.' : 'Arena could not be reached. Check your internet connection.'); }
    let data; try { data = await response.json(); } catch { throw new Error('Arena returned an invalid response.'); }
    if (!response.ok || data.error) {
      if (response.status === 403 && /organization_client_restricted/.test(JSON.stringify(data))) throw new Error('This Arena key is restricted to interactive Claude Code. Select Interactive Claude Code only and choose Save and open Claude via Arena. Desktop chat requires a workspace with API access.');
      const message = String(data.error?.message || (typeof data.error === 'string' ? data.error : '') || data.message || 'Arena request failed');
      const hidden = message.replaceAll(token, '[hidden]').replace(/\b(?:sk-[A-Za-z0-9_-]+|Bearer\s+\S+)/g, '[hidden]').slice(0, 350);
      throw new Error(hidden + ' (HTTP ' + response.status + ')');
    }
    return data;
  }
  async function models(provider = raw().provider) {
    if (!supports(provider)) throw new Error('Select Arena to load its models.');
    const data = await http('/models');
    return (Array.isArray(data.data) ? data.data : []).map(m => ({ id: String(m.id || ''), name: String(m.display_name || m.name || m.id || '') })).filter(m => m.id);
  }
  const getText = data => data.output_text || (data.output || []).flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text || '').join('\n');
  async function apiRequest(config, endpoint, body) {
    if (!config || !supports(config.provider)) throw new Error('Unsupported AI provider.');
    if (endpoint === '/conversations') { const id = 'dynamic7land_' + crypto.randomUUID(); const histories = read(historyFile, {}); histories[id] = []; write(historyFile, histories); return { id }; }
    if (endpoint !== '/responses') throw new Error('Arena does not support ' + endpoint + '.');
    if (!config.ready) throw new Error('Desktop chat requires an Arena workspace with API access. For a free-router key, choose Save and open Claude via Arena in AI connections.');
    const histories = read(historyFile, {}), previous = body.conversation ? histories[body.conversation] || [] : [];
    const input = [...previous, ...(Array.isArray(body.input) ? body.input : [{ role: 'user', content: body.input || '' }])];
    const result = await http('/responses', 'POST', { model: config.model, input, instructions: String(body.instructions || ''),
      max_output_tokens: Math.max(1, Math.min(Math.floor(Number(body.max_output_tokens)) || 4096, 16384)),
      ...(body.text ? { text: body.text } : {}), stream: false, store: false });
    if (body.conversation && result.status !== 'incomplete') {
      histories[body.conversation] = [...input, { role: 'assistant', content: [{ type: 'output_text', text: getText(result) }] }].slice(-12);
      const kept = Object.fromEntries(Object.entries(histories).slice(-40));
      if (JSON.stringify(kept).length < 8 * 1024 * 1024) write(historyFile, kept);
    }
    return result;
  }
  async function answer(prompt, instructions = '', images = []) {
    const config = resolve();
    if (!config?.ready) throw new Error(config?.key ? 'This connection is set to interactive Claude Code only. Use Save and open Claude via Arena, or select Workspace with API access if your Arena workspace permits API requests.' : 'Save your Arena key in AI connections first.');
    const content = [{ type: 'input_text', text: prompt }];
    for (const image of images.slice(0, 3)) { const data = fs.readFileSync(image); if (data.length > 10 * 1024 * 1024) throw new Error('The screenshot is too large.'); content.push({ type: 'input_image', image_url: 'data:image/png;base64,' + data.toString('base64') }); }
    const response = await apiRequest(config, '/responses', { instructions: instructions + '\nReply in English unless the user asks for another language.', input: [{ role: 'user', content }], max_output_tokens: 6000 });
    const text = getText(response); if (!text) throw new Error('Arena returned no readable answer.'); return text;
  }
  function claudeEnvironment() {
    const config = raw(), token = key(config);
    if (!token) throw new Error('Save an Arena API key first.');
    const model = config.provider === 'arena' && config.model ? config.model : DEFAULT_MODEL;
    return { ANTHROPIC_BASE_URL: 'https://api.arena.ai', ANTHROPIC_AUTH_TOKEN: token, ANTHROPIC_MODEL: model,
      ANTHROPIC_DEFAULT_MODEL: model, ANTHROPIC_SMALL_FAST_MODEL: model, CLAUDE_CODE_SUBAGENT_MODEL: model,
      CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT: '1', CLAUDE_CODE_MODEL_CAPABILITIES: model + '=-effort' };
  }
  return { publicConfig, set, resolve, models, apiRequest, answer, claudeEnvironment, supports };
}
module.exports = { createProviderService, ROOTS, PROVIDER_NAMES };
