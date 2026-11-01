'use strict';
const { spawn } = require('node:child_process');
const psQuote = value => "'" + String(value).replace(/'/g, "''") + "'";
const encoded = value => Buffer.from(value, 'utf16le').toString('base64');
function openTerminal(command, { env, cwd, spawn: run = spawn, timeout = 15000 }) {
  // The hidden bootstrap has pipes; Start-Process gives the visible terminal
  // its own keyboard and console handles. Secrets are inherited in env only.
  const script = "$ErrorActionPreference = 'Stop'\nSet-Location -LiteralPath " + psQuote(cwd) + '\n' + command;
  const argumentsText = '-NoLogo -NoProfile -NoExit -EncodedCommand ' + encoded(script);
  const bootstrap = "$ErrorActionPreference = 'Stop'\n$terminal = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList " + psQuote(argumentsText) + ' -WorkingDirectory ' + psQuote(cwd) + " -WindowStyle Normal -PassThru\nWrite-Output ('Dynamic7landTerminal:' + $terminal.Id)";
  return new Promise((resolve, reject) => {
    let child, output = '', finished = false;
    const finish = (error, result) => { if (finished) return; finished = true; clearTimeout(timer); error ? reject(error) : resolve(result); };
    const timer = setTimeout(() => { child?.kill(); finish(new Error('The terminal took too long to open. Close any extra launcher window and try again.')); }, timeout);
    try {
      child = run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded(bootstrap)], { env, cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
      child.stdout?.on('data', chunk => { output = (output + chunk.toString()).slice(-2048); });
      child.stderr?.on('data', () => {});
      child.once('error', () => finish(new Error('PowerShell could not start. Check that Windows PowerShell is available.')));
      child.once('close', code => {
        const match = output.match(/Dynamic7landTerminal:(\d+)/);
        if (code !== 0 || !match || Number(match[1]) < 1) return finish(new Error('The chat window could not be opened. Try again from AI connections.'));
        finish(null, { ok: true, launched: true, processId: Number(match[1]) });
      });
    } catch { finish(new Error('PowerShell could not start. Check that Windows PowerShell is available.')); }
  });
}
module.exports = { openTerminal };
