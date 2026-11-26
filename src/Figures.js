const FIG_LABELS = '(tabela|tab\\.|table|rycina|ryc\\.|rysunek|rys\\.|wykres|fotografia|fot\\.|zdj.cie|schemat|diagram|figure|fig\\.|chart)';
const FIG_NUMBER = '(\\d{1,3}(?:\\.\\d{1,3})?)';
const FIG_CAPTION = new RegExp('^\\s*' + FIG_LABELS + '\\s*(?:nr\\.?\\s*)?' + FIG_NUMBER + '(?![\\d.]*\\d)(\\s*[.:\\u2013\\u2014-]\\s*|\\s+)(.*)$', 'iu');
const FIG_TABLE_LABEL = /^(tabela|tab\.|table)$/i;
const FIG_SOURCE = /^\s*(.r.d.[oa](?:\s+\p{L}+)?\s*[:–—-]|sources?\s*:|opracowanie\s+w.asne|opracowan\S*\s+(w.asne\s+)?na\s+podstawie|opracowano\s+na\s+podstawie)/iu;
const FIG_SOURCE_KEYWORD = /(.r.d.[oa](?:\s+\p{L}+)?\s*[:–—-]|sources?\s*:|opracowanie\s+w.asne|opracowano\s+na\s+podstawie)/iu;
const FIG_SOURCE_CITATION = new RegExp([
  "\\p{Lu}[\\p{L}'’-]+(?:\\s+\\p{Lu}\\.)+(?:,?\\s+[Ii]\\s+in\\.)?,?\\s*\\(?(?:1[5-9]|20)\\d\\d\\b",
  "\\p{Lu}[\\p{L}'’-]+\\s+[Ii]\\s+in\\.,?\\s*\\(?(?:1[5-9]|20)\\d\\d\\b",
  "\\(\\s*\\p{Lu}[\\p{L}'’-]+(?:\\s+(?:i|and|&)\\s+\\p{Lu}[\\p{L}'’-]+)?,?\\s+(?:1[5-9]|20)\\d\\d[a-z]?\\s*[),;]",
  "\\p{Lu}[\\p{L}'’-]+,\\s+(?:1[5-9]|20)\\d\\d\\b",
].join('|'), 'u');
const FIG_ACCESS_DATE = /\d{1,2}\.\d{1,2}\.\d{4}|dost.p|accessed/i;
const FIG_REF_TABLE = '(?:tabel[\\p{L}]*|tab\\.)';
const FIG_REF_FIGURE = '(?:rycin[\\p{L}]*|ryc\\.|rysun[\\p{L}]*|rys\\.|wykres[\\p{L}]*|fotografi[\\p{L}]*|fot\\.|zdj.ci[\\p{L}]*|schemat[\\p{L}]*|diagram[\\p{L}]*|figure[\\p{L}]*|fig\\.)';
const FIG_REF_APPENDIX = '(?:za..cznik[\\p{L}]*|za.\\.|aneks(?:u|ie|em|y|ach|ami|ow|.w)?|appendix|appendices)';
const FIG_PLURAL = /^(tabele|tabelach|tabelami|rycinach|rycinami|rysunki|rysunkach|rysunkami|wykresy|wykresach|wykresami|fotografie|fotografiach|zdj.cia|zdj.ciach|schematy|schematach|za..czniki|za..cznikach|za..cznikami|tables|figures|appendices)$/i;
const FIG_APPENDIX_ITEM = /^\s*(za..cznik|aneks|appendix)\s*(?:nr\.?\s*)?(\d{1,3})\b/i;
const FIG_APPENDIX_SECTION = /^(aneks|za..czniki|appendix|appendices)\b/i;
const FIG_LIST_HEADING = /^(spis|wykaz)\s+(tabel|rycin|rysunk|wykres|ilustracji|tabel\s+i\s+rycin|rycin\s+i\s+tabel)|^list\s+of\s+(tables|figures)/i;
const FIG_KINDS = ['noCaption', 'captionBelow', 'noSource', 'sourceDate', 'sourceCitation', 'numbering', 'labels', 'badRef',
  'noRef', 'refAfter', 'noList', 'listPlace', 'listMissing', 'listExtra', 'listTitle', 'appendixNoRef', 'appendixBadRef'];
const FIG_INFO_KINDS = { labels: true, noRef: true, refAfter: true };
const FIG_MAX_GAP = 2;

