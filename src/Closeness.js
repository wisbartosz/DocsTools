const CLOSENESS_KINDS = ['verbatim', 'paraphrase'];
const CLOSENESS_INFO_KINDS = { paraphrase: true };
const CLOSENESS_DEFAULT_WORDS = 12;
const CLOSENESS_MIN_WORDS = 6;
const CLOSENESS_SEED = 6;
const CLOSENESS_STEM_CHARS = 5;
const CLOSENESS_PARA_MIN_WORDS = 10;
const CLOSENESS_PARA_MIN_PAIRS = 3;
const CLOSENESS_PARA_PAIR_GAP = 4;
const CLOSENESS_PARA_RATIO = 0.6;
const CLOSENESS_PARA_WINDOWS = 3;
const CLOSENESS_PARA_BUCKET = 40;
const CLOSENESS_CONTEXT_WORDS = 12;
const CLOSENESS_SNIPPET_CHARS = 80;
const CLOSENESS_CITATION = /\((?:(?:por|zob|za|cyt|np|see|cf)\.?\s+)?\p{Lu}[^()\n]{0,100}?\b\d{4}[a-z]?\b[^()\n]{0,40}\)/gu;
const CLOSENESS_HYPHEN = /[-\u00AD]\s*[\n\r\u000B]\s*(?=\p{Ll})/gu;
const CLOSENESS_SKIP_HEADING = /o.wiadczeni|declaration/i;
const CLOSENESS_REFERENCES_HEADING = /^[\d.\s]*(bibliografia|pi.miennictwo|literatura|wykaz literatury|references|bibliography)$/i;
const CLOSENESS_STOPWORDS = closenessSet_('ktory ktora ktore ktorych ktorym ktorego ktorej ktorzy ktorymi przez takze jako jego ich jest byc moze mozna moga rowniez tego tych tym tej temu tymi bardzo przy ' +
  'ponadto natomiast jednak czyli aby juz tylko gdzie kiedy sobie swoj swoje swoich swoja swojej jaki jaka jakie jakich tak lecz albo badz wiec ' +
  'miedzy podczas poprzez wedlug wraz wobec oraz zostal zostala zostaly zostalo bedzie beda byla byly bylo jesli jezeli ktos cos tutaj wtedy ' +
  'this that with which from have been were their there these those into also such than other more most some what when where while about ' +
  'would could should will they them then each between through within without being does upon only over under');
const CLOSENESS_END_ABBREVIATIONS = closenessSet_('r itd itp ok');
const CLOSENESS_PACK = 16777216;

function closenessSet_(words) {
  const set = {};
  words.split(' ').forEach(function (w) { set[w] = true; });
  return set;
}

function closenessWordsRule_(value) {
  if (value === undefined) return CLOSENESS_DEFAULT_WORDS;
  const words = positiveInt_(value);
  return words === null ? null : Math.max(CLOSENESS_MIN_WORDS, words);
}

function closenessTokens_(text) {
  const masked = String(text || '').replace(SEARCH_MARKER, function (m) { return ' '.repeat(m.length); });
  const tokens = [];
  const re = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu;
  let m;
  while ((m = re.exec(masked)) !== null) tokens.push({ word: searchFold_(m[0]), start: m.index, end: m.index + m[0].length });
  for (let i = tokens.length - 2; i >= 0; i--) {
    const gap = masked.slice(tokens[i].end, tokens[i + 1].start);
    if (/^[-\u00AD]\s*[\n\r\u000B]\s*$/.test(gap) && /\p{Ll}/u.test(masked[tokens[i + 1].start])) {
      tokens[i] = { word: tokens[i].word + tokens[i + 1].word, start: tokens[i].start, end: tokens[i + 1].end };
      tokens.splice(i + 1, 1);
    }
  }
  return tokens;
}

function closenessStem_(word) {
  return /^\d+$/.test(word) || word.length <= CLOSENESS_STEM_CHARS ? word : word.slice(0, CLOSENESS_STEM_CHARS);
}

function closenessContent_(word) {
  return word.length > 3 && !SEARCH_STOPWORDS[word] && !CLOSENESS_STOPWORDS[word];
}

function closenessQuoteSpans_(text) {
  const spans = [];
  let open = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (open) {
      if (open.close.indexOf(ch) >= 0) {
        spans.push([open.at, i + 1]);
        open = null;
      }
      continue;
    }
    if (ch === '„') open = { at: i, close: '”“' };
    else if (ch === '“') open = { at: i, close: '”' };
    else if (ch === '«') open = { at: i, close: '»' };
    else if (ch === '"') open = { at: i, close: '"' };
  }
  if (open && open.close !== '"') spans.push([open.at, text.length]);
  return spans;
}

