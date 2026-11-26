const STYLE_KINDS = ['personal', 'personalPast', 'digits', 'words', 'introTense', 'conclusionTense', 'abstractPhrase'];
const STYLE_INFO_KINDS = { personalPast: true, digits: true, words: true, introTense: true, conclusionTense: true, abstractPhrase: true };
const STYLE_MAX_ITEMS = 100;
const STYLE_RULES_PROP = 'styleRules';
const STYLE_RULE_OF_KIND = { personal: 'personal', personalPast: 'personal', digits: 'digits', words: 'words', introTense: 'tense', conclusionTense: 'tense', abstractPhrase: 'abstractPhrase' };
const STYLE_CONTEXT = 45;
const STYLE_EDGE = '(?<![\\p{L}\\p{N}])';
const STYLE_END = '(?![\\p{L}\\p{N}])';

const STYLE_PERSONAL = new RegExp(STYLE_EDGE + '(?:' + [
  'moim zdaniem', 'wed\u0142ug mnie', 'w mojej (?:pracy|opinii|ocenie)', 'dla mnie', 'przeze mnie',
  'm\u00f3j', 'moja', 'moje', 'mojego', 'mojej', 'moim', 'moich', 'moj\u0105', 'mojemu',
  'uwa\u017cam', 's\u0105dz\u0119', 'twierdz\u0119', 'my\u015bl\u0119', 'przypuszczam', 'zak\u0142adam', 'stwierdzam',
  'przedstawiam', 'omawiam', 'opisuj\u0119', 'analizuj\u0119', 'prezentuj\u0119', 'proponuj\u0119', 'przyjmuj\u0119',
  'uznaj\u0119', 'wykazuj\u0119', 'pokazuj\u0119', 'zajmuj\u0119 si\u0119', 'skupiam si\u0119', 'koncentruj\u0119 si\u0119',
  'postaram si\u0119', 'spr\u00f3buj\u0119', 'staram si\u0119', 'mam nadziej\u0119', 'chc\u0119', 'pragn\u0119', 'zamierzam',
  'przedstawi\u0119', 'om\u00f3wi\u0119', 'opisz\u0119', 'przeanalizuj\u0119', 'zbadam', 'por\u00f3wnam', 'wyka\u017c\u0119',
  '\\p{L}+[aiy\u0105e\u0119u]\u0142am(?: si\u0119)?', '\\p{L}*(?:sz\u0142|mog\u0142|laz\u0142|nios\u0142|wiod\u0142)am(?: si\u0119)?', 'ja', '\\p{L}+\u0142(?:a)?bym',
].join('|') + ')' + STYLE_END, 'giu');

const STYLE_PAST = new RegExp(STYLE_EDGE + '(?:\\p{L}+[aiy\u0105eu]\u0142em|\\p{L}*(?:szed\u0142|mog\u0142|laz\u0142|nios\u0142|wiod\u0142)em)' + STYLE_END, 'giu');
const STYLE_PAST_NOUNS = /(?:dzia\u0142em|teria\u0142em|pita\u0142em|ncja\u0142em|dea\u0142em|kana\u0142em|gna\u0142em|zapa\u0142em|upa\u0142em|arta\u0142em|fina\u0142em|ryszta\u0142em|ytu\u0142em|tyku\u0142em|rwa\u0142em|ytua\u0142em|szaka\u0142em|pedza\u0142em|^ty\u0142em|^py\u0142em|^mu\u0142em|^ka\u0142em|^cia\u0142em|^wa\u0142em|^sza\u0142em|^cyja\u0142em|^stro\u0142em)$/i;

const STYLE_WORD_NUMBERS = new RegExp(STYLE_EDGE + '(?:jedena[\u015bs]cie|dwana[\u015bs]cie|trzyna[\u015bs]cie|czterna[\u015bs]cie|pi[\u0119e]tna[\u015bs]cie|szesna[\u015bs]cie|siedemna[\u015bs]cie|osiemna[\u015bs]cie|dziewi[\u0119e]tna[\u015bs]cie|dwadzie[\u015bs]cia|trzydzie[\u015bs]ci|czterdzie[\u015bs]ci|pi[\u0119e][\u0107c]dziesi[\u0105a]t|sze[\u015bs][\u0107c]dziesi[\u0105a]t|siedemdziesi[\u0105a]t|osiemdziesi[\u0105a]t|dziewi[\u0119e][\u0107c]dziesi[\u0105a]t|sto)' + STYLE_END, 'giu');

