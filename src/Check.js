const TYPO_CONTEXT_CHARS = 30;
const TYPO_MAX_MATCH_CHARS = 80;

function checkTypography() {
  const groups = checkGroups_(TYPO_KINDS);
  typographyTexts_().forEach(function (entry, order) {
    entry.order = order;
    typographyIssuesFor_(entry).forEach(function (issue) {
      groups.add(issue.kind, function () { return describeTypographyIssue_(entry, issue); });
    });
  });
  return { groups: groups.list() };
}

function showTypographyIssue(ref) {
  const found = locateTypographyIssue_(ref);
  const doc = DocumentApp.getActiveDocument();
  selectRange_(doc, function () { return doc.newRange().addElement(found.entry.text, found.issue.start, found.issue.end - 1); });
}

function fixTypographyIssue(ref) {
  const found = locateTypographyIssue_(ref);
  const before = countByKind_(typographyIssuesFor_(found.entry));
  applyDocumentEdits_(found.entry.text, found.issue.edits);
  if (ref.keepCursor) keepCursorAt_(found.entry.text, found.issue.start);
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

function locateTypographyIssue_(ref) {
  const entry = resolveLocation_(ref.location);
  if (!entry) throw userError_('typo.err.changed');
  const issue = typographyIssuesFor_(entry, [ref.kind]).filter(function (candidate) {
    return candidate.start === ref.start && candidate.original === ref.original;
  })[0];
  if (!issue) throw userError_('typo.err.changed');
  return { entry: entry, issue: issue };
}

