'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOTS = Object.freeze({ arena: 'https://api.arena.ai/v1', anthropic: 'https://api.anthropic.com/v1', openrouter: 'https://openrouter.ai/api/v1', ollama: 'http://127.0.0.1:11434' });
const PROVIDER_NAMES = Object.freeze({ arena: 'Arena API', anthropic: 'Claude API', openrouter: 'OpenRouter — free models only', ollama: 'Ollama — local models' });
const DEFAULT_MODELS = { arena: 'coding-router-preview', openrouter: 'openrouter/free' };
const ENDPOINTS = { arena: ['/models', '/responses'], anthropic: ['/models', '/messages'], openrouter: ['/models', '/chat/completions'], ollama: ['/api/tags', '/api/show', '/api/chat'] };
const supports = provider => Object.hasOwn(ROOTS, provider);
const freeModel = model => model === 'openrouter/free' || /^[a-z0-9][a-z0-9._/-]*:free$/i.test(model);
const cloudModel = model => /(?:[:/-])cloud(?:$|[:/-])/i.test(model);
const read = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
function createProviderService({ directory, safeStorage, fetch: request = globalThis.fetch, env = process.env }) {
  const file = path.join(directory, 'provider-connections.json');
  const historyFile = path.join(directory, 'provider-conversations.json');
  const write = (target, value) => { fs.mkdirSync(directory, { recursive: true }); const temp = target + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(temp, target); };
  const raw = () => ({ provider: 'off', model: '', arenaAccess: 'api', keys: {}, ...read(file, {}) });
  function key(provider, config = raw()) {
    if (provider === 'ollama' || !supports(provider)) return '';
    const encrypted = config.keys?.[provider];
    if (encrypted) { try { return safeStorage.decryptString(Buffer.from(encrypted, 'base64')); } catch { return ''; } }
    const variable = { arena: 'ARENA_API_KEY', anthropic: 'ANTHROPIC_API_KEY', openrouter: 'OPENROUTER_API_KEY' }[provider];
    return variable ? env[variable] || '' : '';
  }
  function ready(config) {
    return supports(config.provider) && !!config.model && (config.provider === 'ollama' || !!key(config.provider, config)) &&
      !(config.provider === 'arena' && config.arenaAccess === 'claude-code-only') &&
      !(config.provider === 'openrouter' && !freeModel(config.model)) && !(config.provider === 'ollama' && cloudModel(config.model));
  }
  function publicConfig() {
    const config = raw();
    return { provider: config.provider, providerName: PROVIDER_NAMES[config.provider] || 'Existing account setup', model: config.model, arenaAccess: config.arenaAccess,
      hasKey: !!key(config.provider, config), active: ready(config), freeOnly: config.provider === 'openrouter', local: config.provider === 'ollama',
      keyStatus: Object.fromEntries(Object.keys(ROOTS).map(provider => [provider, !!key(provider, config)])) };
  }
  function set(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid provider settings.');
    const config = raw(), provider = patch.provider ?? config.provider;
    if (provider !== 'off' && !supports(provider)) throw new Error('Choose a supported AI provider.');
    const model = String(patch.model ?? (provider === config.provider ? config.model : DEFAULT_MODELS[provider] || '')).trim();
    if (model.length > 200 || /[\r\n\x00-\x1f]/.test(model)) throw new Error('Invalid model ID.');
    if (provider === 'openrouter' && model && !freeModel(model)) throw new Error('Paid models are blocked. Choose openrouter/free or an available model ending in :free.');
    if (provider === 'ollama' && cloudModel(model)) throw new Error('Choose a downloaded local Ollama model. Cloud models are blocked in this option.');
    const access = patch.arenaAccess ?? config.arenaAccess;
    if (!['api', 'claude-code-only'].includes(access)) throw new Error('Invalid Arena access type.');
    const next = { ...config, provider, model, arenaAccess: access, keys: { ...config.keys } };
    if (patch.clearKey === true && supports(provider)) delete next.keys[provider];
    else if (typeof patch.key === 'string' && patch.key.trim()) {
      const token = patch.key.trim();
      if (provider === 'ollama') throw new Error('Local Ollama does not use an API key. Leave the key field empty.');
      if (!supports(provider) || token.length < 8 || token.length > 4000 || /[\r\n\x00-\x1f]/.test(token)) throw new Error('Enter a valid API key.');
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure Windows key storage is unavailable. The key was not saved.');
      next.keys[provider] = safeStorage.encryptString(token).toString('base64');
    }
    write(file, next); return publicConfig();
  }
  function resolve() {
    const config = raw(); if (!supports(config.provider)) return null;
    const token = key(config.provider, config);
    return { provider: config.provider, name: PROVIDER_NAMES[config.provider], key: token, ready: ready(config), model: config.model,
      source: config.provider === 'ollama' ? 'local-model' : 'personal-api-key',
      fingerprint: crypto.createHash('sha256').update(config.provider + ':' + config.model + ':' + token).digest('hex').slice(0, 20) };
  }
  async function http(provider, endpoint, method = 'GET', body) {
    if (!supports(provider) || !ENDPOINTS[provider].includes(endpoint)) throw new Error('Unsupported provider endpoint.');
    const token = key(provider); if (provider !== 'ollama' && !token) throw new Error('Save your API key in AI Connections first.');
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'anthropic') Object.assign(headers, { 'x-api-key': token, 'anthropic-version': '2023-06-01' });
    else if (provider !== 'ollama') headers.Authorization = 'Bearer ' + token;
    let response;
    try { response = await request(ROOTS[provider] + endpoint, { method, headers, redirect: 'error', signal: AbortSignal.timeout(provider === 'ollama' ? 300000 : 180000), ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch (error) {
      if (error.name === 'TimeoutError') throw new Error(provider === 'ollama' ? 'The local model timed out. Try a smaller model for this PC.' : 'The AI request timed out.');
      throw new Error(provider === 'ollama' ? 'Ollama could not be reached on this PC. Open Ollama, download a local model, then choose Load models.' : 'The provider could not be reached. Check your internet connection.');
    }
    let data; try { data = await response.json(); } catch { throw new Error('The AI provider returned an invalid response.'); }
    if (!response.ok || data.error) {
      if (provider === 'arena' && response.status === 403 && (data.error?.code === 'organization_client_restricted' || /organization_client_restricted/.test(JSON.stringify(data)))) throw new Error('This Arena key is restricted to the interactive Claude Code app. Use Open Claude via Arena, or use an Arena workspace key with API access for desktop chat and project tools.');
      if (provider === 'openrouter' && response.status === 429) throw new Error('The free model quota is reached or the model is busy. Try later, choose another free model, or use local Ollama. Paid fallback is blocked.');
      const message = String(data.error?.message || (typeof data.error === 'string' ? data.error : '') || data.message || 'Provider request failed');
      const hidden = (token ? message.replaceAll(token, '[hidden]') : message).replace(/\b(?:sk-[A-Za-z0-9_-]+|Bearer\s+\S+)/g, '[hidden]').slice(0, 350);
      throw new Error(hidden + ' (HTTP ' + response.status + ')');
    }
    return data;
  }
  const localEntry = model => Number(model.size) > 0 && !model.remote_host && !model.remote_model && !cloudModel(model.name || model.model || '');
  async function localModels() { const data = await http('ollama', '/api/tags'); return (Array.isArray(data.models) ? data.models : []).filter(localEntry); }
  async function models(provider = raw().provider) {
    if (provider === 'ollama') return (await localModels()).map(m => ({ id: String(m.name || m.model), name: String(m.name || m.model) }));
    const data = await http(provider, '/models');
    let list = Array.isArray(data.data) ? data.data : [];
    if (provider === 'openrouter') list = list.filter(m => freeModel(m.id || '') && m.pricing && ['prompt', 'completion'].every(field => m.pricing[field] !== undefined && Number(m.pricing[field]) === 0) && Object.values(m.pricing).every(value => value !== null && Number.isFinite(Number(value)) && Number(value) === 0));
    const found = list.map(m => ({ id: String(m.id || ''), name: String(m.display_name || m.name || m.id || '') })).filter(m => m.id);
    if (provider === 'openrouter' && !found.some(m => m.id === 'openrouter/free')) found.unshift({ id: 'openrouter/free', name: 'Free models router' });
    return found;
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
  const responseText = (text, incomplete = false) => {
    if (typeof text !== 'string' || !text.trim()) throw new Error('The provider returned no readable answer. Try a different available model.');
    return { status: incomplete ? 'incomplete' : 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] };
  };
  async function freeRequest(config, input, instructions, schema, limit) {
    const converted = messages(input);
    if (config.provider === 'openrouter') {
      if (!freeModel(config.model)) throw new Error('Paid models are blocked. Choose openrouter/free or an available :free model.');
      const chats = converted.map(m => ({ role: m.role, content: m.content.map(c => c.type === 'text' ? c : { type: 'image_url', image_url: { url: 'data:' + c.source.media_type + ';base64,' + c.source.data } }) }));
      if (instructions) chats.unshift({ role: 'system', content: instructions });
      const data = await http('openrouter', '/chat/completions', 'POST', { model: config.model, messages: chats, stream: false, max_tokens: limit,
        provider: { allow_fallbacks: false, require_parameters: true, max_price: { prompt: 0, completion: 0, request: 0, image: 0 } },
        ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: 'dynamic7land_response', strict: true, schema } } } : {}) });
      const choice = data.choices?.[0];
      return responseText(choice?.message?.content, choice?.finish_reason === 'length');
    }
    const installed = await localModels();
    const chosen = installed.find(m => (m.name || m.model) === config.model || (!config.model.includes(':') && (m.name || m.model) === config.model + ':latest'));
    if (!chosen) throw new Error('Download this local model in Ollama first, then choose Load models. Cloud models are not available in this option.');
    const model = chosen.name || chosen.model;
    const info = await http('ollama', '/api/show', 'POST', { model });
    if (info.remote_host || info.remote_model || !info.model_info || !Object.keys(info.model_info).length || info.details?.format !== 'gguf' || /(?:^|\n)\s*FROM\s+.*(?:[:/-])cloud(?:\s|$)/i.test(info.modelfile || '')) throw new Error('This model could not be verified as a downloaded local model. Choose another local Ollama model.');
    if (converted.some(m => m.content.some(c => c.type === 'image')) && !info.capabilities?.includes('vision')) throw new Error('This local model cannot read screenshots. Choose a downloaded vision model such as gemma3:4b, or ask a text-only question.');
    const chats = converted.map(m => ({ role: m.role, content: m.content.filter(c => c.type === 'text').map(c => c.text).join('\n'), images: m.content.filter(c => c.type === 'image').map(c => c.source.data) }));
    if (instructions) chats.unshift({ role: 'system', content: instructions });
    const data = await http('ollama', '/api/chat', 'POST', { model, messages: chats, stream: false, options: { num_predict: limit }, ...(schema ? { format: schema } : {}) });
    return responseText(data.message?.content, data.done_reason === 'length');
  }
  async function apiRequest(config, endpoint, body) {
    if (!config || !supports(config.provider)) throw new Error('Unsupported AI provider.');
    if (endpoint === '/conversations') { const id = 'dynamic7land_' + crypto.randomUUID(); const histories = read(historyFile, {}); histories[id] = []; write(historyFile, histories); return { id }; }
    if (endpoint !== '/responses') throw new Error('This provider does not support ' + endpoint + '.');
    if (!config.ready) throw new Error(config.provider === 'openrouter' ? 'Add your free OpenRouter key and choose openrouter/free in AI connections, then save and test.' : config.provider === 'ollama' ? 'Download a local model in Ollama, then choose Load models in AI connections and save.' : 'Finish AI Connections setup first. Restricted Arena keys support the interactive Claude Code app only.');
    const histories = read(historyFile, {}), previous = body.conversation ? histories[body.conversation] || [] : [];
    const input = [...previous, ...(Array.isArray(body.input) ? body.input : [{ role: 'user', content: body.input || '' }])];
    const schema = body.text?.format?.schema, instructions = String(body.instructions || ''), limit = Math.min(Number(body.max_output_tokens) || 4096, 16384);
    let result;
    if (config.provider === 'arena') {
      const { conversation, store, ...payload } = body;
      result = await http('arena', '/responses', 'POST', { ...payload, input, store: false });
    } else if (config.provider === 'openrouter' || config.provider === 'ollama') result = await freeRequest(config, input, instructions, schema, limit);
    else {
      const data = await http('anthropic', '/messages', 'POST', { model: config.model, max_tokens: limit,
        system: instructions + (schema ? '\nReturn only valid JSON matching this schema: ' + JSON.stringify(schema) : ''), messages: messages(input) });
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
    const config = resolve(); if (!config?.ready) throw new Error('Configure your AI connection in AI Connections first.');
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
  return { publicConfig, set, resolve, models, apiRequest, answer, claudeEnvironment, supports };
}
module.exports = { createProviderService, ROOTS, PROVIDER_NAMES };
