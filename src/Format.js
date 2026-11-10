const FORMAT_RULES_PROP = 'formatRules';
const FORMAT_MAX_ITEMS = 100;
const PT_PER_CM = 72 / 2.54;
const FORMAT_A4 = { width: 595.28, height: 841.89 };
const FORMAT_KINDS = ['page', 'margins', 'font', 'size', 'color', 'lineSpacing', 'alignment', 'indent',
  'heading1', 'heading2', 'headingPeriod', 'chapterPage', 'caption'];
const FORMAT_DOCUMENT_KINDS = { page: true, margins: true };
const FORMAT_SIDES = ['top', 'right', 'bottom', 'left'];
const FORMAT_ALIGNMENTS = ['', 'JUSTIFY', 'LEFT'];
const FORMAT_CAPTION = /^\s*(tabela|tab\.|rycina|ryc\.|rysunek|rys\.|wykres|schemat|fotografia|table|figure|fig\.)\s*(nr\.?\s*)?\d+/i;
const FORMAT_BACK_MATTER = /bibliograf|pi.miennictw|literatur|references|spis (rycin|tabel|rysunk)|aneks|za..cznik|appendix/i;
const FORMAT_EXAMPLE_RULES = {
  font: 'Times New Roman',
  size: 12,
  black: true,
  lineSpacing: 1.5,
  alignment: 'JUSTIFY',
  indent: 1.25,
  a4: true,
  margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
  heading1: { size: 14, bold: true, uppercase: false },
  heading2: { size: 13, bold: true },
  captionSize: 10,
  noHeadingPeriod: true,
  chapterNewPage: true,
};

function getFormatRules() {
  return { rules: readFormatRules_(), example: FORMAT_EXAMPLE_RULES, skipTitlePage: skipTitlePage_() };
}

function saveFormatRules(input) {
  const rules = normalizeFormatRules_(input);
  docProps_().setProperty(FORMAT_RULES_PROP, JSON.stringify(rules));
  return rules;
}

function readFormatRules_() {
  const raw = docProps_().getProperty(FORMAT_RULES_PROP);
  if (!raw) return null;
  try {
    return normalizeFormatRules_(JSON.parse(raw));
  } catch (e) {
    console.warn('Niepoprawny zapis wymagań edytorskich: ' + e.message);
    return null;
  }
}

function normalizeFormatRules_(input) {
  const source = input || {};
  const number = function (value) {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value === undefined || value === null ? '' : value).replace(',', '.'));
    return isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
  };
  const margins = source.margins || {};
  const heading1 = source.heading1 || {};
  const heading2 = source.heading2 || {};
  return {
    font: String(source.font || '').trim(),
    size: number(source.size),
    black: !!source.black,
    lineSpacing: number(source.lineSpacing),
    alignment: FORMAT_ALIGNMENTS.indexOf(source.alignment) >= 0 ? source.alignment : '',
    indent: number(source.indent),
    a4: !!source.a4,
    margins: { top: number(margins.top), right: number(margins.right), bottom: number(margins.bottom), left: number(margins.left) },
    heading1: { size: number(heading1.size), bold: !!heading1.bold, uppercase: !!heading1.uppercase },
    heading2: { size: number(heading2.size), bold: !!heading2.bold },
    captionSize: number(source.captionSize),
    noHeadingPeriod: !!source.noHeadingPeriod,
    chapterNewPage: !!source.chapterNewPage,
  };
}

function checkFormatting() {
  const rules = requireFormatRules_();
  const ctx = formatContext_();
  const groups = {};
  FORMAT_KINDS.forEach(function (kind) { groups[kind] = { kind: kind, count: 0, items: [] }; });
  const add = function (issue, entry) {
    const group = groups[issue.kind];
    group.count++;
    if (group.items.length < FORMAT_MAX_ITEMS) group.items.push(describeFormatIssue_(issue, entry));
  };
  documentFormatIssues_(rules, ctx).forEach(function (issue) { add(issue, null); });
  ctx.paragraphs.forEach(function (entry) {
    paragraphFormatIssues_(entry, rules, ctx).forEach(function (issue) { add(issue, entry); });
  });
  return { noHeadings: ctx.noHeadings, groups: FORMAT_KINDS.map(function (kind) { return groups[kind]; }) };
}

