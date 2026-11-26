const SKIP_TITLE_PAGE_PROP = 'skipTitlePage';
const TITLE_PAGE_MAX_ELEMENTS = 80;
const CHECK_MAX_ITEMS = 100;
const FINGERPRINT_CHARS = 40;

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

function documentParagraphs_(body, options) {
  const all = [];
  collectParagraphs_(body, [], false, all);
  let paragraphs = outsideTitlePage_(all, titlePageEnd_(body));
  if (options && options.skipTables) paragraphs = paragraphs.filter(function (entry) { return !entry.inTable; });
  paragraphs.forEach(function (entry) {
    entry.heading = String(entry.element.getHeading());
    entry.text = entry.element.getText();
  });
  return paragraphs;
}

function headingLevel_(heading) {
  const match = /^HEADING([1-6])$/.exec(heading || '');
  return match ? Number(match[1]) : 0;
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

function selectRange_(doc, buildRange) {
  try {
    doc.setSelection(buildRange().build());
  } catch (e) {
    console.warn('Nie udalo sie zaznaczyc miejsca: ' + e.message);
    throw userError_('typo.err.show');
  }
}

function checkGroups_(kinds, options) {
  const opts = options || {};
  const max = opts.max === undefined ? CHECK_MAX_ITEMS : opts.max;
  const groups = {};
  kinds.forEach(function (kind) {
    groups[kind] = { kind: kind, count: 0, items: [] };
    if (opts.info) groups[kind].info = !!opts.info[kind];
    if (opts.extra) Object.assign(groups[kind], opts.extra(kind));
  });
  return {
    groups: groups,
    add: function (kind, item) {
      const group = groups[kind];
      let value = item;
      if (opts.hide) {
        if (typeof value === 'function') value = value();
        if (opts.hide(group, value)) return false;
      }
      group.count++;
      if (group.items.length < max) group.items.push(typeof value === 'function' ? value() : value);
      return true;
    },
    list: function () {
      const list = kinds.map(function (kind) { return groups[kind]; });
      if (opts.hide && opts.hide.finish) opts.hide.finish(list);
      return list;
    },
  };
}

function positiveInt_(value) {
  const parsed = parseInt(String(value === undefined || value === null ? '' : value), 10);
  return isFinite(parsed) && parsed > 0 ? parsed : null;
}

function flagDefaultTrue_(value) {
  return value === undefined ? true : !!value;
}

function preview_(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}
