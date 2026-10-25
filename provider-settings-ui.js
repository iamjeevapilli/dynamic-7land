/* Keys cross the preload bridge once; saved keys never return to the renderer. */
window.DynamicProviderUI = (() => {
  async function mount({ api, paint, esc, toast, current }) {
    let state = await api.get();
    if (!current()) return;
    if (!state?.ok) return paint('<p class="empty">AI connections could not be loaded.</p>', false);
    paint(`<section id="provider-panel"><p class="lead">Choose free cloud models, run a model on this PC, or connect an existing AI account. Arena approval is not required for the free options.</p>
      <div class="card service-card"><h2>Start with free AI</h2>
        <p><b>Free cloud models:</b> OpenRouter needs a free account and API key. Only free model routes are allowed. Availability and daily limits apply.</p>
        <p><b>Local AI:</b> Ollama runs downloaded models on this PC with no API key or AI API fees. Model downloads need disk space; speed depends on your hardware. Screenshots need a vision model.</p>
        <div class="connection-buttons"><button class="btn main" data-provider-choice="openrouter">Use free cloud models</button><button class="btn ghost" data-provider-choice="ollama">Use local AI</button></div>
      </div>
      <div class="card service-card"><h2>Desktop AI provider</h2>
        <div class="service-field"><label for="connection-provider">Route chat and project requests through</label><select id="connection-provider"><option value="off">Existing Claude / Codex account setup</option><option value="openrouter">OpenRouter — free models only</option><option value="ollama">Ollama — local models, no API key</option><option value="arena">Arena API</option><option value="anthropic">Claude API</option></select></div>
        <div id="connection-api-fields">
          <div class="service-field" id="connection-access-field"><label for="connection-access">Arena key access</label><select id="connection-access"><option value="api">Workspace with API access</option><option value="claude-code-only">Interactive Claude Code only</option></select><p>Free-router keys are limited to interactive Claude Code. Desktop chat, screen questions and project tools require an API-enabled workspace key.</p></div>
          <div class="service-field" id="connection-key-field"><label for="connection-key">API key</label><p id="connection-key-help"></p><input id="connection-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a key to replace the saved key"></div>
          <p id="connection-provider-help" class="muted"></p><div class="service-field"><label for="connection-model">Model ID</label><p>Choose Load models, select one from the list, then save. For local AI, download a model in Ollama first.</p><input id="connection-model" list="connection-models" autocomplete="off" spellcheck="false"><datalist id="connection-models"></datalist></div>
          <div class="connection-buttons"><button class="btn ghost" data-provider-command="models">Load models</button><button class="btn ghost" data-provider-command="clear">Remove saved key</button></div>
        </div>
        <div class="connection-buttons"><button class="btn main" data-provider-command="save">Save connection</button><button class="btn ghost" data-provider-command="test">Test connection</button></div>
        <p id="connection-result" class="connection-result" role="status" aria-live="polite"></p>
        <p class="muted">API keys are encrypted with Windows account storage. Local Ollama requests stay on this PC. Cloud providers receive the text, project context or screenshots you choose to send. OpenRouter is restricted to free models; Arena, Claude API and account-based agents follow their own access terms and usage limits.</p>
      </div>
      <div class="card service-card"><h2>Free provider setup</h2>
        <p>OpenRouter: open its key page, create a key, paste it above, choose <b>openrouter/free</b>, then save and test. The app will stop at free-model limits instead of switching to a paid model.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="openrouter-keys">Get a free-model API key</button></div>
        <p>Ollama: install the official Windows app, download a local model in it, select Ollama above, choose <b>Load models</b>, select your model, then save and test. A small text model can run on more PCs; <b>gemma3:4b</b> is a vision option if your PC has enough memory.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="ollama-download">Download Ollama for Windows</button></div>
      </div>
      <div class="card service-card"><h2>Claude Code</h2><p id="connection-claude-status"></p><p class="muted">A Claude subscription connects through Claude Code's browser sign-in. An Anthropic API key is a separate API connection.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="install-claude">Install Claude Code</button><button class="btn main" data-provider-action="claude-login">Sign in to Claude</button><button class="btn ghost" data-provider-action="claude-open">Open Claude Code</button></div><p class="muted">After installation or sign-in, refresh status. Enable Claude Code in Connections to show its activity in the island.</p>
      </div>
      <div class="card service-card"><h2>Arena</h2><p class="muted">Open interactive Claude Code with your saved Arena key, or visit Arena's agent workspace. Website sessions and API access are managed separately by Arena.</p>
        <div class="connection-buttons"><button class="btn main" data-provider-action="claude-arena">Open Claude via Arena</button><button class="btn ghost" data-provider-action="arena-keys">Get an Arena key</button><button class="btn ghost" data-provider-action="arena-website">Open Arena Agent</button></div>
      </div>
      <div class="card service-card"><h2>Codex and API accounts</h2><p id="connection-codex-status"></p><p class="muted">For desktop chat with your existing ChatGPT plan, select Existing account setup above, save, enable Codex in Connections and sign in through AI &amp; Chat. Access and limits depend on your plan.</p><div class="connection-buttons"><button class="btn main" data-goto="ai">Open AI &amp; Chat sign-in</button><button class="btn ghost" data-provider-action="codex-open">Open Codex</button><button class="btn ghost" data-provider-action="claude-console">Open Claude API console</button><button class="btn ghost" data-provider-command="refresh">Refresh status</button></div></div>
    </section>`, false);
    const panel = document.querySelector('#provider-panel'), get = id => panel.querySelector('#connection-' + id);
    const show = (text, bad = false) => { get('result').textContent = text; get('result').classList.toggle('bad', bad); };
    function sync(changed = false) {
      const provider = get('provider').value;
      get('api-fields').hidden = provider === 'off'; get('access-field').hidden = provider !== 'arena';
      get('key-field').hidden = provider === 'ollama'; get('key').disabled = provider === 'ollama';
      panel.querySelector('[data-provider-command="clear"]').hidden = provider === 'ollama';
      panel.querySelector('[data-provider-command="test"]').hidden = provider === 'off';
      get('provider-help').textContent = provider === 'openrouter' ? 'Free-only mode: openrouter/free or an available :free model. Paid models and paid fallback are blocked. Keep your OpenRouter account on the free tier; quota limits can stop requests.' : provider === 'ollama' ? 'Only downloaded local models are allowed. No API key is needed. The connection uses Ollama on this PC at 127.0.0.1:11434.' : '';
      if (changed) { get('key').value = ''; get('model').value = provider === 'arena' ? 'coding-router-preview' : provider === 'openrouter' ? 'openrouter/free' : ''; get('models').innerHTML = ''; }
      get('key-help').textContent = state.keyStatus?.[provider] ? 'A key is saved. Leave this blank to keep it.' : 'No key is saved for this provider.';
      get('claude-status').textContent = state.claudeInstalled ? 'Claude Code was found on this PC.' : 'Claude Code was not found. Install it first.';
      get('codex-status').textContent = state.codexInstalled ? 'The Codex runtime was found. Complete its browser sign-in when prompted.' : 'Codex is missing. Run INSTALL-AI.cmd from your setup folder.';
    }
    get('provider').value = state.provider; get('model').value = state.model || ''; get('access').value = state.arenaAccess || 'api'; sync();
    get('provider').addEventListener('change', () => sync(true));
    async function save(clearKey = false) {
      const value = await api.set({ provider: get('provider').value, model: get('model').value, arenaAccess: get('access').value, key: get('key').value, clearKey });
      if (!value?.ok) throw new Error(value?.error || 'The connection could not be saved.');
      state = value; get('key').value = ''; sync(); return value;
    }
    panel.addEventListener('click', async event => {
      const button = event.target.closest('button'); if (!button || button.disabled) return;
      if (button.dataset.providerChoice) {
        get('provider').value = button.dataset.providerChoice; sync(true);
        show(button.dataset.providerChoice === 'ollama' ? 'Local AI selected. Download a model in Ollama, then choose Load models.' : 'Free cloud models selected. Create an OpenRouter key using the button below, then save and test.'); return;
      }
      const command = button.dataset.providerCommand, action = button.dataset.providerAction; if (!command && !action) return;
      button.disabled = true; show('Working…');
      try {
        if (action) {
          const value = await api.action(action); if (!value?.ok) throw new Error(value?.error || 'The action could not be opened.');
          show(action === 'install-claude' ? 'Installation opened in PowerShell. Complete it, then refresh status.' : 'Opened. Complete sign-in in the new window if requested.');
        } else if (command === 'refresh') {
          state = await api.get(); if (!state?.ok) throw new Error(state?.error || 'Status is unavailable.'); sync(); show('Installation status refreshed.');
        } else if (command === 'clear') { await save(true); show('Saved key removed. Environment-provided keys remain managed by your PC.'); }
        else if (command === 'models') {
          await save(); const value = await api.models(get('provider').value); if (!value?.ok) throw new Error(value?.error || 'Models could not be loaded.');
          get('models').innerHTML = value.models.map(model => `<option value="${esc(model.id)}">${esc(model.name)}</option>`).join('');
          if (!get('model').value && value.models.length) get('model').value = value.models[0].id;
          show(value.models.length ? value.models.length + ' models loaded. Choose a model, then save the connection.' : 'No downloaded local models found. Open Ollama and download a local model, then try Load models again.');
        } else {
          await save();
          if (command === 'test') { const value = await api.test(); if (!value?.ok) throw new Error(value?.error || 'The test failed.'); show('Connection successful. Your provider returned an answer.'); }
          else { show(state.provider === 'off' ? 'Existing account setup selected.' : state.active ? 'Connection saved. Choose Test connection to verify the selected model.' : state.provider === 'openrouter' ? 'Settings saved. Add your free OpenRouter key and choose openrouter/free, then save and test.' : state.provider === 'ollama' ? 'Settings saved. Download a local model in Ollama, choose Load models, then save and test.' : 'Settings saved. Complete the key and model, or use interactive Claude Code for a restricted Arena key.'); toast('Connection saved'); }
        }
      } catch (error) { show(error.message, true); }
      finally { if (button.isConnected) button.disabled = false; }
    });
  }
  return { mount };
})();
