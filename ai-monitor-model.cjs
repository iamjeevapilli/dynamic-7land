'use strict';
const { createHash } = require('node:crypto');
const PROVIDERS = Object.freeze({
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  claude: { name: 'Claude', url: 'https://claude.ai/' }
});
const hash = text => createHash('sha256').update(text || '').digest('hex');
const clean = text => String(text || '').replace(/\r/g, '').trim();
const STOP = /^(stop( generating| response| streaming| answering)?|stoppen( met (genereren|streamen))?|antwoord stoppen|genereren stoppen|streamen stoppen|stop met streamen)$/i;
const SEND = /^(send( message| prompt)?|send now|verstuur|verzenden|bericht verzenden|bericht versturen|prompt (verzenden|versturen))$/i;
const LOGIN = /^(log in|login|sign in|inloggen|aanmelden)$/i;
const ERROR = /^(something went wrong|an error occurred|er is iets misgegaan|er is een fout opgetreden|failed to generate|network error|usage limit reached|you.ve reached your limit|limiet bereikt)/i;
const HALTED = /^(stopped generating|response stopped|genereren gestopt|antwoord gestopt|generation cancelled)$/i;
const ASSISTANT = /^(ChatGPT (said|zei)|Claude (said|zei)|Claude.s response|Assistant|Assistent)\s*:?\s*$/i;
const USER = /^(You (said|zei)|Je zei|Jij zei|User|Gebruiker)\s*:?\s*$/i;
const RESPONSE_CLASS = /(?:^|[\s_-])(font-claude-message|assistant-message|assistant-response|agent-message)(?:$|[\s_-])/i;
const COMPOSER = /^(prompt-textarea|chat-input|message-input|composer)/i;
// ChatGPT now says "Stel een vraag aan ChatGPT" / "Ask ChatGPT anything" on its input field.
const INPUT_LABEL = /(message (ChatGPT|Claude)|reply to Claude|ask (anything|Claude|ChatGPT)|stel (een vraag|iets)|vraag (iets )?aan (ChatGPT|Claude)|bericht( aan| sturen)?|typ (een|je)|stuur een bericht|how can (I|Claude) help|write (a|your) (message|reply)|reply\.\.\.|antwoord)/i;

// Current claude.ai: each turn is a group "Message 52 of 52" that starts with a summary text
// "Claude responded: …" or "You said: …".
const MESSAGE = /^(message|bericht) \d+ (of|van) \d+$/i;
const ROLE_ASSISTANT = /^(Claude responded|Claude antwoordde|Claude said|Claude zei|ChatGPT said|ChatGPT zei)\s*:/i;
const ROLE_USER = /^(You said|Je zei|Jij zei)\s*:/i;

