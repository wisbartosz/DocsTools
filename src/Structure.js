const STRUCTURE_RULES_PROP = 'structureRules';
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
  const tree = /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/.exec(pdf);
  if (tree) return Number(tree[1] || tree[2]);
  const pages = pdf.match(/\/Type\s*\/Page\b(?!s)/g);
  return pages ? pages.length : null;
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
  return {
    rules: readStructureRules_(),
    defaults: {
      type: 'review',
      sections: { review: t_('structure.default.review'), research: t_('structure.default.research') },
      toc: true,
      numbering: true,
      keywordsMin: 3,
      keywordsMax: 5,
    },
  };
}

function saveStructureRules(input) {
  const rules = normalizeStructureRules_(input);
  docProps_().setProperty(STRUCTURE_RULES_PROP, JSON.stringify(rules));
  return rules;
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

function checkStructure() {
  const rules = readStructureRules_();
  if (!rules) throw userError_('structure.err.noRules');
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
  if (rules.minPages) {
    pages = countPages_();
    if (pages !== null && pages < rules.minPages) {
      add('pages', plainItem('pages', t_('structure.pages.detail', { count: pages, min: rules.minPages }), ''));
    }
  }

  return { pages: pages, groups: STRUCTURE_KINDS.map(function (kind) { return groups[kind]; }) };
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

function fixStructureIssue(ref) {
  applyStructureFix_(ref.kind, ref);
  return checkStructure();
}

function fixStructureKind(kind) {
  if (!STRUCTURE_FIXABLE[kind]) throw userError_('format.err.changed');
  const result = checkStructure();
  const group = result.groups.filter(function (g) { return g.kind === kind; })[0];
  const refs = group.items.filter(function (item) { return item.fixable; }).map(function (item) { return item.ref; });
  refs.slice().reverse().forEach(function (ref) { applyStructureFix_(kind, ref); });
  return { fixed: refs.length, result: checkStructure() };
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
