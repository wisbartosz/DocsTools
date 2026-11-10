const FORMAT_IMPORT_KEYWORDS = new RegExp([
  'czcionk', 'font', 'margines', 'margin', 'interlini', 'line spacing', 'odst.p mi.dzy wierszami', 'wyjustow', 'justif',
  'wci.ci', 'indent', '\\bpkt\\b', '\\bpt\\b', 'nag..wek', 'heading', '\\bA4\\b',
  'struktur', 'uk.ad pracy', 's.owa kluczowe', 'keywords', 'spis tre', 'table of contents', 'obj.to', 'abstrakt',
  'abstract', 'streszczeni', 'cel pracy', 'numer(owa|acj)',
].join('|'), 'gi');
const FORMAT_IMPORT_WINDOW = 1000;
const FORMAT_IMPORT_MAX_CHARS = 60000;
const FORMAT_IMPORT_FIELDS = ['font', 'size', 'black', 'lineSpacing', 'alignment', 'indent', 'a4',
  'margins.top', 'margins.right', 'margins.bottom', 'margins.left',
  'heading1.size', 'heading1.bold', 'heading1.uppercase', 'heading2.size', 'heading2.bold',
  'captionSize', 'noHeadingPeriod', 'chapterNewPage',
  'structure.sectionsReview', 'structure.sectionsResearch', 'structure.toc', 'structure.numbering',
  'structure.keywordsMin', 'structure.keywordsMax', 'structure.abstractMin', 'structure.abstractMax',
  'structure.aimMin', 'structure.aimMax', 'structure.minPages'];
const FORMAT_IMPORT_MAX_NAME_WORDS = 6;
const FORMAT_IMPORT_MAX_NAMES = 4;
const FORMAT_IMPORT_LISTS ={ 'structure.sectionsReview': true, 'structure.sectionsResearch': true };

const FORMAT_IMPORT_PROMPT = [
  'You read excerpts from a university\'s thesis guidelines and extract the formatting and structure requirements',
  'for the thesis.',
  'Rules:',
  '1. Use only values stated explicitly in the excerpts. Leave a field null (or a list empty) when the excerpts do',
  '   not state it.',
  '2. The excerpts may come from several documents. They usually complement each other: combine them into one set',
  '   (for example one says "chapter titles 14 pt" and another "chapter titles bold": size 14 and bold).',
  '   Report a conflict only when two values cannot both be satisfied (for example 12 pt in one document and 13 pt',
  '   in another). For a conflict, put the first value in "rules" or "structure" and list every option in',
  '   "conflicts". Never report conflicts for the lists of parts.',
  '3. Units: font sizes in points, margins and the first-line indent in centimetres, line spacing as a multiple',
  '   (1.15, 1.5). "alignment" is "JUSTIFY" for justified text or "LEFT" for left-aligned text.',
  '4. heading1 = chapter titles, heading2 = section (subchapter) titles. "uppercase" only when chapter titles must',
  '   be written in capital letters. captionSize = font size of table and figure captions.',
  '5. "black" is true when the text must be black. "a4" is true when the paper size must be A4.',
  '   "noHeadingPeriod" is true when titles must not end with a full stop. "chapterNewPage" is true when every',
  '   chapter must start on a new page.',
  '6. "structure.sectionsReview" and "structure.sectionsResearch": the parts a literature-review thesis and',
  '   a research (empirical) thesis must contain, in the required order. List only parts that appear in the',
  '   thesis as a heading with a fixed title, such as an introduction, materials and methods, results,',
  '   discussion, conclusions, bibliography, list of abbreviations, abstract or annex.',
  '   - Leave out parts whose headings the author chooses: the literature review, the theoretical part, the main',
  '     or content chapters (they consist of several chapters with their own titles).',
  '   - Leave out the title page, the table of contents and parts required only in some cases ("if applicable",',
  '     "if there are tables").',
  '   - Each part has "names": short heading titles (at most 5 words), never a description of the content. Write',
  '     them as headings, in the nominative case and in the documents\' language (for example "Bibliografia",',
  '     not the form used inside a sentence of the guidelines). Put the most common name first, then at most three',
  '     alternative names the documents use for the same part.',
  '   - When the documents list the parts differently, combine them into one list in a sensible order.',
  '   Only real requirements count: a typical value ("usually 150-600 words") is not a requirement.',
  '7. "structure.toc" is true when an automatic table of contents is required. "structure.numbering" is true when',
  '   chapters and sections must be numbered (1, 1.1). keywordsMin/keywordsMax: the allowed number of keywords.',
  '   abstractMin/abstractMax and aimMin/aimMax: the allowed length in words of the abstract and of the aim of',
  '   the thesis (only when given in words). minPages: the minimum number of pages of the thesis.',
  '8. For every value you fill in, add an "evidence" item: the field name, the exact source file name from the',
  '   header and a short verbatim quote (at most 20 words).',
  '9. Field names in "conflicts" and "evidence" use dots for nested fields: ' + FORMAT_IMPORT_FIELDS.join(', ') + '.',
].join('\n');

