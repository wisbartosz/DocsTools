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
const FIG_MAX_ITEMS = 100;
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
    labelKey: label.toLowerCase().replace(/\.$/, '').slice(0, 3),
    number: number,
    title: title,
    sourceInline: FIG_SOURCE_KEYWORD.test(title) || FIG_SOURCE_CITATION.test(title),
  };
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
  const next = new RegExp('^(\\s*(?:[-\\u2013]|,|\\s(?:i|oraz|and)\\s)\\s*)' + FIG_NUMBER + '(?![\\d%])(?!\\.\\d)', 'u');
  const after = /^(\s*$|\s*[),.;:!?](?!\d)|\s*[-–]\s*\d|\s+(i|oraz|and)\s+\d|,\s*\d)/u;
  for (;;) {
    const rest = text.slice(end);
    const match = next.exec(rest);
    if (!match) break;
    const tail = rest.slice(match[0].length);
    const connector = match[1].trim();
    if (!after.test(tail) && !(plural && connector !== ',' && /^\s+\p{Ll}/u.test(tail))) break;
    if (connector === '-' || connector === '–') {
      const range = expandRange_(numbers.pop(), match[2]);
      Array.prototype.push.apply(numbers, range);
    } else {
      numbers.push(match[2]);
    }
    end += match[0].length;
  }
  return { numbers: numbers, end: end };
}

function labelledReferences_(text, labels, kind) {
  const refs = [];
  const pattern = new RegExp('(?<![\\p{L}])' + labels + '(?=[\\s\\d]|$)', 'giu');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const list = numberList_(text, match.index + match[0].length, FIG_PLURAL.test(match[0]));
    if (!list) continue;
    const raw = text.slice(match.index, list.end);
    list.numbers.forEach(function (number) {
      refs.push({ kind: kind, number: number, start: match.index, end: list.end, raw: raw });
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

function headingLevel_(heading) {
  const match = /^HEADING([1-6])$/.exec(heading || '');
  return match ? Number(match[1]) : 0;
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
  const groups = {};
  FIG_KINDS.forEach(function (kind) { groups[kind] = { kind: kind, count: 0, items: [], info: !!FIG_INFO_KINDS[kind] }; });
  const add = function (kind, item) {
    groups[kind].count++;
    if (groups[kind].items.length < FIG_MAX_ITEMS) groups[kind].items.push(item);
  };
  const preview = function (text, fallback) {
    const clean = String(text || '').trim();
    if (!clean) return fallback;
    return clean.length > 120 ? clean.slice(0, 120) + '…' : clean;
  };
  const blockItem = function (block, label, detail) {
    const shown = block.type === 'table' ? (label ? label + ': ' : '') + preview(block.text.split('\n')[0], '') : preview(block.text, label);
    return { ref: { location: block.location, fingerprint: block.text.trim().slice(0, 40) }, showable: true, preview: shown, detail: detail || '' };
  };
  const objectLabel = function (object) {
    const caption = object.caption || object.captionBelow;
    if (caption) return caption.parsed.label + ' ' + caption.parsed.number;
    return t_(object.kind === 'table' ? 'fig.object.table' : 'fig.object.figure');
  };
  const rangeItem = function (ref, detail) {
    return { ref: { location: ref.block.location, start: ref.start, end: ref.end, fingerprint: ref.raw }, showable: true, preview: ref.raw, detail: detail };
  };

  let entries = null;
  ctx.objects.forEach(function (object) {
    if (!object.caption && !object.captionBelow) add('noCaption', blockItem(object.first, objectLabel(object), t_('fig.noCaption.detail')));
    if (object.captionBelow) add('captionBelow', blockItem(object.captionBelow.block, objectLabel(object), t_('fig.captionBelow.detail')));
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
        add('labels', { ref: {}, showable: false, preview: t_('fig.labels.detail', { labels: labels.join(', ') }), detail: '' });
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
    groups: FIG_KINDS.map(function (kind) { return groups[kind]; }),
  };
}
