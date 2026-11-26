const BIB_RULES_PROP = 'bibliographyRules';
const BIB_HEADING = /^(bibliografia|pi.miennictwo|wykaz pi.miennictwa|wykaz literatury|literatura|references|bibliography)\b/i;
const BIB_YEAR = /\b(1[5-9]\d\d|20\d\d)([a-z])?\b/;
const BIB_NAME = "\\p{Lu}[\\p{L}'’-]+";
const BIB_NOT_AUTHOR = /^(tabela|tab|rycina|ryc|rysunek|rys|wykres|schemat|fotografia|zdj.cie|za..cznik|aneks|rozdzia.|dz|table|figure|fig|appendix|chapter|annex|w|we|od|do|na|po|za|lata|latach|rok|roku|wiek|ustawa|ustawy|ustawie|rozporz.dzenie|rozporz.dzeniu|polsce|europie|unii)$/i;
const BIB_PREFIX = /^(?:(?:por|zob|np|cf|vide|see|patrz|e\.g|za)\s*[.:]?\s*(?:te.|tak.e|r.wnie.|also)?\s*[.:]?\s+)+/i;
const BIB_WEAK_BEFORE = /(?:^|[^\p{L}])(?:w|we|na|z|ze|do|od|po|o|u|przy|przed|nad|pod|dla|przez)\s+$/iu;
const BIB_PAGES = /,?\s*(s|ss|str|pp?)\.\s*\d+(\s*[-–]\s*\d+)?\s*$/i;
const BIB_ABBREVIATIONS = /^(itd|itp|tzw|tzn|red|wyd|por|zob|str|ryc|tab|rys|godz|min|max|ang|jw|etc|al|tys|mln|mld|proc|wsp|ust|art|pkt|poz|mgr|prof|hab|in.|nast|rozdz|oprac|t.um|wydz|kat|dot|ser|vol|eds|ibid|cyt|p.n|p.d|zach|wsch|sek|fot|zdj|dzi.|ok|ww)$/i;
const BIB_KINDS = ['missing', 'uncited', 'authors', 'letters', 'periodBefore', 'innerSpace', 'commaYear', 'etAl', 'sameAuthor',
  'semicolon', 'quoteItalic', 'order', 'count', 'format', 'wikipedia', 'quoteNoCite', 'noCitation', 'results', 'discussion', 'old', 'web'];
const BIB_INFO_KINDS = { old: true, web: true, quoteNoCite: true, noCitation: true, results: true, discussion: true };
const BIB_FIXABLE = { periodBefore: true, innerSpace: true, commaYear: true, etAl: true, sameAuthor: true, semicolon: true, quoteItalic: true };
const BIB_FIX_ALL = { periodBefore: true, innerSpace: true, commaYear: true };
const BIB_FORMAT_KINDS = { authors: true, letters: true, periodBefore: true, innerSpace: true, commaYear: true, etAl: true,
  sameAuthor: true, semicolon: true, quoteItalic: true, quoteNoCite: true };
const BIB_PLACEMENT_KINDS = { noCitation: true, results: true, discussion: true };
const BIB_DEFAULT_RULES = { minReview: 30, minResearch: null, maxAge: 10, wikipedia: true, web: true, format: true, citeFormat: true, citePlacement: true };
const BIB_EN_WORDS = /\b(the|of|and|with|for|in|on|to|from|an|by|is|are|study|review|effect|treatment|patients?)\b/gi;
const BIB_PL_WORDS = /\b(i|w|z|na|do|oraz|dla|od|po|jako|przez|badanie|leczenie|pacjent\w*)\b/gi;
const BIB_QUOTE_MIN_WORDS = 5;
const BIB_NO_CITATION_MIN_CHARS = 300;

