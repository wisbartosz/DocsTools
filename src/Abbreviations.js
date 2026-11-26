const ABBR_KINDS = ['missing', 'unused', 'noExpansion', 'order'];
const ABBR_INFO_KINDS = { unused: true, noExpansion: true, order: true };
const ABBR_SECTION = /^(?:(?:wykaz|spis)(?: (?:stosowanych|u\u017cywanych|wykorzystanych|najwa\u017cniejszych))? (?:skr\u00f3t\u00f3w|oznacze\u0144|symboli|akronim\u00f3w|skr\u00f3t\u00f3w i oznacze\u0144|skr\u00f3t\u00f3w i symboli|skr\u00f3t\u00f3w i akronim\u00f3w|oznacze\u0144 i skr\u00f3t\u00f3w|symboli i skr\u00f3t\u00f3w)(?: (?:u\u017cytych|stosowanych) w pracy)?|skr\u00f3ty|skr\u00f3ty i oznaczenia|abbreviations|list of abbreviations|list of abbreviations and symbols)$/;
const ABBR_TABLE_HEADER = /^(?:skr\u00f3t|skr\u00f3ty|symbol|symbole|oznaczenie|oznaczenia|akronim|abbreviation|abbreviations|term)$/i;
const ABBR_TOKEN = /(?<![\p{L}\p{N}&])(\p{Lu}[\p{Lu}\p{N}&]*)(-\p{N}+)?(-\p{Ll}{1,4})?(?![\p{L}\p{N}])/gu;
const ABBR_COMMON = { ISBN: true, ISSN: true, DOI: true, URL: true, WWW: true, PDF: true, PLN: true, USD: true, EUR: true };
const ABBR_MASK = /https?:\/\/\S+|www\.\S+|doi:\s*\S+|\b10\.\d{4,}\/\S+/gi;

function abbreviationMask_(text) {
  let masked = String(text).replace(ABBR_MASK, function (m) { return ' '.repeat(m.length); });
  parseCitations_(masked).forEach(function (c) {
    masked = masked.slice(0, c.start) + ' '.repeat(c.end - c.start) + masked.slice(c.end);
  });
  return masked;
}

