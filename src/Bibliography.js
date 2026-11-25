const BIB_RULES_PROP = 'bibliographyRules';
const BIB_HEADING = /^(bibliografia|pi.miennictwo|wykaz pi.miennictwa|wykaz literatury|literatura|references|bibliography)\b/i;
const BIB_YEAR = /\b(1[5-9]\d\d|20\d\d)([a-z])?\b/;
const BIB_NAME = "\\p{Lu}[\\p{L}'’-]+";
const BIB_NOT_AUTHOR = /^(tabela|tab|rycina|ryc|rysunek|rys|wykres|schemat|fotografia|zdj.cie|za..cznik|aneks|rozdzia.|dz|table|figure|fig|appendix|chapter|annex|w|we|od|do|na|po|za|lata|latach|rok|roku|wiek|ustawa|ustawy|ustawie|rozporz.dzenie|rozporz.dzeniu|polsce|europie|unii)$/i;
const BIB_PREFIX = /^(?:(?:por|zob|np|cf|vide|see|patrz|e\.g|za)\s*[.:]?\s*(?:te.|tak.e|r.wnie.|also)?\s*[.:]?\s+)+/i;
const BIB_WEAK_BEFORE = /(?:^|[^\p{L}])(?:w|we|na|z|ze|do|od|po|o|u|przy|przed|nad|pod|dla|przez)\s+$/iu;
const BIB_KINDS = ['missing', 'uncited', 'order', 'count', 'format', 'wikipedia', 'old', 'web'];
const BIB_INFO_KINDS = { old: true, web: true };
const BIB_DEFAULT_RULES = { minReview: 30, minResearch: null, maxAge: 10, wikipedia: true, web: true, format: true };
const BIB_EN_WORDS = /\b(the|of|and|with|for|in|on|to|from|an|by|is|are|study|review|effect|treatment|patients?)\b/gi;
const BIB_PL_WORDS = /\b(i|w|z|na|do|oraz|dla|od|po|jako|przez|badanie|leczenie|pacjent\w*)\b/gi;

function normalizeSurname_(name) {
  return String(name || '').normalize('NFC').toLowerCase().replace(/['’-]/g, '');
}

function citationItems_(content) {
  const afterCitedBy = content.split(/cyt\.\s*za\s+/i);
  const text = afterCitedBy[afterCitedBy.length - 1];
  const items = [];
  text.split(';').forEach(function (part) {
    let clean = part.trim().replace(/,?\s*(s|ss|str|pp?)\.\s*\d+(\s*[-–]\s*\d+)?\s*$/i, '');
    const prefix = BIB_PREFIX.exec(clean);
    const inflected = !!prefix && /(^|\s)za(\s|[.:]|$)/i.test(prefix[0]);
    if (prefix) clean = clean.slice(prefix[0].length);
    const pattern = new RegExp('^(' + BIB_NAME + ')((?:\\s*,\\s*' + BIB_NAME + ')*)(?:\\s+(?:i|oraz|and|&)\\s+' + BIB_NAME + ')?' +
      '(\\s+(?:i\\s*in\\.|et\\s+al\\.))?\\s*,?\\s+((?:1[5-9]|20)\\d\\d[a-z]?(?:\\s*,\\s*(?:1[5-9]|20)\\d\\d[a-z]?)*)$', 'u');
    const match = pattern.exec(clean);
    if (!match || BIB_NOT_AUTHOR.test(match[1])) return;
    match[4].split(',').forEach(function (year) {
      const parsed = /((?:1[5-9]|20)\d\d)([a-z])?/.exec(year.trim());
      items.push({ surname: match[1], year: parsed[1], suffix: parsed[2] || '', narrative: inflected });
    });
  });
  return items;
}

function parseCitations_(text) {
  const found = [];
  const parenthetical = /\(([^()]{4,250})\)/g;
  let match;
  while ((match = parenthetical.exec(text)) !== null) {
    const items = citationItems_(match[1]);
    if (items.length) found.push({ start: match.index, end: match.index + match[0].length, raw: match[0], items: items });
  }
  const narrative = new RegExp("(?<![\\p{L}'’-])(" + BIB_NAME + ')((?:\\s*,\\s*' + BIB_NAME + ')*)' +
    '(?:\\s+(?:i|oraz|and|&)\\s+' + BIB_NAME + '|\\s+i\\s*in\\.|\\s+et\\s+al\\.)?' +
    '\\s*\\(((?:1[5-9]|20)\\d\\d)([a-z])?(?:\\s*,\\s*(?:s|ss|str|pp?)\\.\\s*\\d+(?:\\s*[-–]\\s*\\d+)?)?\\)', 'gu');
  while ((match = narrative.exec(text)) !== null) {
    const names = [match[1]].concat(match[2].split(',').map(function (n) { return n.trim(); }).filter(String));
    let weak = BIB_WEAK_BEFORE.test(text.slice(Math.max(0, match.index - 12), match.index));
    if (names.length > 1 && (weak || BIB_NOT_AUTHOR.test(names[0]))) {
      names.shift();
      weak = false;
    }
    if (BIB_NOT_AUTHOR.test(names[0]) || names[0].length < 3) continue;
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
      items: [{ surname: names[0], names: names, year: match[3], suffix: match[4] || '', narrative: true, weak: weak }],
    });
  }
  return found.sort(function (a, b) { return a.start - b.start; });
}