const STYLE_UNITS = /^(?:%|‰|°|proc\.?|procent\p{L}*|p\.\s?p\.|pkt|punkt\p{L}*|cm|mm|m|km|m2|m²|m3|m³|kg|g|mg|µg|ug|ml|l|dl|z\u0142|z[\u0142l]otych|gr|PLN|EUR|USD|euro|tys\.?|mln|mld|h|godz\.?|godzin\p{L}*|min\.?|minut\p{L}*|s|sek\.?|sekund\p{L}*|dni|dnia|dzie[\u0144n]|tydz\.?|tydzie[\u0144n]|tygod\p{L}*|mies\.?|miesi[\u0105a]c\p{L}*|lat|lata|rok\p{L}*|r\.|kcal|kJ|mmHg|bpm|x|×|stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[\u015bs]nia|pa[\u017az]dziernika|listopada|grudnia)$/iu;
const STYLE_LABELS = /^(?:typ\p{L}*|grup\p{L}*|etap\p{L}*|stopni\p{L}*|stopie[\u0144n]|pytani\p{L}*|hipotez\p{L}*|wariant\p{L}*|poziom\p{L}*|klas\p{L}*|faz\p{L}*|kategori\p{L}*|numer\p{L}*|nr\.?|wersj\p{L}*|krok\p{L}*|model\p{L}*|schemat\p{L}*|wz[o\u00f3]r\p{L}*|r[o\u00f3]wnani\p{L}*|tabel\p{L}*|tab\.|rycin\p{L}*|ryc\.|rys\.|rysun\p{L}*|wykres\p{L}*|rozdzia\p{L}*|podrozdzia\p{L}*|cz[\u0119e][\u015bs][\u0107c]|cz[\u0119e][\u015bs]ci|za[\u0142l][\u0105a]cznik\p{L}*|za[\u0142l]\.|aneks\p{L}*|punkt\p{L}*|pkt\.?|ust\.|art\.|§|s\.|str\.|semestr\p{L}*|kurs\p{L}*|lekcj\p{L}*|tom\p{L}*|t\.|vol\.|zadani\p{L}*|kwarta[\u0142l]\p{L}*|dzie[\u0144n]|dnia|tydzie[\u0144n]|tygodni\p{L}*|miesi[\u0105a]c\p{L}*|rok\p{L}*|roku|godzin\p{L}*|sezon\p{L}*|edycj\p{L}*|runda|rundzie|seri\p{L}*|pr[o\u00f3]b\p{L}*|sesj\p{L}*|wizyt\p{L}*|badani\p{L}*|pacjent\p{L}*|respondent\p{L}*|osob\p{L}*|tabela|tydz\.)$/iu;

