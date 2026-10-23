'use strict';
// Connection preferences only. Provider keys and OAuth tokens use the original encrypted stores.
const fs = require('node:fs');
const path = require('node:path');
const DEFAULTS = Object.freeze({ ownerName: 'Jeeva', spotifyClientId: '', companionEndpoint: '', updatesRepository: '' });

function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid service settings.');
  const config = {};
  for (const key of Object.keys(DEFAULTS)) {
    const raw = value[key] ?? DEFAULTS[key];
    if (typeof raw !== 'string') throw new Error('Invalid value for ' + key + '.');
    config[key] = raw.trim();
  }
  if (!config.ownerName || config.ownerName.length > 60 || /[\x00-\x1f]/.test(config.ownerName)) throw new Error('Enter a name between 1 and 60 characters.');
  if (config.spotifyClientId && !/^[a-f0-9]{32}$/i.test(config.spotifyClientId)) throw new Error('Spotify Client ID must contain 32 hexadecimal characters.');
  if (config.companionEndpoint) {
    let url;
    try { url = new URL(config.companionEndpoint); } catch { throw new Error('Enter a valid HTTPS companion URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS companion URL without a password, query or fragment.');
    config.companionEndpoint = url.toString().replace(/\/+$/, '');
  }
  if (config.updatesRepository && !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(config.updatesRepository)) throw new Error('Use a GitHub repository in owner/repository format.');
  return config;
}

function createStore(directory) {
  const file = path.join(directory, 'services.json');
  const get = () => {
    try { return validate({ ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) }); }
    catch { return { ...DEFAULTS }; }
  };
  const set = value => {
    const next = validate({ ...get(), ...value });
    fs.mkdirSync(directory, { recursive: true });
    const temp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
    return next;
  };
  return { get, set };
}
module.exports = { DEFAULTS, validate, createStore };
