'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { EventEmitter } = require('node:events');
const { openTerminal } = require('../terminal-launcher.cjs');

test('terminal launch waits for a valid child PID and hides bootstrap failures without exposing its environment', async () => {
  for (const [code, output, valid] of [[0, 'Dynamic7landTerminal:1234', true], [1, 'failure secret-test-value', false], [0, '', false]]) {
    const calls = [], env = { TEST_ONLY_TOKEN: 'secret-test-value' };
    const run = (file, args, options) => {
      calls.push({ file, args, options }); const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
      queueMicrotask(() => { child.stdout.emit('data', Buffer.from(output)); child.emit('close', code); }); return child;
    };
    const promise = openTerminal("Write-Host 'Hello'", { env, cwd: "C:\\User's Folder", spawn: run });
    if (valid) assert.equal((await promise).processId, 1234);
    else await assert.rejects(promise, error => /could not be opened/.test(error.message) && !error.message.includes('secret-test-value'));
    assert.equal(calls[0].options.shell, false); assert.equal(calls[0].options.windowsHide, true);
    assert.equal(calls[0].options.env, env); assert.ok(calls[0].args.includes('-NonInteractive'));
    const bootstrap = Buffer.from(calls[0].args.at(-1), 'base64').toString('utf16le');
    assert.doesNotMatch(bootstrap, /secret-test-value|NoNewWindow|RedirectStandard/);
    assert.match(bootstrap, /User''s Folder/);
  }
});

test('Windows terminal smoke test verifies real console input, working directory and inherited environment', { skip: process.platform !== 'win32', timeout: 20000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "Dynamic7land console's "));
  const marker = path.join(directory, 'console-result.json');
  const quote = value => "'" + value.replace(/'/g, "''") + "'";
  let processId;
  t.after(() => { if (processId) { try { process.kill(processId); } catch {} } fs.rmSync(directory, { recursive: true, force: true }); });
  const command = `try {
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class Dynamic7landConsoleProbe { [DllImport("kernel32.dll")] public static extern IntPtr GetStdHandle(int value); [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(IntPtr handle, out uint mode); }'
$consoleMode = [uint32]0
$keyboard = [Dynamic7landConsoleProbe]::GetConsoleMode([Dynamic7landConsoleProbe]::GetStdHandle(-10), [ref]$consoleMode)
@{ keyboard = $keyboard; folder = (Get-Location).Path; inherited = ($env:DYNAMIC7LAND_CONSOLE_TEST -eq 'synthetic-test-value') } | ConvertTo-Json | Set-Content -LiteralPath ${quote(marker)} -Encoding UTF8
} finally { exit }`;
  const opened = await openTerminal(command, { env: { ...process.env, DYNAMIC7LAND_CONSOLE_TEST: 'synthetic-test-value' }, cwd: directory });
  processId = opened.processId;
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(marker) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(fs.existsSync(marker), 'The real terminal ran its command');
  const result = JSON.parse(fs.readFileSync(marker, 'utf8').replace(/^\uFEFF/, ''));
  assert.equal(result.keyboard, true, 'The new terminal has a keyboard console handle');
  assert.equal(result.inherited, true);
  // Windows TEMP may use an 8.3 alias while PowerShell reports the long name.
  assert.equal(fs.realpathSync.native(result.folder).toLowerCase(), fs.realpathSync.native(directory).toLowerCase());
});
