'use strict';
const { NativeWorker } = require('./ai-monitor-main.cjs');
const { observe, PROVIDERS } = require('./ai-monitor-model.cjs');
async function check(worker, write = console.log) {
  const result = await worker.request('windows');
  if (!result?.ok) throw new Error(result?.error || "Windows connection unavailable.");
  write("✓ Windows connection started.");
  let identified = 0, readable = 0;
  for (const target of result.windows || []) {
    let snapshot;
    try { snapshot = await worker.request('read', { target }); }
    catch { write("A window is not responding. Restore the window and try again."); continue; }
    if (!Object.hasOwn(PROVIDERS, snapshot?.provider || '')) continue;
    identified++;
    const observation = observe(snapshot, snapshot.provider);
    const name = PROVIDERS[snapshot.provider].name;
    if (!observation.valid) {
      write(name + ": not readable. " + (observation.login ? "Sign in first." : snapshot.truncated ? 'Te veel of onvolledige vensterinformatie.' : "Keep the correct conversation visible in its own window."));
      continue;
    }
    readable++;
    write(name + ': ' + (observation.composer ? "input field recognised" : "working button recognised") +
      " · AI message " + (observation.assistant ? 'herkend' : "not recognised yet") +
      " · completion " + (observation.completed ? 'herkend' : "not recognised yet"));
  }
  if (!identified) write("No readable ChatGPT or Claude window yet. Open your conversation in its own window and run this check again.");
  else if (readable) write("Connect that conversation in Dynamic7land. Then test a question, a completed answer, and a reply from the island.");
  write("This check sends nothing and shows no conversation content. Test actual sending and notifications separately.");
  return { identified, readable };
}
if (require.main === module) {
  const worker = new NativeWorker();
  check(worker).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => worker.close());
}
module.exports = { check };