const FORMAT_IMPORT_SCHEMA = (function () {
  const num = { type: 'NUMBER', nullable: true };
  const bool = { type: 'BOOLEAN', nullable: true };
  const parts = {
    type: 'ARRAY',
    items: { type: 'OBJECT', properties: { names: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['names'] },
  };
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
      structure: {
        type: 'OBJECT',
        properties: {
          sectionsReview: parts,
          sectionsResearch: parts,
          toc: bool,
          numbering: bool,
          keywordsMin: num,
          keywordsMax: num,
          abstractMin: num,
          abstractMax: num,
          aimMin: num,
          aimMax: num,
          minPages: num,
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
    required: ['rules', 'structure', 'conflicts', 'evidence'],
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
  const rules = importedRules_(parsed.rules || {});
  const structure = importedStructure_(parsed.structure || {});
  return {
    model: result.model,
    rules: rules,
    structure: structure,
    found: rules.found.length + structure.found.length,
    conflicts: (parsed.conflicts || []).filter(function (c) {
      return known(c) && !FORMAT_IMPORT_LISTS[c.field] && c.options && c.options.length > 1;
    }),
    evidence: (parsed.evidence || []).filter(known),
  };
}

function importedRules_(raw) {
  const rules = normalizeFormatRules_(raw);
  const margins = raw.margins || {};
  const heading1 = raw.heading1 || {};
  const heading2 = raw.heading2 || {};
  rules.found = FORMAT_IMPORT_FIELDS.filter(function (field) {
    if (field.indexOf('structure.') === 0) return false;
    const value = field.indexOf('.') < 0 ? raw[field]
      : ({ margins: margins, heading1: heading1, heading2: heading2 })[field.split('.')[0]][field.split('.')[1]];
    return value !== null && value !== undefined && value !== '';
  });
  return rules;
}

function importedStructure_(raw) {
  const sectionsText = function (parts) {
    return (parts || []).map(function (part) {
      return (part.names || [])
        .map(function (name) { return String(name).replace(/\s+/g, ' ').trim(); })
        .filter(function (name) { return name && name.split(' ').length <= FORMAT_IMPORT_MAX_NAME_WORDS; })
        .slice(0, FORMAT_IMPORT_MAX_NAMES)
        .join(' / ');
    }).filter(function (line) { return line; }).join('\n');
  };
  const normalized = normalizeStructureRules_(raw);
  const structure = {
    sections: { review: sectionsText(raw.sectionsReview), research: sectionsText(raw.sectionsResearch) },
    toc: typeof raw.toc === 'boolean' ? raw.toc : null,
    numbering: typeof raw.numbering === 'boolean' ? raw.numbering : null,
  };
  ['keywordsMin', 'keywordsMax', 'abstractMin', 'abstractMax', 'aimMin', 'aimMax', 'minPages'].forEach(function (key) {
    structure[key] = normalized[key];
  });
  structure.found = FORMAT_IMPORT_FIELDS.filter(function (field) {
    if (field.indexOf('structure.') !== 0) return false;
    const key = field.slice('structure.'.length);
    if (key === 'sectionsReview') return !!structure.sections.review;
    if (key === 'sectionsResearch') return !!structure.sections.research;
    return structure[key] !== null && structure[key] !== undefined;
  });
  return structure;
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