function parseCaption_(text) {
  const match = FIG_CAPTION.exec(String(text || ''));
  if (!match) return null;
  const label = match[1];
  const title = match[4].trim();
  const separator = match[3].trim();
  const upper = /^[\p{Lu}„"]/u.test(title);
  const digits = /[.:]/.test(separator) && /^\d/.test(title) && !/^\d+\s*[-–,]/.test(title);
  const mixed = separator && !/^[-–—]$/.test(separator) && /^\p{Ll}+\p{Lu}/u.test(title);
  if (!upper && !digits && !mixed) return null;
  const number = match[2];
  return {
    kind: FIG_TABLE_LABEL.test(label) ? 'table' : 'figure',
    label: label,
    labelKey: figureLabelKey_(label),
    number: number,
    numberAt: match[0].length - (match[2].length + match[3].length + match[4].length),
    title: title,
    sourceInline: FIG_SOURCE_KEYWORD.test(title) || FIG_SOURCE_CITATION.test(title),
  };
}

function figureLabelKey_(label) {
  return String(label).toLowerCase().replace(/\.$/, '').slice(0, 3);
}

function isSourceLine_(text) {
  return FIG_SOURCE.test(String(text || ''));
}

function numberParts_(number) {
  const parts = String(number).split('.');
  return parts.length > 1 ? { chapter: parts[0], n: Number(parts[1]) } : { chapter: '', n: Number(parts[0]) };
}

function expandRange_(from, to) {
  const a = numberParts_(from);
  const b = numberParts_(to);
  if (a.chapter !== b.chapter || b.n < a.n || b.n - a.n > 50) return [from, to];
  const out = [];
  for (let n = a.n; n <= b.n; n++) out.push(a.chapter ? a.chapter + '.' + n : String(n));
  return out;
}

function numberList_(text, from, plural) {
  const first = new RegExp('^\\s*(?:nr\\.?\\s*)?' + FIG_NUMBER + '(?![\\d\\p{L}%])(?!\\.\\d)', 'u').exec(text.slice(from));
  if (!first) return null;
  const numbers = [first[1]];
  let end = from + first[0].length;
  const tokens = [{ number: first[1], start: end - first[1].length, range: false }];
  const next = new RegExp('^(\\s*(?:[-\\u2013]|,|\\s(?:i|oraz|and)\\s)\\s*)' + FIG_NUMBER + '(?![\\d%])(?!\\.\\d)', 'u');
  const after = /^(\s*$|\s*[),.;:!?](?!\d)|\s*[-–]\s*\d|\s+(i|oraz|and)\s+\d|,\s*\d)/u;
  for (;;) {
    const rest = text.slice(end);
    const match = next.exec(rest);
    if (!match) break;
    const tail = rest.slice(match[0].length);
    const connector = match[1].trim();
    if (!after.test(tail) && !(plural && connector !== ',' && /^\s+\p{Ll}/u.test(tail))) break;
    const range = connector === '-' || connector === '–';
    if (range) {
      const expanded = expandRange_(numbers.pop(), match[2]);
      Array.prototype.push.apply(numbers, expanded);
    } else {
      numbers.push(match[2]);
    }
    end += match[0].length;
    tokens.push({ number: match[2], start: end - match[2].length, range: range });
  }
  return { numbers: numbers, end: end, tokens: tokens };
}

function labelledReferences_(text, labels, kind) {
  const refs = [];
  const pattern = new RegExp('(?<![\\p{L}])' + labels + '(?=[\\s\\d]|$)', 'giu');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const list = numberList_(text, match.index + match[0].length, FIG_PLURAL.test(match[0]));
    if (!list) continue;
    const raw = text.slice(match.index, list.end);
    const labelKey = figureLabelKey_(match[0]);
    list.numbers.forEach(function (number) {
      refs.push({ kind: kind, number: number, start: match.index, end: list.end, raw: raw, labelKey: labelKey, tokens: list.tokens });
    });
    pattern.lastIndex = list.end;
  }
  return refs;
}

function figureReferences_(text) {
  return labelledReferences_(text, FIG_REF_TABLE, 'table')
    .concat(labelledReferences_(text, FIG_REF_FIGURE, 'figure'))
    .sort(function (a, b) { return a.start - b.start; });
}

function appendixReferences_(text) {
  return labelledReferences_(text, FIG_REF_APPENDIX, 'appendix');
}

