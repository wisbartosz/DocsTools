const QUOTE_CLOSE_RATIO = 0.8;
const QUOTE_WINDOW_SLACK = 1.4;
const QUOTE_MIN_SEGMENT_WORDS = 3;

function indexSourceWords_(text) {
  const source = String(text || '').normalize('NFC');
  const markers = [];
  const markerRe = /\[\[str\. (\d+)\]\]/g;
  let m;
  while ((m = markerRe.exec(source)) !== null) markers.push({ start: m.index, end: m.index + m[0].length, page: +m[1] });
  const words = [];
  const wordRe = /[\p{L}\p{N}]+/gu;
  let markerIndex = 0;
  while ((m = wordRe.exec(source)) !== null) {
    while (markerIndex < markers.length && markers[markerIndex].end <= m.index) markerIndex++;
    const insideMarker = markerIndex < markers.length && m.index >= markers[markerIndex].start;
    if (!insideMarker) words.push({ word: m[0].toLowerCase(), pos: m.index });
  }
  return { words: words, markers: markers };
}

function quoteWords_(quote) {
  return (String(quote || '').normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
}

function pageAt_(markers, pos) {
  let page = null;
  for (let i = 0; i < markers.length && markers[i].start <= pos; i++) page = markers[i].page;
  return page;
}

function findExact_(words, target) {
  outer: for (let i = 0; i + target.length <= words.length; i++) {
    for (let j = 0; j < target.length; j++) if (words[i + j].word !== target[j]) continue outer;
    return i;
  }
  return -1;
}

function findClose_(words, target) {
  const window = Math.ceil(target.length * QUOTE_WINDOW_SLACK);
  const anchors = {};
  target.slice(0, 3).forEach(function (w) { anchors[w] = true; });
  let best = { index: -1, ratio: 0 };
  for (let i = 0; i < words.length; i++) {
    if (!anchors[words[i].word]) continue;
    const span = words.slice(i, i + window).map(function (w) { return w.word; });
    const ratio = commonSubsequence_(span, target) / target.length;
    if (ratio > best.ratio) best = { index: i, ratio: ratio };
  }
  return best.ratio >= QUOTE_CLOSE_RATIO ? best.index : -1;
}

function commonSubsequence_(a, b) {
  let previous = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const current = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      current[j] = a[i - 1] === b[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    }
    previous = current;
  }
  return previous[b.length];
}

function locateQuote_(sourceIndex, quote) {
  const segments = String(quote || '')
    .split(/…|\.\.\.|\[\.\.\.\]|\(\.\.\.\)/)
    .map(quoteWords_)
    .filter(function (words) { return words.length; });
  if (!segments.length) return { status: 'missing', page: null };
  let status = 'exact';
  let firstPos = null;
  for (let s = 0; s < segments.length; s++) {
    const target = segments[s];
    let index = findExact_(sourceIndex.words, target);
    if (index < 0) {
      index = target.length >= QUOTE_MIN_SEGMENT_WORDS ? findClose_(sourceIndex.words, target) : -1;
      if (index < 0) return { status: 'missing', page: null };
      status = 'close';
    }
    if (firstPos === null) firstPos = sourceIndex.words[index].pos;
  }
  return { status: status, page: pageAt_(sourceIndex.markers, firstPos) };
}