function descendants(nodes, parent) {
  const ids = new Set([parent]);
  return nodes.filter(n => { if (ids.has(n.parent)) { ids.add(n.index); return true; } return false; });
}
// Joins inline pieces ("Druk op ", "Ctrl+O", " en …") into one line per paragraph or list item.
function blockText(nodes, scope) {
  const byIndex = new Map(nodes.map(n => [n.index, n]));
  const block = n => { let p = byIndex.get(n.parent); while (p && p.type === 'Text') p = byIndex.get(p.parent); return p?.index; };
  const lines = [], guards = []; let lastBlock;
  for (const n of scope) {
    const name = String(n.name || '').replace(/\r/g, '');
    if (!name.trim() || n.type !== 'Text' || nodes.some(child => child.parent === n.index && clean(child.name))) continue;
    const b = block(n);
    if (lines.length && b === lastBlock) lines[lines.length - 1] += name; else lines.push(name);
    lastBlock = b; guards.push({ id: n.id, name: n.name });
  }
  return { text: lines.map(clean).filter(Boolean).join('\n').slice(0, 40000), guards };
}
function lastMessageTurn(nodes) {
  const turns = nodes.filter(n => n.type === 'Group' && MESSAGE.test(clean(n.name)));
  if (!turns.length) return undefined;
  const anchor = turns.at(-1), inside = descendants(nodes, anchor.index);
  if (inside.some(n => ROLE_USER.test(clean(n.name)))) return null; // Newest turn is yours: no reply yet.
  if (!inside.some(n => ROLE_ASSISTANT.test(clean(n.name)))) return undefined;
  // Skip the summary line, the thinking status and the action toolbar.
  const skip = new Set();
  for (const n of inside) {
    if (skip.has(n.parent) || ROLE_ASSISTANT.test(clean(n.name)) || ['ToolBar', 'StatusBar', 'Button'].includes(n.type)) skip.add(n.index);
  }
  const { text, guards } = blockText(nodes, inside.filter(n => !skip.has(n.index)));
  if (!text) return null;
  return { text, fingerprint: hash(text), guards, anchor: anchor.index };
}
function lastAssistant(nodes) {
  const turn = lastMessageTurn(nodes);
  if (turn !== undefined) return turn;
  const groups = nodes.filter(n => RESPONSE_CLASS.test(n.className || '') && ['Group', 'Pane', 'Document'].includes(n.type));
  let scope, anchor;
  if (groups.length) {
    anchor = groups.at(-1); scope = descendants(nodes, anchor.index);
  } else {
    const markers = nodes.filter(n => ASSISTANT.test(clean(n.name)) && n.type !== 'Button');
    anchor = markers.at(-1);
    if (!anchor) return null;
    scope = nodes.filter(n => n.index > anchor.index);
  }
  const parts = [], guards = [];
  if (!scope.length && clean(anchor.name) && !ASSISTANT.test(clean(anchor.name))) scope = [anchor];
  for (const n of scope) {
    const name = clean(n.name);
    if (USER.test(name)) return null; // A newer user turn: the old reply is no longer awaiting input.
    if (n.type === 'Edit' || COMPOSER.test(n.automationId || '')) break;
    if (!name || ASSISTANT.test(name) || !['Text', 'Group', 'Pane'].includes(n.type)) continue;
    if (nodes.some(child => child.parent === n.index && clean(child.name))) continue;
    if (/^(ChatGPT can make mistakes|ChatGPT kan fouten maken|Claude can make mistakes|Claude kan fouten maken|check important info|controleer belangrijke informatie)/i.test(name)) continue;
    if (parts.at(-1) !== name) { parts.push(name); guards.push({ id: n.id, name: n.name }); }
  }
  const text = parts.join('\n').slice(0, 40000);
  if (!text) return null;
  return { text, fingerprint: hash(text), guards, anchor: anchor.index };
}
function questionFrom(text) {
  // Conservative text recognition; examples, quotes and code do not prove an input request.
  // Only the closing lines count: a real question near the end ("Wil je A of B?"),
  // or a last line that asks you to answer ("Typ 1 of 2.", "Zeg het maar.", "Let me know.").
  let fenced = false;
  const lines = clean(text).split(/\n+/).map(l => l.trim()).filter(l => {
    if (l.startsWith('```')) { fenced = !fenced; return false; }
    return l && !fenced;
  });
  const plain = l => l.replace(/[*_`]/g, '').trim();
  const asks = l => /\?\s*[*_]*$/.test(l) && !/^([>`]|\*?voorbeeld|example|vraag \d)/i.test(l) &&
    /\b(jij|je|jouw|u|uw|wil|wilt|welke|wat|hoe|kan|kun|zou|kies|you|your|would|which|what|how|can|should|do you)\b/i.test(l);
  const invites = l => /^(typ|kies|zeg|antwoord|laat (me |het )?weten|type|pick|choose|reply|let me know|tell me)\b/i.test(plain(l)) ||
    /\b(zeg het( maar)?|laat (het )?(me )?weten|let me know)[.!]?$/i.test(plain(l));
  const tail = lines.slice(-3), last = tail.at(-1) || '';
  if (!tail.some(asks) && !invites(last)) return '';
  return text.slice(-6000);
}
function observe(snapshot, provider) {
  if (!snapshot?.ok) return { valid: false, detail: snapshot?.error || 'Venster niet beschikbaar.' };
  if (!PROVIDERS[provider] || snapshot.provider !== provider) return { valid: false, detail: 'Het gekozen venster toont dit gesprek niet meer.' };
  if (snapshot.truncated) return { valid: false, detail: 'Dit venster geeft nog niet voldoende leesbare informatie. Open het laatste antwoord.' };
  const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
  const buttons = nodes.filter(n => n.type === 'Button' && n.enabled !== false);
  const login = buttons.find(n => LOGIN.test(clean(n.name)));
  if (login) return { valid: false, login: true, detail: 'Log eerst in bij ' + PROVIDERS[provider].name + '.' };
  const richEditors = nodes.filter(n => !n.password && n.type === 'Edit' && /(?:^|\s)ProseMirror(?:\s|$)/.test(n.className || ''));
  const edits = nodes.filter(n => !n.password && n.enabled !== false &&
    (n.type === 'Edit' || COMPOSER.test(n.automationId || '')) &&
    (COMPOSER.test(n.automationId || '') || INPUT_LABEL.test(clean(n.name)) || INPUT_LABEL.test(clean(n.helpText)) ||
      (richEditors.length === 1 && n.id === richEditors[0].id))); // the one rich text box of the chat (claude.ai and chatgpt.com)
  // Never guess an arbitrary edit field, search box or address bar.
  const composer = edits.length === 1 ? edits[0] : null;
  // claude.ai also announces streaming in a status line, e.g. "Claude is responding".
  const stop = buttons.find(n => STOP.test(clean(n.name))) ||
    nodes.find(n => n.type === 'Text' && /^Claude is (responding|thinking|writing)\b/i.test(clean(n.name)));
  const send = buttons.find(n => SEND.test(clean(n.name)));
  const assistant = lastAssistant(nodes);
  const tail = assistant ? nodes.filter(n => n.index > assistant.anchor) : [];
  const error = tail.find(n => n.type === 'Text' && ERROR.test(clean(n.name)));
  const halted = tail.find(n => n.type === 'Text' && HALTED.test(clean(n.name)));
  const completed = Boolean(assistant && composer && tail.some(n => n.type === 'Button' &&
    /^(copy( response| message)?|kopieer( antwoord| bericht)?|kopiëren|good response|bad response|goed antwoord|slecht antwoord|retry|regenerate|opnieuw genereren)$/i.test(clean(n.name))));
  const phase = nodes.find(n => n.type === 'Text' && /^(thinking|aan het denken|nadenken|searching the web|zoeken op het web|writing|antwoord schrijven|researching|onderzoeken)(\.{0,3})$/i.test(clean(n.name)));
  return { valid: Boolean(composer || stop), detail: composer || stop ? '' : 'Invoerveld niet herkenbaar. Open het gesprek in dit venster.',
    contextKey: snapshot.contextKey, stop: Boolean(stop), composer, send, assistant, completed,
    error: error?.name || '', halted: Boolean(halted), question: assistant ? questionFrom(assistant.text) : '',
    activity: phase?.name || 'Antwoord wordt gemaakt', snapshot };
}
// "Ideeën voor mijn site - Google Chrome" → "Ideeën voor mijn site"
function chatTitle(title) {
  return String(title || '').replace(/\s+[-–—]\s+(Google Chrome|Microsoft​? Edge|Mozilla Firefox|Brave|Opera|Vivaldi|Arc)$/i, '')
    .replace(/^(ChatGPT|Claude)\s+[-–—]\s+/i, '').trim();
}
class Session {
  constructor(provider, target) {
    this.provider = provider; this.target = target; this.contextKey = null; this.state = 'connecting';
    this.detail = 'Verbinding controleren'; this.run = null; this.last = null; this.stable = 0;
    this.baseline = null; this.completions = 0;
    this.question = ''; this.questionId = ''; this.startedAt = null; this.endedAt = null; this.notification = null;
  }
  accept(obs, now = Date.now()) {
    this.notification = null; this.last = obs;
    if (!obs.valid) {
      this.state = obs.login ? 'login' : 'unavailable'; this.detail = obs.detail;
      this.run = null; this.baseline = null; this.stable = 0; this.question = ''; this.questionId = ''; return this.public(now);
    }
    if (this.contextKey && this.contextKey !== obs.contextKey) {
      const isNewChat = this.run && /:https:\/\/(chatgpt\.com|claude\.ai)\/?$/.test(this.contextKey);
      if (!isNewChat) {
        // Another chat is open now: Dynamic7land simply follows that one (like Coucou, nothing to reconnect).
        // Its current answer is the starting point, so an old answer never counts as "done".
        this.contextKey = obs.contextKey; this.run = null; this.stable = 0; this.startedAt = null; this.endedAt = null;
        this.baseline = obs.assistant?.fingerprint || ''; this.preview = obs.assistant?.text || '';
        this.state = 'ready'; this.detail = 'Volgt dit gesprek'; this.question = ''; this.questionId = '';
        this.title = chatTitle(obs.snapshot?.title || this.target.title); return this.public(now);
      }
    }
    this.contextKey = obs.contextKey; this.title = chatTitle(obs.snapshot?.title || this.target.title);
    if (obs.assistant?.text) this.preview = obs.assistant.text;
    const previousReply = this.baseline;
    this.baseline = obs.assistant?.fingerprint || '';
    if (obs.error || obs.halted) {
      this.state = obs.halted ? 'stopped' : 'error'; this.detail = obs.halted ? 'Antwoord gestopt' : obs.error;
      this.run = null; this.question = ''; this.questionId = ''; return this.public(now);
    }
    if (obs.stop) {
      if (!this.run) { this.run = { baseline: obs.assistant?.fingerprint || '', last: '', began: now }; this.startedAt = now; }
      // Keep the observed streaming fingerprint to require final action controls and a stable reply.
      this.run.latest = obs.assistant?.fingerprint || '';
      this.state = 'running'; this.detail = obs.activity; this.stable = 0; this.endedAt = null;
      this.question = ''; this.questionId = ''; return this.public(now);
    }
    if (!this.run && previousReply !== null && this.baseline && this.baseline !== previousReply && obs.completed) {
      // A very short response may finish between polls. Require a changed reply, final controls and stability.
      this.run = { baseline: previousReply, last: this.baseline, began: now, settlingAt: now };
      this.startedAt = now; this.endedAt = null; this.stable = 0;
      this.state = 'running'; this.detail = 'Nieuw antwoord controleren'; return this.public(now);
    }
    if (this.run) {
      const fingerprint = obs.assistant?.fingerprint || '';
      this.stable = fingerprint && this.run.last === fingerprint ? this.stable + 1 : 0;
      this.run.last = fingerprint;
      if (!obs.completed || this.stable < 1) {
        this.state = 'running'; this.detail = 'Einde van antwoord controleren';
        this.run.settlingAt ||= now;
        if (now - this.run.settlingAt > 20000 && !obs.completed) {
          this.state = 'unavailable'; this.detail = 'Het einde van dit antwoord is niet bevestigd.'; this.run = null;
        }
        return this.public(now);
      }
      this.run = null; this.endedAt = now;
      this.state = obs.question ? 'question' : 'done';
      this.detail = obs.question ? 'Heeft een vraag voor jou' : 'Antwoord klaar';
      this.question = obs.question; this.questionId = obs.question ? fingerprint : '';
      this.completions++;
      this.notification = this.state; return this.public(now);
    }
    if (obs.question && obs.completed) {
      this.state = 'question'; this.detail = 'Vraag in het laatste antwoord';
      this.question = obs.question; this.questionId = obs.assistant.fingerprint;
    } else if (this.state !== 'done') {
      this.state = 'ready'; this.detail = 'Ready · venster verbonden'; this.question = ''; this.questionId = '';
    }
    return this.public(now);
  }
  public(now = Date.now()) {
    return { provider: this.provider, name: PROVIDERS[this.provider].name, connected: true,
      state: this.state, detail: this.detail, question: this.question, questionId: this.questionId,
      elapsed: this.startedAt ? Math.floor(((this.endedAt || now) - this.startedAt) / 1000) : 0,
      canReply: this.state === 'question' && Boolean(this.last?.composer),
      source: { title: this.title || chatTitle(this.target.title), process: this.target.process }, targetId: this.target.id,
      preview: String(this.preview || '').slice(-1200) };
  }
}
module.exports = { PROVIDERS, observe, Session, questionFrom, hash };