function parseBibliographyEntry_(raw) {
  const text = String(raw || '').replace(/^\s*\d+\s*[.)]\s*/, '').trim();
  const entry = { text: text, numbered: text !== String(raw || '').trim(), surname: null, year: null, suffix: '', authors: 0, web: false, wikipedia: false, english: false, problems: [] };
  entry.web = /https?:\/\/|www\./i.test(text);
  entry.wikipedia = /wikipedia/i.test(text);
  const year = BIB_YEAR.exec(text);
  const authorsPart = year ? text.slice(0, year.index) : '';
  const authors = authorsPart.match(new RegExp(BIB_NAME + '\\s+(?:\\p{Lu}\\.\\s?-?)+', 'gu')) || [];
  entry.authors = authors.length;
  const first = new RegExp('^(' + BIB_NAME + ')', 'u').exec(text);
  const leadingName = new RegExp('^' + BIB_NAME + '\\s*[,.]?\\s*\\(?(?:1[5-9]|20)\\d\\d', 'u');
  if (first && (!entry.web || authors.length || leadingName.test(text))) entry.surname = first[1];
  if (year) {
    entry.year = year[1];
    entry.suffix = year[2] || '';
  }
  if (entry.web) {
    if (!/\(\s*\d{1,2}\.\d{1,2}\.\d{4}\s*\)/.test(text)) entry.problems.push('accessDate');
    return entry;
  }
  if (!year) {
    entry.problems.push('year');
    return entry;
  }
  if (!authors.length || authorsPart.indexOf(authors[0]) !== 0) entry.problems.push('initials');
  if (!new RegExp('^\\s*' + year[0] + '\\s*\\.').test(text.slice(year.index))) entry.problems.push('yearPeriod');
  if (entry.authors > 3 && !/\bi\s*in\.|et al\./i.test(authorsPart)) entry.problems.push('etAl');
  if (!/\b(s|ss|pp?)\.\s?\d+/i.test(text)) entry.problems.push('pages');
  const title = text.slice(year.index + year[0].length);
  entry.english = (title.match(BIB_EN_WORDS) || []).length > (title.match(BIB_PL_WORDS) || []).length;
  return entry;
}

function matchCitation_(item, entries) {
  if (item.names && item.names.length > 1) {
    for (let i = 0; i < item.names.length; i++) {
      const matches = matchCitation_({ surname: item.names[i], year: item.year, suffix: item.suffix, narrative: item.narrative }, entries);
      if (matches.length) return matches;
    }
    return [];
  }
  const surname = normalizeSurname_(item.surname);
  const sameYear = entries.filter(function (entry) { return entry.surname && entry.year === item.year; });
  const exact = sameYear.filter(function (entry) { return normalizeSurname_(entry.surname) === surname; });
  const withSuffix = exact.filter(function (entry) { return entry.suffix === item.suffix; });
  if (withSuffix.length) return withSuffix;
  if (exact.length) return exact;
  if (!item.narrative) return [];
  return sameYear.filter(function (entry) {
    const base = normalizeSurname_(entry.surname);
    let common = 0;
    while (common < base.length && common < surname.length && base[common] === surname[common]) common++;
    return common >= Math.max(4, base.length - 2);
  });
}

function compareEntries_(a, b) {
  const urlA = /^(https?:\/\/|www\.)/i.test(a.text);
  const urlB = /^(https?:\/\/|www\.)/i.test(b.text);
  if (urlA !== urlB) return urlA ? 1 : -1;
  return a.text.localeCompare(b.text, 'pl', { sensitivity: 'base' });
}

function alphabeticalProblems_(entries) {
  const problems = [];
  for (let i = 1; i < entries.length; i++) {
    if (compareEntries_(entries[i], entries[i - 1]) < 0) problems.push(i);
  }
  return problems;
}