function normalizeCaptionTitle_(text) {
  return String(text || '').toLowerCase()
    .replace(/\t.*$/, '')
    .replace(/[\s.…]*\d+\s*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function sameCaptionTitle_(a, b) {
  const x = normalizeCaptionTitle_(a);
  const y = normalizeCaptionTitle_(b);
  if (!x || !y) return x === y;
  const length = Math.min(x.length, y.length, 40);
  return x.slice(0, length) === y.slice(0, length);
}

function numberingProblems_(captions) {
  const problems = [];
  let previous = null;
  captions.forEach(function (caption) {
    const parts = numberParts_(caption.number);
    const expected = previous && previous.chapter === parts.chapter ? previous.n + 1 : 1;
    if (parts.n !== expected && !(previous && previous.chapter !== parts.chapter && !parts.chapter)) {
      problems.push({ caption: caption, expected: parts.chapter ? parts.chapter + '.' + expected : String(expected) });
    }
    previous = parts;
  });
  return problems;
}

function figureNumberingProblems_(captions) {
  const byLabel = {};
  captions.forEach(function (caption) { (byLabel[caption.labelKey] = byLabel[caption.labelKey] || []).push(caption); });
  const keys = Object.keys(byLabel);
  if (keys.length < 2) return numberingProblems_(captions);
  const separate = keys.every(function (key) { return numberParts_(byLabel[key][0].number).n === 1; });
  if (!separate) return numberingProblems_(captions);
  return keys.reduce(function (all, key) { return all.concat(numberingProblems_(byLabel[key])); }, []);
}

function figureBlocks_(body) {
  const end = titlePageEnd_(body);
  const blocks = [];
  const count = body.getNumChildren();
  for (let i = end + 1; i < count; i++) {
    const child = castElement_(body.getChild(i));
    if (!child || child.isText) continue;
    const location = { footnote: -1, path: [i] };
    if (child.type === 'TABLE') {
      const table = child.element;
      const images = hasImage_(table);
      blocks.push({ type: 'table', element: table, location: location, index: i, text: table.getText(), imageFrame: images && !table.getText().trim(), heading: '' });
    } else {
      const element = child.element;
      blocks.push({
        type: 'paragraph',
        element: element,
        location: location,
        index: i,
        text: element.getText(),
        heading: String(element.getHeading()),
        image: hasImage_(element) || (typeof element.getPositionedImages === 'function' && element.getPositionedImages().length > 0),
      });
    }
  }
  return blocks;
}

function hasImage_(element) {
  return !!(element.findElement(DocumentApp.ElementType.INLINE_IMAGE) || element.findElement(DocumentApp.ElementType.INLINE_DRAWING));
}

function figuresContext_() {
  const body = DocumentApp.getActiveDocument().getBody();
  const blocks = figureBlocks_(body);
  const isEmpty = function (block) { return block.type === 'paragraph' && !block.image && !block.text.trim(); };
  const neighbour = function (from, step) {
    for (let i = from + step, gap = 0; i >= 0 && i < blocks.length; i += step) {
      if (!isEmpty(blocks[i])) return blocks[i];
      if (++gap > FIG_MAX_GAP) return null;
    }
    return null;
  };
  const ctx = { objects: [], captions: [], refs: [], appendices: [], appendixRefs: [], lists: [], bibliographyIndex: -1, blocks: blocks };

  let appendixLevel = 0;
  blocks.forEach(function (block) {
    const level = block.type === 'paragraph' && block.text.trim() ? headingLevel_(block.heading) : 0;
    if (level) {
      const title = normalizeTitle_(block.text);
      if (appendixLevel && level <= appendixLevel) appendixLevel = 0;
      if (!appendixLevel && (FIG_APPENDIX_SECTION.test(title) || FIG_APPENDIX_ITEM.test(block.text))) appendixLevel = level;
    }
    block.inAppendix = appendixLevel > 0;
  });

  const used = [];
  const free = function (block) { return block && used.indexOf(block) < 0; };
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    const isTable = block.type === 'table' && !block.imageFrame;
    const isFigure = (block.type === 'paragraph' && block.image) || (block.type === 'table' && block.imageFrame);
    if ((!isTable && !isFigure) || block.inAppendix) {
      i++;
      continue;
    }
    let last = i;
    if (isFigure) {
      while (last + 1 < blocks.length && blocks[last + 1].type === 'paragraph' && blocks[last + 1].image && !blocks[last + 1].text.trim()) last++;
    }
    const object = { kind: isTable ? 'table' : 'figure', first: block, last: blocks[last], index: block.index };
    const above = neighbour(i, -1);
    const below = neighbour(last, 1);
    const inside = isTable ? parseCaption_(firstCellText_(block.element)) : null;
    const ownCaption = block.type === 'paragraph' && block.text.trim() ? parseCaption_(block.text) : null;
    if (free(above) && above.type === 'paragraph' && parseCaption_(above.text)) {
      object.caption = { block: above, parsed: parseCaption_(above.text) };
    } else if (inside) {
      object.caption = { block: block, parsed: inside };
    } else if (ownCaption) {
      object.caption = { block: block, parsed: ownCaption };
    } else if (free(below) && below.type === 'paragraph' && parseCaption_(below.text) && !startsObject_(neighbour(blocks.indexOf(below), 1))) {
      object.captionBelow = { block: below, parsed: parseCaption_(below.text) };
    }
    const sourceBlock = object.captionBelow ? neighbour(blocks.indexOf(object.captionBelow.block), 1) : below;
    if (free(sourceBlock) && sourceBlock.type === 'paragraph' && isSourceLine_(sourceBlock.text)) {
      object.source = { block: sourceBlock, text: sourceBlock.text.trim() };
    } else if (isTable && isSourceLine_(lastCellText_(block.element))) {
      object.source = { block: block, text: lastCellText_(block.element).trim() };
    } else if (free(above) && above.type === 'paragraph' && isSourceLine_(above.text) && object.caption && object.caption.block !== above) {
      object.source = { block: above, text: above.text.trim() };
    }
    const caption = object.caption || object.captionBelow;
    if (caption) used.push(caption.block);
    if (object.source) used.push(object.source.block);
    ctx.objects.push(object);
    i = last + 1;
  }
  ctx.objects.forEach(function (object) {
    const caption = object.caption || object.captionBelow;
    if (caption) ctx.captions.push({ object: object, block: caption.block, parsed: caption.parsed });
  });

  let list = null;
  let listLevel = 0;
  blocks.forEach(function (block, position) {
    if (block.type !== 'paragraph') return;
    const text = block.text.trim();
    const level = text ? headingLevel_(block.heading) : 0;
    if (level) {
      const title = normalizeTitle_(text);
      if (list && level <= listLevel) list = null;
      if (BIB_HEADING.test(title)) ctx.bibliographyIndex = position;
      if (FIG_LIST_HEADING.test(title)) {
        list = { block: block, position: position, entries: [] };
        listLevel = level;
        ctx.lists.push(list);
        return;
      }
    }
    if (list && !level) {
      const parsed = parseCaption_(text);
      if (parsed) list.entries.push({ block: block, parsed: parsed });
      return;
    }
    const appendix = FIG_APPENDIX_ITEM.exec(text);
    if (appendix && block.inAppendix && (level || !ctx.appendices.some(function (a) { return a.number === appendix[2]; }))) {
      ctx.appendices.push({ block: block, number: appendix[2], position: position });
      return;
    }
    if (used.indexOf(block) >= 0 || !text || level) return;
    if (!block.inAppendix) {
      figureReferences_(block.text).forEach(function (ref) {
        ref.block = block;
        ref.position = position;
        ctx.refs.push(ref);
      });
    }
    appendixReferences_(block.text).forEach(function (ref) {
      ref.block = block;
      ctx.appendixRefs.push(ref);
    });
  });
  return ctx;
}

function startsObject_(block) {
  return !!block && (block.type === 'table' || !!block.image);
}

function firstCellText_(table) {
  try {
    return table.getNumRows() ? table.getRow(0).getCell(0).getText() : '';
  } catch (e) {
    return '';
  }
}

function lastCellText_(table) {
  try {
    const rows = table.getNumRows();
    if (!rows) return '';
    const row = table.getRow(rows - 1);
    return row.getNumCells() === 1 || !row.getCell(1).getText().trim() ? row.getCell(0).getText() : '';
  } catch (e) {
    return '';
  }
}

function checkFigures(options) {
  const ctx = figuresContext_();
  const groups = checkGroups_(FIG_KINDS, { info: FIG_INFO_KINDS, hide: ignoreFilter_('figures') });
  const add = function (kind, item) {
    groups.add(kind, item);
  };
  const preview = function (text, fallback) {
    const clean = String(text || '').trim();
    if (!clean) return fallback;
    return preview_(clean, 120);
  };
  const blockItem = function (block, label, detail) {
    const shown = block.type === 'table' ? (label ? label + ': ' : '') + preview(block.text.split('\n')[0], '') : preview(block.text, label);
    return { ref: { location: block.location, fingerprint: block.text.trim().slice(0, FINGERPRINT_CHARS) }, showable: true, preview: shown, detail: detail || '', keyText: block.text };
  };
  const objectLabel = function (object) {
    const caption = object.caption || object.captionBelow;
    if (caption) return caption.parsed.label + ' ' + caption.parsed.number;
    return t_(object.kind === 'table' ? 'fig.object.table' : 'fig.object.figure');
  };
  const rangeItem = function (ref, detail) {
    return { ref: { location: ref.block.location, start: ref.start, end: ref.end, fingerprint: ref.raw }, showable: true, preview: ref.raw, detail: detail, keyText: ref.block.text };
  };

  let entries = null;
  ctx.objects.forEach(function (object) {
    if (!object.caption && !object.captionBelow) add('noCaption', blockItem(object.first, objectLabel(object), t_('fig.noCaption.detail')));
    if (object.captionBelow) {
      const item = blockItem(object.captionBelow.block, objectLabel(object), t_('fig.captionBelow.detail'));
      item.fixable = object.captionBelow.block.type === 'paragraph';
      add('captionBelow', item);
    }
    const caption = object.caption || object.captionBelow;
    const inlineSource = caption && caption.parsed.sourceInline;
    if (!object.source && !inlineSource) {
      add('noSource', blockItem(caption ? caption.block : object.first, objectLabel(object), t_('fig.noSource.detail')));
    }
    const sourceText = object.source ? object.source.text : inlineSource ? caption.parsed.title : '';
    if (sourceText && /https?:\/\/|www\./i.test(sourceText) && !FIG_ACCESS_DATE.test(sourceText)) {
      add('sourceDate', blockItem(object.source ? object.source.block : caption.block, objectLabel(object), t_('fig.sourceDate.detail')));
    }
    if (object.source && !/w.asne/i.test(sourceText)) {
      const items = parseCitations_(sourceText).reduce(function (all, c) { return all.concat(c.items); }, [])
        .concat(citationItems_(sourceText.replace(FIG_SOURCE, '').replace(/^\s*:?\s*/, '').replace(/\.\s*$/, '')));
      if (items.length) {
        if (!entries) entries = bibliographyContext_((options || {}).type || savedStructureType_()).entries;
        const missing = items.filter(function (item) { return entries.length && !matchCitation_(item, entries).length; });
        if (missing.length) {
          add('sourceCitation', blockItem(object.source.block, objectLabel(object),
            t_('fig.sourceCitation.detail', { cite: missing.map(function (m) { return m.surname + ' ' + m.year + m.suffix; }).join(', ') })));
        }
      }
    }
  });

  ['table', 'figure'].forEach(function (kind) {
    const captions = ctx.captions.filter(function (c) { return c.parsed.kind === kind; });
    const parsed = captions.map(function (c) { return c.parsed; });
    (kind === 'figure' ? figureNumberingProblems_(parsed) : numberingProblems_(parsed)).forEach(function (problem) {
      const caption = captions.filter(function (c) { return c.parsed === problem.caption; })[0];
      add('numbering', blockItem(caption.block, '', t_('fig.numbering.detail', { label: problem.caption.label, number: problem.expected })));
    });
    if (kind === 'figure') {
      const keys = {};
      captions.forEach(function (c) { keys[c.parsed.labelKey] = c.parsed.label; });
      const labels = Object.keys(keys).map(function (k) { return keys[k]; });
      if (labels.length > 1) {
        add('labels', { ref: {}, showable: false, preview: t_('fig.labels.detail', { labels: labels.join(', ') }), detail: '', keyText: labels.join(', ') });
      }
    }
    const numbers = captions.map(function (c) { return c.parsed.number; });
    const seen = {};
    ctx.refs.filter(function (ref) { return ref.kind === kind; }).forEach(function (ref) {
      const key = ref.number;
      if (numbers.indexOf(key) < 0) {
        add('badRef', rangeItem(ref, t_('fig.badRef.detail', { count: captions.length })));
        return;
      }
      if (!seen[key]) seen[key] = ref;
    });
    captions.forEach(function (c) {
      const first = seen[c.parsed.number];
      if (!first) {
        add('noRef', blockItem(c.block, '', t_('fig.noRef.detail')));
      } else if (first.block.index > c.object.index) {
        add('refAfter', blockItem(c.block, '', t_('fig.refAfter.detail')));
      }
    });
  });

  if (ctx.objects.length) {
    if (!ctx.lists.length) {
      add('noList', { ref: {}, showable: false, preview: t_('fig.noList.detail'), detail: '' });
    } else {
      ctx.lists.forEach(function (list) {
        if (ctx.bibliographyIndex >= 0 && list.position < ctx.bibliographyIndex) {
          add('listPlace', blockItem(list.block, '', t_('fig.listPlace.detail')));
        }
      });
      const listed = ctx.lists.reduce(function (all, list) { return all.concat(list.entries); }, []);
      const same = function (a, b) { return a.kind === b.kind && a.number === b.number; };
      const find = function (items, parsed, pick) {
        const candidates = items.filter(function (item) { return same(pick(item), parsed); });
        return candidates.filter(function (item) { return pick(item).labelKey === parsed.labelKey; })[0] || candidates[0];
      };
      ctx.captions.forEach(function (c) {
        const entry = find(listed, c.parsed, function (e) { return e.parsed; });
        if (!entry) add('listMissing', blockItem(c.block, '', t_('fig.listMissing.detail')));
        else if (!sameCaptionTitle_(entry.parsed.title, c.parsed.title)) add('listTitle', blockItem(entry.block, '', t_('fig.listTitle.detail', { title: preview(c.parsed.title, '') })));
      });
      listed.forEach(function (e) {
        if (!find(ctx.captions, e.parsed, function (c) { return c.parsed; })) add('listExtra', blockItem(e.block, '', t_('fig.listExtra.detail')));
      });
    }
  }

  const appendixNumbers = ctx.appendices.map(function (a) { return a.number; });
  const referenced = {};
  ctx.appendixRefs.forEach(function (ref) {
    if (appendixNumbers.indexOf(ref.number) < 0) add('appendixBadRef', rangeItem(ref, t_('fig.appendixBadRef.detail')));
    else referenced[ref.number] = true;
  });
  ctx.appendices.forEach(function (a) {
    if (!referenced[a.number]) add('appendixNoRef', blockItem(a.block, '', t_('fig.appendixNoRef.detail')));
  });

  return {
    stats: {
      tables: ctx.objects.filter(function (o) { return o.kind === 'table'; }).length,
      figures: ctx.objects.filter(function (o) { return o.kind === 'figure'; }).length,
      appendices: ctx.appendices.length,
    },
    groups: groups.list(),
  };
}

function renumberSeries_(captions) {
  const series = [];
  const tables = captions.filter(function (c) { return c.kind === 'table'; });
  if (tables.length) series.push({ kind: 'table', labelKey: null, captions: tables });
  const figures = captions.filter(function (c) { return c.kind === 'figure'; });
  if (!figures.length) return series;
  const byLabel = {};
  figures.forEach(function (c) { (byLabel[c.labelKey] = byLabel[c.labelKey] || []).push(c); });
  const keys = Object.keys(byLabel);
  const separate = keys.length > 1 && keys.every(function (key) { return numberParts_(byLabel[key][0].number).n === 1; });
  if (!separate) {
    series.push({ kind: 'figure', labelKey: null, captions: figures });
  } else {
    keys.forEach(function (key) { series.push({ kind: 'figure', labelKey: key, captions: byLabel[key] }); });
  }
  return series;
}

function renumberPlan_(input) {
  const out = { changes: [], edits: [], refCount: 0, entryCount: 0, unresolved: [], conflicts: [] };
  const series = renumberSeries_(input.captions).map(function (group) {
    let previous = null;
    let previousNew = 0;
    const items = group.captions.map(function (caption) {
      const parts = numberParts_(caption.number);
      if (previous && previous.chapter !== parts.chapter && !parts.chapter) {
        previous = parts;
        previousNew = parts.n;
        return { caption: caption, assigned: caption.number };
      }
      const n = previous && previous.chapter === parts.chapter ? previousNew + 1 : 1;
      previous = parts;
      previousNew = n;
      return { caption: caption, assigned: parts.chapter ? parts.chapter + '.' + n : String(n) };
    });
    const seen = {};
    const conflict = items.some(function (item) {
      const duplicate = seen[item.assigned];
      seen[item.assigned] = true;
      return duplicate;
    });
    const map = {};
    items.forEach(function (item) {
      const old = item.caption.number;
      map[old] = Object.prototype.hasOwnProperty.call(map, old) ? null : item.assigned;
    });
    const created = {};
    items.forEach(function (item) {
      if (item.assigned !== item.caption.number) created[item.assigned] = true;
    });
    return { kind: group.kind, labelKey: group.labelKey, label: group.captions[0].label, items: items, map: map, created: created, conflict: conflict };
  });

  series.forEach(function (group) {
    if (group.conflict) {
      out.conflicts.push(group.label);
      return;
    }
    group.items.forEach(function (item) {
      const caption = item.caption;
      if (item.assigned === caption.number) return;
      out.changes.push({ kind: caption.kind, label: caption.label, from: caption.number, to: item.assigned });
      out.edits.push({ target: caption.target, at: caption.numberAt, remove: caption.number.length, insert: item.assigned, expect: caption.number });
    });
  });

  const seriesFor = function (kind, labelKey) {
    const candidates = series.filter(function (group) { return group.kind === kind; });
    if (candidates.length === 1 && candidates[0].labelKey === null) return candidates[0];
    return candidates.filter(function (group) { return group.labelKey === labelKey; })[0] || null;
  };
  const lookup = function (group, number) {
    return Object.prototype.hasOwnProperty.call(group.map, number) ? group.map[number] : undefined;
  };
  const unresolved = function (ref, reason, number) {
    out.unresolved.push({ raw: ref.raw, reason: reason, number: number || '' });
  };

  input.refs.forEach(function (ref) {
    const group = seriesFor(ref.kind, ref.labelKey);
    if (!group) {
      const changes = ref.tokens.some(function (token) {
        return series.some(function (g) {
          const value = g.kind === ref.kind ? lookup(g, token.number) : undefined;
          return value !== undefined && value !== token.number;
        });
      });
      if (changes) unresolved(ref, 'label');
      return;
    }
    if (group.conflict) return;
    const edits = [];
    const tokens = ref.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const next = tokens[i + 1];
      if (next && next.range) {
        const numbers = expandRange_(token.number, next.number);
        const mapped = numbers.map(function (number) { return lookup(group, number); });
        i++;
        if (mapped.every(function (value, k) { return value === undefined ? !group.created[numbers[k]] : value === numbers[k]; })) continue;
        if (mapped.some(function (value) { return value === undefined; })) {
          unresolved(ref, 'missing', token.number + '–' + next.number);
          continue;
        }
        if (mapped.some(function (value) { return value === null; })) {
          unresolved(ref, 'ambiguous', token.number + '–' + next.number);
          continue;
        }
        const parts = mapped.map(numberParts_);
        const contiguous = numbers.length > 1 && parts.every(function (p, k) {
          return k === 0 || (p.chapter === parts[0].chapter && p.n === parts[k - 1].n + 1);
        });
        if (!contiguous) {
          unresolved(ref, 'range', token.number + '–' + next.number);
          continue;
        }
        if (mapped[0] !== token.number) edits.push({ target: ref.target, at: token.start, remove: token.number.length, insert: mapped[0], expect: token.number });
        const last = mapped[mapped.length - 1];
        if (last !== next.number) edits.push({ target: ref.target, at: next.start, remove: next.number.length, insert: last, expect: next.number });
        continue;
      }
      const value = lookup(group, token.number);
      if (value === undefined) {
        if (group.created[token.number]) unresolved(ref, 'stale', token.number);
        continue;
      }
      if (value === null) {
        unresolved(ref, 'ambiguous', token.number);
        continue;
      }
      if (value !== token.number) edits.push({ target: ref.target, at: token.start, remove: token.number.length, insert: value, expect: token.number });
    }
    if (edits.length) {
      out.refCount++;
      Array.prototype.push.apply(out.edits, edits);
    }
  });

  input.entries.forEach(function (entry) {
    const group = seriesFor(entry.kind, entry.labelKey);
    if (!group || group.conflict) return;
    const byTitle = group.items.filter(function (item) { return sameCaptionTitle_(item.caption.title, entry.title); });
    const assigned = byTitle.length === 1 ? byTitle[0].assigned : lookup(group, entry.number);
    if (assigned === undefined && group.created[entry.number]) {
      out.unresolved.push({ raw: entry.raw || entry.title, reason: 'stale', number: entry.number });
      return;
    }
    if (!assigned || assigned === entry.number) return;
    out.entryCount++;
    out.edits.push({ target: entry.target, at: entry.numberAt, remove: entry.number.length, insert: assigned, expect: entry.number });
  });
  return out;
}