function showFormatIssue(ref) {
  const found = resolveElementPath_(ref.location);
  if (!found || found.isText) throw userError_('format.err.changed');
  const doc = DocumentApp.getActiveDocument();
  try {
    doc.setSelection(doc.newRange().addElement(found.element).build());
  } catch (e) {
    console.warn('Nie udało się zaznaczyć akapitu: ' + e.message);
    throw userError_('typo.err.show');
  }
}

function fixFormatIssue(ref) {
  const rules = requireFormatRules_();
  const ctx = formatContext_();
  if (FORMAT_DOCUMENT_KINDS[ref.kind]) {
    applyDocumentFormatFix_(ref.kind, rules, ctx);
    return checkFormatting();
  }
  const entry = ctx.paragraphs.filter(function (candidate) { return candidate.key === ref.key; })[0];
  const valid = entry && entry.text.slice(0, 40) === ref.fingerprint &&
    paragraphFormatIssues_(entry, rules, ctx).some(function (issue) { return issue.kind === ref.kind; });
  if (!valid) throw userError_('format.err.changed');
  applyParagraphFormatFix_(ref.kind, entry, rules, ctx);
  return checkFormatting();
}

function fixFormatKind(kind) {
  if (FORMAT_KINDS.indexOf(kind) < 0) throw userError_('format.err.changed');
  const rules = requireFormatRules_();
  const ctx = formatContext_();
  let fixed = 0;
  if (FORMAT_DOCUMENT_KINDS[kind]) {
    applyDocumentFormatFix_(kind, rules, ctx);
    fixed = 1;
  } else {
    ctx.paragraphs.slice().reverse().forEach(function (entry) {
      const matches = paragraphFormatIssues_(entry, rules, ctx).some(function (issue) { return issue.kind === kind; });
      if (!matches) return;
      applyParagraphFormatFix_(kind, entry, rules, ctx);
      fixed++;
    });
  }
  return { fixed: fixed, result: checkFormatting() };
}

function requireFormatRules_() {
  const rules = readFormatRules_();
  if (!rules) throw userError_('format.err.noRules');
  return rules;
}

function formatContext_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const styles = {};
  ['NORMAL', 'HEADING1', 'HEADING2'].forEach(function (name) {
    styles[name] = body.getHeadingAttributes(DocumentApp.ParagraphHeading[name]) || {};
  });
  const all = [];
  collectParagraphs_(body, [], false, all);
  const paragraphs = outsideTitlePage_(all, titlePageEnd_(body));
  let seenHeading = false;
  let backMatter = false;
  paragraphs.forEach(function (entry) {
    entry.heading = String(entry.element.getHeading());
    entry.text = entry.element.getText();
    if (entry.heading === 'HEADING1' && !entry.inTable) {
      seenHeading = true;
      backMatter = FORMAT_BACK_MATTER.test(entry.text);
    }
    entry.isBody = seenHeading;
    entry.backMatter = backMatter;
  });
  const noHeadings = !seenHeading;
  if (noHeadings) paragraphs.forEach(function (entry) { entry.isBody = true; });
  return { body: body, styles: styles, paragraphs: paragraphs, noHeadings: noHeadings };
}

function collectParagraphs_(container, path, inTable, out) {
  const count = container.getNumChildren();
  for (let i = 0; i < count; i++) {
    const child = castElement_(container.getChild(i));
    if (!child || child.isText) continue;
    const location = { footnote: -1, path: path.concat(i) };
    if (child.type === 'PARAGRAPH' || child.type === 'LIST_ITEM') {
      out.push({ element: child.element, isList: child.type === 'LIST_ITEM', inTable: inTable, location: location, key: locationKey_(location) });
    } else {
      collectParagraphs_(child.element, location.path, true, out);
    }
  }
}