function buildClosenessIndex_(sources) {
  const vocabulary = new Map();
  const seeds = new Map();
  const stems = new Map();
  const push = function (map, key, value) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  const docs = sources.map(function (source, s) {
    const text = String(source.text || '').normalize('NFC');
    const tokens = closenessTokens_(text.replace(CLOSENESS_CITATION, function (m) { return ' '.repeat(m.length); }));
    tokens.forEach(function (token, i) {
      let id = vocabulary.get(token.word);
      if (id === undefined) vocabulary.set(token.word, id = vocabulary.size);
      token.id = id;
      if (closenessContent_(token.word)) push(stems, closenessStem_(token.word), s * CLOSENESS_PACK + i);
    });
    for (let i = 0; i + CLOSENESS_SEED <= tokens.length; i++) push(seeds, closenessSeed_(tokens, i), s * CLOSENESS_PACK + i);
    return { id: source.id, name: source.name, text: text, tokens: tokens, markers: indexSourceWords_(text).markers };
  });
  return { vocabulary: vocabulary, seeds: seeds, stems: stems, docs: docs };
}

function closenessSeed_(tokens, from) {
  let hash = 2166136261;
  for (let k = 0; k < CLOSENESS_SEED; k++) hash = Math.imul(hash ^ tokens[from + k].id, 16777619) >>> 0;
  return hash;
}

function closenessSegments_(text) {
  const blanked = String(text || '').replace(CLOSENESS_CITATION, function (m) { return ' '.repeat(m.length); });
  const segments = [];
  let plain = '';
  let last = 0;
  closenessQuoteSpans_(blanked).forEach(function (span) {
    segments.push({ from: last, to: span[0] });
    plain += blanked.slice(last, span[0]) + ' '.repeat(span[1] - span[0]);
    last = span[1];
  });
  segments.push({ from: last, to: blanked.length });
  plain += blanked.slice(last);
  return {
    plain: plain,
    segments: segments.map(function (seg) {
      return closenessTokens_(blanked.slice(seg.from, seg.to)).map(function (t) {
        return { word: t.word, start: t.start + seg.from, end: t.end + seg.from };
      });
    }).filter(function (tokens) { return tokens.length; }),
  };
}

function closenessParagraph_(text, index, rules) {
  const hits = [];
  const covered = [];
  const parts = closenessSegments_(text);
  parts.segments.forEach(function (tokens) {
    tokens.forEach(function (t) {
      const id = index.vocabulary.get(t.word);
      t.id = id === undefined ? -1 : id;
    });
    let i = 0;
    while (i + CLOSENESS_SEED <= tokens.length) {
      let known = true;
      for (let k = 0; k < CLOSENESS_SEED && known; k++) known = tokens[i + k].id >= 0;
      const candidates = known ? index.seeds.get(closenessSeed_(tokens, i)) || [] : [];
      let best = null;
      candidates.forEach(function (packed) {
        const c = { s: Math.floor(packed / CLOSENESS_PACK), i: packed % CLOSENESS_PACK };
        const doc = index.docs[c.s].tokens;
        let len = 0;
        while (i + len < tokens.length && c.i + len < doc.length && tokens[i + len].id === doc[c.i + len].id) len++;
        if (len >= CLOSENESS_SEED && (!best || len > best.len)) best = { s: c.s, i: c.i, len: len };
      });
      if (best && best.len >= rules.words) {
        const from = tokens[i].start;
        const to = tokens[i + best.len - 1].end;
        covered.push([from, to]);
        hits.push(closenessHit_('verbatim', [[from, to]], index, best.s, best.i, best.i + best.len - 1, best.len, null));
        i += best.len;
      } else {
        i++;
      }
    }
  });
  if (rules.paraphrase) closenessParaphrases_(parts, index, covered).forEach(function (hit) { hits.push(hit); });
  return hits;
}