function renumberFingerprint_(plan) {
  return JSON.stringify(plan.edits.map(function (edit) { return [edit.target.key, edit.at, edit.expect, edit.insert]; }));
}

function renumberInput_(ctx) {
  const paragraphTarget = function (key, element) {
    return { key: key, text: function () { return element.editAsText(); } };
  };
  const captions = ctx.captions.map(function (c) {
    const target = c.block.type === 'table'
      ? paragraphTarget('t' + c.block.index + ':caption', c.block.element.getRow(0).getCell(0))
      : paragraphTarget('b' + c.block.index, c.block.element);
    return {
      kind: c.parsed.kind, label: c.parsed.label, labelKey: c.parsed.labelKey, number: c.parsed.number,
      numberAt: c.parsed.numberAt, title: c.parsed.title, target: target,
    };
  });

  const refs = [];
  const seen = {};
  const addRefs = function (text, target, from) {
    figureReferences_(text).forEach(function (ref) {
      const id = target.key + '@' + ref.start;
      if (ref.start < (from || 0) || seen[id]) return;
      seen[id] = true;
      refs.push({ kind: ref.kind, labelKey: ref.labelKey, raw: ref.raw, tokens: ref.tokens, target: target });
    });
  };
  ctx.refs.forEach(function (ref) {
    const target = paragraphTarget('b' + ref.block.index, ref.block.element);
    const id = target.key + '@' + ref.start;
    if (seen[id]) return;
    seen[id] = true;
    refs.push({ kind: ref.kind, labelKey: ref.labelKey, raw: ref.raw, tokens: ref.tokens, target: target });
  });
  ctx.objects.forEach(function (object) {
    if (object.source && object.source.block.type === 'paragraph') {
      addRefs(object.source.block.text, paragraphTarget('b' + object.source.block.index, object.source.block.element));
    }
  });
  ctx.captions.forEach(function (c, i) {
    const text = c.block.type === 'table' ? firstCellText_(c.block.element) : c.block.text;
    addRefs(text, captions[i].target, c.parsed.numberAt + c.parsed.number.length);
  });
  ctx.blocks.forEach(function (block) {
    if (block.type !== 'paragraph' || block.inAppendix || !block.text.trim() || !headingLevel_(block.heading)) return;
    addRefs(block.text, paragraphTarget('b' + block.index, block.element));
  });
  ctx.blocks.forEach(function (block) {
    if (block.type !== 'table' || block.inAppendix) return;
    const table = block.element;
    for (let r = 0; r < table.getNumRows(); r++) {
      const row = table.getRow(r);
      for (let c = 0; c < row.getNumCells(); c++) {
        const cell = row.getCell(c);
        for (let k = 0; k < cell.getNumChildren(); k++) {
          const child = castElement_(cell.getChild(k));
          if (!child || child.isText || child.type === 'TABLE') continue;
          const text = child.element.getText();
          if (!text.trim() || parseCaption_(text)) continue;
          addRefs(text, paragraphTarget('t' + block.index + ':' + r + ':' + c + ':' + k, child.element));
        }
      }
    }
  });
  const body = DocumentApp.getActiveDocument().getBody();
  const blockAt = {};
  ctx.blocks.forEach(function (block) { blockAt[block.index] = block; });
  const anchorBlock = function (footnote) {
    let node = footnote.getParent();
    while (node && node.getParent() && node.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) node = node.getParent();
    return node && node.getParent() ? blockAt[body.getChildIndex(node)] : null;
  };
  DocumentApp.getActiveDocument().getFootnotes().forEach(function (footnote, f) {
    const anchor = anchorBlock(footnote);
    if (!anchor || anchor.inAppendix) return;
    const contents = footnote.getFootnoteContents();
    if (!contents) return;
    for (let k = 0; k < contents.getNumChildren(); k++) {
      const child = castElement_(contents.getChild(k));
      if (!child || child.isText || child.type === 'TABLE') continue;
      addRefs(child.element.getText(), paragraphTarget('f' + f + ':' + k, child.element));
    }
  });

  const entries = [];
  ctx.lists.forEach(function (list) {
    list.entries.forEach(function (entry) {
      const lead = entry.block.text.length - entry.block.text.replace(/^\s+/, '').length;
      entries.push({
        raw: entry.block.text.trim().slice(0, 60),
        kind: entry.parsed.kind, labelKey: entry.parsed.labelKey, number: entry.parsed.number,
        numberAt: lead + entry.parsed.numberAt, title: entry.parsed.title,
        target: paragraphTarget('b' + entry.block.index, entry.block.element),
      });
    });
  });
  return { captions: captions, refs: refs, entries: entries };
}