const STYLE_THESIS = /(?<![\p{L}])(?:w\s+(?:niniejszej\s+|tej\s+|ca[\u0142l]ej\s+)?pracy|niniejsz\p{L}*\s+prac\p{L}*|w\s+(?:kolejnych\s+|nast[\u0119e]pnych\s+|poszczeg[o\u00f3]lnych\s+|pierwszym\s+|drugim\s+|trzecim\s+|czwartym\s+|ostatnim\s+)?rozdzia\p{L}*|w\s+cz[\u0119e][\u015bs]ci\s+(?:teoretycznej|empirycznej|badawczej|praktycznej)|celem\s+(?:niniejszej\s+)?pracy|cel(?:em)?\s+(?:g[\u0142l][o\u00f3]wnym\s+)?pracy|praca\s+(?:ta\s+)?(?:sk[\u0142l]ada|zawiera|obejmuje))/iu;
const STYLE_PAST_MARKERS = new RegExp(STYLE_EDGE + '(?:przedstawiono|om[o\u00f3]wiono|opisano|zbadano|przeanalizowano|scharakteryzowano|por[o\u00f3]wnano|wykazano|ustalono|zaprezentowano|wskazano|dokonano|przeprowadzono|poddano|zestawiono|sformu[\u0142l]owano|postawiono|zweryfikowano|wykorzystano|zastosowano|uwzgl[\u0119e]dniono|zawarto|podj[\u0119e]to|zdefiniowano|wyja[\u015bs]niono|zaproponowano|oceniono|zosta[\u0142l]y|zosta[\u0142l]a|zosta[\u0142l]o|zosta[\u0142l]|by[\u0142l]y\\s+omawiane)' + STYLE_END, 'giu');
const STYLE_FUTURE_MARKERS = new RegExp(STYLE_EDGE + '(?:zostanie|zostan[\u0105a]|b[\u0119e]dzie|b[\u0119e]d[\u0105a]|przedstawi[\u0119e]|om[o\u00f3]wi[\u0119e]|opisz[\u0119e]|przeanalizuj[\u0119e]|zbadam)' + STYLE_END, 'giu');
const STYLE_ABSTRACT = new RegExp(STYLE_EDGE + '(?:b[\u0119e]dzie\\s+mowa|zostan(?:ie|[\u0105a])\\s+om[o\u00f3]wion\\p{L}*|b[\u0119e]d[\u0105a]\\s+om[o\u00f3]wion\\p{L}*|w\\s+(?:niniejszym\\s+|tym\\s+)?tek[\u015bs]cie\\s+(?:opisano|om[o\u00f3]wiono|przedstawiono|zawarto)|w\\s+niniejszym\\s+tek[\u015bs]cie|postaram\\s+si[\u0119e]|praca\\s+(?:ta\\s+)?jest\\s+o)' + STYLE_END, 'giu');

const STYLE_ROLES = [
  ['skip', /^(?:bibliografia|pi\u015bmiennictwo|wykaz pi\u015bmiennictwa|literatura|references|bibliography|aneks|aneksy|za\u0142\u0105czniki|appendix|appendices|spis tre\u015bci|spis tabel|spis rycin|spis rysunk\u00f3w|spis ilustracji|spis tabel i rycin|spis rycin i tabel|wykaz skr\u00f3t\u00f3w|wykaz skr\u00f3t\u00f3w i oznacze\u0144|wykaz oznacze\u0144|contents|table of contents|list of tables|list of figures|abbreviations|o\u015bwiadczenie|o\u015bwiadczenia|podzi\u0119kowania|acknowledgements?|s\u0142owa kluczowe|keywords|abstract|summary)$|^za\u0142\u0105cznik\s+(?:nr\s*)?\d|^(?:wykaz|spis)(?: \S+)? (?:skr\u00f3t|oznacze\u0144|symboli|akronim)/],
  ['abstract', /^(?:streszczenie|abstrakt)$/],
  ['intro', /^(?:wst[\u0119e]p|wprowadzenie|introduction)/],
  ['conclusion', /^(?:zako[\u0144n]czenie|podsumowanie|wnioski|conclusions?|summary and conclusions)/],
];

function styleTitle_(text) {
  return String(text || '').toLowerCase()
    .replace(/^\s*(?:rozdzia\S*|chapter|cz\S{3})\s+(?:\d+|[ivxlc]+)(?=[\s.:–-]|$)\s*[.:–-]?\s*/, '')
    .replace(/^\s*\d+(?:\.\d+)*\.?\s+/, '')
    .replace(/[\s.:]+$/, '')
    .trim();
}

function styleChapter_(text) {
  return /^\s*(?:(?:rozdzia\S*|chapter|cz\S{3})\s+(?:\d+|[ivxlc]+)|\d+\.?\s)/i.test(String(text || ''));
}

function styleRole_(text) {
  const title = styleTitle_(text);
  for (let i = 0; i < STYLE_ROLES.length; i++) {
    if (STYLE_ROLES[i][1].test(title)) return STYLE_ROLES[i][0];
  }
  return null;
}

