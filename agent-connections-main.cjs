'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawn } = require('node:child_process');
const { app, ipcMain, safeStorage, shell } = require('electron');
const service = require('./provider-connections.cjs').createProviderService({ directory: app.getPath('userData'), safeStorage });
function claudeExecutable() {
  const candidates = [path.join(os.homedir(), '.local', 'bin', 'claude.exe')];
  for (const folder of (process.env.PATH || '').split(path.delimiter)) candidates.push(path.join(folder, process.platform === 'win32' ? 'claude.exe' : 'claude'));
  return candidates.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || '';
}
function codexExecutable() {
  const base = path.join(__dirname, 'node_modules', '@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe');
  if (fs.existsSync(base)) return base;
  for (const folder of (process.env.PATH || '').split(path.delimiter)) { const file = path.join(folder, process.platform === 'win32' ? 'codex.exe' : 'codex'); if (fs.existsSync(file)) return file; }
  return '';
}
const status = () => ({ ...service.publicConfig(), claudeInstalled: !!claudeExecutable(), codexInstalled: !!codexExecutable() });
const trusted = e => { try { const u = new URL(e.senderFrame?.url || e.sender.getURL()); return u.protocol === 'file:' && path.resolve(require('node:url').fileURLToPath(u)) === path.join(__dirname, 'settings-app.html'); } catch { return false; } };
const psQuote = s => "'" + s.replace(/'/g, "''") + "'";
function terminal(command, extraEnv = {}, localScript = false) {
  if (process.platform !== 'win32') throw new Error('This launcher requires Windows.');
  const env = { ...process.env, ...extraEnv }; delete env.ELECTRON_RUN_AS_NODE;
  // A personal Anthropic key must not override the explicitly selected Arena route.
  if (extraEnv.ANTHROPIC_AUTH_TOKEN) delete env.ANTHROPIC_API_KEY;
  const child = spawn('powershell.exe', ['-NoLogo','-NoProfile', ...(localScript ? ['-ExecutionPolicy','Bypass'] : []), '-NoExit','-Command',command], { env, windowsHide: false, detached: true, stdio: 'ignore', shell: false });
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('PowerShell could not start. Check that Windows PowerShell is available.')));
    child.once('spawn', () => { child.unref(); resolve({ ok: true, launched: true }); });
  });
}
async function action(kind) {
  if (typeof kind !== 'string') throw new Error('Unknown connection action.');
  const setupTools = { 'setup-ollama': 'ollama', 'setup-ollama-vision': 'ollama-vision', 'setup-freellmapi': 'freellmapi', 'setup-omniroute': 'omniroute' };
  if (Object.hasOwn(setupTools, kind)) {
    const result = await terminal('& ' + psQuote(path.join(__dirname, 'AI-SETUP.ps1')) + ' -Tool ' + setupTools[kind], {}, true);
    return { ...result, message: 'Setup opened in PowerShell. Finish any installer prompts and wait for its result. Return here to load models, save and test; opening setup does not mean installation has finished.' };
  }
  if (kind === 'omniroute-dashboard' || kind === 'freellmapi-dashboard') {
    const provider = kind.replace('-dashboard', '');
    await shell.openExternal(new URL(service.publicConfig().gatewayEndpoints[provider]).origin);
    return { ok: true, message: 'The local dashboard was opened. If it does not load, start the router and check its port in AI connections.' };
  }
  if (kind === 'freellmapi-releases') { await shell.openExternal('https://github.com/tashfeenahmed/freellmapi/releases/latest'); return { ok: true }; }
  if (kind === 'omniroute-guide') { await shell.openExternal('https://github.com/cheaper-inference/OmniRoute#-quick-start'); return { ok: true }; }
  if (kind === 'install-claude') return terminal('irm https://claude.ai/install.ps1 | iex');
  if (kind === 'arena-website') { await shell.openExternal('https://arena.ai/agent'); return { ok: true }; }
  if (kind === 'openrouter-keys') { await shell.openExternal('https://openrouter.ai/settings/keys'); return { ok: true }; }
  if (kind === 'ollama-download') { await shell.openExternal('https://ollama.com/download/windows'); return { ok: true }; }
  if (kind === 'arena-keys') { await shell.openExternal('https://platform.arena.ai'); return { ok: true }; }
  if (kind === 'claude-console') { await shell.openExternal('https://platform.claude.com'); return { ok: true }; }
  const claude = claudeExecutable();
  if (['claude-login','claude-open','claude-arena'].includes(kind)) {
    if (!claude) throw new Error('Install Claude Code first using Install Claude Code.');
    return terminal('& ' + psQuote(claude) + (kind === 'claude-login' ? ' auth login' : ''), kind === 'claude-arena' ? service.claudeEnvironment() : {});
  }
  if (kind === 'codex-open') { const codex = codexExecutable(); if (!codex) throw new Error('The Codex runtime is missing. Run INSTALL-AI.cmd from the setup folder.'); return terminal('& ' + psQuote(codex)); }
  throw new Error('Unknown connection action.');
}
for (const [channel, fn] of Object.entries({ get: status, set: patch => { const config = service.set(patch); app.emit('dynamic7land-provider-changed', service.supports(config.provider) ? config.provider : ''); return status(); }, models: provider => service.models(provider), test: async () => ({ answer: await service.answer('Reply only with: Connection successful.', 'This is a connection test.') }), action })) {
  ipcMain.handle('agent-connections:' + channel, async (event, payload) => { if (!trusted(event)) return { ok: false, error: 'Access denied.' }; try { return { ok: true, ...(channel === 'models' ? { models: await fn(payload) } : await fn(payload)) }; } catch (error) { return { ok: false, error: error.message }; } });
}
module.exports = { service, claudeExecutable, codexExecutable, status };