function renumberSummary_(plan) {
  return {
    changes: plan.changes,
    refCount: plan.refCount,
    entryCount: plan.entryCount,
    unresolved: plan.unresolved,
    conflicts: plan.conflicts,
    fingerprint: renumberFingerprint_(plan),
  };
}

function applyRenumber_(plan) {
  const groups = {};
  plan.edits.forEach(function (edit) {
    const key = edit.target.key;
    if (!groups[key]) groups[key] = { target: edit.target, edits: [] };
    const same = groups[key].edits.filter(function (other) { return other.at === edit.at; })[0];
    if (same) {
      if (same.remove !== edit.remove || same.insert !== edit.insert) throw userError_('err.renumberChanged');
      return;
    }
    groups[key].edits.push(edit);
  });
  Object.keys(groups).forEach(function (key) {
    const sorted = groups[key].edits.slice().sort(function (a, b) { return a.at - b.at; });
    sorted.forEach(function (edit, i) {
      if (i && sorted[i - 1].at + sorted[i - 1].remove > edit.at) throw userError_('err.renumberChanged');
    });
  });
  const resolved = Object.keys(groups).map(function (key) {
    const group = groups[key];
    const text = group.target.text();
    const content = text.getText();
    group.edits.forEach(function (edit) {
      if (content.substr(edit.at, edit.remove) !== edit.expect) throw userError_('err.renumberChanged');
    });
    return { text: text, edits: group.edits.map(function (edit) { return { at: edit.at, remove: edit.remove, insert: edit.insert }; }) };
  });
  resolved.forEach(function (item) { applyDocumentEdits_(item.text, item.edits); });
}