function documentFormatIssues_(rules, ctx) {
  const issues = [];
  const body = ctx.body;
  if (rules.a4) {
    const width = body.getPageWidth();
    const height = body.getPageHeight();
    if (Math.abs(width - FORMAT_A4.width) > 2 || Math.abs(height - FORMAT_A4.height) > 2) {
      issues.push({ kind: 'page', detail: change_(cm_(width) + ' × ' + cm_(height) + ' cm', '21 × 29,7 cm') });
    }
  }
  const actual = { top: body.getMarginTop(), right: body.getMarginRight(), bottom: body.getMarginBottom(), left: body.getMarginLeft() };
  const wrong = FORMAT_SIDES.filter(function (side) {
    return rules.margins[side] && Math.abs(actual[side] / PT_PER_CM - rules.margins[side]) > 0.05;
  });
  if (wrong.length) {
    issues.push({
      kind: 'margins',
      detail: wrong.map(function (side) {
        return t_('format.rules.' + side) + ' ' + change_(cm_(actual[side]), number_(rules.margins[side]) + ' cm');
      }).join('; '),
    });
  }
  return issues;
}

function paragraphFormatIssues_(entry, rules, ctx) {
  if (!entry.text.trim() || entry.inTable) return [];
  const issues = [];
  const element = entry.element;
  const text = element.editAsText();
  if (entry.heading === 'HEADING1' || entry.heading === 'HEADING2') {
    const level = entry.heading === 'HEADING1' ? rules.heading1 : rules.heading2;
    const style = ctx.styles[entry.heading];
    const problems = [];
    if (rules.font) wrongValues_(fontsOf_(text, style), rules.font).forEach(function (font) { problems.push(change_(font, rules.font)); });
    if (level.size) wrongSizes_(sizesOf_(text, style), level.size).forEach(function (size) { problems.push(change_(number_(size) + ' pkt', number_(level.size) + ' pkt')); });
    if (level.bold && !isBold_(text, style)) problems.push(t_('format.notBold'));
    if (level.uppercase && entry.text !== entry.text.toLocaleUpperCase()) problems.push(t_('format.notUpper'));
    if (problems.length) issues.push({ kind: entry.heading === 'HEADING1' ? 'heading1' : 'heading2', detail: problems.join('; ') });
    if (rules.noHeadingPeriod && /[^.]\.\s*$/.test(entry.text)) issues.push({ kind: 'headingPeriod', detail: '' });
    if (entry.heading === 'HEADING1' && rules.chapterNewPage && !startsOnNewPage_(entry, ctx)) issues.push({ kind: 'chapterPage', detail: '' });
    return issues;
  }
  if (entry.heading !== 'NORMAL') return issues;
  const style = ctx.styles.NORMAL;
  if (FORMAT_CAPTION.test(entry.text)) {
    if (rules.captionSize) {
      wrongSizes_(sizesOf_(text, style), rules.captionSize).forEach(function (size) {
        issues.push({ kind: 'caption', detail: change_(number_(size) + ' pkt', number_(rules.captionSize) + ' pkt') });
      });
    }
    return issues.slice(0, 1);
  }
  if (!entry.isBody) return issues;
  if (rules.font) {
    const fonts = wrongValues_(fontsOf_(text, style), rules.font);
    if (fonts.length) issues.push({ kind: 'font', detail: change_(fonts.join(', '), rules.font) });
  }
  if (rules.size) {
    const sizes = wrongSizes_(sizesOf_(text, style), rules.size);
    if (sizes.length) issues.push({ kind: 'size', detail: change_(sizes.map(number_).join(', ') + ' pkt', number_(rules.size) + ' pkt') });
  }
  if (rules.black) {
    const colors = nonBlackColors_(text, style);
    if (colors.length) issues.push({ kind: 'color', detail: change_(colors.join(', '), t_('format.black')) });
  }
  if (rules.lineSpacing) {
    const spacing = paragraphValue_(element.getLineSpacing(), style, DocumentApp.Attribute.LINE_SPACING);
    if (spacing && Math.abs(spacing - rules.lineSpacing) > 0.01) {
      issues.push({ kind: 'lineSpacing', detail: change_(number_(spacing), number_(rules.lineSpacing)) });
    }
  }
  if (rules.alignment && !entry.isList) {
    const alignment = String(paragraphValue_(element.getAlignment(), style, DocumentApp.Attribute.HORIZONTAL_ALIGNMENT) || 'LEFT');
    if (alignment !== rules.alignment) {
      issues.push({ kind: 'alignment', detail: change_(t_('format.align.' + alignment), t_('format.align.' + rules.alignment)) });
    }
  }
  if (rules.indent && !entry.isList && !entry.backMatter) {
    const indent = firstLineIndentCm_(element, style);
    if (Math.abs(indent - rules.indent) > 0.05) {
      issues.push({ kind: 'indent', detail: change_(number_(indent) + ' cm', number_(rules.indent) + ' cm') });
    }
  }
  return issues;
}

