const RETRIEVAL_CHUNK_CHARS = 1500;
const RETRIEVAL_STEM_CHARS = 5;
const RETRIEVAL_CONTEXT_TOP = 5;
const RETRIEVAL_MIN_RELATIVE_SCORE = 0.3;
const RETRIEVAL_MIN_WORD = 3;
const RETRIEVAL_PAGE_MARKER = /\[\[str\. (\d+)\]\]/g;
const RETRIEVAL_COMBINING = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const RETRIEVAL_L_STROKE = new RegExp(String.fromCharCode(0x142), 'g');
const RETRIEVAL_STOPWORDS = (function () {
  const words = ('oraz ale jak jest jako jego jej ich ten ta to tego tej tym tych dla przez przy pod nad bez czy lub ' +
    'albo ani nie tak tez juz jeszcze tylko sie co ktory ktora ktore ktorych ktorej ktorym gdzie kiedy jaki jaka ' +
    'jakie jakich czym czego ile mozna jesli jezeli byc jest sa byl byla bylo beda bedzie moze musi powinien ' +
    'powinna powinno praca pracy prace the and for with from that this what which how are was were have has into ' +
    'about there their they them than then also does should could would').split(' ');
  const set = {};
  words.forEach(function (w) { set[w] = true; });
  return set;
})();

function retrievalTerms_(text) {
  return String(text || '')
    .toLowerCase()
    .replace(RETRIEVAL_PAGE_MARKER, ' ')
    .normalize('NFD')
    .replace(RETRIEVAL_COMBINING, '')
    .replace(RETRIEVAL_L_STROKE, 'l')
    .split(/[^a-z0-9]+/)
    .filter(function (word) { return /^\d+$/.test(word) || (word.length >= RETRIEVAL_MIN_WORD && !RETRIEVAL_STOPWORDS[word]); })
    .map(function (word) { return /^\d+$/.test(word) ? word : word.slice(0, RETRIEVAL_STEM_CHARS); });
}

function splitChunks_(text, size) {
  const limit = size || RETRIEVAL_CHUNK_CHARS;
  const paragraphs = String(text || '').split(/\n+/);
  const chunks = [];
  let current = '';
  let page = null;
  let chunkPage = null;
  const flush = function () {
    if (!current.trim()) return;
    const prefix = chunkPage && current.indexOf('[[str.') !== 0 ? '[[str. ' + chunkPage + ']] ' : '';
    chunks.push(prefix + current.trim());
    current = '';
  };
  paragraphs.forEach(function (paragraph) {
    if (!current) chunkPage = page;
    if (current && current.length + paragraph.length > limit) {
      flush();
      chunkPage = page;
    }
    paragraphPieces_(paragraph, limit).forEach(function (piece, index) {
      if (index > 0) {
        flush();
        chunkPage = page;
      }
      current += (current ? '\n' : '') + piece;
      let marker;
      RETRIEVAL_PAGE_MARKER.lastIndex = 0;
      while ((marker = RETRIEVAL_PAGE_MARKER.exec(piece)) !== null) page = Number(marker[1]);
    });
  });
  flush();
  return chunks;
}

function paragraphPieces_(text, limit) {
  const pieces = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf(' ', limit);
    if (cut < limit / 2) cut = limit;
    const open = rest.lastIndexOf('[[', cut);
    if (open > 0 && rest.indexOf(']]', open) + 2 > cut) cut = open;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

function selectPassages_(sources, query, budget) {
  const queryTerms = {};
  retrievalTerms_(query).forEach(function (term) { queryTerms[term] = true; });
  const chunks = [];
  sources.forEach(function (source, sourceIndex) {
    splitChunks_(source.text).forEach(function (text, position) {
      const counts = {};
      retrievalTerms_(text).forEach(function (term) {
        if (queryTerms[term]) counts[term] = (counts[term] || 0) + 1;
      });
      chunks.push({ source: sourceIndex, position: position, text: text, counts: counts });
    });
  });
  const documentFrequency = {};
  chunks.forEach(function (chunk) {
    Object.keys(chunk.counts).forEach(function (term) { documentFrequency[term] = (documentFrequency[term] || 0) + 1; });
  });
  chunks.forEach(function (chunk) {
    chunk.score = Object.keys(chunk.counts).reduce(function (sum, term) {
      const idf = Math.log(1 + chunks.length / documentFrequency[term]);
      return sum + Math.min(chunk.counts[term], 3) * idf;
    }, 0);
  });
  const ranked = chunks.slice().sort(function (a, b) {
    return b.score - a.score || a.source - b.source || a.position - b.position;
  });
  const chosen = [];
  const taken = {};
  let used = 0;
  const take = function (chunk, limit) {
    const key = chunk.source + ':' + chunk.position;
    if (taken[key] || used + chunk.text.length > limit) return;
    taken[key] = true;
    chosen.push(chunk);
    used += chunk.text.length;
  };
  const best = ranked.length ? ranked[0].score : 0;
  const matching = ranked.filter(function (chunk) { return chunk.score > 0 && chunk.score >= best * RETRIEVAL_MIN_RELATIVE_SCORE; });
  matching.forEach(function (chunk) { take(chunk, budget); });
  matching.slice(0, RETRIEVAL_CONTEXT_TOP).forEach(function (chunk) {
    chunks.forEach(function (other) {
      if (other.source === chunk.source && Math.abs(other.position - chunk.position) === 1) take(other, budget);
    });
  });
  if (!chosen.length) {
    const last = chunks.reduce(function (max, chunk) { return Math.max(max, chunk.position); }, 0);
    for (let position = 0; position <= last; position++) {
      chunks.forEach(function (chunk) { if (chunk.position === position) take(chunk, budget / 4); });
    }
  }
  return sources.map(function (source, sourceIndex) {
    return chosen
      .filter(function (chunk) { return chunk.source === sourceIndex; })
      .sort(function (a, b) { return a.position - b.position; })
      .map(function (chunk) { return chunk.text; });
  });
}