function previewFigureRenumber() {
  return renumberSummary_(renumberPlan_(renumberInput_(figuresContext_())));
}

function renumberFigures(options, fingerprint) {
  const plan = renumberPlan_(renumberInput_(figuresContext_()));
  if (renumberFingerprint_(plan) !== fingerprint) return { stale: true, preview: renumberSummary_(plan) };
  applyRenumber_(plan);
  return { result: checkFigures(options), captions: plan.changes.length, refs: plan.refCount, entries: plan.entryCount };
}

function figureListEntries_(captions) {
  const ordered = captions.filter(function (c) { return c.kind === 'table'; })
    .concat(captions.filter(function (c) { return c.kind !== 'table'; }));
  return ordered.map(function (c) {
    const title = String(c.title || '').replace(/\s+/g, ' ').trim();
    return { id: c.id, text: c.label + ' ' + c.number + '. ' + title, page: c.page || null };
  });
}

function figureListPlan_(ctx, withPages) {
  const pages = withPages ? estimatedChildPages_() : null;
  const captions = ctx.captions.map(function (c, i) {
    return { id: i, kind: c.parsed.kind, label: c.parsed.label, number: c.parsed.number, title: c.parsed.title, page: pages ? pages[c.block.index] : null };
  });
  const bibliography = ctx.bibliographyIndex >= 0 ? ctx.blocks[ctx.bibliographyIndex] : null;
  return {
    entries: figureListEntries_(captions),
    place: ctx.lists.length > 1 ? 'replaceMany' : ctx.lists.length ? 'replace' : bibliography ? 'afterBibliography' : 'end',
    existing: ctx.lists.reduce(function (sum, list) { return sum + list.entries.length; }, 0),
    pages: !!pages,
  };
}

