const TYPO_MAX_ITEMS = 100;
const TYPO_CONTEXT_CHARS = 30;
const TYPO_MAX_MATCH_CHARS = 80;

function checkTypography() {
  const groups = {};
  TYPO_KINDS.forEach(function (kind) { groups[kind] = { kind: kind, count: 0, items: [] }; });
  typographyTexts_().forEach(function (entry, order) {
    entry.order = order;
    typographyIssuesFor_(entry).forEach(function (issue) {
      const group = groups[issue.kind];
      group.count++;
      if (group.items.length < TYPO_MAX_ITEMS) group.items.push(describeTypographyIssue_(entry, issue));
    });
  });
  return { groups: TYPO_KINDS.map(function (kind) { return groups[kind]; }) };
}

function showTypographyIssue(ref) {
  const found = locateTypographyIssue_(ref);
  const doc = DocumentApp.getActiveDocument();
  try {
    doc.setSelection(doc.newRange().addElement(found.entry.text, found.issue.start, found.issue.end - 1).build());
  } catch (e) {
    console.warn('Nie udało się zaznaczyć miejsca: ' + e.message);
    throw userError_('typo.err.show');
  }
}

function fixTypographyIssue(ref) {
  const found = locateTypographyIssue_(ref);
  const before = countByKind_(typographyIssuesFor_(found.entry));
  applyDocumentEdits_(found.entry.text, found.issue.edits);
  const issues = typographyIssuesFor_(found.entry);
  return {
    key: ref.key,
    before: before,
    after: countByKind_(issues),
    items: issues.map(function (issue) { return describeTypographyIssue_(found.entry, issue); }),
  };
}

function fixTypographyKind(kind) {
  if (TYPO_KINDS.indexOf(kind) < 0) throw userError_('typo.err.changed');
  let found = 0;
  typographyTexts_().forEach(function (entry) {
    const issues = typographyIssuesFor_(entry, [kind]);
    if (!issues.length) return;
    found += issues.length;
    applyDocumentEdits_(entry.text, typographyEdits_(issues));
  });
  const result = checkTypography();
  const left = result.groups.filter(function (group) { return group.kind === kind; })[0].count;
  return { fixed: Math.max(0, found - left), result: result };
}

function typographyIssuesFor_(entry, kinds) {
  const text = entry.text.getText();
  return findTypographyIssues_(text, kinds).filter(function (issue) {
    if (!TYPO_LINK_SENSITIVE[issue.kind]) return true;
    return !entry.text.getLinkUrl(issue.start) && !entry.text.getLinkUrl(issue.end - 1);
  });
}

function describeTypographyIssue_(entry, issue) {
  const text = entry.text.getText();
  const from = Math.max(0, issue.start - TYPO_CONTEXT_CHARS);
  let match = issue.original;
  if (match.length > TYPO_MAX_MATCH_CHARS) match = match.slice(0, 45) + ' … ' + match.slice(-30);
  return {
    ref: { key: entry.key, location: entry.location, start: issue.start, kind: issue.kind, original: issue.original },
    order: entry.order,
    footnote: entry.location.footnote >= 0,
    before: (from > 0 ? '…' : '') + text.slice(from, issue.start),
    match: match,
    after: text.slice(issue.end, issue.end + TYPO_CONTEXT_CHARS) + (issue.end + TYPO_CONTEXT_CHARS < text.length ? '…' : ''),
  };
}

function countByKind_(issues) {
  const counts = {};
  issues.forEach(function (issue) { counts[issue.kind] = (counts[issue.kind] || 0) + 1; });
  return counts;
}

const SKIP_TITLE_PAGE_PROP = 'skipTitlePage';
const TITLE_PAGE_MAX_ELEMENTS = 80;

function skipTitlePage_() {
  return docProps_().getProperty(SKIP_TITLE_PAGE_PROP) !== 'false';
}

function saveSkipTitlePage(skip) {
  docProps_().setProperty(SKIP_TITLE_PAGE_PROP, skip ? 'true' : 'false');
  return !!skip;
}