function styleRoles_(headings) {
  let stack = [];
  return headings.map(function (heading) {
    const parents = stack.filter(function (h) { return h.level < heading.level; });
    const own = styleRole_(heading.text);
    const parent = parents.length ? parents[parents.length - 1].role : null;
    const role = own || (parent === 'skip' ? 'skip' : styleChapter_(heading.text) ? null : parent);
    stack = parents.concat({ level: heading.level, role: role });
    return role;
  });
}

function styleMask_(text) {
  const chars = String(text || '').split('');
  const blank = function (start, end) {
    for (let i = start; i < end && i < chars.length; i++) if (chars[i] !== '\n') chars[i] = ' ';
  };
  const patterns = [
    /„[^„”"]*[”"]/g,
    /“[^“”]*”/g,
    /"[^"\n]*"/g,
    /«[^«»]*»/g,
    /\([^()]*(?:1[5-9]|20)\d{2}[a-z]?[^()]*\)/g,
    /https?:\/\/\S+|www\.\S+/gi,
    new RegExp('(?<![\\p{L}])(?:tab(?:el\\p{L}*|\\.)|ryc(?:in\\p{L}*|\\.)|rys(?:un\\p{L}*|\\.)|wykres\\p{L}*|za[\u0142l](?:[\u0105a]cznik\\p{L}*|\\.)|aneks\\p{L}*|podrozdzia\\p{L}*|rozdzia\\p{L}*|punkt\\p{L}*|pkt\\.?|nr\\.?|s\\.|str\\.|ust\\.|art\\.|§)\\s*\\d[\\d.,–-]*', 'giu'),
  ];
  const source = chars.join('');
  patterns.forEach(function (pattern) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(source)) !== null) {
      blank(match.index, match.index + match[0].length);
      if (!match[0].length) pattern.lastIndex++;
    }
  });
  return chars.join('');
}

function styleMatches_(pattern, text) {
  const out = [];
  let match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    out.push({ start: match.index, end: match.index + match[0].length, match: match[0] });
    if (!match[0].length) pattern.lastIndex++;
  }
  return out;
}

function personalForms_(text) {
  const masked = styleMask_(text);
  const closed = styleMatches_(STYLE_PERSONAL, masked).map(function (m) { return Object.assign(m, { kind: 'personal' }); });
  const open = styleMatches_(STYLE_PAST, masked)
    .filter(function (m) { return !STYLE_PAST_NOUNS.test(m.match); })
    .map(function (m) { return Object.assign(m, { kind: 'personalPast' }); });
  return closed.concat(open).sort(function (a, b) { return a.start - b.start; });
}

function styleWordAfter_(text, from) {
  const rest = text.slice(from);
  const match = /^\s*([^\s,;:()[\]]+)/u.exec(rest);
  return match ? match[1].replace(/[.,;:!?)]+$/, function (tail) { return tail.charAt(0) === '.' ? '.' : ''; }) : '';
}