function closenessParaphrases_(parts, index, covered) {
  const hits = [];
  const all = parts.segments.reduce(function (list, tokens) { return list.concat(tokens); }, []);
  const free = function (t) { return !covered.some(function (r) { return r[0] < t.end && r[1] > t.start; }); };
  closenessSentences_(parts.plain).forEach(function (sentence) {
    const inside = all.filter(function (t) { return t.start >= sentence.from && t.end <= sentence.to; });
    const content = inside
      .filter(function (t) { return free(t) && closenessContent_(t.word); })
      .map(function (t) { return { stem: closenessStem_(t.word), start: t.start, end: t.end }; });
    const distinct = Array.from(new Set(content.map(function (t) { return t.stem; })));
    if (distinct.length < CLOSENESS_PARA_MIN_WORDS) return;
    const buckets = new Map();
    distinct.forEach(function (stem) {
      (index.stems.get(stem) || []).forEach(function (packed) {
        const e = { s: Math.floor(packed / CLOSENESS_PACK), i: packed % CLOSENESS_PACK };
        const key = e.s + ':' + Math.floor(e.i / CLOSENESS_PARA_BUCKET);
        const bucket = buckets.get(key) || buckets.set(key, { s: e.s, b: Math.floor(e.i / CLOSENESS_PARA_BUCKET), stems: new Set() }).get(key);
        bucket.stems.add(stem);
      });
    });
    const windows = [];
    buckets.forEach(function (bucket) {
      const next = buckets.get(bucket.s + ':' + (bucket.b + 1));
      const shared = next ? new Set(Array.from(bucket.stems).concat(Array.from(next.stems))) : bucket.stems;
      if (shared.size / distinct.length >= CLOSENESS_PARA_RATIO) windows.push({ s: bucket.s, b: bucket.b, shared: shared });
    });
    windows.sort(function (x, y) { return y.shared.size - x.shared.size; });
    for (let w = 0; w < Math.min(windows.length, CLOSENESS_PARA_WINDOWS); w++) {
      const hit = closenessParaphraseHit_(windows[w], content, distinct, index, inside);
      if (hit) {
        hits.push(hit);
        return;
      }
    }
  });
  return hits;
}

function closenessParaphraseHit_(best, content, distinct, index, inside) {
  const doc = index.docs[best.s].tokens;
  const from = best.b * CLOSENESS_PARA_BUCKET;
  const to = Math.min(doc.length, from + 2 * CLOSENESS_PARA_BUCKET);
  const positions = {};
  for (let i = from; i < to; i++) {
    const stem = closenessStem_(doc[i].word);
    if (best.shared.has(stem)) (positions[stem] = positions[stem] || []).push(i);
  }
  let pairs = 0;
  for (let c = 0; c + 1 < content.length; c++) {
    const a = positions[content[c].stem];
    const b = positions[content[c + 1].stem];
    if (a && b && content[c].stem !== content[c + 1].stem && a.some(function (x) { return b.some(function (y) { return Math.abs(x - y) <= CLOSENESS_PARA_PAIR_GAP; }); })) pairs++;
  }
  if (pairs < CLOSENESS_PARA_MIN_PAIRS) return null;
  const used = [];
  Object.keys(positions).forEach(function (stem) { positions[stem].forEach(function (i) { used.push({ i: i, stem: stem }); }); });
  used.sort(function (x, y) { return x.i - y.i; });
  const span = closenessDensest_(used, content.length * 2);
  const marks = content.filter(function (t) { return best.shared.has(t.stem); }).map(function (t) { return [t.start, t.end]; });
  const percent = Math.round(best.shared.size / distinct.length * 100);
  const hit = closenessHit_('paraphrase', marks, index, best.s, span[0], span[1], best.shared.size, percent, best.shared);
  hit.range = [inside[0].start, inside[inside.length - 1].end];
  return hit;
}

function closenessDensest_(used, width) {
  let best = { distinct: 0, from: used[0].i, to: used[0].i };
  const counts = {};
  let distinct = 0;
  for (let a = 0, b = 0; b < used.length; b++) {
    counts[used[b].stem] = (counts[used[b].stem] || 0) + 1;
    if (counts[used[b].stem] === 1) distinct++;
    while (used[b].i - used[a].i > width) {
      counts[used[a].stem]--;
      if (counts[used[a].stem] === 0) distinct--;
      a++;
    }
    let from = a;
    while (from < b && counts[used[from].stem] > 1) {
      counts[used[from].stem]--;
      from++;
    }
    for (let k = a; k < from; k++) counts[used[k].stem]++;
    if (distinct > best.distinct || (distinct === best.distinct && used[b].i - used[from].i < best.to - best.from)) best = { distinct: distinct, from: used[from].i, to: used[b].i };
  }
  return [best.from, best.to];
}

