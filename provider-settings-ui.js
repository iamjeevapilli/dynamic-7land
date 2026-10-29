/* Keys cross the preload bridge once; saved keys never return to the renderer. */
window.DynamicProviderUI = (() => {
  const gatewayPorts = { omniroute: 20128, freellmapi: 31415 };
  const isGateway = provider => Object.hasOwn(gatewayPorts, provider);
  const defaultModel = provider => ({ arena: 'coding-router-preview', openrouter: 'openrouter/free', ollama: 'llama3.2:1b', omniroute: 'auto', freellmapi: 'auto' })[provider] || '';
  async function mount({ api, paint, esc, toast, current }) {
    let state = await api.get();
    if (!current()) return;
    if (!state?.ok) return paint('<p class="empty">AI connections could not be loaded.</p>', false);
    paint(`<section id="provider-panel"><p class="lead">Use AI on this PC without an API key, connect a local router, or keep your existing AI account.</p>
      <div class="card service-card"><h2>No API key? Start here</h2>
        <p><b>Ollama runs AI on this PC.</b> No provider account, API key or AI API fee is needed. Setup downloads Ollama and a small text model. Speed depends on your PC; model downloads need disk space and memory.</p>
        <div class="connection-buttons"><button class="btn main" data-provider-choice="ollama">Use local AI — no key</button><button class="btn ghost" data-provider-action="setup-ollama">Install Ollama + small model</button></div>
        <p>Wait for the setup window to finish, choose Ollama below, then <b>Load models → Save connection → Test connection</b>. Screenshot questions need a vision model.</p>
      </div>
      <div class="card service-card"><h2>Use your free provider connections together</h2>
        <p><b>FreeLLMAPI and OmniRoute</b> run a router on your PC and can try another configured provider when one is busy. They do not supply unlimited AI access. Provider sign-up, keys or supported account sign-in may still be needed.</p>
        <div class="connection-buttons"><button class="btn main" data-provider-choice="freellmapi">Use FreeLLMAPI</button><button class="btn ghost" data-provider-choice="omniroute">Use OmniRoute</button><button class="btn ghost" data-provider-choice="openrouter">Use OpenRouter free models</button></div>
        <p>For a free setup, enable only eligible free connections in your router and set its spending controls there. Dynamic 7land cannot enforce the billing or fallback rules inside another app.</p>
      </div>
      <div class="card service-card"><h2>Desktop AI provider</h2>
        <div class="service-field"><label for="connection-provider">Route chat and project requests through</label><select id="connection-provider"><option value="off">Existing Claude / Codex account setup</option><option value="ollama">Ollama — local models, no API key</option><option value="freellmapi">FreeLLMAPI — local gateway</option><option value="omniroute">OmniRoute — local gateway</option><option value="openrouter">OpenRouter — free models only</option><option value="arena">Arena API</option><option value="anthropic">Claude API</option></select></div>
        <div id="connection-api-fields">
          <div class="service-field" id="connection-access-field"><label for="connection-access">Arena key access</label><select id="connection-access"><option value="api">Workspace with API access</option><option value="claude-code-only">Interactive Claude Code only</option></select><p>Free-router keys are limited to interactive Claude Code. Desktop chat, screen questions and project tools require an API-enabled workspace key.</p></div>
          <div class="service-field" id="connection-port-field"><label for="connection-port">Router port on this PC</label><input id="connection-port" type="number" min="1" max="65535" step="1"><p>Match the port in the router's tray or dashboard. FreeLLMAPI desktop normally uses 31415; its Docker/server install normally uses 3001. OmniRoute normally uses 20128. Connections stay on 127.0.0.1.</p></div>
          <div class="service-field" id="connection-key-field"><label id="connection-key-label" for="connection-key">API key</label><p id="connection-key-help"></p><input id="connection-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a key to replace the saved key"></div>
          <p id="connection-provider-help" class="muted"></p><div class="service-field"><label for="connection-model">Model or router profile</label><p>Choose Load models, select one from the list, then save. Router model <b>auto</b> uses that router's configured connections. For Ollama, download a local model first.</p><input id="connection-model" list="connection-models" autocomplete="off" spellcheck="false"><datalist id="connection-models"></datalist></div>
          <div class="connection-buttons"><button class="btn ghost" data-provider-command="models">Load models</button><button class="btn ghost" data-provider-command="clear">Remove saved key</button></div>
        </div>
        <div class="connection-buttons"><button class="btn main" data-provider-command="save">Save connection</button><button class="btn ghost" data-provider-command="test">Test connection</button></div>
        <p id="connection-result" class="connection-result" role="status" aria-live="polite"></p>
        <p class="muted">Saved keys are encrypted with Windows account storage. The key box clears after saving; “A key is saved” confirms it is kept. Ollama local requests stay on this PC. Routers may send your text, selected project context or screenshots to their enabled cloud providers. OpenRouter direct connections are restricted to free models. Other connections follow their own access, pricing and usage limits.</p>
      </div>
      <div class="card service-card"><h2>FreeLLMAPI setup</h2>
        <ol><li>Choose <b>Install FreeLLMAPI</b>. The setup window downloads the official Windows installer, verifies its checksum and opens it. Finish installation and open FreeLLMAPI.</li><li>In its dashboard, add your eligible free provider connections. Provider keys belong in FreeLLMAPI.</li><li>Copy its <b>unified API key</b> from the tray's <b>Copy Key</b> button or Keys page header. Paste that connection key above, select FreeLLMAPI and match its port.</li><li>Keep model <b>auto</b>, then <b>Save connection → Test connection</b>. Keep FreeLLMAPI running while using it.</li></ol>
        <div class="connection-buttons"><button class="btn main" data-provider-action="setup-freellmapi">Install FreeLLMAPI</button><button class="btn ghost" data-provider-action="freellmapi-dashboard">Open FreeLLMAPI dashboard</button><button class="btn ghost" data-provider-action="freellmapi-releases">Official downloads</button></div>
      </div>
      <div class="card service-card"><h2>OmniRoute setup</h2>
        <ol><li>Choose <b>Install / start OmniRoute</b>. The setup window installs Node.js if needed, installs the pinned router release and starts it. Keep that window open.</li><li>In its dashboard, connect only the free provider accounts you are eligible to use and configure its free-only routing/spending controls. A “cheap” route can still be paid.</li><li>Copy an endpoint key from <b>Endpoints</b>, select OmniRoute above and paste it into the connection key box. Select a model or a free-only combo you configured.</li><li>Choose <b>Save connection → Test connection</b>. Provider limits still apply.</li></ol>
        <div class="connection-buttons"><button class="btn main" data-provider-action="setup-omniroute">Install / start OmniRoute</button><button class="btn ghost" data-provider-action="omniroute-dashboard">Open OmniRoute dashboard</button><button class="btn ghost" data-provider-action="omniroute-guide">Official setup guide</button></div>
      </div>
      <div class="card service-card"><h2>Free provider setup</h2>
        <p>OpenRouter: open its key page, create a key, paste it above, choose <b>openrouter/free</b>, then save and test. The app will stop at free-model limits instead of switching to a paid model.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="openrouter-keys">Get a free-model API key</button></div>
        <p>Ollama: install the official Windows app, download a local model in it, select Ollama above, choose <b>Load models</b>, select your model, then save and test. A small text model can run on more PCs; <b>gemma3:4b</b> is a vision option if your PC has enough memory.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="ollama-download">Download Ollama for Windows</button><button class="btn ghost" data-provider-action="setup-ollama-vision">Install Ollama + vision model</button></div><p>The optional vision setup downloads <b>gemma3:4b</b>, which needs several GB of disk space and enough memory. Start with the small text model if your PC is limited.</p>
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
      get('port-field').hidden = !isGateway(provider); get('port').disabled = !isGateway(provider);
      get('key-field').hidden = provider === 'ollama'; get('key').disabled = provider === 'ollama';
      panel.querySelector('[data-provider-command="clear"]').hidden = provider === 'ollama';
      panel.querySelector('[data-provider-command="test"]').hidden = provider === 'off';
      get('provider-help').textContent = isGateway(provider) ? (provider === 'freellmapi' ? 'Use the unified connection key from FreeLLMAPI. Its provider keys stay in its own dashboard.' : 'Use the endpoint connection key from OmniRoute. Its provider keys or account sign-ins stay in its own dashboard.') + ' Set up only free providers for a free route. The router controls its own fallbacks and billing; a local router can still use cloud AI.' : provider === 'openrouter' ? 'Free-only mode: openrouter/free or an available :free model. Paid models and paid fallback are blocked. Keep your OpenRouter account on the free tier; quota limits can stop requests.' : provider === 'ollama' ? 'Only downloaded local models are allowed. No API key is needed. The connection uses Ollama on this PC at 127.0.0.1:11434.' : '';
      if (changed) { get('key').value = ''; get('model').value = defaultModel(provider); get('models').innerHTML = ''; get('port').value = state.gatewayPorts?.[provider] || gatewayPorts[provider] || ''; }
      get('key-label').textContent = isGateway(provider) ? 'Connection key from your router' : 'API key';
      get('key-help').textContent = state.keyStatus?.[provider] ? 'A key is saved. Leave this blank to keep it. The visible box clears after saving.' : isGateway(provider) ? 'Copy the router connection key from its own tray or dashboard. No provider key needs to be shared here.' : 'No key is saved for this provider.';
      get('claude-status').textContent = state.claudeInstalled ? 'Claude Code was found on this PC.' : 'Claude Code was not found. Install it first.';
      get('codex-status').textContent = state.codexInstalled ? 'The Codex runtime was found. Complete its browser sign-in when prompted.' : 'Codex is missing. Run INSTALL-AI.cmd from your setup folder.';
    }
    get('provider').value = state.provider; get('model').value = state.model || ''; get('access').value = state.arenaAccess || 'api'; get('port').value = state.gatewayPorts?.[state.provider] || gatewayPorts[state.provider] || ''; sync();
    get('provider').addEventListener('change', () => sync(true));
    async function save(clearKey = false) {
      const provider = get('provider').value;
      const value = await api.set({ provider, model: get('model').value, arenaAccess: get('access').value, key: get('key').value, clearKey, ...(isGateway(provider) ? { gatewayPort: get('port').value } : {}) });
      if (!value?.ok) throw new Error(value?.error || 'The connection could not be saved.');
      state = value; get('key').value = ''; sync(); return value;
    }
    panel.addEventListener('click', async event => {
      const button = event.target.closest('button'); if (!button || button.disabled) return;
      if (button.dataset.providerChoice) {
        get('provider').value = button.dataset.providerChoice; sync(true);
        show(isGateway(button.dataset.providerChoice) ? 'Router selected. Follow its setup card below, paste its connection key above, then save and test.' : button.dataset.providerChoice === 'ollama' ? 'Local AI selected. Use Install Ollama + small model. When setup finishes, choose Load models, save and test.' : 'Free cloud models selected. Create an OpenRouter key using the button below, then save and test.'); return;
      }
      const command = button.dataset.providerCommand, action = button.dataset.providerAction; if (!command && !action) return;
      button.disabled = true; show('Working…');
      try {
        if (action) {
          if (action.endsWith('-dashboard') && get('provider').value === action.replace('-dashboard', '')) await save();
          const value = await api.action(action); if (!value?.ok) throw new Error(value?.error || 'The action could not be opened.');
          show(value.message || (action === 'install-claude' ? 'Installation opened in PowerShell. Complete it, then refresh status.' : 'Opened. Complete sign-in in the new window if requested.'));
        } else if (command === 'refresh') {
          state = await api.get(); if (!state?.ok) throw new Error(state?.error || 'Status is unavailable.'); sync(); show('Installation status refreshed.');
        } else if (command === 'clear') { await save(true); show('Saved key removed. Environment-provided keys remain managed by your PC.'); }
        else if (command === 'models') {
          await save(); const value = await api.models(get('provider').value); if (!value?.ok) throw new Error(value?.error || 'Models could not be loaded.');
          get('models').innerHTML = value.models.map(model => `<option value="${esc(model.id)}">${esc(model.name)}</option>`).join('');
          if (value.models.length && (!get('model').value || (get('provider').value === 'ollama' && !value.models.some(model => model.id === get('model').value || model.id === get('model').value + ':latest')))) get('model').value = value.models[0].id;
          show(value.models.length ? value.models.length + ' models loaded. Choose a model, then save the connection.' : isGateway(get('provider').value) ? 'The router lists no available models. Open its dashboard and connect an eligible provider, then try Load models again.' : 'No downloaded local models found. Open Ollama and download a local model, then try Load models again.');
        } else {
          await save();
          if (command === 'test') { const value = await api.test(); if (!value?.ok) throw new Error(value?.error || 'The test failed.'); show('Connection successful. Your provider returned an answer.'); }
          else { show(state.provider === 'off' ? 'Existing account setup selected.' : state.active ? 'Connection saved. The key box clears for privacy. Choose Test connection to verify the selected model.' : isGateway(state.provider) ? 'Settings saved. Start the router, paste its connection key and choose a model, then save and test.' : state.provider === 'openrouter' ? 'Settings saved. Add your free OpenRouter key and choose openrouter/free, then save and test.' : state.provider === 'ollama' ? 'Settings saved. Download a local model in Ollama, choose Load models, then save and test.' : 'Settings saved. Complete the key and model, or use interactive Claude Code for a restricted Arena key.'); toast('Connection saved'); }
        }
      } catch (error) { show(error.message, true); }
      finally { if (button.isConnected) button.disabled = false; }
    });
  }
  return { mount };
})();
