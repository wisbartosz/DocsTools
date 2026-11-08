const TEXT_PIPELINE_VERSION = 2;
const FOOTER_MAX_LINE_LENGTH = 120;
const FOOTER_SEED_MIN = 3;
const FOOTER_MIN_PAGES = 5;
const FOOTER_SIMILARITY = 0.6;
const FOOTER_EVEN_SHARE = 0.7;
const FOOTER_MAX_EXTRA_LINES = 2;
const FOOTER_MIN_PAGE_CHARS = 400;

function pageMarker_(page) {
  return '[[str. ' + page + ']]';
}

function cleanSourceText_(raw) {
  let text = String(raw || '').replace(/\r\n?/g, '\n').normalize('NFC');
  text = text.replace(/[ \t ]+/g, ' ').replace(/^ +| +$/gm, '');
  text = removeDocsComments_(text);
  const paged = markPages_(text);
  text = collapseFieldLeaders_(paged.text);
  text = splitWordYear_(text);
  text = text.replace(/ {2,}/g, ' ').replace(/ +$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return { text: text, pages: paged.pages };
}

function removeDocsComments_(text) {
  const anchor = /([^\s[])\[([a-z]{1,3})\]/g;
  const labels = {};
  text.replace(anchor, function (match, before, label) {
    labels[label] = true;
    return match;
  });
  if (!Object.keys(labels).length) return text;
  return text
    .split('\n')
    .filter(function (line) {
      const comment = line.match(/^\[([a-z]{1,3})\]/);
      return !(comment && labels[comment[1]]);
    })
    .join('\n')
    .replace(anchor, '$1');
}

function footerTokens_(line) {
  if (!line || line.length > FOOTER_MAX_LINE_LENGTH) return [];
  return line
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, ' ')
    .split(' ')
    .filter(function (token) { return token.length > 3; });
}

function tokenSimilarity_(a, b) {
  if (!a.length || !b.length) return 0;
  const inB = {};
  b.forEach(function (t) { inB[t] = true; });
  const union = {};
  a.concat(b).forEach(function (t) { union[t] = true; });
  const common = a.filter(function (t, i) { return inB[t] && a.indexOf(t) === i; }).length;
  return common / Object.keys(union).length;
}

function footerSeed_(lines) {
  const counts = {};
  lines.forEach(function (line) {
    const tokens = footerTokens_(line);
    if (tokens.length < 2) return;
    const key = tokens.join(' ');
    counts[key] = (counts[key] || 0) + 1;
  });
  const best = Object.keys(counts).sort(function (a, b) {
    return counts[b] - counts[a] || b.split(' ').length - a.split(' ').length;
  })[0];
  return best && counts[best] >= FOOTER_SEED_MIN ? best.split(' ') : null;
}

function nextNonEmpty_(lines, from) {
  for (let j = from + 1; j < lines.length; j++) if (lines[j]) return j;
  return -1;
}

function matchFooterAt_(lines, i, seed) {
  const own = footerTokens_(lines[i]);
  if (tokenSimilarity_(own, seed) === 0) return -1;
  let joined = lines[i];
  let j = i;
  let end = tokenSimilarity_(own, seed) >= FOOTER_SIMILARITY ? i : -1;
  for (let extra = 0; extra < FOOTER_MAX_EXTRA_LINES; extra++) {
    j = nextNonEmpty_(lines, j);
    if (j < 0 || lines[j].length > FOOTER_MAX_LINE_LENGTH) break;
    if (end >= 0 && !isFooterRemnant_(lines[j], seed)) break;
    joined += ' ' + lines[j];
    if (tokenSimilarity_(footerTokens_(joined), seed) >= FOOTER_SIMILARITY) end = j;
  }
  return end;
}

function isFooterRemnant_(line, seed) {
  const tokens = footerTokens_(line);
  if (!tokens.length) return line.length <= 6;
  return tokens.every(function (t) { return seed.indexOf(t) >= 0; });
}

function findFooters_(lines) {
  const seed = footerSeed_(lines);
  if (!seed) return null;
  const hits = [];
  let offset = 0;
  let contentSinceLast = false;
  const lineOffsets = [];
  lines.forEach(function (line) { lineOffsets.push(offset); offset += line.length + 1; });
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    const end = contentSinceLast ? matchFooterAt_(lines, i, seed) : -1;
    if (end >= 0) {
      const number = lines.slice(i, end + 1).join(' ').match(/(?:^|\D)(\d{1,4})(?!\d)/);
      hits.push({ start: i, end: end, at: lineOffsets[i], number: number ? +number[1] : null });
      contentSinceLast = false;
      i = end;
      continue;
    }
    contentSinceLast = true;
  }
  if (!footersLookLikePages_(hits, offset)) return null;
  const shift = pageNumberShift_(hits);
  return hits
    .map(function (hit, k) { return Object.assign(hit, { page: k + 1 + shift }); })
    .filter(function (hit) { return hit.page >= 1; });
}

function footersLookLikePages_(hits, totalLength) {
  if (hits.length < FOOTER_MIN_PAGES) return false;
  if (hits[hits.length - 1].at - hits[0].at < totalLength / 2) return false;
  const gaps = [];
  for (let k = 1; k < hits.length; k++) gaps.push(hits[k].at - hits[k - 1].at);
  const median = gaps.slice().sort(function (a, b) { return a - b; })[Math.floor(gaps.length / 2)];
  if (median < FOOTER_MIN_PAGE_CHARS) return false;
  const even = gaps.filter(function (g) { return g >= median / 4 && g <= median * 3; }).length;
  return even >= gaps.length * FOOTER_EVEN_SHARE;
}

function pageNumberShift_(hits) {
  const votes = {};
  let numbered = 0;
  hits.forEach(function (hit, k) {
    if (hit.number === null) return;
    numbered++;
    const shift = hit.number - (k + 1);
    votes[shift] = (votes[shift] || 0) + 1;
  });
  const best = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; })[0];
  return best !== undefined && votes[best] >= Math.max(2, numbered / 2) ? +best : 0;
}

function markPages_(text) {
  const lines = text.split('\n');
  const hits = findFooters_(lines);
  if (!hits || !hits.length) return { text: text, pages: null };
  const byStart = {};
  hits.forEach(function (hit) { byStart[hit.start] = hit; });
  const out = [pageMarker_(hits[0].page)];
  let lastPage = hits[0].page;
  let pendingPage = null;
  let lastContent = 0;
  for (let i = 0; i < lines.length; i++) {
    const hit = byStart[i];
    if (hit) {
      pendingPage = hit.page + 1;
      i = hit.end;
      continue;
    }
    const line = lines[i];
    if (pendingPage !== null && line) {
      const marker = pageMarker_(pendingPage);
      lastPage = pendingPage;
      pendingPage = null;
      const previous = out[lastContent];
      const continues = lastContent > 0 && !/[.!?:;…"”)\]]$/.test(previous) && /^\p{Ll}/u.test(line);
      if (continues) {
        out[lastContent] = previous + ' ' + marker + ' ' + line;
        continue;
      }
      out.push(marker);
    }
    out.push(line);
    if (line) lastContent = out.length - 1;
  }
  return { text: out.join('\n'), pages: lastPage };
}

function collapseFieldLeaders_(text) {
  return text
    .replace(/(?:\. ?){4,}/g, '… ')
    .replace(/_{4,}/g, '___')
    .replace(/…(?:\s*…)+/g, '…');
}

function splitWordYear_(text) {
  return text.replace(/(?<![\p{L}\p{N}./])(\p{Lu}\p{Ll}+)((?:1[5-9]|20)\d{2})\b/gu, '$1 $2');
}