function closenessSentences_(text) {
  const sentences = [];
  const re = /[.!?…]+/g;
  let from = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const next = text.slice(end).match(/^\s*(\S)/);
    const word = (text.slice(from, m.index).match(/([\p{L}\p{N}]+)$/u) || [])[1];
    if (next && !/[\p{Lu}„“"(]/u.test(next[1])) continue;
    if (next && word && m[0] === '.' && /^\p{Lu}$/u.test(word)) continue;
    if (next && word && m[0] === '.' && SEARCH_ABBREVIATIONS[searchFold_(word)] && !CLOSENESS_END_ABBREVIATIONS[searchFold_(word)]) continue;
    if (text.slice(from, end).trim()) sentences.push({ from: from, to: end });
    from = end;
  }
  if (text.slice(from).trim()) sentences.push({ from: from, to: text.length });
  return sentences;
}

function closenessHit_(kind, marks, index, s, from, to, words, percent, stems) {
  const doc = index.docs[s];
  const start = doc.tokens[from].start;
  const end = doc.tokens[to].end;
  const quote = doc.text.slice(start, end).replace(SEARCH_MARKER, ' ').replace(CLOSENESS_HYPHEN, '').replace(/\s+/g, ' ').trim();
  const ctxFrom = Math.max(0, from - CLOSENESS_CONTEXT_WORDS);
  const ctxTo = Math.min(doc.tokens.length - 1, to + CLOSENESS_CONTEXT_WORDS);
  const context = closenessContext_(doc, ctxFrom, ctxTo, function (i) {
    return i >= from && i <= to && (kind === 'verbatim' || stems.has(closenessStem_(doc.tokens[i].word)));
  });
  return {
    kind: kind,
    marks: marks,
    words: words,
    percent: percent,
    source: {
      id: doc.id,
      name: doc.name,
      page: pageAt_(doc.markers, start),
      quote: quote,
      text: context.text,
      marks: context.marks,
      cutStart: ctxFrom > 0,
      cutEnd: ctxTo < doc.tokens.length - 1,
    },
  };
}

function closenessContext_(doc, from, to, marked) {
  let text = '';
  const marks = [];
  for (let i = from; i <= to; i++) {
    const token = doc.tokens[i];
    if (i > from) {
      const gap = doc.text.slice(doc.tokens[i - 1].end, token.start).replace(SEARCH_MARKER, ' ').replace(/\s+/g, ' ');
      text += gap || ' ';
    }
    const start = text.length;
    text += doc.text.slice(token.start, token.end).replace(SEARCH_MARKER, '').replace(CLOSENESS_HYPHEN, '');
    if (marked(i)) marks.push([start, text.length]);
  }
  return { text: text, marks: marks };
}

function checkCloseness() {
  const rules = readBibliographyRules_() || getDefaultBibliographyRules();
  const groups = checkGroups_(CLOSENESS_KINDS, { info: CLOSENESS_INFO_KINDS, hide: ignoreFilter_('closeness') });
  const settings = { words: rules.closenessWords, paraphrase: rules.closenessParaphrase };
  if (!settings.words && !settings.paraphrase) return { off: true, groups: groups.list() };
  if (!settings.words) settings.words = Infinity;
  const ready = docProps_().getProperty(PROP.SOURCE_FOLDER) ? getReadySources_() : [];
  if (!ready.length) return { noSources: true, groups: groups.list() };
  const texts = searchReadTexts_(ready.map(function (s) { return s.textFileId; }));
  const index = buildClosenessIndex_(ready.map(function (s, i) { return { id: s.id, name: s.name, text: texts[i] }; }));
  const paragraphs = closenessParagraphs_();
  paragraphs.forEach(function (p) {
    closenessParagraph_(p.text, index, settings).forEach(function (hit) {
      groups.add(hit.kind, function () { return closenessItem_(p, hit); });
    });
  });
  return { stats: { paragraphs: paragraphs.length, sources: ready.length }, groups: groups.list() };
}

function closenessParagraphs_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const out = [];
  let skipLevel = 0;
  documentParagraphs_(body).forEach(function (p) {
    const level = headingLevel_(p.heading);
    if (level && p.text.trim()) {
      if (skipLevel && level <= skipLevel) skipLevel = 0;
      const back = level === 1 ? FORMAT_BACK_MATTER.test(p.text) : CLOSENESS_REFERENCES_HEADING.test(p.text.trim());
      if (!skipLevel && (back || CLOSENESS_SKIP_HEADING.test(p.text))) skipLevel = level;
      return;
    }
    if (!skipLevel && p.text.trim()) out.push(p);
  });
  return out;
}

function closenessItem_(p, hit) {
  const start = hit.range ? hit.range[0] : hit.marks[0][0];
  const end = hit.range ? hit.range[1] : hit.marks[hit.marks.length - 1][1];
  const from = Math.max(0, start - CLOSENESS_SNIPPET_CHARS);
  const to = Math.min(p.text.length, end + CLOSENESS_SNIPPET_CHARS);
  return {
    ref: styleRef_(p.location, p.text, { start: start, end: end, match: p.text.slice(start, end) }),
    showable: true,
    keyText: p.text,
    words: hit.words,
    percent: hit.percent,
    thesis: {
      text: p.text.slice(from, to),
      marks: hit.marks.map(function (m) { return [m[0] - from, m[1] - from]; }),
      cutStart: from > 0,
      cutEnd: to < p.text.length,
    },
    source: hit.source,
  };
}
