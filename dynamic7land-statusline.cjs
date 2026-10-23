'use strict';
// Claude Code status line → Dynamic7land.
// Claude Code runs this after each answer and passes session data on stdin, including how much
// of your 5-hour and weekly limit you have used. We forward that to Dynamic7land (for the ring) and
// print a short status line in the terminal. Usage: node dynamic7land-statusline.cjs <token>
const http = require('node:http');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(input); } catch {}
  const pct = value => (Number.isFinite(value) ? Math.round(value) : null);
  const limits = data.rate_limits || {};
  const usage = {
    session_id: data.session_id || '',
    pid: process.ppid, // part of Claude Code, used for "jump to terminal"
    model: data.model?.display_name || data.model?.id || '', // shown on the Claude page
    context: pct(data.context_window?.used_percentage),
    five_hour: limits.five_hour ? { used: pct(limits.five_hour.used_percentage), resets_at: limits.five_hour.resets_at || null } : null,
    seven_day: limits.seven_day ? { used: pct(limits.seven_day.used_percentage), resets_at: limits.seven_day.resets_at || null } : null
  };

  const parts = ['Dynamic7land'];
  if (usage.five_hour?.used != null) parts.push('5 uur: ' + usage.five_hour.used + '%');
  if (usage.seven_day?.used != null) parts.push('week: ' + usage.seven_day.used + '%');
  if (usage.context != null) parts.push('gesprek: ' + usage.context + '% vol');
  process.stdout.write(parts.join(' · ') + '\n');

  const body = JSON.stringify(usage);
  const req = http.request({ host: '127.0.0.1', port: 47825, path: '/dynamic7land-status', method: 'POST', timeout: 800,
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'x-dynamic7land-token': process.argv[2] || '' } });
  req.on('error', () => {}); // Dynamic7land not running: the status line still works.
  req.on('timeout', () => req.destroy());
  req.end(body);
});
