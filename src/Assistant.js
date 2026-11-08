const ASSISTANT_EXCLUDED_PROP = 'assistantExcludedSources';
const ASSISTANT_WARN_CHARS = 400000;
const ASSISTANT_HISTORY_TURNS = 4;
const ASSISTANT_WINDOW = { width: 900, height: 680 };

const ASSISTANT_SYSTEM_PROMPT = [
  'You are a research assistant helping a student who is writing a thesis.',
  'You receive the full texts of the student\'s sources. Each source starts with a header line',
  '"=== SOURCE: <file name> ===" followed by a note saying whether the text contains page markers.',
  'A page marker looks like [[str. 12]] and means that the text after it is on page 12.',
  '',
  'Rules:',
  '1. Answer ONLY with information found in the provided sources. Never use outside knowledge.',
  '2. If the sources do not contain the answer, set "found" to false and say plainly in "answer"',
  '   that the selected sources do not cover it. You may mention related topics they do cover.',
  '3. Support every statement with a citation. In "answer" refer to citations as [1], [2], ...',
  '   where [n] means the n-th element of "citations".',
  '4. For each citation: "source" is the exact file name from the header; "quote" is a short',
  '   verbatim excerpt (at most about 30 words) copied exactly from the source text, without page',
  '   markers and without correcting typos or OCR errors; "location" is, for sources without page',
  '   markers, the nearest section, paragraph or heading (for example "§ 5" or "Chapter 2"),',
  '   otherwise null.',
  '5. Never write, rewrite or continue any part of the student\'s thesis (introductions, chapters,',
  '   paragraphs or summaries meant to be pasted into it). If asked to, politely decline in',
  '   "answer" and instead explain what the sources say on the topic, with citations.',
  '6. The request may include the earlier part of this conversation. The new question can refer',
  '   to it ("and what about margins?"), but every statement still has to come from the sources.',
  '7. Answer in the same language as the question. Plain text, no Markdown. Be concise.',
  '   Use short paragraphs separated by a blank line. When you list several points, put each',
  '   point on its own line, starting with "1.", "2.", ... or "- ".',
].join('\n');

const ASSISTANT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    found: { type: 'BOOLEAN' },
    answer: { type: 'STRING' },
    citations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          source: { type: 'STRING' },
          quote: { type: 'STRING' },
          location: { type: 'STRING', nullable: true },
        },
        required: ['source', 'quote'],
      },
    },
  },
  required: ['found', 'answer', 'citations'],
};

function getAssistantSources() {
  const excluded = readExcludedSources_();
  return {
    warnChars: ASSISTANT_WARN_CHARS,
    sources: getReadySources_().map(function (s) {
      return { id: s.id, name: s.name, chars: s.chars, pages: s.pages, selected: excluded.indexOf(s.id) < 0 };
    }),
  };
}

function saveAssistantSelection(excludedIds) {
  docProps_().setProperty(ASSISTANT_EXCLUDED_PROP, JSON.stringify(excludedIds || []));
}

function readExcludedSources_() {
  try {
    return JSON.parse(docProps_().getProperty(ASSISTANT_EXCLUDED_PROP) || '[]');
  } catch (e) {
    console.warn('Niepoprawny zapis wyboru źródeł asystenta: ' + e.message);
    return [];
  }
}

function showAssistantWindow() {
  const template = HtmlService.createTemplateFromFile('Sidebar');
  template.mode = 'window';
  const html = template.evaluate().setWidth(ASSISTANT_WINDOW.width).setHeight(ASSISTANT_WINDOW.height);
  DocumentApp.getUi().showModelessDialog(html, APP_NAME);
}

function askAssistant(question, sourceIds, history) {
  const text = String(question || '').trim();
  if (!text) throw userError_('assistant.err.emptyQuestion');
  const wanted = {};
  (sourceIds || []).forEach(function (id) { wanted[id] = true; });
  const sources = getReadySources_().filter(function (s) { return wanted[s.id]; });
  if (!sources.length) throw userError_('assistant.err.noSources');
  sources.forEach(function (s) { s.text = storeReadText_(s.textFileId); });

  const parts = [{ text: buildSourcesBlock_(sources) }];
  const earlier = buildHistoryBlock_(history);
  if (earlier) parts.push({ text: earlier });
  parts.push({ text: 'QUESTION:\n' + text });

  const result = geminiGenerate_({
    systemInstruction: { parts: [{ text: ASSISTANT_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: ASSISTANT_RESPONSE_SCHEMA,
    },
  }, { feature: 'assistant' });

  let parsed;
  try {
    parsed = JSON.parse(result.text);
  } catch (e) {
    console.warn('Odpowiedź asystenta nie jest poprawnym JSON: ' + e.message);
    return { model: result.model, raw: result.text };
  }
  return {
    model: result.model,
    found: parsed.found !== false,
    answer: String(parsed.answer || ''),
    citations: (parsed.citations || []).map(function (c) { return resolveCitation_(c, sources); }),
  };
}

function buildHistoryBlock_(history) {
  const turns = (history || [])
    .filter(function (turn) { return turn && turn.question && turn.answer; })
    .slice(-ASSISTANT_HISTORY_TURNS);
  if (!turns.length) return '';
  return 'CONVERSATION SO FAR:\n' + turns.map(function (turn) {
    return 'Q: ' + String(turn.question).trim() + '\nA: ' + String(turn.answer).trim();
  }).join('\n\n');
}

function buildSourcesBlock_(sources) {
  return sources.map(function (s) {
    const note = s.pages ? 'This text contains page markers.' : 'This text has no page markers.';
    return '=== SOURCE: ' + s.name + ' ===\n' + note + '\n\n' + s.text;
  }).join('\n\n');
}

function resolveCitation_(citation, sources) {
  const name = String(citation.source || '').trim();
  const source = sources.filter(function (s) { return s.name === name; })[0] ||
    sources.filter(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })[0] || null;
  const quote = String(citation.quote || '').trim();
  if (source && !source.wordIndex) source.wordIndex = indexSourceWords_(source.text);
  const match = source ? locateQuote_(source.wordIndex, quote) : { status: 'missing', page: null };
  return {
    sourceName: source ? source.name : name,
    sourceUrl: source ? source.url : null,
    known: !!source,
    page: match.page,
    location: match.page ? null : (citation.location || null),
    quote: quote,
    quoteStatus: match.status,
  };
}
