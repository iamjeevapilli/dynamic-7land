// Settings are their own app now (settings-app.html, opened by settings-app-main.cjs). The settings code
// itself stays here in the island, where Dynamic7land and all his preferences live: the app asks for a list
// ("general" or "karakter") and every click in the app is played on a hidden copy of that list here.
//
// Everything you change in the app is a draft first: the app's own Dynamic7land shows it right away, the real Dynamic7land
// and the island only get it when you press Save (and nothing at all when you press Cancel).
(() => {
  const openView = setView;
  // The gear, the Settings tile and the AI shortcut all open the app instead of the small settings page.
  setView = (view, ...rest) => {
    if (view === 'settings' && window.dynamic7land?.settingsOpen) { window.dynamic7land.settingsOpen(); return; }
    return openView(view, ...rest);
  };

  const root = document.getElementById('dynamic7land-settings-v2');
  const box = document.createElement('div');
  box.id = 'tc-remote-settings'; box.hidden = true; box.setAttribute('aria-hidden', 'true');
  root.appendChild(box); // inside the settings root, so its click handler runs for clicks in here

  // ---------- apps you removed (ai-monitor-ui.js leaves them out of the island, buddy-ui.js for Dynamic7land) ----------
  let offCache = null; // read once, the island asks every frame
  const appsOff = () => { if (!offCache) { try { offCache = new Set(JSON.parse(localStorage.getItem('dynamic7land:apps-off')) || []); } catch { offCache = new Set(); } } return offCache; };
  window.__dynamic7landAppsOff = appsOff;

  // ---------- the draft ----------
  // prefs: a copy of Dynamic7land's preferences; sleep/login: the two switches that live outside prefs;
  // extras: city and calendar link typed but not saved; apps: the apps you want in your Dynamic7land.
  let draft = null;
  const realLogin = () => box.querySelector('[data-login]')?.classList.contains('on') ?? false;
  function begin() {
    if (draft) return draft;
    box.innerHTML = window.__dynamic7landSettingsHtml?.('general') || '';
    // login: null until you flip it (its real value arrives a moment after start, so it is read when needed)
    draft = { prefs: window.__dynamic7landRealPrefs(), sleep: !!sleepEnabled, login: null, extras: {}, apps: [...appsOff()] };
    window.__dynamic7landPreviewPrefs(draft.prefs);
    return draft;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function dirty() {
    if (!draft) return false;
    box.innerHTML = window.__dynamic7landSettingsHtml?.('general') || '';
    return !same(draft.prefs, window.__dynamic7landRealPrefs()) || draft.sleep !== !!sleepEnabled || (draft.login !== null && draft.login !== realLogin())
      || Object.keys(draft.extras).length > 0 || !same([...draft.apps].sort(), [...appsOff()].sort());
  }

  const settle = () => new Promise(r => setTimeout(r, 0)); // the English translation (i18n-ui.js) runs right after a change
  // A list as it looks with your draft.
  async function list(which) {
    const d = begin();
    box.innerHTML = window.__dynamic7landWithDraft(d.prefs, () => window.__dynamic7landSettingsHtml?.(which) || '');
    const set = (sel, on) => box.querySelectorAll(sel).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    set('[data-action="sleep"]', d.sleep);
    if (d.login !== null) set('[data-login]', d.login);
    for (const [key, value] of Object.entries(d.extras)) box.querySelectorAll('#tc-in-' + key).forEach(i => i.setAttribute('value', value));
    await settle();
    return box.innerHTML;
  }
  const info = () => {
    const d = draft, base = window.__dynamic7landLocker?.() || {};
    return { ...base, name: (d?.prefs.name || '').trim() || base.name, lang: window.__dynamic7landPrefs?.().lang === 'nl' ? 'nl' : 'en', dirty: dirty() };
  };

  // Play one click from the app on the draft.
  function clickDraft(el, values) {
    const d = begin();
    // what you typed in the app goes into the field here first
    for (const [id, value] of Object.entries(values || {})) {
      if (!/^tc-in-[\w-]+$/.test(id)) continue;
      document.querySelectorAll('#' + id).forEach(input => { input.value = String(value).slice(0, 2000); }); // every copy (the island may have one too)
    }
    if (el.dataset.action === 'sleep') { d.sleep = !d.sleep; return; }
    if (el.dataset.login) { d.login = !(d.login ?? el.classList.contains('on')); return; }
    if (el.dataset.save) { const key = el.dataset.pref; d.extras[key] = box.querySelector('#tc-in-' + key)?.value || ''; return; }
    // these really happen right now: quit, restart and the test buttons (they test the island itself)
    if (el.dataset.quit || el.dataset.restart || el.dataset.test) { el.click(); return; }
    window.__dynamic7landWithDraft(d.prefs, () => el.click());
    window.__dynamic7landPreviewPrefs(d.prefs);
  }

  // Save: everything in the draft becomes real at once.
  async function saveDraft() {
    if (!draft) return;
    const d = draft;
    window.__dynamic7landSaveDraft(d.prefs);
    box.innerHTML = window.__dynamic7landSettingsHtml?.('karakter') || '';
    if (d.sleep !== !!sleepEnabled) box.querySelector('[data-action="sleep"]')?.click();
    box.innerHTML = window.__dynamic7landSettingsHtml?.('general') || '';
    if (d.login !== null && d.login !== realLogin()) box.querySelector('[data-login]')?.click();
    for (const [key, value] of Object.entries(d.extras)) {
      box.innerHTML = window.__dynamic7landSettingsHtml?.('general') || '';
      document.querySelectorAll('#tc-in-' + key).forEach(i => { i.value = value; });
      box.querySelector(`[data-save][data-pref="${key}"]`)?.click();
    }
    offCache = new Set(d.apps);
    try { localStorage.setItem('dynamic7land:apps-off', JSON.stringify(d.apps)); } catch {}
    draft = null;
    await new Promise(r => setTimeout(r, 120));
  }

  // req: { kind: 'list' | 'click' | 'save' | 'discard' | 'apps' | 'app', ... }
  window.__dynamic7landRemoteSettings = async req => {
    const which = req?.which === 'karakter' ? 'karakter' : 'general';
    if (req?.kind === 'save') await saveDraft();
    if (req?.kind === 'discard') { draft = null; window.__dynamic7landPreviewPrefs(null); }
    if (req?.kind === 'apps' || req?.kind === 'app') {
      const d = begin();
      if (req.kind === 'app' && /^[a-z]+$/.test(req.id || '')) {
        const off = new Set(d.apps); if (req.on) off.delete(req.id); else off.add(req.id);
        d.apps = [...off];
      }
      return { off: d.apps, info: info() };
    }
    if (req?.kind === 'click') {
      await list(which);
      const el = req.row != null ? box.querySelectorAll('.tc-setting-row')[req.row] : box.querySelectorAll('button')[req.index];
      if (el && req.row != null) window.__dynamic7landWithDraft(begin().prefs, () => window.__dynamic7landDemo?.(el.dataset.demo)); // an example block: the app's Dynamic7land shows it
      else if (el) clickDraft(el, req.values);
      await new Promise(r => setTimeout(r, 30));
    }
    return { html: await list(which), info: info() };
  };

  // While the app is open its Dynamic7land is drawn too (buddy-ui.js), from the draft.
  window.__dynamic7landFaceForSettings = false;
  window.__dynamic7landSettingsClosed = () => { draft = null; window.__dynamic7landPreviewPrefs(null); };
})();