function previewFigureList() {
  const plan = figureListPlan_(figuresContext_(), true);
  return { entries: plan.entries, place: plan.place, existing: plan.existing, pages: plan.pages };
}

function figureListBookmark_(doc, c) {
  try {
    return figureListBookmarkAt_(doc, c);
  } catch (e) {
    console.warn('Nie udało się dodać zakładki: ' + e.message);
    return null;
  }
}

function figureListBookmarkAt_(doc, c) {
  let paragraph = c.block.element;
  if (c.block.type === 'table') {
    const cell = c.block.element.getRow(0).getCell(0);
    paragraph = null;
    for (let k = 0; k < cell.getNumChildren() && !paragraph; k++) {
      const child = castElement_(cell.getChild(k));
      if (child && !child.isText && child.type !== 'TABLE' && child.element.getText().trim()) paragraph = child.element;
    }
    if (!paragraph) return null;
  }
  const text = paragraph.editAsText();
  if (!text.getText().length) return null;
  return doc.addBookmark(doc.newPosition(text, 0)).getId();
}

function insertFigureList(options, settings) {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const ctx = figuresContext_();
  if (!ctx.captions.length) throw userError_('err.figListEmpty');
  const wantPages = !settings || settings.pages !== false;
  const wantLinks = !settings || settings.links !== false;
  const plan = figureListPlan_(ctx, false);

  const props = PropertiesService.getDocumentProperties();
  try {
    JSON.parse(props.getProperty('figListBookmarks') || '[]').forEach(function (id) {
      const old = doc.getBookmark(id);
      if (old) old.remove();
    });
  } catch (e) {
    console.warn('Nie udało się usunąć starych zakładek spisu: ' + e.message);
  }
  const bookmarks = {};
  if (wantLinks) ctx.captions.forEach(function (c, i) { bookmarks[i] = figureListBookmark_(doc, c); });

  let insertAt;
  if (ctx.lists.length) {
    ctx.lists.slice(1).reverse().forEach(function (list) {
      clearFigureList_(body, list.block.index + 1);
      if (list.block.index < body.getNumChildren() - 1) list.block.element.removeFromParent();
    });
    insertAt = ctx.lists[0].block.index + 1;
    clearFigureList_(body, insertAt);
  } else {
    const bibliography = plan.place === 'afterBibliography' ? ctx.blocks[ctx.bibliographyIndex] : null;
    const level = bibliography ? headingLevel_(bibliography.heading) || 1 : 1;
    let at = body.getNumChildren();
    const firstAppendix = ctx.blocks.filter(function (b) { return b.inAppendix; })[0];
    for (let j = (bibliography ? bibliography.index : 0) + 1; j < body.getNumChildren(); j++) {
      const child = castElement_(body.getChild(j));
      if (!child || child.isText || child.type === 'TABLE') continue;
      const childLevel = headingLevel_(String(child.element.getHeading()));
      if ((bibliography && childLevel && childLevel <= level) || (firstAppendix && j === firstAppendix.index)) {
        at = j;
        break;
      }
    }
    const heading = body.insertParagraph(at, t_('fig.list.heading'));
    heading.setHeading(bibliography ? bibliography.element.getHeading() : DocumentApp.ParagraphHeading.HEADING1);
    insertAt = at + 1;
  }

  let template = null;
  for (let k = 0; k < body.getNumChildren(); k++) {
    if (String(body.getChild(k).getType()) !== 'TABLE_OF_CONTENTS') continue;
    const toc = body.getChild(k).asTableOfContents();
    if (toc.getNumChildren() && String(toc.getChild(0).getType()) === 'PARAGRAPH') template = toc.getChild(0).asParagraph();
    break;
  }
  const normal = body.getAttributes()[DocumentApp.Attribute.FOREGROUND_COLOR];
  const color = typeof normal === 'string' && normal ? normal : '#000000';
  const inserted = plan.entries.map(function (entry, k) {
    const paragraph = template ? body.insertParagraph(insertAt + k, template.copy()) : body.insertParagraph(insertAt + k, '');
    paragraph.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    paragraph.setText(entry.text);
    const text = paragraph.editAsText();
    const end = text.getText().length - 1;
    text.setLinkUrl(0, end, null).setBold(0, end, false).setItalic(0, end, false);
    if (bookmarks[entry.id]) text.setLinkUrl(0, end, '#bookmark=' + bookmarks[entry.id]);
    text.setForegroundColor(0, end, color).setUnderline(0, end, false);
    return paragraph;
  });
  let pagesShown = false;
  if (wantPages) {
    const after = figureListPlan_(figuresContext_(), true);
    if (after.pages && after.entries.length === inserted.length) {
      after.entries.forEach(function (entry, k) {
        if (!entry.page) return;
        const text = inserted[k].editAsText();
        const start = text.getText().length;
        text.appendText('\t' + entry.page);
        text.setLinkUrl(start, start + String(entry.page).length, null);
        pagesShown = true;
      });
    }
  }
  props.setProperty('figListBookmarks', JSON.stringify(Object.keys(bookmarks).map(function (k) { return bookmarks[k]; }).filter(Boolean)));
  return { result: checkFigures(options), count: plan.entries.length, place: plan.place, pages: pagesShown };
}