function normalizeSurname_(name) {
  return String(name || '').normalize('NFC').toLowerCase().replace(/['’-]/g, '');
}

function authorYear_(core) {
  const pattern = new RegExp('^(' + BIB_NAME + ')((?:\\s*,\\s*' + BIB_NAME + ')*)((?:\\s+(?:i|oraz|and|&)\\s+' + BIB_NAME + ')?)' +
    '(\\s+(?:i\\s*in\\.|et\\s+al\\.))?(\\s*,?\\s+)((?:1[5-9]|20)\\d\\d[a-z]?(?:\\s*,\\s*(?:1[5-9]|20)\\d\\d[a-z]?)*)$', 'u');
  const match = pattern.exec(core);
  if (!match || BIB_NOT_AUTHOR.test(match[1])) return null;
  const listed = 1 + (match[2].match(/,/g) || []).length + (match[3] ? 1 : 0);
  const authorEnd = match[1].length + match[2].length + match[3].length + (match[4] || '').length;
  return {
    first: match[1],
    listed: listed,
    authors: match[4] || listed > 2 ? 3 : listed,
    etAlForm: match[4] ? match[4].trim().replace(/\s+/g, ' ') : '',
    authorText: core.slice(0, authorEnd),
    authorEnd: authorEnd,
    separator: match[5],
    yearsStart: authorEnd + match[5].length,
    years: match[6].split(',').map(function (year) {
      const parsed = /((?:1[5-9]|20)\d\d)([a-z])?/.exec(year.trim());
      return { year: parsed[1], suffix: parsed[2] || '' };
    }),
  };
}

function splitAuthorYears_(core) {
  const chunks = [];
  const splitter = /,\s+(?=\p{Lu})/gu;
  let last = 0;
  let match;
  while ((match = splitter.exec(core)) !== null) {
    chunks.push({ text: core.slice(last, match.index), at: last, comma: match.index });
    last = match.index + match[0].length;
  }
  chunks.push({ text: core.slice(last), at: last, comma: -1 });
  if (chunks.length < 2) return null;
  chunks.forEach(function (chunk) { chunk.parsed = authorYear_(chunk.text); });
  return chunks.every(function (chunk) { return chunk.parsed; }) ? chunks : null;
}

function parseCitationContent_(content) {
  const result = { items: [], fixes: [] };
  let base = 0;
  let citedBy = false;
  const citedByPattern = /cyt\.\s*za\s+/gi;
  let match;
  while ((match = citedByPattern.exec(content)) !== null) {
    base = match.index + match[0].length;
    citedBy = true;
  }
  const tail = content.slice(base);
  const partPattern = /[^;]+/g;
  let previous = null;
  while ((match = partPattern.exec(tail)) !== null) {
    const raw = match[0];
    const lead = raw.length - raw.replace(/^\s+/, '').length;
    const trimmed = raw.trim();
    const clean = trimmed.replace(BIB_PAGES, '');
    const prefix = BIB_PREFIX.exec(clean);
    const inflected = !!prefix && /(^|\s)za(\s|[.:]|$)/i.test(prefix[0]);
    const core = prefix ? clean.slice(prefix[0].length) : clean;
    const coreAt = base + match.index + lead + (prefix ? prefix[0].length : 0);
    const pieces = [];
    const whole = authorYear_(core);
    if (whole) {
      pieces.push({ parsed: whole, at: coreAt, length: core.length });
    } else {
      const chunks = splitAuthorYears_(core) || [];
      chunks.forEach(function (chunk, i) {
        pieces.push({ parsed: chunk.parsed, at: coreAt + chunk.at, length: chunk.text.length });
        const next = chunks[i + 1];
        if (!next) return;
        if (authorKey_(chunk.parsed) === authorKey_(next.parsed)) {
          if (clean !== trimmed && i + 2 === chunks.length) return;
          const end = coreAt + chunk.at + chunk.text.length;
          result.fixes.push({ kind: 'sameAuthor', at: end, remove: coreAt + next.at + next.parsed.yearsStart - end, insert: ', ' });
        } else {
          result.fixes.push({ kind: 'semicolon', at: coreAt + chunk.comma, remove: 1, insert: ';' });
        }
      });
    }
    if (!pieces.length) {
      previous = null;
      continue;
    }
    pieces.forEach(function (piece) {
      const parsed = piece.parsed;
      parsed.years.forEach(function (year) {
        result.items.push({ surname: parsed.first, year: year.year, suffix: year.suffix, narrative: inflected, authors: parsed.authors });
      });
      if (!citedBy && parsed.separator.indexOf(',') >= 0) {
        result.fixes.push({ kind: 'commaYear', at: piece.at + parsed.authorEnd, remove: parsed.separator.length, insert: ' ' });
      }
      if (parsed.listed > 2 || /^et/i.test(parsed.etAlForm)) {
        result.fixes.push({ kind: 'etAl', at: piece.at, remove: parsed.authorEnd, insert: parsed.first + ' i in.',
          firstAuthor: { surname: parsed.first, year: parsed.years[0].year, suffix: parsed.years[0].suffix, narrative: inflected } });
      }
    });
    const first = pieces[0];
    const paged = clean !== trimmed;
    if (previous && !previous.paged && !paged && !prefix && previous.key === authorKey_(first.parsed)) {
      result.fixes.push({ kind: 'sameAuthor', at: previous.end, remove: first.at + first.parsed.yearsStart - previous.end, insert: ', ' });
    }
    const lastPiece = pieces[pieces.length - 1];
    previous = { key: authorKey_(lastPiece.parsed), end: lastPiece.at + lastPiece.length, paged: paged };
  }
  return result;
}

function authorKey_(parsed) {
  return normalizeSurname_(parsed.authorText.replace(/\s+/g, ' '));
}

function citationItems_(content) {
  return parseCitationContent_(content).items;
}

function applyEditsToString_(text, edits) {
  let out = text;
  edits.slice().sort(function (a, b) { return b.at - a.at; }).forEach(function (edit) {
    out = out.slice(0, edit.at) + edit.insert + out.slice(edit.at + edit.remove);
  });
  return out;
}

function citationIssue_(text, kind, edits, spanStart, spanEnd) {
  const start = Math.min.apply(null, edits.map(function (e) { return e.at; }));
  const end = Math.max.apply(null, edits.map(function (e) { return e.at + e.remove; }));
  const from = Math.min(start, spanStart);
  const to = Math.max(end, spanEnd);
  const shifted = edits.map(function (e) { return { at: e.at - from, remove: e.remove, insert: e.insert }; });
  return {
    kind: kind,
    start: start,
    original: text.slice(start, end),
    from: from,
    to: to,
    preview: text.slice(from, to),
    replacement: applyEditsToString_(text.slice(from, to), shifted),
    edits: edits,
  };
}

function periodBeforeIssue_(text, start, end) {
  const before = /([^\s.]+)\.(\s+)$/u.exec(text.slice(Math.max(0, start - 40), start));
  if (!before) return null;
  const word = before[1];
  if (/^\p{L}+$/u.test(word) && (word.length < 3 || BIB_ABBREVIATIONS.test(word))) return null;
  const after = text.slice(end);
  const closed = after.charAt(0) === '.';
  if (!closed && !/^(\s*$|\s+[\p{Lu}„"])/u.test(after)) return null;
  const dot = start - before[2].length - 1;
  const edits = [{ at: dot, remove: 1, insert: '' }];
  if (!closed) edits.push({ at: end, remove: 0, insert: '.' });
  const issue = citationIssue_(text, 'periodBefore', edits, dot - word.length, end);
  issue.single = closed;
  return issue;
}

function parseCitations_(text) {
  const found = [];
  const parenthetical = /\(([^()]{4,250})\)/g;
  let match;
  while ((match = parenthetical.exec(text)) !== null) {
    const parsed = parseCitationContent_(match[1]);
    if (!parsed.items.length) continue;
    const start = match.index;
    const end = start + match[0].length;
    const issues = parsed.fixes.map(function (fix) {
      const issue = citationIssue_(text, fix.kind, [{ at: start + 1 + fix.at, remove: fix.remove, insert: fix.insert }], start, end);
      if (fix.firstAuthor) issue.firstAuthor = fix.firstAuthor;
      return issue;
    });
    const inner = match[1];
    const lead = inner.length - inner.replace(/^\s+/, '').length;
    const trail = inner.length - inner.replace(/\s+$/, '').length;
    if (lead || trail) {
      issues.push(citationIssue_(text, 'innerSpace', [
        { at: start + 1, remove: lead, insert: '' },
        { at: end - 1 - trail, remove: trail, insert: '' },
      ].filter(function (edit) { return edit.remove; }), start, end));
    }
    const period = periodBeforeIssue_(text, start, end);
    if (period) issues.push(period);
    found.push({ start: start, end: end, raw: match[0], items: parsed.items, issues: issues });
  }
  const narrative = new RegExp("(?<![\\p{L}'’-])(" + BIB_NAME + ')((?:\\s*,\\s*' + BIB_NAME + ')*)' +
    '((?:\\s+(?:i|oraz|and|&)\\s+' + BIB_NAME + '|\\s+i\\s*in\\.|\\s+et\\s+al\\.)?)' +
    '\\s*\\(((?:1[5-9]|20)\\d\\d)([a-z])?(?:\\s*,\\s*(?:s|ss|str|pp?)\\.\\s*\\d+(?:\\s*[-–]\\s*\\d+)?)?\\)', 'gu');
  while ((match = narrative.exec(text)) !== null) {
    const names = [match[1]].concat(match[2].split(',').map(function (n) { return n.trim(); }).filter(String));
    let weak = BIB_WEAK_BEFORE.test(text.slice(Math.max(0, match.index - 12), match.index));
    let shifted = false;
    if (names.length > 1 && (weak || BIB_NOT_AUTHOR.test(names[0]))) {
      names.shift();
      weak = false;
      shifted = true;
    }
    if (BIB_NOT_AUTHOR.test(names[0]) || names[0].length < 3) continue;
    const tail = match[3].trim();
    const etAl = /^(i\s*in\.|et\s+al\.)$/.test(tail);
    const listed = names.length + (tail && !etAl ? 1 : 0);
    const issues = [];
    if (!shifted && (listed > 2 || /^et/.test(tail))) {
      const issue = citationIssue_(text, 'etAl', [{ at: match.index, remove: match[1].length + match[2].length + match[3].length, insert: names[0] + ' i in.' }],
        match.index, match.index + match[0].length);
      issue.firstAuthor = { surname: names[0], year: match[4], suffix: match[5] || '', narrative: true };
      issues.push(issue);
    }
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
      items: [{ surname: names[0], names: names, year: match[4], suffix: match[5] || '', narrative: true, weak: weak, etAl: etAl, extra: tail && !etAl ? 1 : 0, authors: etAl || listed > 2 ? 3 : listed }],
      issues: issues,
    });
  }
  return found.sort(function (a, b) { return a.start - b.start; });
}

function quoteSpans_(text) {
  const spans = [];
  const pattern = /„([^”"„]+)[”"]|"([^"]+)"|«([^»]+)»/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const inner = match[1] || match[2] || match[3];
    if (inner.trim().split(/\s+/).length >= BIB_QUOTE_MIN_WORDS) spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

function uncitedQuotes_(text, citations) {
  return quoteSpans_(text).filter(function (quote) {
    let sentenceStart = 0;
    const back = /[.!?](?=\s)/g;
    let match;
    while ((match = back.exec(text)) !== null && match.index < quote.start) sentenceStart = match.index + 1;
    const forward = /[.!?](?=\s|$)/g;
    forward.lastIndex = quote.end;
    const next = forward.exec(text);
    const sentenceEnd = next ? next.index : text.length;
    return !citations.some(function (c) { return c.end > sentenceStart && c.start <= sentenceEnd + 2; });
  });
}

function parseBibliographyEntry_(raw) {
  const text = String(raw || '').replace(/^\s*\d+\s*[.)]\s*/, '').trim();
  const entry = { text: text, numbered: text !== String(raw || '').trim(), surname: null, year: null, suffix: '', authors: 0, authorSurnames: [], etAl: false, web: false, wikipedia: false, english: false, problems: [] };
  entry.web = /https?:\/\/|www\./i.test(text);
  entry.wikipedia = /wikipedia/i.test(text);
  const year = BIB_YEAR.exec(text);
  const authorsPart = year ? text.slice(0, year.index) : '';
  const authors = authorsPart.match(new RegExp(BIB_NAME + '\\s+(?:\\p{Lu}\\.\\s?-?)+', 'gu')) || [];
  entry.authors = authors.length;
  entry.authorSurnames = authors.map(function (author) { return author.split(/\s+/)[0]; });
  entry.etAl = /\bi\s*in\.|et al\./i.test(authorsPart);
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
  if (entry.authors > 3 && !entry.etAl) entry.problems.push('etAl');
  if (!/\b(s|ss|pp?)\.\s?\d+/i.test(text)) entry.problems.push('pages');
  const title = text.slice(year.index + year[0].length);
  entry.english = (title.match(BIB_EN_WORDS) || []).length > (title.match(BIB_PL_WORDS) || []).length;
  return entry;
}

function entryAuthorClass_(entry) {
  if (!entry.authors) return 0;
  return entry.etAl || entry.authors >= 3 ? 3 : entry.authors;
}

function expectedCitation_(entry, narrative) {
  const names = entry.authorSurnames;
  const cls = entryAuthorClass_(entry);
  const authors = cls === 1 ? names[0] : cls === 2 ? names[0] + ' i ' + names[1] : names[0] + ' i in.';
  const year = entry.year + entry.suffix;
  return narrative ? authors + ' (' + year + ')' : '(' + authors + ' ' + year + ')';
}

function letterProblems_(entries) {
  const groups = {};
  entries.forEach(function (entry, index) {
    if (!entry.surname || !entry.year) return;
    const authors = entry.authorSurnames.length ? entry.authorSurnames.join('+') + (entry.etAl ? '+' : '') : entry.surname;
    const key = normalizeSurname_(authors) + '|' + entry.year;
    (groups[key] = groups[key] || []).push(index);
  });
  const problems = [];
  Object.keys(groups).forEach(function (key) {
    const group = groups[key];
    if (group.length < 2) return;
    const suffixes = group.map(function (i) { return entries[i].suffix; });
    const distinct = suffixes.every(function (s, i) { return s && suffixes.indexOf(s) === i; });
    if (!distinct) Array.prototype.push.apply(problems, group);
  });
  return problems.sort(function (a, b) { return a - b; });
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
  return sameYear.filter(function (entry) { return sameSurname_(entry.surname, surname); });
}

function sameSurname_(entrySurname, citedSurname) {
  const base = normalizeSurname_(entrySurname);
  const cited = normalizeSurname_(citedSurname);
  let common = 0;
  while (common < base.length && common < cited.length && base[common] === cited[common]) common++;
  return common >= Math.max(4, base.length - 2);
}

function otherYears_(item, entries) {
  const names = item.names || [item.surname];
  return entries.filter(function (entry) {
    if (!entry.surname || !entry.year) return false;
    return names.some(function (name) {
      return normalizeSurname_(entry.surname) === normalizeSurname_(name) || (item.narrative && sameSurname_(entry.surname, name));
    });
  }).map(function (entry) { return entry.surname + ' ' + entry.year + entry.suffix; });
}

function citedAuthors_(item, entries) {
  if (!item.names || item.names.length < 2) return item.authors;
  let index = 0;
  while (index < item.names.length - 1 && !matchCitation_({ surname: item.names[index], year: item.year, suffix: item.suffix, narrative: true }, entries).length) index++;
  const listed = item.names.length - index + item.extra;
  return item.etAl || listed > 2 ? 3 : listed;
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

function chapterNames_(text) {
  return [].concat.apply([], parseSections_(text));
}

function chapterRoles_(type) {
  return {
    results: chapterNames_(t_('bib.names.results')),
    discussion: chapterNames_(t_('bib.names.discussion')),
    methods: chapterNames_(t_('bib.names.methods')),
    other: [].concat(
      chapterNames_(currentStructureRules_(type).sections),
      chapterNames_(t_('structure.default.review')),
      chapterNames_(t_('structure.default.research')),
      chapterNames_(t_('structure.names.aim')),
      chapterNames_(t_('structure.names.abstract')),
      chapterNames_(t_('bib.names.other'))),
  };
}

function chapterRole_(title, roles) {
  const clean = String(title || '')
    .replace(/^\s*(?:[Rr]ozdzia\S*|ROZDZIA\S*|[Cc]hapter|CHAPTER|[Cc]z\S{3}|CZ\S{3}|[Pp]art|PART)\s+(?:\d+|[IVXLC]+)(?=[\s.:–-]|$)\s*[.:–-]?\s*/, '');
  if (matchesSection_(clean, roles.discussion)) return 'discussion';
  if (matchesSection_(clean, roles.results)) return /dyskusj|discussion|om.wienie/i.test(clean) ? 'discussion' : 'results';
  if (matchesSection_(clean, roles.methods)) return 'methods';
  if (matchesSection_(clean, roles.other)) return 'other';
  return 'theory';
}

function getBibliographyRules() {
  const saved = readBibliographyRules_();
  return { rules: saved || getDefaultBibliographyRules(), isDefault: !saved };
}

function getDefaultBibliographyRules() {
  return normalizeBibliographyRules_(BIB_DEFAULT_RULES);
}

function saveBibliographyRules(input) {
  return writeRulesProp_(BIB_RULES_PROP, normalizeBibliographyRules_(input), getDefaultBibliographyRules());
}

function readBibliographyRules_() {
  return readRulesProp_(BIB_RULES_PROP, normalizeBibliographyRules_);
}

function normalizeBibliographyRules_(input) {
  const source = input || {};
  const number = positiveInt_;
  const flag = flagDefaultTrue_;
  return {
    minReview: number(source.minReview),
    minResearch: number(source.minResearch),
    maxAge: number(source.maxAge),
    wikipedia: !!source.wikipedia,
    web: !!source.web,
    format: !!source.format,
    citeFormat: flag(source.citeFormat),
    citePlacement: flag(source.citePlacement),
  };
}

function paragraphIssues_(element, text, citations) {
  const issues = [];
  citations.forEach(function (citation) { Array.prototype.push.apply(issues, citation.issues); });
  const rich = element.editAsText();
  quoteSpans_(text).forEach(function (quote) {
    const probes = [quote.start + 1, Math.floor((quote.start + quote.end) / 2), quote.end - 2];
    if (!probes.every(function (offset) { return rich.isItalic(offset) === true; })) return;
    const original = text.slice(quote.start, quote.end);
    issues.push({ kind: 'quoteItalic', start: quote.start, end: quote.end, original: original, from: quote.start, to: quote.end, preview: original, replacement: '', edits: [] });
  });
  return issues;
}

function checkBibliography(options) {
  const opts = options || {};
  const rules = readBibliographyRules_() || getDefaultBibliographyRules();
  const type = opts.type || savedStructureType_();
  const ctx = bibliographyContext_(type);
  const groups = checkGroups_(BIB_KINDS, {
    info: BIB_INFO_KINDS,
    hide: ignoreFilter_('bibliography'),
    extra: function (kind) { return { fixAll: !!BIB_FIX_ALL[kind], fixable: 0 }; },
  });
  const add = function (kind, item) {
    if (BIB_FORMAT_KINDS[kind] && !rules.citeFormat) return;
    if (BIB_PLACEMENT_KINDS[kind] && !rules.citePlacement) return;
    if (groups.add(kind, item) && item.fixable && !item.single) groups.groups[kind].fixable++;
  };
  const preview = function (text) {
    return preview_(text.trim(), 120);
  };
  const entryItem = function (entry, detail) {
    return {
      ref: { location: entry.location, fingerprint: entry.raw.slice(0, FINGERPRINT_CHARS) },
      showable: true,
      preview: preview(entry.raw),
      detail: detail || '',
      keyText: entry.raw,
    };
  };
  const paragraphItem = function (p, detail) {
    return { ref: { location: p.location, fingerprint: p.text.trim().slice(0, FINGERPRINT_CHARS) }, showable: true, preview: preview(p.text), detail: detail || '', keyText: p.text };
  };
  const rangeItem = function (location, start, end, text, detail, context) {
    return { ref: { location: location, start: start, end: end, fingerprint: text }, showable: true, preview: text, detail: detail || '', keyText: context };
  };
  const result = function () {
    const list = groups.list();
    return {
      noSection: !ctx.section,
      sortable: ctx.sortable,
      stats: ctx.stats,
      groups: list,
    };
  };
  if (!ctx.section) return result();

  const missing = {};
  const cited = [];
  const earlier = [];
  const inDiscussion = [];
  const discussionOrder = ctx.discussion ? ctx.discussion.order : Infinity;
  ctx.citations.forEach(function (citation) {
    const reported = {};
    citation.items.forEach(function (item) {
      const matches = matchCitation_(item, ctx.entries);
      if (matches.length) {
        Array.prototype.push.apply(cited, matches);
        if (citation.paragraph.role === 'discussion') Array.prototype.push.apply(inDiscussion, matches);
        else if (citation.paragraph.order < discussionOrder) Array.prototype.push.apply(earlier, matches);
        if (matches.length === 1) {
          const entry = matches[0];
          const expected = entryAuthorClass_(entry);
          const authors = citedAuthors_(item, ctx.entries);
          const key = 'a' + ctx.entries.indexOf(entry);
          if (expected && authors && authors !== expected && !reported[key]) {
            reported[key] = true;
            add('authors', rangeItem(citation.location, citation.start, citation.end, citation.raw, t_('bib.authors.detail', { expected: expectedCitation_(entry, item.narrative && citation.raw.charAt(0) !== '(') })));
          }
        } else if (!item.suffix && matches.every(function (m) { return m.suffix; })) {
          const options = matches.map(function (m) { return m.surname + ' ' + m.year + m.suffix; }).join(', ');
          add('letters', rangeItem(citation.location, citation.start, citation.end, citation.raw, t_('bib.letters.cite', { options: options })));
        }
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
          hint: otherYears_(item, ctx.entries),
          count: 0,
        };
      }
      missing[key].count++;
    });
  });
  Object.keys(missing).forEach(function (key) {
    const item = missing[key];
    item.detail = t_('bib.missing.detail', { count: item.count }) + ': ' + item.raw;
    if (item.hint.length) item.detail += ' – ' + t_('bib.missing.hint', { options: item.hint.join(', ') });
    delete item.hint;
    add('missing', item);
  });

  ctx.paragraphs.forEach(function (p) {
    paragraphIssues_(p.element, p.text, citedOnly_(p.citations, ctx.entries)).forEach(function (issue) {
      if (issue.firstAuthor) {
        const matches = matchCitation_(issue.firstAuthor, ctx.entries);
        if (!matches.length) return;
        if (matches.length === 1 && entryAuthorClass_(matches[0]) && entryAuthorClass_(matches[0]) < 3) return;
      }
      const item = rangeItem(p.location, issue.from, issue.to, issue.preview,
        issue.kind === 'quoteItalic' ? t_('bib.quoteItalic.detail') : t_('bib.fix.to', { text: issue.replacement }));
      item.ref.kind = issue.kind;
      item.ref.at = issue.start;
      item.ref.original = issue.original;
      item.fixable = true;
      item.single = !!issue.single;
      if (issue.kind !== 'quoteItalic') item.replacement = issue.replacement;
      add(issue.kind, item);
    });
    uncitedQuotes_(p.text, p.citations).forEach(function (quote) {
      add('quoteNoCite', rangeItem(p.location, quote.start, quote.end, p.text.slice(quote.start, quote.end), t_('bib.quoteNoCite.detail'), p.text));
    });
    if (p.role === 'theory' && !p.isList && !p.inTable && !p.citations.length && p.text.trim().length >= BIB_NO_CITATION_MIN_CHARS) {
      add('noCitation', paragraphItem(p, t_('bib.noCitation.detail', { chapter: p.chapter })));
    }
    if (p.role === 'results') {
      p.citations.forEach(function (citation) {
        add('results', rangeItem(p.location, citation.start, citation.end, citation.raw, t_('bib.results.detail', { chapter: p.chapter }), p.text));
      });
    }
  });
  const discussed = inDiscussion.filter(function (entry, i) { return inDiscussion.indexOf(entry) === i; });
  const fresh = discussed.filter(function (entry) { return earlier.indexOf(entry) < 0; });
  if (ctx.discussion && discussed.length >= 3 && fresh.length * 2 > discussed.length) {
    add('discussion', paragraphItem(ctx.discussion, t_('bib.discussion.detail', { count: discussed.length, fresh: fresh.length })));
  }

  const thisYear = new Date().getFullYear();
  const letters = letterProblems_(ctx.entries);
  ctx.entries.forEach(function (entry, index) {
    if (entry.surname && entry.year && cited.indexOf(entry) < 0) add('uncited', entryItem(entry, t_('bib.uncited.detail')));
    if (letters.indexOf(index) >= 0) add('letters', entryItem(entry, t_('bib.letters.entry', { year: entry.year })));
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
  const text = resolved.element.getText();
  if (ref.start === undefined) {
    if (text.trim().slice(0, FINGERPRINT_CHARS) !== ref.fingerprint) throw userError_('format.err.changed');
    selectRange_(doc, function () { return doc.newRange().addElement(resolved.element); });
    return;
  }
  const start = text.slice(ref.start, ref.end) === ref.fingerprint ? ref.start : text.indexOf(ref.fingerprint);
  if (start < 0 || !ref.fingerprint) throw userError_('format.err.changed');
  selectRange_(doc, function () { return doc.newRange().addElement(resolved.element.editAsText(), start, start + ref.fingerprint.length - 1); });
}

function citedOnly_(citations, entries) {
  return citations.filter(function (citation) {
    return citation.items.some(function (item) { return matchCitation_(item, entries).length; });
  });
}

function applyBibliographyIssue_(element, issue) {
  const text = element.editAsText();
  if (issue.kind === 'quoteItalic') text.setItalic(issue.from, issue.to - 1, false);
  else applyDocumentEdits_(text, issue.edits);
}

function fixBibliographyIssue(ref, options) {
  const resolved = ref && ref.location ? resolveElementPath_(ref.location) : null;
  if (!resolved || resolved.isText || !BIB_FIXABLE[ref.kind]) throw userError_('format.err.changed');
  const ctx = bibliographyContext_((options || {}).type || savedStructureType_());
  const text = resolved.element.getText();
  const issue = paragraphIssues_(resolved.element, text, citedOnly_(parseCitations_(text), ctx.entries)).filter(function (candidate) {
    return candidate.kind === ref.kind && candidate.start === ref.at && candidate.original === ref.original;
  })[0];
  if (!issue) throw userError_('format.err.changed');
  applyBibliographyIssue_(resolved.element, issue);
  if (ref.keepCursor) keepCursorAt_(resolved.element, issue.start);
  return checkBibliography(options);
}

function fixBibliographyKind(kind, options) {
  if (!BIB_FIX_ALL[kind]) throw userError_('format.err.changed');
  const ctx = bibliographyContext_((options || {}).type || savedStructureType_());
  let fixed = 0;
  ctx.paragraphs.forEach(function (p) {
    const issues = citedOnly_(p.citations, ctx.entries).reduce(function (all, citation) { return all.concat(citation.issues); }, [])
      .filter(function (issue) { return issue.kind === kind && !issue.single; });
    if (!issues.length) return;
    applyDocumentEdits_(p.element.editAsText(), issues.reduce(function (all, issue) { return all.concat(issue.edits); }, []));
    fixed += issues.length;
  });
  return { fixed: fixed, result: checkBibliography(options) };
}

function sortBibliography(options) {
  const ctx = bibliographyContext_((options || {}).type || savedStructureType_());
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

function bibliographyContext_(type, options) {
  const body = DocumentApp.getActiveDocument().getBody();
  const paragraphs = documentParagraphs_(body);
  const candidates = [];
  paragraphs.forEach(function (p, i) {
    if (!p.inTable && p.text.trim().length <= 60 && BIB_HEADING.test(normalizeTitle_(p.text))) candidates.push(i);
  });
  const headed = candidates.filter(function (i) { return headingLevel_(paragraphs[i].heading); });
  const pool = headed.length ? headed : candidates;
  const start = pool.length ? pool[pool.length - 1] : -1;
  const ctx = { section: start >= 0, entries: [], citations: [], paragraphs: [], discussion: null, sortable: false, stats: { citations: 0, entries: 0, english: 0 } };
  let end = paragraphs.length;
  if (start >= 0) {
    const startLevel = headingLevel_(paragraphs[start].heading) || 7;
    for (let i = start + 1; i < paragraphs.length; i++) {
      const l = headingLevel_(paragraphs[i].heading);
      if (l && l <= startLevel) {
        end = i;
        break;
      }
    }
    ctx.entries = paragraphs.slice(start + 1, end)
      .filter(function (p) { return p.text.trim() && !headingLevel_(p.heading); })
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
  if (options && options.entriesOnly) return { entries: ctx.entries };
  const roles = chapterRoles_(type);
  let stack = [];
  let ownPart = false;
  paragraphs.forEach(function (p, i) {
    p.order = i;
    const l = headingLevel_(p.heading);
    if (l) {
      if (p.inTable || !p.text.trim()) return;
      let role = chapterRole_(p.text, roles);
      const parents = stack.filter(function (h) { return h.level < l; });
      const owner = parents.filter(function (h) { return h.role === 'results' || h.role === 'discussion' || h.role === 'own'; }).pop();
      if (role === 'methods') role = 'own';
      if (role === 'theory' && owner) role = owner.role;
      if (!parents.length && (role === 'own' || role === 'results' || role === 'discussion')) ownPart = true;
      if (ownPart && !parents.length && role === 'theory') role = 'own';
      stack = parents.concat({ level: l, paragraph: p, role: role });
      if (role === 'discussion' && !ctx.discussion) ctx.discussion = p;
      return;
    }
    if (start >= 0 && i >= start && i < end) return;
    const current = stack[stack.length - 1];
    p.role = current ? (current.role === 'own' ? 'other' : current.role) : null;
    p.chapter = current ? current.paragraph.text.trim() : '';
    p.citations = parseCitations_(p.text);
    p.citations.forEach(function (citation) {
      citation.location = p.location;
      citation.paragraph = p;
      ctx.citations.push(citation);
    });
    ctx.paragraphs.push(p);
  });
  const scholarly = ctx.entries.filter(function (e) { return !e.web; });
  ctx.stats = {
    citations: ctx.citations.length,
    entries: ctx.entries.length,
    english: scholarly.length ? Math.round(100 * scholarly.filter(function (e) { return e.english; }).length / scholarly.length) : 0,
  };
  return ctx;
}