function abbreviationsIn_(text) {
  const letters = (String(text).match(/\p{L}/gu) || []).length;
  const upper = (String(text).match(/\p{Lu}/gu) || []).length;
  if (letters >= 12 && upper / letters > 0.6) return [];
  const masked = abbreviationMask_(text);
  const out = [];
  let match;
  ABBR_TOKEN.lastIndex = 0;
  while ((match = ABBR_TOKEN.exec(masked)) !== null) {
    const core = match[1];
    const caps = (core.match(/\p{Lu}/gu) || []).length;
    if (caps < 2) continue;
    if (/^(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/.test(core)) continue;
    if (/^\p{Lu}{7,}$/u.test(core)) continue;
    const abbr = core + (match[2] || '');
    if (ABBR_COMMON[abbr]) continue;
    if (/^,?\s*\(?(?:1[5-9]|20)\d\d[a-z]?(?![\p{L}\p{N}])/u.test(masked.slice(match.index + match[0].length))) continue;
    out.push({ start: match.index, end: match.index + abbr.length, abbr: abbr });
  }
  return out;
}

function parseAbbreviationEntry_(text) {
  const clean = String(text || '').replace(/\s+$/, '');
  const match = /^\s*(.+?)(?:\t+\s*|\s+[–—-]\s+|\s*[–—]\s*|\s*:\s+)(.+)$/.exec(clean);
  if (match) {
    const abbr = match[1].replace(/\s*\(.*$/, '').replace(/[.,;:]+$/, '').trim();
    if (abbr && abbr.length <= 20 && !/\s\S+\s/.test(abbr)) return { abbr: abbr, expansion: match[2].trim() };
  }
  const single = clean.trim().replace(/[.,;:]+$/, '');
  if (single && single.length <= 15 && !/\s/.test(single) && (single.match(/\p{Lu}/gu) || []).length >= 2) return { abbr: single, expansion: '' };
  return null;
}

function abbreviationTableEntries_(rows) {
  const out = [];
  rows.forEach(function (row, index) {
    const abbr = String(row.cells[0] || '').trim().replace(/[.,;:]+$/, '');
    if (!abbr || !row.paragraph || abbr.length > 20) return;
    if (index === 0 && ABBR_TABLE_HEADER.test(abbr)) return;
    out.push({ abbr: abbr, expansion: String(row.cells[1] || '').trim(), paragraph: row.paragraph });
  });
  return out;
}

function abbreviationPlainWords_(part) {
  return (part.match(/\p{L}[\p{L}'’-]+/gu) || []).filter(function (word) { return (word.match(/\p{Lu}/gu) || []).length < 2; }).length;
}

function hasExpansion_(text, start, end) {
  const abbr = text.slice(start, end);
  const need = Math.max(2, Math.min(3, (abbr.match(/\p{Lu}/gu) || []).length));
  const acronym = /\p{Lu}[\p{Lu}\p{N}&]+/u;
  const before = text.slice(0, start);
  const after = text.slice(end).replace(/^-\p{Ll}+/u, '');
  const open = before.lastIndexOf('(');
  const close = after.indexOf(')');
  if (open >= 0 && before.indexOf(')', open) < 0 && close >= 0 && after.lastIndexOf('(', close) < 0) {
    const inside = before.slice(open + 1) + ' ' + after.slice(0, close);
    if (acronym.test(inside)) return false;
    const words = abbreviationPlainWords_(inside);
    if (words >= need) return true;
    const lead = before.slice(0, open).split(/[.!?;:]\s/).pop();
    return words === 0 && abbreviationPlainWords_(lead) >= need;
  }
  const paren = /^\s*\(([^()]*)\)/.exec(after);
  if (paren && !acronym.test(paren[1]) && abbreviationPlainWords_(paren[1]) >= need) return true;
  return /^\s*(?:[–—-]\s+|,?\s*(?:czyli|tj\.|tzn\.|that is|i\.e\.)\s+)\p{L}{2,}\s+\p{L}{2,}/u.test(after);
}

function abbreviationOrder_(entries) {
  const problems = [];
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].abbr.localeCompare(entries[i - 1].abbr, 'pl', { sensitivity: 'base' }) < 0) problems.push(i);
  }
  return problems;
}

function abbreviationUsed_(abbr, uses, bodyText) {
  if (uses[abbr]) return true;
  const base = abbr.replace(/-\d+$/, '');
  if (Object.keys(uses).some(function (used) { return used === base || used.replace(/-\d+$/, '') === abbr; })) return true;
  const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![\\p{L}\\p{N}])' + escaped + '(?![\\p{L}\\p{N}])', 'u').test(bodyText);
}

function abbreviationListed_(abbr, listed) {
  return !!(listed[abbr] || listed[abbr.replace(/-\d+$/, '')]);
}

function abbreviationContext_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const paragraphs = documentParagraphs_(body);
  const headings = [];
  paragraphs.forEach(function (p) {
    const level = headingLevel_(p.heading);
    p.level = level && p.text.trim() && !p.inTable ? level : 0;
    if (p.level) headings.push({ level: p.level, text: p.text, paragraph: p });
  });
  const roles = styleRoles_(headings);
  headings.forEach(function (h, i) { h.paragraph.headingRole = roles[i]; });
  let role = null;
  let section = null;
  const ctx = { section: null, entries: [], paragraphs: [] };
  const flush = function () {
    if (section) Array.prototype.push.apply(ctx.entries, abbreviationTableEntries_(section.rows));
  };
  paragraphs.forEach(function (p) {
    if (p.level) {
      if (section && p.level > section.level) return;
      flush();
      section = ABBR_SECTION.test(styleTitle_(p.text)) ? { level: p.level, rows: [], byKey: {} } : null;
      if (section) ctx.section = p;
      role = p.headingRole;
      return;
    }
    if (!p.text.trim()) return;
    if (section) {
      if (p.inTable) {
        const path = p.location.path;
        const key = path.slice(0, -2).join('.');
        const cell = path[path.length - 2];
        let row = section.byKey[key];
        if (!row) {
          row = section.byKey[key] = { cells: [], paragraph: null };
          section.rows.push(row);
        }
        row.cells[cell] = ((row.cells[cell] || '') + ' ' + p.text).trim();
        if (cell === 0 && !row.paragraph) row.paragraph = p;
        return;
      }
      const entry = parseAbbreviationEntry_(p.text);
      if (entry) ctx.entries.push(Object.assign(entry, { paragraph: p }));
      return;
    }
    if (role === 'skip') return;
    ctx.paragraphs.push({ paragraph: p, role: role });
  });
  flush();
  return ctx;
}

function abbreviationItem_(location, text, start, end, detail) {
  const snippet = styleSnippet_(text, start, end);
  return {
    ref: styleRef_(location, text, { start: start, end: end, match: text.slice(start, end) }),
    before: snippet.before,
    match: snippet.match,
    after: snippet.after,
    detail: detail || '',
    keyText: text,
  };
}

function checkAbbreviations() {
  const ctx = abbreviationContext_();
  const groups = checkGroups_(ABBR_KINDS, { info: ABBR_INFO_KINDS, hide: ignoreFilter_('abbreviations') });
  const add = function (kind, item) {
    groups.add(kind, item);
  };
  const uses = {};
  ctx.paragraphs.forEach(function (entry) {
    const text = entry.paragraph.text;
    abbreviationsIn_(text).forEach(function (hit) {
      const use = uses[hit.abbr] || (uses[hit.abbr] = { count: 0, paragraph: entry.paragraph, hit: hit });
      use.count++;
    });
  });
  const listed = {};
  ctx.entries.forEach(function (entry) { listed[entry.abbr] = entry; });
  Object.keys(uses).forEach(function (abbr) {
    const use = uses[abbr];
    const text = use.paragraph.text;
    if (ctx.section && !abbreviationListed_(abbr, listed)) {
      add('missing', abbreviationItem_(use.paragraph.location, text, use.hit.start, use.hit.end, t_('abbr.missing.detail', { count: use.count })));
    }
    if (!hasExpansion_(text, use.hit.start, use.hit.end)) {
      add('noExpansion', abbreviationItem_(use.paragraph.location, text, use.hit.start, use.hit.end, ''));
    }
  });
  const bodyText = ctx.paragraphs.map(function (entry) { return entry.paragraph.text; }).join('\n');
  ctx.entries.forEach(function (entry) {
    if (!abbreviationUsed_(entry.abbr, uses, bodyText)) {
      add('unused', abbreviationItem_(entry.paragraph.location, entry.paragraph.text, entry.paragraph.text.indexOf(entry.abbr), entry.paragraph.text.indexOf(entry.abbr) + entry.abbr.length, ''));
    }
  });
  abbreviationOrder_(ctx.entries).forEach(function (index) {
    const entry = ctx.entries[index];
    const start = entry.paragraph.text.indexOf(entry.abbr);
    add('order', abbreviationItem_(entry.paragraph.location, entry.paragraph.text, start, start + entry.abbr.length, t_('abbr.order.detail', { previous: ctx.entries[index - 1].abbr })));
  });
  const list = groups.list();
  return {
    noSection: !ctx.section,
    stats: { abbreviations: Object.keys(uses).length, listed: ctx.entries.length },
    groups: list,
  };
}