function getBibliographyRules() {
  const saved = readBibliographyRules_();
  return { rules: saved || getDefaultBibliographyRules(), isDefault: !saved };
}

function getDefaultBibliographyRules() {
  return normalizeBibliographyRules_(BIB_DEFAULT_RULES);
}

function saveBibliographyRules(input) {
  const rules = normalizeBibliographyRules_(input);
  const isDefault = JSON.stringify(rules) === JSON.stringify(getDefaultBibliographyRules());
  if (isDefault) docProps_().deleteProperty(BIB_RULES_PROP);
  else docProps_().setProperty(BIB_RULES_PROP, JSON.stringify(rules));
  return { rules: rules, isDefault: isDefault };
}

function readBibliographyRules_() {
  const raw = docProps_().getProperty(BIB_RULES_PROP);
  if (!raw) return null;
  try {
    return normalizeBibliographyRules_(JSON.parse(raw));
  } catch (e) {
    console.warn('Niepoprawny zapis wymagań bibliografii: ' + e.message);
    return null;
  }
}

function normalizeBibliographyRules_(input) {
  const source = input || {};
  const number = function (value) {
    const parsed = parseInt(String(value === undefined || value === null ? '' : value), 10);
    return isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  return {
    minReview: number(source.minReview),
    minResearch: number(source.minResearch),
    maxAge: number(source.maxAge),
    wikipedia: !!source.wikipedia,
    web: !!source.web,
    format: !!source.format,
  };
}

function checkBibliography(options) {
  const opts = options || {};
  const rules = readBibliographyRules_() || getDefaultBibliographyRules();
  const type = opts.type || savedStructureType_();
  const ctx = bibliographyContext_();
  const groups = {};
  BIB_KINDS.forEach(function (kind) { groups[kind] = { kind: kind, count: 0, items: [], info: !!BIB_INFO_KINDS[kind] }; });
  const add = function (kind, item) {
    groups[kind].count++;
    groups[kind].items.push(item);
  };
  const entryItem = function (entry, detail) {
    return {
      ref: { location: entry.location, fingerprint: entry.raw.slice(0, 40) },
      showable: true,
      preview: entry.raw.length > 120 ? entry.raw.slice(0, 120) + '…' : entry.raw,
      detail: detail || '',
    };
  };
  const result = function () {
    return {
      noSection: !ctx.section,
      sortable: ctx.sortable,
      stats: ctx.stats,
      groups: BIB_KINDS.map(function (kind) { return groups[kind]; }),
    };
  };
  if (!ctx.section) return result();

  const missing = {};
  const cited = [];
  ctx.citations.forEach(function (citation) {
    citation.items.forEach(function (item) {
      const matches = matchCitation_(item, ctx.entries);
      if (matches.length) {
        Array.prototype.push.apply(cited, matches);
        return;
      }
      if (item.weak) return;
      const label = (item.names || [item.surname]).join(', ');
      const key = normalizeSurname_(label) + '|' + item.year + item.suffix;
      if (!missing[key]) {
        missing[key] = {
          ref: { location: citation.location, start: citation.start, end: citation.end, fingerprint: citation.raw },
          showable: true,
          preview: label + ' ' + item.year + item.suffix,
          raw: citation.raw,
          count: 0,
        };
      }
      missing[key].count++;
    });
  });
  Object.keys(missing).forEach(function (key) {
    const item = missing[key];
    item.detail = t_('bib.missing.detail', { count: item.count }) + ': ' + item.raw;
    add('missing', item);
  });

  const thisYear = new Date().getFullYear();
  ctx.entries.forEach(function (entry) {
    if (entry.surname && entry.year && cited.indexOf(entry) < 0) add('uncited', entryItem(entry, t_('bib.uncited.detail')));
    if (rules.format && entry.problems.length) {
      add('format', entryItem(entry, entry.problems.map(function (p) { return t_('bib.problem.' + p); }).join('; ')));
    }
    if (rules.wikipedia && entry.wikipedia) add('wikipedia', entryItem(entry, ''));
    if (rules.web && entry.web && !entry.wikipedia) add('web', entryItem(entry, ''));
    if (rules.maxAge && entry.year && Number(entry.year) < thisYear - rules.maxAge) {
      add('old', entryItem(entry, t_('bib.old.detail', { year: entry.year, years: rules.maxAge })));
    }
  });
  alphabeticalProblems_(ctx.entries).forEach(function (index) {
    add('order', entryItem(ctx.entries[index], t_('bib.order.detail')));
  });
  const minimum = type === 'research' ? rules.minResearch : rules.minReview;
  if (minimum && ctx.entries.length < minimum) {
    add('count', { ref: {}, showable: false, preview: t_('bib.count.detail', { count: ctx.entries.length, min: minimum }), detail: '' });
  }
  return result();
}

function showBibliographyIssue(ref) {
  const resolved = ref.location ? resolveElementPath_(ref.location) : null;
  if (!resolved || resolved.isText) throw userError_('format.err.changed');
  const doc = DocumentApp.getActiveDocument();
  const range = doc.newRange();
  const text = resolved.element.getText();
  if (ref.start === undefined) {
    if (text.trim().slice(0, 40) !== ref.fingerprint) throw userError_('format.err.changed');
    range.addElement(resolved.element);
  } else {
    const start = text.slice(ref.start, ref.end) === ref.fingerprint ? ref.start : text.indexOf(ref.fingerprint);
    if (start < 0 || !ref.fingerprint) throw userError_('format.err.changed');
    range.addElement(resolved.element.editAsText(), start, start + ref.fingerprint.length - 1);
  }
  doc.setSelection(range.build());
}

function sortBibliography(options) {
  const ctx = bibliographyContext_();
  if (!ctx.section || !ctx.sortable) throw userError_('bib.err.cantSort');
  const body = DocumentApp.getActiveDocument().getBody();
  const sorted = ctx.entries.slice().sort(compareEntries_);
  const after = ctx.entries[ctx.entries.length - 1].location.path[0] + 1;
  sorted.forEach(function (entry, i) {
    const copy = entry.element.copy();
    if (entry.isList) body.insertListItem(after + i, copy);
    else body.insertParagraph(after + i, copy);
  });
  ctx.entries.forEach(function (entry) { entry.element.removeFromParent(); });
  return checkBibliography(options);
}

function bibliographyContext_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const all = [];
  collectParagraphs_(body, [], false, all);
  const paragraphs = outsideTitlePage_(all, titlePageEnd_(body));
  paragraphs.forEach(function (entry) {
    entry.heading = String(entry.element.getHeading());
    entry.text = entry.element.getText();
  });
  const level = function (heading) {
    const match = /^HEADING([1-6])$/.exec(heading);
    return match ? Number(match[1]) : 0;
  };
  const candidates = [];
  paragraphs.forEach(function (p, i) {
    if (!p.inTable && p.text.trim().length <= 60 && BIB_HEADING.test(normalizeTitle_(p.text))) candidates.push(i);
  });
  const headed = candidates.filter(function (i) { return level(paragraphs[i].heading); });
  const pool = headed.length ? headed : candidates;
  const start = pool.length ? pool[pool.length - 1] : -1;
  const ctx = { section: start >= 0, entries: [], citations: [], sortable: false, stats: { citations: 0, entries: 0, english: 0 } };
  let end = paragraphs.length;
  if (start >= 0) {
    const startLevel = level(paragraphs[start].heading) || 7;
    for (let i = start + 1; i < paragraphs.length; i++) {
      const l = level(paragraphs[i].heading);
      if (l && l <= startLevel) {
        end = i;
        break;
      }
    }
    ctx.entries = paragraphs.slice(start + 1, end)
      .filter(function (p) { return p.text.trim() && !level(p.heading); })
      .map(function (p) {
        const parsed = parseBibliographyEntry_(p.text);
        parsed.raw = p.text.trim();
        parsed.location = p.location;
        parsed.element = p.element;
        parsed.isList = p.isList;
        return parsed;
      });
    const indexes = ctx.entries.map(function (e) { return e.location.path.length === 1 ? e.location.path[0] : -1; });
    ctx.sortable = ctx.entries.length > 1 && !ctx.entries.some(function (e) { return e.numbered; }) && indexes.every(function (index, i) {
      return index >= 0 && (i === 0 || index === indexes[i - 1] + 1);
    });
  }
  paragraphs.forEach(function (p, i) {
    if (start >= 0 && i >= start && i < end) return;
    if (level(p.heading)) return;
    parseCitations_(p.text).forEach(function (citation) {
      citation.location = p.location;
      ctx.citations.push(citation);
    });
  });
  const scholarly = ctx.entries.filter(function (e) { return !e.web; });
  ctx.stats = {
    citations: ctx.citations.length,
    entries: ctx.entries.length,
    english: scholarly.length ? Math.round(100 * scholarly.filter(function (e) { return e.english; }).length / scholarly.length) : 0,
  };
  return ctx;
}