function titlePageEnd_(body) {
  if (!skipTitlePage_()) return -1;
  const count = Math.min(body.getNumChildren(), TITLE_PAGE_MAX_ELEMENTS);
  for (let i = 0; i < count; i++) {
    const child = castElement_(body.getChild(i));
    if (child && (child.type === 'PARAGRAPH' || child.type === 'LIST_ITEM') &&
        child.element.findElement(DocumentApp.ElementType.PAGE_BREAK)) {
      return i;
    }
  }
  return -1;
}

function outsideTitlePage_(entries, end) {
  if (end < 0) return entries;
  return entries.filter(function (entry) { return entry.location.footnote >= 0 || entry.location.path[0] > end; });
}

function typographyTexts_() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const bodyTexts = [];
  collectTexts_(body, { footnote: -1, path: [] }, bodyTexts);
  const out = outsideTitlePage_(bodyTexts, titlePageEnd_(body));
  doc.getFootnotes().forEach(function (footnote, index) {
    const contents = footnote.getFootnoteContents();
    if (contents) collectTexts_(contents, { footnote: index, path: [] }, out);
  });
  return out;
}

function collectTexts_(container, location, out) {
  const count = container.getNumChildren();
  for (let i = 0; i < count; i++) {
    const child = castElement_(container.getChild(i));
    if (!child) continue;
    const childLocation = { footnote: location.footnote, path: location.path.concat(i) };
    if (child.isText) {
      out.push({ text: child.element, location: childLocation, key: locationKey_(childLocation) });
    } else {
      collectTexts_(child.element, childLocation, out);
    }
  }
}

function castElement_(element) {
  const type = String(element.getType());
  switch (type) {
    case 'TEXT': return { type: type, isText: true, element: element.asText() };
    case 'PARAGRAPH': return { type: type, element: element.asParagraph() };
    case 'LIST_ITEM': return { type: type, element: element.asListItem() };
    case 'TABLE': return { type: type, element: element.asTable() };
    case 'TABLE_ROW': return { type: type, element: element.asTableRow() };
    case 'TABLE_CELL': return { type: type, element: element.asTableCell() };
    default: return null;
  }
}

function locationKey_(location) {
  return location.footnote + ':' + location.path.join('.');
}

function locateTypographyIssue_(ref) {
  const entry = resolveLocation_(ref.location);
  if (!entry) throw userError_('typo.err.changed');
  const issue = typographyIssuesFor_(entry, [ref.kind]).filter(function (candidate) {
    return candidate.start === ref.start && candidate.original === ref.original;
  })[0];
  if (!issue) throw userError_('typo.err.changed');
  return { entry: entry, issue: issue };
}

function resolveLocation_(location) {
  const current = resolveElementPath_(location);
  if (!current || !current.isText) return null;
  return { text: current.element, location: location, key: locationKey_(location), order: null };
}

function resolveElementPath_(location) {
  const doc = DocumentApp.getActiveDocument();
  let container;
  if (location.footnote >= 0) {
    const footnote = doc.getFootnotes()[location.footnote];
    container = footnote ? footnote.getFootnoteContents() : null;
  } else {
    container = doc.getBody();
  }
  let current = null;
  for (let i = 0; container && i < location.path.length; i++) {
    if (location.path[i] >= container.getNumChildren()) return null;
    current = castElement_(container.getChild(location.path[i]));
    if (!current) return null;
    container = current.isText ? null : current.element;
    if (current.isText && i < location.path.length - 1) return null;
  }
  return current;
}

function applyDocumentEdits_(text, edits) {
  let length = text.getText().length;
  edits.slice().sort(function (a, b) { return b.at - a.at; }).forEach(function (edit) {
    if (edit.insert) {
      const position = edit.at + edit.remove;
      if (position >= length) text.appendText(edit.insert);
      else text.insertText(position, edit.insert);
    }
    if (edit.remove) text.deleteText(edit.at, edit.at + edit.remove - 1);
    length += edit.insert.length - edit.remove;
  });
}