function describeFormatIssue_(issue, entry) {
  if (!entry) return { ref: { kind: issue.kind }, showable: false, preview: t_('format.document'), detail: issue.detail };
  return {
    ref: { kind: issue.kind, key: entry.key, location: entry.location, fingerprint: entry.text.slice(0, 40) },
    showable: true,
    preview: entry.text.length > 90 ? entry.text.slice(0, 90) + '…' : entry.text,
    detail: issue.detail,
  };
}

function applyDocumentFormatFix_(kind, rules, ctx) {
  const body = ctx.body;
  if (kind === 'page') {
    body.setPageWidth(FORMAT_A4.width);
    body.setPageHeight(FORMAT_A4.height);
  } else if (kind === 'margins') {
    if (rules.margins.top) body.setMarginTop(rules.margins.top * PT_PER_CM);
    if (rules.margins.right) body.setMarginRight(rules.margins.right * PT_PER_CM);
    if (rules.margins.bottom) body.setMarginBottom(rules.margins.bottom * PT_PER_CM);
    if (rules.margins.left) body.setMarginLeft(rules.margins.left * PT_PER_CM);
  }
}

function applyParagraphFormatFix_(kind, entry, rules, ctx) {
  const element = entry.element;
  const text = element.editAsText();
  switch (kind) {
    case 'font': text.setFontFamily(rules.font); break;
    case 'size': text.setFontSize(rules.size); break;
    case 'caption': text.setFontSize(rules.captionSize); break;
    case 'color': blackenText_(text); break;
    case 'lineSpacing': element.setLineSpacing(rules.lineSpacing); break;
    case 'alignment': element.setAlignment(DocumentApp.HorizontalAlignment[rules.alignment]); break;
    case 'indent': {
      const start = paragraphValue_(element.getIndentStart(), ctx.styles.NORMAL, DocumentApp.Attribute.INDENT_START) || 0;
      element.setIndentFirstLine(start + rules.indent * PT_PER_CM);
      break;
    }
    case 'heading1':
    case 'heading2': {
      const level = kind === 'heading1' ? rules.heading1 : rules.heading2;
      if (rules.font) text.setFontFamily(rules.font);
      if (level.size) text.setFontSize(level.size);
      if (level.bold) text.setBold(true);
      if (level.uppercase) uppercaseText_(text);
      break;
    }
    case 'headingPeriod': {
      const match = /\.\s*$/.exec(text.getText());
      if (match) text.deleteText(match.index, match.index);
      break;
    }
    case 'chapterPage':
      ctx.body.insertPageBreak(entry.location.path[0]);
      break;
  }
}