function styleWordBefore_(text, to) {
  const match = /([^\s(]+)\s*$/u.exec(text.slice(0, to));
  return match ? match[1] : '';
}

function digitNumbers_(text, upTo) {
  const masked = styleMask_(text);
  const out = [];
  const pattern = upTo === 10
    ? /(?<![\p{L}\p{N}.,\-–\/=<>±+_])(?:10|[1-9])(?![\p{N}\p{L}\-–\/%°²³_]|[.,]\p{N})/gu
    : /(?<![\p{L}\p{N}.,\-–\/=<>±+_])[1-9](?![\p{N}\p{L}\-–\/%°²³_]|[.,]\p{N})/gu;
  let match;
  while ((match = pattern.exec(masked)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const next = masked.slice(end);
    if (/^\s*[)\]]/.test(next) || /^\.\s+\p{Ll}/u.test(next) || /^\s*[-–]\s*\d/.test(next) || /^\s*(?:x|×|=|<|>)/.test(next)) continue;
    const before = styleWordBefore_(masked, start);
    const after = styleWordAfter_(masked, end);
    if (!after) {
      if (/^\s*[,;:(]/.test(next) && !STYLE_LABELS.test(before) && !/^[(\[=<>≤≥±~≈]$/.test(before)) out.push({ start: start, end: end, match: match[0], kind: 'digits' });
      continue;
    }
    if (STYLE_UNITS.test(after.replace(/\.$/, '')) || STYLE_UNITS.test(after)) continue;
    if (STYLE_LABELS.test(before) || /^[(\[=<>≤≥±~≈]$/.test(before)) continue;
    if (/\d$/.test(before)) continue;
    out.push({ start: start, end: end, match: match[0], kind: 'digits' });
  }
  return out;
}

function wordNumbers_(text) {
  const masked = styleMask_(text);
  return styleMatches_(STYLE_WORD_NUMBERS, masked)
    .filter(function (m) {
      const before = masked.slice(0, m.start).replace(/\s+$/, '');
      return before && !/[.!?…:]$/.test(before);
    })
    .map(function (m) { return Object.assign(m, { kind: 'words' }); });
}

function styleSentences_(text) {
  const out = [];
  const pattern = /[^.!?…]+(?:[.!?…]+|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (!match[0].trim()) {
      if (!match[0].length) pattern.lastIndex++;
      continue;
    }
    const last = out[out.length - 1];
    if (last && /^\s*[\p{Ll}\d(]/u.test(match[0])) {
      last.end = match.index + match[0].length;
      last.text = text.slice(last.start, last.end);
      continue;
    }
    out.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
  }
  return out;
}

function tenseIssues_(text, role) {
  if (role !== 'intro' && role !== 'conclusion') return [];
  const masked = styleMask_(text);
  const markers = role === 'intro' ? STYLE_PAST_MARKERS : STYLE_FUTURE_MARKERS;
  const out = [];
  styleSentences_(masked).forEach(function (sentence) {
    if (!STYLE_THESIS.test(String(text).slice(sentence.start, sentence.end))) return;
    const hit = styleMatches_(markers, sentence.text)[0];
    if (!hit) return;
    out.push({ start: sentence.start + hit.start, end: sentence.start + hit.end, match: hit.match, kind: role === 'intro' ? 'introTense' : 'conclusionTense' });
  });
  return out;
}

function abstractPhrases_(text) {
  return styleMatches_(STYLE_ABSTRACT, styleMask_(text)).map(function (m) { return Object.assign(m, { kind: 'abstractPhrase' }); });
}

function styleIssues_(text, role, rules) {
  if (role === 'skip') return [];
  const active = rules || getDefaultStyleRules();
  const found = personalForms_(text).concat(tenseIssues_(text, role), role === 'abstract' ? abstractPhrases_(text) : [], digitNumbers_(text, active.wordsUpTo), wordNumbers_(text))
    .filter(function (issue) { return active[STYLE_RULE_OF_KIND[issue.kind]] !== false; });
  const kept = [];
  found.forEach(function (issue) {
    if (kept.some(function (other) { return issue.start < other.end && other.start < issue.end; })) return;
    kept.push(issue);
  });
  return kept.sort(function (a, b) { return a.start - b.start; })
    .map(function (issue) { return Object.assign(issue, { match: text.slice(issue.start, issue.end) }); });
}

function styleSnippet_(text, start, end) {
  let from = Math.max(0, start - STYLE_CONTEXT);
  let to = Math.min(text.length, end + STYLE_CONTEXT);
  if (from > 0) {
    const space = text.indexOf(' ', from);
    if (space >= 0 && space < start) from = space + 1;
  }
  if (to < text.length) {
    const space = text.lastIndexOf(' ', to);
    if (space > end) to = space;
  }
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, start),
    match: text.slice(start, end),
    after: text.slice(end, to) + (to < text.length ? '…' : ''),
  };
}

function styleContext_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const all = [];
  collectParagraphs_(body, [], false, all);
  const paragraphs = outsideTitlePage_(all, titlePageEnd_(body)).filter(function (p) { return !p.inTable; });
  const headings = [];
  paragraphs.forEach(function (p) {
    p.text = p.element.getText();
    const match = /^HEADING([1-6])$/.exec(String(p.element.getHeading()));
    p.level = match && p.text.trim() ? Number(match[1]) : 0;
    if (p.level) headings.push({ level: p.level, text: p.text, paragraph: p });
  });
  const roles = styleRoles_(headings);
  headings.forEach(function (h, i) { h.paragraph.headingRole = roles[i]; });
  let role = null;
  const out = [];
  paragraphs.forEach(function (p) {
    if (p.level) {
      role = p.headingRole;
      return;
    }
    if (!p.text.trim()) return;
    out.push({ paragraph: p, role: role });
  });
  return out;
}

function checkStyle() {
  const groups = {};
  STYLE_KINDS.forEach(function (kind) { groups[kind] = { kind: kind, count: 0, items: [], info: !!STYLE_INFO_KINDS[kind] }; });
  const entries = styleContext_();
  const rules = readStyleRules_() || getDefaultStyleRules();
  const hide = ignoreFilter_('style');
  entries.forEach(function (entry) {
    const text = entry.paragraph.text;
    const issues = styleIssues_(text, entry.role, rules);
    issues.forEach(function (issue) {
      if (issue.kind === 'digits' && entry.paragraph.isList) return;
      const group = groups[issue.kind];
      const snippet = styleSnippet_(text, issue.start, issue.end);
      const item = {
        ref: styleRef_(entry.paragraph.location, text, issue),
        before: snippet.before,
        match: snippet.match,
        after: snippet.after,
        keyText: text,
      };
      if (hide(group, item)) return;
      group.count++;
      if (group.items.length < STYLE_MAX_ITEMS) group.items.push(item);
    });
  });
  const list = STYLE_KINDS.map(function (kind) { return groups[kind]; });
  hide.finish(list);
  return { stats: { paragraphs: entries.length }, groups: list };
}

function styleRef_(location, text, issue) {
  const from = Math.max(0, issue.start - 20);
  const to = Math.min(text.length, issue.end + 20);
  return { location: location, start: issue.start, end: issue.end, fingerprint: issue.match, context: text.slice(from, to), offset: issue.start - from };
}

function showStyleIssue(ref) {
  const resolved = ref.location ? resolveElementPath_(ref.location) : null;
  if (!resolved || resolved.isText) throw userError_('format.err.changed');
  const text = resolved.element.getText();
  let start = -1;
  if (text.slice(ref.start - ref.offset, ref.start - ref.offset + ref.context.length) === ref.context) {
    start = ref.start;
  } else {
    const first = text.indexOf(ref.context);
    if (first >= 0 && text.indexOf(ref.context, first + 1) < 0) start = first + ref.offset;
  }
  if (start < 0) throw userError_('format.err.changed');
  const doc = DocumentApp.getActiveDocument();
  selectRange_(doc, function () { return doc.newRange().addElement(resolved.element.editAsText(), start, start + ref.fingerprint.length - 1); });
}

function normalizeStyleRules_(input) {
  const source = input || {};
  const flag = function (value) { return value === undefined ? true : !!value; };
  return {
    personal: flag(source.personal),
    digits: flag(source.digits),
    words: flag(source.words),
    tense: flag(source.tense),
    abstractPhrase: flag(source.abstractPhrase),
    wordsUpTo: Number(source.wordsUpTo) === 10 ? 10 : 9,
  };
}

function getDefaultStyleRules() {
  return normalizeStyleRules_({});
}

function readStyleRules_() {
  const raw = docProps_().getProperty(STYLE_RULES_PROP);
  if (!raw) return null;
  try {
    return normalizeStyleRules_(JSON.parse(raw));
  } catch (e) {
    console.warn('Niepoprawny zapis regul stylu: ' + e.message);
    return null;
  }
}

function getStyleRules() {
  const saved = readStyleRules_();
  return { rules: saved || getDefaultStyleRules(), isDefault: !saved };
}

function saveStyleRules(input) {
  const rules = normalizeStyleRules_(input);
  const isDefault = JSON.stringify(rules) === JSON.stringify(getDefaultStyleRules());
  if (isDefault) docProps_().deleteProperty(STYLE_RULES_PROP);
  else docProps_().setProperty(STYLE_RULES_PROP, JSON.stringify(rules));
  return { rules: rules, isDefault: isDefault };
}
