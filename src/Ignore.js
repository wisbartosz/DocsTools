const IGNORE_PROP_PREFIX = 'ignoredIssues.';
const IGNORE_CHUNK_CHARS = 8000;
const IGNORE_MAX_CHUNKS = 20;
const IGNORE_MAX_HIDDEN = 100;
const IGNORE_LOCK_MS = 10000;
const IGNORE_KEY = /^[A-Za-z]+:[0-9a-f]{8}$/;

function ignoreInfoKinds_(module) {
  if (module === 'bibliography') return BIB_INFO_KINDS;
  if (module === 'figures') return FIG_INFO_KINDS;
  if (module === 'style') return STYLE_INFO_KINDS;
  if (module === 'abbreviations') return ABBR_INFO_KINDS;
  if (module === 'closeness') return CLOSENESS_INFO_KINDS;
  return null;
}

function ignoreNorm_(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/[„”“«»"]/g, '"')
    .replace(/[‘’‚']/g, "'")
    .replace(/[‐-―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\s   ]+/g, ' ')
    .trim();
}

function ignoreHash_(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ('0000000' + hash.toString(16)).slice(-8);
}

function ignoreChunks_(keys) {
  const chunks = [];
  let current = [];
  let size = 0;
  keys.forEach(function (key) {
    if (current.length && size + key.length + 1 > IGNORE_CHUNK_CHARS) {
      chunks.push(current.join(','));
      current = [];
      size = 0;
    }
    current.push(key);
    size += key.length + 1;
  });
  if (current.length) chunks.push(current.join(','));
  return chunks;
}

function readIgnoredIssues_(module) {
  const props = docProps_().getProperties();
  const keys = [];
  for (let i = 0; i < IGNORE_MAX_CHUNKS; i++) {
    const value = props[IGNORE_PROP_PREFIX + module + '.' + i];
    if (!value) break;
    value.split(',').forEach(function (key) { if (IGNORE_KEY.test(key)) keys.push(key); });
  }
  return keys;
}

function writeIgnoredIssues_(module, keys) {
  const props = docProps_();
  const chunks = ignoreChunks_(keys).slice(0, IGNORE_MAX_CHUNKS);
  const values = {};
  chunks.forEach(function (chunk, i) { values[IGNORE_PROP_PREFIX + module + '.' + i] = chunk; });
  if (chunks.length) props.setProperties(values);
  const existing = props.getKeys();
  for (let i = chunks.length; i < IGNORE_MAX_CHUNKS; i++) {
    const key = IGNORE_PROP_PREFIX + module + '.' + i;
    if (existing.indexOf(key) >= 0) props.deleteProperty(key);
  }
}

function withIgnoreLock_(action) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(IGNORE_LOCK_MS)) throw userError_('ignore.err.busy');
  try {
    return action();
  } finally {
    lock.releaseLock();
  }
}

function ignoreFilter_(module, stored) {
  const kinds = ignoreInfoKinds_(module) || {};
  const keys = {};
  (stored || readIgnoredIssues_(module)).forEach(function (key) { keys[key] = true; });
  const seen = {};
  const visible = {};
  const hide = function (group, item) {
    const text = item.keyText !== undefined ? item.keyText : item.preview;
    delete item.keyText;
    if (!kinds[group.kind]) return false;
    const base = [group.kind, text, item.match, item.ref && item.ref.fingerprint].map(ignoreNorm_).join('\u0001');
    seen[base] = (seen[base] || 0) + 1;
    group.seq = (group.seq || 0) + 1;
    item.seq = group.seq;
    item.ignoreKey = group.kind + ':' + ignoreHash_(base + '\u0001' + seen[base]);
    if (!keys[item.ignoreKey]) {
      (visible[group.kind] = visible[group.kind] || []).push(item.ignoreKey);
      return false;
    }
    if (!group.hidden) group.hidden = [];
    group.hiddenCount = (group.hiddenCount || 0) + 1;
    if (group.hidden.length < IGNORE_MAX_HIDDEN) group.hidden.push(item);
    return true;
  };
  hide.finish = function (groups) {
    groups.forEach(function (group) {
      if (visible[group.kind] && group.count > group.items.length) group.allKeys = visible[group.kind];
    });
  };
  return hide;
}

function mergeIgnoredKeys_(current, add, remove) {
  const removedKinds = {};
  const removed = {};
  if (remove && remove.kinds) remove.kinds.forEach(function (kind) { removedKinds[kind] = true; });
  else (remove || []).forEach(function (key) { removed[key] = true; });
  const isRemoved = function (key) { return removed[key] || removedKinds[key.split(':')[0]]; };
  const added = (add || []).filter(function (key, i, all) { return !removed[key] && all.indexOf(key) === i; });
  const addedSet = {};
  added.forEach(function (key) { addedSet[key] = true; });
  let keys = current.filter(function (key) { return !isRemoved(key) && !addedSet[key]; }).concat(added);
  while (keys.length && ignoreChunks_(keys).length > IGNORE_MAX_CHUNKS) keys = keys.slice(Math.ceil(keys.length / 20));
  return keys;
}

function updateIgnoredIssues(module, add, remove) {
  const kinds = ignoreInfoKinds_(module);
  if (!kinds) throw new Error('Unknown module: ' + module);
  const valid = function (key) { return typeof key === 'string' && IGNORE_KEY.test(key) && !!kinds[key.split(':')[0]]; };
  const removal = remove && remove.kinds
    ? { kinds: remove.kinds.filter(function (kind) { return !!kinds[kind]; }) }
    : (remove || []).filter(valid);
  return withIgnoreLock_(function () {
    const current = readIgnoredIssues_(module);
    writeIgnoredIssues_(module, mergeIgnoredKeys_(current, (add || []).filter(valid), removal));
    return {
      removed: removal.kinds ? current.filter(function (key) { return removal.kinds.indexOf(key.split(':')[0]) >= 0; }) : [],
    };
  });
}
