const FORMAT_IMPORT_KEYWORDS = /czcionk|font|margines|margin|interlini|line spacing|odst.p mi.dzy wierszami|wyjustow|justif|wci.ci|indent|\bpkt\b|\bpt\b|nag..wek|heading|\bA4\b/gi;
const FORMAT_IMPORT_WINDOW = 1000;
const FORMAT_IMPORT_MAX_CHARS = 60000;
const FORMAT_IMPORT_FIELDS = ['font', 'size', 'black', 'lineSpacing', 'alignment', 'indent', 'a4',
  'margins.top', 'margins.right', 'margins.bottom', 'margins.left',
  'heading1.size', 'heading1.bold', 'heading1.uppercase', 'heading2.size', 'heading2.bold',
  'captionSize', 'noHeadingPeriod', 'chapterNewPage'];

const FORMAT_IMPORT_PROMPT = [
  'You read excerpts from a university\'s thesis guidelines and extract the formatting requirements for the thesis.',
  'Rules:',
  '1. Use only values stated explicitly in the excerpts. Leave a field null when the excerpts do not state it.',
  '2. The excerpts may come from several documents. They usually complement each other: combine them into one set',
  '   (for example one says "chapter titles 14 pt" and another "chapter titles bold": size 14 and bold).',
  '   Report a conflict only when two values cannot both be satisfied (for example 12 pt in one document and 13 pt',
  '   in another). For a conflict, put the first value in "rules" and list every option in "conflicts".',
  '3. Units: font sizes in points, margins and the first-line indent in centimetres, line spacing as a multiple',
  '   (1.15, 1.5). "alignment" is "JUSTIFY" for justified text or "LEFT" for left-aligned text.',
  '4. heading1 = chapter titles, heading2 = section (subchapter) titles. "uppercase" only when chapter titles must',
  '   be written in capital letters. captionSize = font size of table and figure captions.',
  '5. "black" is true when the text must be black. "a4" is true when the paper size must be A4.',
  '   "noHeadingPeriod" is true when titles must not end with a full stop. "chapterNewPage" is true when every',
  '   chapter must start on a new page.',
  '6. For every value you fill in, add an "evidence" item: the field name, the exact source file name from the',
  '   header and a short verbatim quote (at most 20 words).',
  '7. Field names in "conflicts" and "evidence" use dots for nested fields: ' + FORMAT_IMPORT_FIELDS.join(', ') + '.',
].join('\n');

const FORMAT_IMPORT_SCHEMA = (function () {
  const num = { type: 'NUMBER', nullable: true };
  const bool = { type: 'BOOLEAN', nullable: true };
  const quoteItem = {
    type: 'OBJECT',
    properties: { field: { type: 'STRING' }, source: { type: 'STRING' }, quote: { type: 'STRING' } },
    required: ['field', 'source', 'quote'],
  };
  return {
    type: 'OBJECT',
    properties: {
      rules: {
        type: 'OBJECT',
        properties: {
          font: { type: 'STRING', nullable: true },
          size: num,
          black: bool,
          lineSpacing: num,
          alignment: { type: 'STRING', nullable: true, enum: ['JUSTIFY', 'LEFT'] },
          indent: num,
          a4: bool,
          margins: { type: 'OBJECT', properties: { top: num, right: num, bottom: num, left: num } },
          heading1: { type: 'OBJECT', properties: { size: num, bold: bool, uppercase: bool } },
          heading2: { type: 'OBJECT', properties: { size: num, bold: bool } },
          captionSize: num,
          noHeadingPeriod: bool,
          chapterNewPage: bool,
        },
      },
      conflicts: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            field: { type: 'STRING' },
            options: {
              type: 'ARRAY',
              items: { type: 'OBJECT', properties: { value: { type: 'STRING' }, source: { type: 'STRING' } }, required: ['value', 'source'] },
            },
          },
          required: ['field', 'options'],
        },
      },
      evidence: { type: 'ARRAY', items: quoteItem },
    },
    required: ['rules', 'conflicts', 'evidence'],
  };
})();

function importFormatRules() {
  const sources = getReadySources_();
  if (!sources.length) throw userError_('format.err.noSourcesForRules');
  const blocks = [];
  let total = 0;
  sources.forEach(function (source) {
    if (total >= FORMAT_IMPORT_MAX_CHARS) return;
    const excerpts = formatExcerpts_(storeReadText_(source.textFileId), FORMAT_IMPORT_WINDOW);
    if (!excerpts.length) return;
    const block = '=== SOURCE: ' + source.name + ' ===\n' + excerpts.join('\n[...]\n');
    blocks.push(block.slice(0, FORMAT_IMPORT_MAX_CHARS - total));
    total += block.length;
  });
  if (!blocks.length) throw userError_('format.err.noRulesInSources');

  const result = geminiGenerate_({
    systemInstruction: { parts: [{ text: FORMAT_IMPORT_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: blocks.join('\n\n') }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: FORMAT_IMPORT_SCHEMA },
  }, { feature: 'formatRules' });

  let parsed;
  try {
    parsed = JSON.parse(result.text);
  } catch (e) {
    console.warn('Odpowiedz Gemini z wymaganiami nie jest JSON: ' + e.message);
    throw userError_('format.err.importFailed');
  }
  const known = function (item) { return item && FORMAT_IMPORT_FIELDS.indexOf(item.field) >= 0; };
  return {
    model: result.model,
    rules: importedRules_(parsed.rules || {}),
    conflicts: (parsed.conflicts || []).filter(function (c) { return known(c) && c.options && c.options.length > 1; }),
    evidence: (parsed.evidence || []).filter(known),
  };
}

function importedRules_(raw) {
  const rules = normalizeFormatRules_(raw);
  const margins = raw.margins || {};
  const heading1 = raw.heading1 || {};
  const heading2 = raw.heading2 || {};
  rules.found = FORMAT_IMPORT_FIELDS.filter(function (field) {
    const value = field.indexOf('.') < 0 ? raw[field]
      : ({ margins: margins, heading1: heading1, heading2: heading2 })[field.split('.')[0]][field.split('.')[1]];
    return value !== null && value !== undefined && value !== '';
  });
  return rules;
}

function formatExcerpts_(text, window) {
  const ranges = [];
  let match;
  FORMAT_IMPORT_KEYWORDS.lastIndex = 0;
  while ((match = FORMAT_IMPORT_KEYWORDS.exec(text)) !== null) {
    const start = Math.max(0, match.index - window);
    const end = Math.min(text.length, match.index + match[0].length + window);
    const last = ranges[ranges.length - 1];
    if (last && start <= last.end) last.end = Math.max(last.end, end);
    else ranges.push({ start: start, end: end });
  }
  return ranges.map(function (range) { return text.slice(range.start, range.end).trim(); });
}
