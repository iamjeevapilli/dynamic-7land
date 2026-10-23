/* Keys cross the preload bridge once; saved keys never return to the renderer. */
window.DynamicProviderUI = (() => {
  async function mount({ api, paint, esc, toast, current }) {
    let state = await api.get();
    if (!current()) return;
    if (!state?.ok) return paint('<p class="empty">AI connections could not be loaded.</p>', false);
    paint(`<section id="provider-panel"><p class="lead">Use your Claude account, or route desktop chat and project requests through Arena or the Claude API.</p>
      <div class="card service-card"><h2>Desktop AI provider</h2>
        <div class="service-field"><label for="connection-provider">Route chat and project requests through</label><select id="connection-provider"><option value="off">Existing Claude / Codex account setup</option><option value="arena">Arena API</option><option value="anthropic">Claude API</option></select></div>
        <div id="connection-api-fields">
          <div class="service-field" id="connection-access-field"><label for="connection-access">Arena key access</label><select id="connection-access"><option value="api">Workspace with API access</option><option value="claude-code-only">Interactive Claude Code only</option></select><p>Free-router keys are limited to interactive Claude Code. Desktop chat, screen questions and project tools require an API-enabled workspace key.</p></div>
          <div class="service-field"><label for="connection-key">API key</label><p id="connection-key-help"></p><input id="connection-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a key to replace the saved key"></div>
          <div class="service-field"><label for="connection-model">Model ID</label><p>Load the models available to your account, or enter a model ID from your provider.</p><input id="connection-model" list="connection-models" autocomplete="off" spellcheck="false"><datalist id="connection-models"></datalist></div>
          <div class="connection-buttons"><button class="btn ghost" data-provider-command="models">Load models</button><button class="btn ghost" data-provider-command="clear">Remove saved key</button></div>
        </div>
        <div class="connection-buttons"><button class="btn main" data-provider-command="save">Save connection</button><button class="btn ghost" data-provider-command="test">Test connection</button></div>
        <p id="connection-result" class="connection-result" role="status" aria-live="polite"></p>
        <p class="muted">Keys are encrypted with Windows account storage. Tests make a provider request; normal usage charges and limits apply. Project files and screenshots are sent when you use those tools.</p>
      </div>
      <div class="card service-card"><h2>Claude Code</h2><p id="connection-claude-status"></p><p class="muted">A Claude subscription connects through Claude Code's browser sign-in. An Anthropic API key is a separate API connection.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="install-claude">Install Claude Code</button><button class="btn main" data-provider-action="claude-login">Sign in to Claude</button><button class="btn ghost" data-provider-action="claude-open">Open Claude Code</button></div><p class="muted">After installation or sign-in, refresh status. Enable Claude Code in Connections to show its activity in the island.</p>
      </div>
      <div class="card service-card"><h2>Arena</h2><p class="muted">Open interactive Claude Code with your saved Arena key, or visit Arena's agent workspace. Website sessions and API access are managed separately by Arena.</p>
        <div class="connection-buttons"><button class="btn main" data-provider-action="claude-arena">Open Claude via Arena</button><button class="btn ghost" data-provider-action="arena-keys">Get an Arena key</button><button class="btn ghost" data-provider-action="arena-website">Open Arena Agent</button></div>
      </div>
      <div class="card service-card"><h2>Codex and API accounts</h2><p id="connection-codex-status"></p><div class="connection-buttons"><button class="btn ghost" data-provider-action="codex-open">Open Codex</button><button class="btn ghost" data-provider-action="claude-console">Open Claude API console</button><button class="btn ghost" data-provider-command="refresh">Refresh status</button></div></div>
    </section>`, false);
    const panel = document.querySelector('#provider-panel'), get = id => panel.querySelector('#connection-' + id);
    const show = (text, bad = false) => { get('result').textContent = text; get('result').classList.toggle('bad', bad); };
    function sync(changed = false) {
      const provider = get('provider').value;
      get('api-fields').hidden = provider === 'off'; get('access-field').hidden = provider !== 'arena';
      if (changed) { get('key').value = ''; get('model').value = provider === 'arena' ? 'coding-router-preview' : ''; get('models').innerHTML = ''; }
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
          show(value.models.length + ' models loaded. Choose a model, then save the connection.');
        } else {
          await save();
          if (command === 'test') { const value = await api.test(); if (!value?.ok) throw new Error(value?.error || 'The test failed.'); show('Connection successful. Your provider returned an answer.'); }
          else { show(state.provider === 'off' ? 'Existing account setup selected.' : state.active ? 'Connection saved. Test it to verify your key and model.' : 'Settings saved. Complete the key and model, or use interactive Claude Code for a restricted Arena key.'); toast('Connection saved'); }
        }
      } catch (error) { show(error.message, true); }
      finally { if (button.isConnected) button.disabled = false; }
    });
  }
  return { mount };
})();
