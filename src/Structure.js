const STRUCTURE_RULES_PROP = 'structureRules';
const STRUCTURE_TYPE_PROP = 'structureType';
const STRUCTURE_TYPES = ['review', 'research'];
const STRUCTURE_KINDS = ['toc', 'hierarchy', 'numbering', 'missing', 'order', 'untagged', 'keywords', 'length', 'pages'];
const STRUCTURE_FIXABLE = { numbering: true, untagged: true };
const STRUCTURE_MAX_TITLE_CHARS = 80;
const STRUCTURE_NUMBER = /^(\s*)(\d+(?:\.\d+)*)(\.?)(\s+)/;
const STRUCTURE_KEYWORDS = /^\s*(s.owa kluczowe|keywords|key words)\s*[:\-–]\s*(.*)$/i;

function normalizeTitle_(text) {
  return String(text || '')
    .replace(/^\s*(\d+(?:\.\d+)*\.?|[IVXLC]+\.)\s+/, '')
    .replace(/[\s.:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseSections_(text) {
  return String(text || '').split('\n')
    .map(function (line) {
      return line.split('/').map(normalizeTitle_).filter(function (name) { return name; });
    })
    .filter(function (names) { return names.length; });
}

function matchesSection_(title, names) {
  const normalized = normalizeTitle_(title);
  return names.some(function (name) {
    return normalized === name || normalized.indexOf(name + ' ') === 0 || normalized.indexOf(name + ':') === 0;
  });
}

function headingNumber_(text) {
  const match = STRUCTURE_NUMBER.exec(text);
  if (!match) return null;
  return {
    start: match[1].length,
    text: match[2] + match[3],
    parts: match[2].split('.').map(Number),
    period: match[3] === '.',
  };
}

function numberingIssues_(headings) {
  const issues = [];
  const numbered = headings.filter(function (h) { return h.level <= 2 && !h.isList && headingNumber_(h.text); });
  const periodStyle = {};
  [1, 2].forEach(function (level) {
    const ofLevel = numbered.filter(function (h) { return h.level === level; });
    const withPeriod = ofLevel.filter(function (h) { return headingNumber_(h.text).period; }).length;
    periodStyle[level] = withPeriod * 2 >= ofLevel.length;
  });
  let chapter = 0;
  let section = 0;
  let parentNumbered = false;
  headings.forEach(function (heading, index) {
    if (heading.isList || heading.level > 2) return;
    const number = headingNumber_(heading.text);
    if (heading.level === 1) {
      parentNumbered = !!number;
      section = 0;
      if (!number) return;
      chapter++;
      const expected = chapter + (periodStyle[1] ? '.' : '');
      if (number.text !== expected) issues.push({ index: index, actual: number.text, expected: expected });
      return;
    }
    if (!number) return;
    if (!parentNumbered) return;
    section++;
    const expectedSection = chapter + '.' + section + (periodStyle[2] ? '.' : '');
    if (number.text !== expectedSection) issues.push({ index: index, actual: number.text, expected: expectedSection });
  });
  const firstNumbered = headings.findIndex(function (h) { return h.level === 1 && headingNumber_(h.text); });
  let lastNumbered = -1;
  headings.forEach(function (h, i) { if (h.level === 1 && headingNumber_(h.text)) lastNumbered = i; });
  headings.forEach(function (heading, index) {
    if (heading.level === 1 && !heading.isList && !headingNumber_(heading.text) && index > firstNumbered && index < lastNumbered && firstNumbered >= 0) {
      issues.push({ index: index, actual: '', expected: null });
    }
  });
  return issues.sort(function (a, b) { return a.index - b.index; });
}

function hierarchyIssues_(headings) {
  const issues = [];
  let last = 0;
  headings.forEach(function (heading, index) {
    if (heading.level > last + 1) issues.push({ index: index, level: heading.level, parent: heading.level - 1 });
    last = heading.level;
  });
  return issues;
}

function tocDiff_(entries, headings) {
  const inText = {};
  headings.forEach(function (heading) { inText[normalizeTitle_(heading.text)] = true; });
  const tocTitle = function (entry) {
    const plain = normalizeTitle_(entry);
    if (inText[plain]) return plain;
    const withoutPage = normalizeTitle_(String(entry).replace(/\s*\d+\s*$/, ''));
    return inText[withoutPage] ? withoutPage : plain;
  };
  const inToc = {};
  entries.forEach(function (entry) { inToc[tocTitle(entry)] = true; });
  return {
    missing: headings.map(function (h, i) { return i; }).filter(function (i) { return !inToc[normalizeTitle_(headings[i].text)]; }),
    extra: entries.filter(function (entry) { return normalizeTitle_(entry) && !inText[tocTitle(entry)]; }),
  };
}

function countWords_(text) {
  return String(text || '').split(/\s+/).filter(function (word) { return /[0-9A-Za-zÀ-ɏ]/.test(word); }).length;
}

function parseKeywords_(text) {
  const match = STRUCTURE_KEYWORDS.exec(text);
  if (!match) return null;
  return match[2].split(/[,;]/).map(function (word) { return word.replace(/[.\s]+$/, '').trim(); }).filter(function (word) { return word; });
}

function pdfPageCount_(pdf) {
  const pages = pdf.match(/\/Type\s*\/Page\b(?!s)/g);
  if (pages) return pages.length;
  const trees = /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g;
  let max = null;
  let match;
  while ((match = trees.exec(pdf)) !== null) max = Math.max(max || 0, Number(match[1] || match[2]));
  return max;
}

function normalizeStructureRules_(input) {
  const source = input || {};
  const number = function (value) {
    const parsed = parseInt(String(value === undefined || value === null ? '' : value), 10);
    return isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  return {
    type: STRUCTURE_TYPES.indexOf(source.type) >= 0 ? source.type : 'review',
    sections: String(source.sections || '').slice(0, 3000),
    toc: !!source.toc,
    numbering: !!source.numbering,
    keywordsMin: number(source.keywordsMin),
    keywordsMax: number(source.keywordsMax),
    abstractMin: number(source.abstractMin),
    abstractMax: number(source.abstractMax),
    aimMin: number(source.aimMin),
    aimMax: number(source.aimMax),
    minPages: number(source.minPages),
  };
}

function getStructureRules() {
  const saved = readStructureRules_();
  return {
    rules: saved || defaultStructureRules_(savedStructureType_()),
    isDefault: !saved,
    sections: { review: t_('structure.default.review'), research: t_('structure.default.research') },
  };
}

function getDefaultStructureRules(type) {
  return defaultStructureRules_(type);
}

function currentStructureRules_(type) {
  return readStructureRules_() || defaultStructureRules_(type || savedStructureType_());
}

function savedStructureType_() {
  return docProps_().getProperty(STRUCTURE_TYPE_PROP) || 'review';
}

function defaultStructureRules_(type) {
  const kind = STRUCTURE_TYPES.indexOf(type) >= 0 ? type : 'review';
  return normalizeStructureRules_({
    type: kind,
    sections: t_('structure.default.' + kind),
    toc: true,
    numbering: true,
    keywordsMin: 3,
    keywordsMax: 5,
    aimMin: 100,
    aimMax: 200,
    minPages: 30,
  });
}

function saveStructureRules(input) {
  const rules = normalizeStructureRules_(input);
  const props = docProps_();
  props.setProperty(STRUCTURE_TYPE_PROP, rules.type);
  const isDefault = JSON.stringify(rules) === JSON.stringify(defaultStructureRules_(rules.type));
  if (isDefault) props.deleteProperty(STRUCTURE_RULES_PROP);
  else props.setProperty(STRUCTURE_RULES_PROP, JSON.stringify(rules));
  return { rules: rules, isDefault: isDefault };
}

function saveStructureType(type, sections) {
  const kind = STRUCTURE_TYPES.indexOf(type) >= 0 ? type : 'review';
  docProps_().setProperty(STRUCTURE_TYPE_PROP, kind);
  const saved = readStructureRules_();
  if (saved && saved.type !== kind) {
    if (typeof sections === 'string' && sections.trim()) saved.sections = sections;
    else if (saved.sections === defaultStructureRules_(saved.type).sections) saved.sections = defaultStructureRules_(kind).sections;
    saved.type = kind;
    saveStructureRules(saved);
  }
  return kind;
}

function readStructureRules_() {
  const raw = docProps_().getProperty(STRUCTURE_RULES_PROP);
  if (!raw) return null;
  try {
    return normalizeStructureRules_(JSON.parse(raw));
  } catch (e) {
    console.warn('Niepoprawny zapis wymagań struktury: ' + e.message);
    return null;
  }
}

function checkStructure(options) {
  const opts = options || {};
  const rules = currentStructureRules_(opts.type);
  const ctx = structureContext_();
  const groups = {};
  STRUCTURE_KINDS.forEach(function (kind) { groups[kind] = { kind: kind, count: 0, items: [] }; });
  const add = function (kind, item) {
    groups[kind].count++;
    groups[kind].items.push(item);
  };
  const headingItem = function (kind, heading, detail) {
    return {
      ref: { kind: kind, location: heading.entry.location, fingerprint: heading.text.slice(0, 40) },
      showable: true, fixable: !!STRUCTURE_FIXABLE[kind], preview: heading.text, detail: detail || '',
    };
  };
  const plainItem = function (kind, preview, detail) {
    return { ref: { kind: kind }, showable: false, fixable: false, preview: preview, detail: detail || '' };
  };

  if (rules.toc) {
    if (!ctx.toc) {
      add('toc', plainItem('toc', t_('structure.toc.none'), t_('structure.toc.noneHint')));
    } else {
      const diff = tocDiff_(ctx.tocEntries, ctx.headings);
      diff.missing.forEach(function (index) { add('toc', headingItem('toc', ctx.headings[index], t_('structure.toc.missing'))); });
      diff.extra.forEach(function (entry) {
        add('toc', { ref: { kind: 'toc', toc: true }, showable: true, fixable: false, preview: entry, detail: t_('structure.toc.extra') });
      });
    }
  }

  hierarchyIssues_(ctx.headings).forEach(function (issue) {
    add('hierarchy', headingItem('hierarchy', ctx.headings[issue.index], t_('structure.hierarchy.detail', { level: issue.level, parent: issue.parent })));
  });

  if (rules.numbering) {
    numberingIssues_(ctx.headings).forEach(function (issue) {
      const heading = ctx.headings[issue.index];
      const detail = issue.expected === null ? t_('structure.numbering.unnumbered')
        : change_(issue.actual, issue.expected);
      const item = headingItem('numbering', heading, detail);
      item.fixable = issue.expected !== null;
      add('numbering', item);
    });
  }

  const required = parseSections_(rules.sections);
  let lastPosition = -1;
  let lastName = '';
  required.forEach(function (names) {
    const position = ctx.headings.findIndex(function (h) { return matchesSection_(h.text, names); });
    const label = names[0].charAt(0).toUpperCase() + names[0].slice(1);
    if (position < 0) {
      const untagged = ctx.paragraphs.filter(function (entry) {
        return entry.heading === 'NORMAL' && entry.text.trim().length <= STRUCTURE_MAX_TITLE_CHARS && matchesSection_(entry.text, names);
      })[0];
      if (untagged) {
        add('untagged', {
          ref: { kind: 'untagged', location: untagged.location, fingerprint: untagged.text.slice(0, 40) },
          showable: true, fixable: true, preview: untagged.text, detail: t_('structure.untagged.detail'),
        });
      } else {
        add('missing', plainItem('missing', label, ''));
      }
      return;
    }
    if (position < lastPosition) {
      add('order', headingItem('order', ctx.headings[position], t_('structure.order.detail', { name: lastName })));
    } else {
      lastPosition = position;
      lastName = ctx.headings[position].text;
    }
  });

  ctx.paragraphs.forEach(function (entry) {
    const words = parseKeywords_(entry.text);
    if (!words) return;
    if ((rules.keywordsMin && words.length < rules.keywordsMin) || (rules.keywordsMax && words.length > rules.keywordsMax)) {
      add('keywords', {
        ref: { kind: 'keywords', location: entry.location, fingerprint: entry.text.slice(0, 40) },
        showable: true, fixable: false, preview: entry.text,
        detail: t_('structure.range', { count: words.length, min: rules.keywordsMin || 0, max: rules.keywordsMax || '∞' }),
      });
    }
  });

  [['abstract', rules.abstractMin, rules.abstractMax], ['aim', rules.aimMin, rules.aimMax]].forEach(function (spec) {
    if (!spec[1] && !spec[2]) return;
    const names = parseSections_(t_('structure.names.' + spec[0]))[0];
    ctx.headings.forEach(function (heading, index) {
      if (!matchesSection_(heading.text, names)) return;
      const words = sectionWords_(ctx, index);
      if ((spec[1] && words < spec[1]) || (spec[2] && words > spec[2])) {
        add('length', headingItem('length', heading, t_('structure.words', { count: words, min: spec[1] || 0, max: spec[2] || '∞' })));
      }
    });
  });

  let pages = null;
  let pagesApprox = false;
  if (rules.minPages && opts.pages !== false) {
    const counted = documentPages_(rules.minPages);
    if (counted) {
      pages = counted.count;
      pagesApprox = counted.approx;
    }
    if (pages !== null && pages < rules.minPages) {
      add('pages', plainItem('pages', t_(pagesApprox ? 'structure.pages.detailApprox' : 'structure.pages.detail', { count: pages, min: rules.minPages }), ''));
    }
  }

  return { pages: pages, pagesApprox: pagesApprox, groups: STRUCTURE_KINDS.map(function (kind) { return groups[kind]; }) };
}

function showStructureIssue(ref) {
  const doc = DocumentApp.getActiveDocument();
  let element = null;
  if (ref.toc) {
    const found = doc.getBody().findElement(DocumentApp.ElementType.TABLE_OF_CONTENTS);
    element = found ? found.getElement() : null;
  } else if (ref.location) {
    const resolved = resolveElementPath_(ref.location);
    element = resolved && !resolved.isText ? resolved.element : null;
  }
  if (!element) throw userError_('format.err.changed');
  doc.setSelection(doc.newRange().addElement(element).build());
}

function fixStructureIssue(ref, type) {
  applyStructureFix_(ref.kind, ref);
  return checkStructure({ type: type, pages: false });
}

function fixStructureKind(kind, type) {
  if (!STRUCTURE_FIXABLE[kind]) throw userError_('format.err.changed');
  const result = checkStructure({ type: type, pages: false });
  const group = result.groups.filter(function (g) { return g.kind === kind; })[0];
  const refs = group.items.filter(function (item) { return item.fixable; }).map(function (item) { return item.ref; });
  refs.slice().reverse().forEach(function (ref) { applyStructureFix_(kind, ref); });
  return { fixed: refs.length, result: checkStructure({ type: type, pages: false }) };
}

function applyStructureFix_(kind, ref) {
  const resolved = resolveElementPath_(ref.location);
  if (!resolved || resolved.isText || resolved.element.getText().slice(0, 40) !== ref.fingerprint) {
    throw userError_('format.err.changed');
  }
  const element = resolved.element;
  if (kind === 'untagged') {
    element.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    return;
  }
  if (kind === 'numbering') {
    const ctx = structureContext_();
    const index = ctx.headings.findIndex(function (h) { return h.entry.key === locationKey_(ref.location); });
    const issue = numberingIssues_(ctx.headings).filter(function (i) { return i.index === index && i.expected !== null; })[0];
    if (!issue) throw userError_('format.err.changed');
    const number = headingNumber_(element.getText());
    applyDocumentEdits_(element.editAsText(), [{ at: number.start, remove: number.text.length, insert: issue.expected }]);
  }
}

function structureContext_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const all = [];
  collectParagraphs_(body, [], false, all);
  const paragraphs = outsideTitlePage_(all, titlePageEnd_(body)).filter(function (entry) { return !entry.inTable; });
  paragraphs.forEach(function (entry) {
    entry.heading = String(entry.element.getHeading());
    entry.text = entry.element.getText();
  });
  const headings = [];
  paragraphs.forEach(function (entry, position) {
    const match = /^HEADING([1-6])$/.exec(entry.heading);
    if (!match || !entry.text.trim()) return;
    headings.push({ level: Number(match[1]), text: entry.text, isList: entry.isList, entry: entry, position: position });
  });
  const tocFound = body.findElement(DocumentApp.ElementType.TABLE_OF_CONTENTS);
  const toc = tocFound ? tocFound.getElement().asTableOfContents() : null;
  const tocEntries = [];
  if (toc) {
    toc.getText().split(/\r?\n/).forEach(function (line) {
      const title = line.split('\t')[0];
      if (title.trim()) tocEntries.push(title);
    });
  }
  return { paragraphs: paragraphs, headings: headings, toc: toc, tocEntries: tocEntries };
}

function sectionWords_(ctx, headingIndex) {
  const heading = ctx.headings[headingIndex];
  const next = ctx.headings.slice(headingIndex + 1).filter(function (h) { return h.level <= heading.level; })[0];
  const end = next ? next.position : ctx.paragraphs.length;
  let words = 0;
  for (let i = heading.position + 1; i < end; i++) {
    const text = ctx.paragraphs[i].text;
    if (ctx.paragraphs[i].heading === 'NORMAL' && !parseKeywords_(text)) words += countWords_(text);
  }
  return words;
}

function countPages_() {
  try {
    const pdf = DocumentApp.getActiveDocument().getAs('application/pdf').getDataAsString('ISO-8859-1');
    return pdfPageCount_(pdf);
  } catch (e) {
    console.warn('Nie udało się policzyć stron: ' + e.message);
    return null;
  }
}

const PAGE_COUNT_PROP = 'pageCount';
const PAGE_SAFE_FACTOR = 1.25;
const PAGE_HEADING_DEFAULTS = {
  NORMAL: { size: 11, before: 0, after: 0 },
  HEADING1: { size: 20, before: 20, after: 6 },
  HEADING2: { size: 16, before: 18, after: 6 },
  HEADING3: { size: 14, before: 16, after: 4 },
  HEADING4: { size: 12, before: 14, after: 4 },
  HEADING5: { size: 11, before: 12, after: 4 },
  HEADING6: { size: 11, before: 12, after: 4 },
  TITLE: { size: 26, before: 0, after: 3 },
  SUBTITLE: { size: 15, before: 0, after: 16 },
};

function charWidthFactor_(family) {
  const name = String(family || '').toLowerCase();
  if (/times|georgia|garamond|cambria|book/.test(name)) return 0.45;
  if (/calibri|carlito/.test(name)) return 0.47;
  if (/courier|mono|consol/.test(name)) return 0.6;
  return 0.5;
}

function textLines_(text, width, fontSize, family) {
  const perLine = Math.max(10, Math.floor(width / (fontSize * charWidthFactor_(family))));
  return String(text || '').split(/[\r\n\v]/).reduce(function (sum, line) {
    return sum + Math.max(1, Math.ceil(line.length / perLine));
  }, 0);
}

function layoutPages_(blocks, pageHeight) {
  let pages = 0;
  let y = 0;
  blocks.forEach(function (block) {
    if (block.breakBefore && y > 0) {
      pages++;
      y = 0;
    }
    y += block.height;
    while (y > pageHeight) {
      pages++;
      y -= pageHeight;
    }
    if (block.breakAfter) {
      pages++;
      y = 0;
    }
  });
  return pages + (y > 0 ? 1 : 0);
}

function pageStyles_(body) {
  const styles = {};
  Object.keys(PAGE_HEADING_DEFAULTS).forEach(function (name) {
    const defaults = PAGE_HEADING_DEFAULTS[name];
    let attributes = {};
    try {
      attributes = body.getHeadingAttributes(DocumentApp.ParagraphHeading[name]) || {};
    } catch (e) {
      attributes = {};
    }
    const value = function (attribute, fallback) {
      const found = attributes[DocumentApp.Attribute[attribute]];
      return found === null || found === undefined ? fallback : found;
    };
    styles[name] = {
      size: value('FONT_SIZE', defaults.size),
      family: value('FONT_FAMILY', 'Arial'),
      spacing: value('LINE_SPACING', 1.15),
      before: value('SPACING_BEFORE', defaults.before),
      after: value('SPACING_AFTER', defaults.after),
    };
  });
  return styles;
}

function estimatePages_() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    const width = body.getPageWidth() - body.getMarginLeft() - body.getMarginRight();
    const height = body.getPageHeight() - body.getMarginTop() - body.getMarginBottom();
    if (!(width > 0) || !(height > 0)) return null;
    const styles = pageStyles_(body);
    const blocks = [];
    const count = body.getNumChildren();
    for (let i = 0; i < count; i++) {
      const child = body.getChild(i);
      const type = String(child.getType());
      if (type === 'PARAGRAPH' || type === 'LIST_ITEM') {
        blocks.push(paragraphBlock_(type === 'PARAGRAPH' ? child.asParagraph() : child.asListItem(), width, styles));
      } else if (type === 'TABLE') {
        blocks.push({ height: tableHeight_(child.asTable(), width, styles) });
      } else if (type === 'TABLE_OF_CONTENTS') {
        const lines = child.asTableOfContents().getText().split('\n').length;
        blocks.push({ height: lines * styles.NORMAL.size * 1.17 * 1.15 + 6 });
      }
    }
    const footnotes = doc.getFootnotes().reduce(function (sum, footnote) {
      const contents = footnote.getFootnoteContents();
      return sum + (contents ? textLines_(contents.getText(), width, 10, styles.NORMAL.family) * 10 * 1.17 : 0);
    }, 0);
    if (footnotes) blocks.push({ height: footnotes });
    return layoutPages_(blocks, height);
  } catch (e) {
    console.warn('Nie udało się oszacować liczby stron: ' + e.message);
    return null;
  }
}

function paragraphBlock_(paragraph, width, styles) {
  try {
    const style = styles[String(paragraph.getHeading())] || styles.NORMAL;
    const text = paragraph.editAsText();
    const content = text.getText();
    const size = (content.length && text.getFontSize(0)) || style.size;
    const family = (content.length && text.getFontFamily(0)) || style.family;
    const spacing = paragraph.getLineSpacing() || style.spacing || 1.15;
    const before = paragraph.getSpacingBefore();
    const after = paragraph.getSpacingAfter();
    const indent = (paragraph.getIndentStart() || 0) + (paragraph.getIndentEnd() || 0);
    let height = textLines_(content, Math.max(100, width - indent), size, family) * size * 1.17 * spacing;
    height += (before === null ? style.before : before) + (after === null ? style.after : after);
    const images = [];
    let found = paragraph.findElement(DocumentApp.ElementType.INLINE_IMAGE);
    while (found) {
      images.push(found.getElement().asInlineImage().getHeight() * 0.75);
      found = paragraph.findElement(DocumentApp.ElementType.INLINE_IMAGE, found);
    }
    paragraph.getPositionedImages().forEach(function (image) { images.push(image.getHeight() * 0.75); });
    if (images.length) {
      const stacked = /[\r\n\v]/.test(content);
      const imageHeight = stacked ? images.reduce(function (a, b) { return a + b; }, 0) : Math.max.apply(null, images);
      height = Math.max(height, imageHeight + size * 0.3);
    }
    return { height: height, breakAfter: !!paragraph.findElement(DocumentApp.ElementType.PAGE_BREAK) };
  } catch (e) {
    console.warn('Nie udało się zmierzyć akapitu: ' + e.message);
    return { height: styles.NORMAL.size * 1.17 * styles.NORMAL.spacing };
  }
}

function tableHeight_(table, width, styles) {
  let height = 0;
  const rows = table.getNumRows();
  for (let r = 0; r < rows; r++) {
    const row = table.getRow(r);
    const cells = Math.max(1, row.getNumCells());
    let tallest = 0;
    for (let c = 0; c < cells; c++) {
      const cell = row.getCell(c);
      let cellHeight = 0;
      for (let p = 0; p < cell.getNumChildren(); p++) {
        const child = cell.getChild(p);
        const type = String(child.getType());
        if (type === 'PARAGRAPH' || type === 'LIST_ITEM') {
          cellHeight += paragraphBlock_(type === 'PARAGRAPH' ? child.asParagraph() : child.asListItem(), width / cells - 10, styles).height;
        }
      }
      tallest = Math.max(tallest, cellHeight);
    }
    height += tallest + 10;
  }
  return height + 12;
}

function documentPages_(minPages) {
  const state = pageState_();
  const cached = cachedPages_(state);
  if (cached !== null) return { count: cached, approx: false };
  const estimate = estimatePages_();
  if (estimate !== null && estimate >= minPages * PAGE_SAFE_FACTOR) return { count: estimate, approx: true };
  const exact = countPages_();
  if (exact !== null) {
    if (state) docProps_().setProperty(PAGE_COUNT_PROP, JSON.stringify({ count: exact, state: state }));
    return { count: exact, approx: false };
  }
  return estimate === null ? null : { count: estimate, approx: true };
}

function pageState_() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    const updated = DriveApp.getFileById(doc.getId()).getLastUpdated().getTime();
    return [updated, body.getNumChildren(), body.getText().length, doc.getFootnotes().length].join(':');
  } catch (e) {
    console.warn('Nie udało się odczytać stanu dokumentu: ' + e.message);
    return null;
  }
}

function cachedPages_(state) {
  if (!state) return null;
  try {
    const cached = JSON.parse(docProps_().getProperty(PAGE_COUNT_PROP) || 'null');
    return cached && cached.state === state ? cached.count : null;
  } catch (e) {
    console.warn('Niepoprawny zapis liczby stron: ' + e.message);
    return null;
  }
}