function startsOnNewPage_(entry, ctx) {
  if (entry.location.path.length !== 1) return true;
  if (entry.element.findElement(DocumentApp.ElementType.PAGE_BREAK)) return true;
  const index = entry.location.path[0];
  if (index === 0) return true;
  for (let i = index - 1; i >= 0 && i >= index - 3; i--) {
    const previous = castElement_(ctx.body.getChild(i));
    if (!previous || (previous.type !== 'PARAGRAPH' && previous.type !== 'LIST_ITEM')) return false;
    if (previous.element.findElement(DocumentApp.ElementType.PAGE_BREAK)) return true;
    if (previous.element.getText().trim()) return false;
  }
  return false;
}

function runValues_(text, read, fallback, skipLinks) {
  const length = text.getText().length;
  const values = {};
  text.getTextAttributeIndices().forEach(function (start) {
    if (start >= length || (skipLinks && text.getLinkUrl(start))) return;
    let value = read(start);
    if (value === null || value === undefined) value = fallback;
    if (value !== null && value !== undefined) values[String(value)] = value;
  });
  return Object.keys(values).map(function (key) { return values[key]; });
}

function fontsOf_(text, style) {
  const whole = text.getFontFamily();
  if (whole) return [whole];
  return runValues_(text, function (offset) { return text.getFontFamily(offset); }, style[DocumentApp.Attribute.FONT_FAMILY], false);
}

function sizesOf_(text, style) {
  const whole = text.getFontSize();
  if (whole) return [whole];
  return runValues_(text, function (offset) { return text.getFontSize(offset); }, style[DocumentApp.Attribute.FONT_SIZE], false);
}

function isBold_(text, style) {
  const whole = text.isBold();
  if (whole !== null) return whole;
  const values = runValues_(text, function (offset) { return text.isBold(offset); }, style[DocumentApp.Attribute.BOLD], false);
  return values.length > 0 && values.every(function (value) { return value === true; });
}

function nonBlackColors_(text, style) {
  const fallback = style[DocumentApp.Attribute.FOREGROUND_COLOR] || '#000000';
  const whole = text.getForegroundColor();
  if (whole && isBlack_(whole)) return [];
  return runValues_(text, function (offset) { return text.getForegroundColor(offset); }, fallback, true)
    .filter(function (color) { return !isBlack_(color); });
}

function blackenText_(text) {
  const length = text.getText().length;
  const starts = text.getTextAttributeIndices();
  starts.forEach(function (start, i) {
    if (start >= length || text.getLinkUrl(start)) return;
    const end = (i + 1 < starts.length ? starts[i + 1] : length) - 1;
    if (end >= start) text.setForegroundColor(start, end, '#000000');
  });
}

function uppercaseText_(text) {
  const current = text.getText();
  const upper = current.toLocaleUpperCase();
  if (upper.length !== current.length) return;
  const edits = [];
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== upper[i]) edits.push({ at: i, remove: 1, insert: upper[i] });
  }
  applyDocumentEdits_(text, edits);
}

function isBlack_(color) {
  return /^#0{6}$/i.test(String(color));
}

function wrongValues_(values, expected) {
  return values.filter(function (value) { return String(value).toLowerCase() !== expected.toLowerCase(); });
}

function wrongSizes_(values, expected) {
  return values.filter(function (value) { return Math.abs(value - expected) > 0.1; });
}

function paragraphValue_(value, style, attribute) {
  if (value !== null && value !== undefined) return value;
  const inherited = style[attribute];
  return inherited === undefined ? null : inherited;
}

function firstLineIndentCm_(element, style) {
  const first = paragraphValue_(element.getIndentFirstLine(), style, DocumentApp.Attribute.INDENT_FIRST_LINE) || 0;
  const start = paragraphValue_(element.getIndentStart(), style, DocumentApp.Attribute.INDENT_START) || 0;
  return Math.round(((first - start) / PT_PER_CM) * 100) / 100;
}

function cm_(points) {
  return number_(Math.round((points / PT_PER_CM) * 100) / 100);
}

function number_(value) {
  const rounded = String(Math.round(value * 100) / 100);
  return uiLanguage_() === 'pl' ? rounded.replace('.', ',') : rounded;
}

function change_(from, to) {
  return t_('format.change', { from: from, to: to });
}
