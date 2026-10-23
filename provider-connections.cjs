'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOTS = Object.freeze({ arena: 'https://api.arena.ai/v1', anthropic: 'https://api.anthropic.com/v1' });
const read = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
function createProviderService({ directory, safeStorage, fetch: request = globalThis.fetch, env = process.env }) {
  const file = path.join(directory, 'provider-connections.json');
  const historyFile = path.join(directory, 'provider-conversations.json');
  const write = (target, value) => { fs.mkdirSync(directory, { recursive: true }); const temp = target + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(temp, target); };
  const raw = () => ({ provider: 'off', model: '', arenaAccess: 'api', keys: {}, ...read(file, {}) });
  function key(provider, config = raw()) {
    const encrypted = config.keys?.[provider];
    if (encrypted) { try { return safeStorage.decryptString(Buffer.from(encrypted, 'base64')); } catch { return ''; } }
    return provider === 'arena' ? env.ARENA_API_KEY || '' : env.ANTHROPIC_API_KEY || '';
  }
  function publicConfig() {
    const config = raw(), token = ROOTS[config.provider] ? key(config.provider, config) : '';
    return { provider: config.provider, model: config.model, arenaAccess: config.arenaAccess,
      hasKey: !!token, active: !!token && !!config.model && !(config.provider === 'arena' && config.arenaAccess === 'claude-code-only'),
      keyStatus: { arena: !!key('arena', config), anthropic: !!key('anthropic', config) } };
  }
  function set(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid provider settings.');
    const config = raw(), provider = patch.provider ?? config.provider;
    if (!['off', 'arena', 'anthropic'].includes(provider)) throw new Error('Choose Arena, Claude API, or Off.');
    const model = String(patch.model ?? (provider === config.provider ? config.model : provider === 'arena' ? 'coding-router-preview' : '')).trim();
    if (model.length > 200 || /[\r\n\x00-\x1f]/.test(model)) throw new Error('Invalid model ID.');
    const access = patch.arenaAccess ?? config.arenaAccess;
    if (!['api', 'claude-code-only'].includes(access)) throw new Error('Invalid Arena access type.');
    const next = { ...config, provider, model, arenaAccess: access, keys: { ...config.keys } };
    if (patch.clearKey === true && ROOTS[provider]) delete next.keys[provider];
    else if (typeof patch.key === 'string' && patch.key.trim()) {
      const token = patch.key.trim();
      if (!ROOTS[provider] || token.length < 8 || token.length > 4000 || /[\r\n\x00-\x1f]/.test(token)) throw new Error('Enter a valid API key.');
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure Windows key storage is unavailable. The key was not saved.');
      next.keys[provider] = safeStorage.encryptString(token).toString('base64');
    }
    write(file, next); return publicConfig();
  }
  function resolve() {
    const config = raw(); if (!ROOTS[config.provider]) return null;
    const token = key(config.provider, config);
    return { provider: config.provider, name: config.provider === 'arena' ? 'Arena API' : 'Claude API', key: token,
      ready: !!token && !!config.model && !(config.provider === 'arena' && config.arenaAccess === 'claude-code-only'), model: config.model,
      source: 'personal-api-key', fingerprint: crypto.createHash('sha256').update(config.provider + ':' + config.model + ':' + token).digest('hex').slice(0, 20) };
  }
  async function http(provider, endpoint, method = 'GET', body) {
    if (!ROOTS[provider] || !['/models', '/messages', '/responses'].includes(endpoint)) throw new Error('Unsupported provider endpoint.');
    const token = key(provider); if (!token) throw new Error('Save your API key in AI Connections first.');
    const headers = { 'Content-Type': 'application/json', ...(provider === 'arena' ? { Authorization: 'Bearer ' + token } : { 'x-api-key': token, 'anthropic-version': '2023-06-01' }) };
    let response;
    try { response = await request(ROOTS[provider] + endpoint, { method, headers, redirect: 'error', signal: AbortSignal.timeout(180000), ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch (error) { throw new Error(error.name === 'TimeoutError' ? 'The AI request timed out.' : 'The provider could not be reached. Check your internet connection.'); }
    let data; try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      if (provider === 'arena' && response.status === 403 && (data.error?.code === 'organization_client_restricted' || /organization_client_restricted/.test(JSON.stringify(data)))) throw new Error('This Arena key is restricted to the interactive Claude Code app. Use Open Claude via Arena, or use an Arena workspace key with API access for desktop chat and project tools.');
      const message = String(data.error?.message || data.message || 'Provider request failed').replaceAll(token, '[hidden]').replace(/\b(?:sk-[A-Za-z0-9_-]+|Bearer\s+\S+)/g, '[hidden]').slice(0, 350);
      throw new Error(message + ' (HTTP ' + response.status + ')');
    }
    return data;
  }
  async function models(provider = raw().provider) {
    const data = await http(provider, '/models');
    return (Array.isArray(data.data) ? data.data : []).map(m => ({ id: String(m.id || ''), name: String(m.display_name || m.name || m.id || '') })).filter(m => m.id);
  }
  function messages(input) {
    if (typeof input === 'string') return [{ role: 'user', content: [{ type: 'text', text: input }] }];
    return (Array.isArray(input) ? input : []).filter(m => ['user','assistant'].includes(m.role)).map(m => ({ role: m.role,
      content: (typeof m.content === 'string' ? [{ type: 'input_text', text: m.content }] : m.content || []).flatMap(c => {
        if (c.type === 'input_text' || c.type === 'output_text' || c.type === 'text') return [{ type: 'text', text: String(c.text || '') }];
        if (c.type === 'input_image' && /^data:image\/(png|jpeg|webp);base64,/.test(c.image_url || '')) { const [meta, data] = c.image_url.split(','); return [{ type: 'image', source: { type: 'base64', media_type: meta.slice(5, meta.indexOf(';')), data } }]; }
        return [];
      }) }));
  }
  const getText = data => data.output_text || (data.output || []).flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text || '').join('\n');
  async function apiRequest(config, endpoint, body) {
    if (endpoint === '/conversations') { const id = 'dynamic7land_' + crypto.randomUUID(); const histories = read(historyFile, {}); histories[id] = []; write(historyFile, histories); return { id }; }
    if (endpoint !== '/responses') throw new Error('This provider does not support ' + endpoint + '.');
    if (!config.ready) throw new Error('Finish AI Connections setup first. Restricted Arena keys support the interactive Claude Code app only.');
    const histories = read(historyFile, {}), previous = body.conversation ? histories[body.conversation] || [] : [];
    const input = [...previous, ...(Array.isArray(body.input) ? body.input : [{ role: 'user', content: body.input || '' }])];
    let result;
    if (config.provider === 'arena') {
      const { conversation, store, ...payload } = body;
      result = await http('arena', '/responses', 'POST', { ...payload, input, store: false });
    } else {
      const schema = body.text?.format?.schema;
      const data = await http('anthropic', '/messages', 'POST', { model: config.model, max_tokens: Math.min(body.max_output_tokens || 4096, 16384),
        system: String(body.instructions || '') + (schema ? '\nReturn only valid JSON matching this schema: ' + JSON.stringify(schema) : ''), messages: messages(input) });
      result = { status: data.stop_reason === 'max_tokens' ? 'incomplete' : 'completed', output: [{ type: 'message', role: 'assistant', content: (data.content || []).filter(c => c.type === 'text').map(c => ({ type: 'output_text', text: c.text })) }] };
    }
    if (body.conversation && result.status !== 'incomplete') {
      histories[body.conversation] = [...input, { role: 'assistant', content: [{ type: 'output_text', text: getText(result) }] }].slice(-12);
      const kept = Object.fromEntries(Object.entries(histories).slice(-40));
      if (JSON.stringify(kept).length < 8 * 1024 * 1024) write(historyFile, kept);
    }
    return result;
  }
  async function answer(prompt, instructions = '', images = []) {
    const config = resolve(); if (!config?.ready) throw new Error('Configure your API connection in AI Connections first.');
    const content = [{ type: 'input_text', text: prompt }];
    for (const image of images.slice(0, 3)) { const data = fs.readFileSync(image); if (data.length > 10 * 1024 * 1024) throw new Error('The screenshot is too large.'); content.push({ type: 'input_image', image_url: 'data:image/png;base64,' + data.toString('base64') }); }
    const response = await apiRequest(config, '/responses', { model: config.model, instructions: instructions + '\nReply in English unless the user asks for another language.', input: [{ role: 'user', content }], max_output_tokens: 6000, store: false });
    const text = getText(response); if (!text) throw new Error('The provider returned no readable answer.'); return text;
  }
  function claudeEnvironment() {
    const config = raw(), token = key('arena', config);
    if (!token) throw new Error('Save an Arena API key first.');
    const model = config.provider === 'arena' && config.model ? config.model : 'coding-router-preview';
    return { ANTHROPIC_BASE_URL: 'https://api.arena.ai', ANTHROPIC_AUTH_TOKEN: token, ANTHROPIC_MODEL: model,
      ANTHROPIC_DEFAULT_MODEL: model, ANTHROPIC_SMALL_FAST_MODEL: model, CLAUDE_CODE_SUBAGENT_MODEL: model,
      CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT: '1', CLAUDE_CODE_MODEL_CAPABILITIES: model + '=-effort' };
  }
  return { publicConfig, set, resolve, models, apiRequest, answer, claudeEnvironment };
}
module.exports = { createProviderService, ROOTS };
