const PREVIEW_CONTEXT_CHARS = 4000;
const PREVIEW_MAX_CITATIONS = 30;
const PREVIEW_MAX_QUOTE_CHARS = 2000;

function openSourcePreview(state) {
  const citations = ((state && state.citations) || [])
    .filter(function (c) { return c && c.sourceId; })
    .slice(0, PREVIEW_MAX_CITATIONS)
    .map(previewCitation_);
  if (!citations.length) throw userError_('preview.err.source');
  const index = Math.min(Math.max(Number(state.index) || 0, 0), citations.length - 1);
  const template = HtmlService.createTemplateFromFile('PreviewPage');
  template.state = scriptJson_({ citations: citations, index: index, kind: state.kind === 'search' ? 'search' : 'answer' });
  const html = template.evaluate().setWidth(ASSISTANT_WINDOW.width).setHeight(ASSISTANT_WINDOW.height);
  DocumentApp.getUi().showModelessDialog(html, t_('preview.title'));
}

function previewCitation_(c) {
  return {
    number: Number(c.number) || null,
    sourceId: String(c.sourceId),
    sourceName: String(c.sourceName || ''),
    quote: String(c.quote || '').slice(0, PREVIEW_MAX_QUOTE_CHARS),
    page: Number(c.page) || null,
  };
}

function scriptJson_(value) {
  return JSON.stringify(value).replace(/[<\u2028\u2029]/g, function (ch) {
    return '\\u' + ('000' + ch.charCodeAt(0).toString(16)).slice(-4);
  });
}

function previewSource(sourceId, quote, asText) {
  const source = getReadySources_().filter(function (s) { return s.id === sourceId; })[0];
  if (!source) throw userError_('preview.err.source');
  const result = { name: source.name, url: source.url };
  if (!asText && DriveApp.getFileById(source.id).getMimeType() === MimeType.PDF) {
    result.kind = 'pdf';
    result.fileId = source.id;
    result.token = ScriptApp.getOAuthToken();
    return result;
  }
  result.kind = 'text';
  result.excerpt = previewExcerpt_(storeReadText_(source.textFileId), quote);
  return result;
}

function previewExcerpt_(text, quote) {
  const source = String(text || '').normalize('NFC');
  const match = locateQuote_(indexSourceWords_(source), quote);
  const found = match.status !== 'missing';
  let from = found ? Math.max(0, match.start - PREVIEW_CONTEXT_CHARS) : 0;
  let to = Math.min(source.length, (found ? match.end : 0) + PREVIEW_CONTEXT_CHARS);
  if (from > 0) from = source.lastIndexOf('\n', from) + 1;
  if (to < source.length) {
    const end = source.indexOf('\n', to);
    to = end < 0 ? source.length : end;
  }
  return {
    text: source.slice(from, to),
    mark: found ? { start: match.start - from, end: match.end - from } : null,
    before: from > 0,
    after: to < source.length,
  };
}
