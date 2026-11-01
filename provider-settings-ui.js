/* Keys cross the preload bridge once; saved keys never return to the renderer. */
window.DynamicProviderUI = (() => {
  async function mount({ api, paint, esc, toast, current }) {
    let state = await api.get();
    if (!current()) return;
    if (!state?.ok) return paint('<p class="empty">AI connections could not be loaded.</p>', false);
    paint(`<section id="provider-panel"><p class="lead">Connect Arena to Dynamic 7land. Paste your key below and choose the access type granted by your Arena workspace.</p>
      <div class="card service-card"><h2>Arena connection</h2>
        <div class="service-field"><label for="connection-provider">Route chat and project requests through</label><select id="connection-provider"><option value="arena">Arena</option><option value="off">Existing Claude / Codex account setup</option></select></div>
        <div id="connection-api-fields">
          <div class="service-field"><label for="connection-key">Arena API key</label><p id="connection-key-help"></p><input id="connection-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your Arena key here"></div>
          <div class="service-field"><label for="connection-access">Arena key access</label><select id="connection-access"><option value="claude-code-only">Interactive Claude Code only (free-router)</option><option value="api">Workspace with API access</option></select><p id="connection-access-help"></p></div>
          <div class="service-field"><label for="connection-model">Arena model</label><input id="connection-model" list="connection-models" autocomplete="off" spellcheck="false"><datalist id="connection-models"></datalist><p>Keep <b>coding-router-preview</b>, or load models and choose an ID enabled for your key.</p></div>
          <div class="connection-buttons"><button class="btn ghost" data-provider-command="models">Load models</button><button class="btn ghost" data-provider-command="clear">Remove saved key</button></div>
        </div>
        <div class="connection-buttons"><button class="btn main" data-provider-command="save">Save connection</button><button class="btn ghost" data-provider-command="test">Test connection</button><button class="btn main" data-provider-command="launch-arena">Save and open Claude via Arena</button></div>
        <p id="connection-result" class="connection-result" role="status" aria-live="polite"></p>
        <p class="muted">Your key is encrypted for your Windows account and kept on this PC. The visible key box clears after saving. No key is included in the public app. Arena controls model access, quotas and pricing.</p>
      </div>
      <div class="card service-card"><h2>Claude Code</h2><p id="connection-claude-status"></p><p>For a free-router Arena key, install Claude Code if needed, then use <b>Save and open Claude via Arena</b> above. Type your questions in the terminal that opens. Enable Claude Code in Connections to show its activity in the island.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="install-claude">Install Claude Code</button><button class="btn ghost" data-provider-command="refresh">Refresh status</button><button class="btn ghost" data-provider-action="arena-keys">Open Arena dashboard</button><button class="btn ghost" data-provider-action="arena-website">Open Arena Agent</button></div>
      </div>
      <div class="card service-card"><h2>Existing Claude and Codex accounts</h2><p id="connection-codex-status"></p><p>Session monitoring and your existing account connections remain available. To use an existing account for desktop chat, select Existing Claude / Codex account setup above and save. Access follows that account's plan.</p>
        <div class="connection-buttons"><button class="btn ghost" data-provider-action="claude-login">Sign in to Claude</button><button class="btn ghost" data-provider-action="claude-open">Open Claude Code</button><button class="btn ghost" data-goto="ai">Open AI &amp; Chat sign-in</button><button class="btn ghost" data-provider-action="codex-open">Open Codex</button></div>
      </div>
    </section>`, false);
    const panel = document.querySelector('#provider-panel'), get = id => panel.querySelector('#connection-' + id);
    const show = (text, bad = false) => { get('result').textContent = text; get('result').classList.toggle('bad', bad); };
    function sync(changed = false) {
      const arena = get('provider').value === 'arena', restricted = get('access').value === 'claude-code-only';
      get('api-fields').hidden = !arena;
      panel.querySelector('[data-provider-command="test"]').hidden = !arena || restricted;
      panel.querySelector('[data-provider-command="launch-arena"]').hidden = !arena;
      if (changed) { get('key').value = ''; get('model').value = arena ? 'coding-router-preview' : ''; get('models').innerHTML = ''; }
      get('key-help').textContent = state.keyStatus?.arena ? 'A key is saved. Leave this blank to keep it. The visible box clears after saving.' : 'No Arena key is saved. Paste it here, then save.';
      get('access-help').textContent = restricted ? 'Free-router keys work in interactive Claude Code. They cannot run direct desktop chat, screen questions or project API requests. Use Save and open Claude via Arena.' : 'Choose this only if your Arena workspace permits API requests. Test connection makes a live request; usage follows your Arena workspace pricing and limits.';
      get('claude-status').textContent = state.claudeInstalled ? 'Claude Code was found on this PC.' : 'Claude Code was not found. Install it first.';
      get('codex-status').textContent = state.codexInstalled ? 'The Codex runtime was found. Complete its browser sign-in when prompted.' : 'Codex is missing. Run INSTALL-AI.cmd from your setup folder.';
    }
    get('provider').value = state.provider; get('model').value = state.model || 'coding-router-preview'; get('access').value = state.arenaAccess || 'claude-code-only'; sync();
    get('provider').addEventListener('change', () => sync(true));
    get('access').addEventListener('change', () => sync());
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
        if (action || command === 'launch-arena') {
          if (command === 'launch-arena') await save();
          const value = await api.action(action || 'claude-arena'); if (!value?.ok) throw new Error(value?.error || 'The action could not be opened.');
          show(value.message || (action === 'install-claude' ? 'Installation opened in PowerShell. Complete it, then refresh status.' : command === 'launch-arena' ? 'Claude Code opened with Arena. Type a question in its terminal to verify the connection.' : 'Opened. Complete sign-in in the new window if requested.'));
        } else if (command === 'refresh') {
          state = await api.get(); if (!state?.ok) throw new Error(state?.error || 'Status is unavailable.'); sync(); show('Installation status refreshed.');
        } else if (command === 'clear') { await save(true); show('Saved key removed. Environment-provided keys remain managed by your PC.'); }
        else if (command === 'models') {
          await save(); const value = await api.models('arena'); if (!value?.ok) throw new Error(value?.error || 'Models could not be loaded.');
          get('models').innerHTML = value.models.map(model => `<option value="${esc(model.id)}">${esc(model.name)}</option>`).join('');
          if (value.models.length && !get('model').value) get('model').value = value.models[0].id;
          show(value.models.length ? value.models.length + ' Arena models loaded. Choose a model, then save.' : 'Arena lists no models for this key. Check its access in the Arena dashboard.');
        } else {
          await save();
          if (command === 'test') { const value = await api.test(); if (!value?.ok) throw new Error(value?.error || 'The test failed.'); show('Connection successful. Arena returned an answer.'); }
          else { show(state.provider === 'off' ? 'Existing account setup selected.' : state.arenaAccess === 'claude-code-only' ? 'Arena key saved. Choose Save and open Claude via Arena to use it in interactive Claude Code.' : state.active ? 'Arena connection saved. Choose Test connection to verify it.' : 'Settings saved. Add your Arena key and model, then save.'); toast('Connection saved'); }
        }
      } catch (error) { show(error.message, true); }
      finally { if (button.isConnected) button.disabled = false; }
    });
  }
  return { mount };
})();