function plainEmptyParagraph_(element) {
  if (element.getText().length) return false;
  for (let k = 0; k < element.getNumChildren(); k++) {
    if (String(element.getChild(k).getType()) !== 'TEXT') return false;
  }
  return !(typeof element.getPositionedImages === 'function' && element.getPositionedImages().length);
}

function clearFigureList_(body, from) {
  while (from < body.getNumChildren() - 1) {
    const child = castElement_(body.getChild(from));
    if (!child || child.isText || child.type === 'TABLE' || headingLevel_(String(child.element.getHeading()))) return;
    const text = child.element.getText();
    const entry = text.trim() && parseCaption_(text.trim()) && !(typeof child.element.getPositionedImages === 'function' && child.element.getPositionedImages().length) &&
      !child.element.findElement(DocumentApp.ElementType.INLINE_IMAGE) && !child.element.findElement(DocumentApp.ElementType.PAGE_BREAK) &&
      !child.element.findElement(DocumentApp.ElementType.FOOTNOTE);
    if (!entry && !plainEmptyParagraph_(child.element)) return;
    child.element.removeFromParent();
  }
}

function captionBelowObjects_(ctx) {
  return ctx.objects.filter(function (object) { return object.captionBelow && object.captionBelow.block.type === 'paragraph'; });
}

function moveCaptionAbove_(body, object) {
  const caption = object.captionBelow.block.index;
  const first = object.first.index;
  const last = object.last.index;
  for (let k = 0; k <= last - first; k++) {
    const source = body.getChild(first + k);
    const type = String(source.getType());
    const copy = source.copy();
    if (type === 'TABLE') body.insertTable(caption + 1 + k, copy);
    else if (type === 'LIST_ITEM') body.insertListItem(caption + 1 + k, copy);
    else body.insertParagraph(caption + 1 + k, copy);
  }
  for (let i = last; i >= first; i--) body.getChild(i).removeFromParent();
}

function moveFigureCaption(options, ref) {
  const body = DocumentApp.getActiveDocument().getBody();
  const ctx = figuresContext_();
  const object = captionBelowObjects_(ctx).filter(function (o) {
    return o.captionBelow.block.index === ref.location.path[0] && o.captionBelow.block.text.trim().slice(0, FINGERPRINT_CHARS) === ref.fingerprint;
  })[0];
  if (!object) throw userError_('err.figCaptionMoved');
  moveCaptionAbove_(body, object);
  if (ref.keepCursor) keepCursorAt_(body.getChild(object.first.index), 0);
  return checkFigures(options);
}

function moveAllFigureCaptions(options) {
  const body = DocumentApp.getActiveDocument().getBody();
  const objects = captionBelowObjects_(figuresContext_());
  objects.slice().sort(function (a, b) { return b.first.index - a.first.index; }).forEach(function (object) { moveCaptionAbove_(body, object); });
  return { result: checkFigures(options), moved: objects.length };
}
