const TYPO_NBSP = ' ';
const TYPO_KINDS = ['orphan', 'quotes', 'dash', 'ellipsis', 'spaces', 'punctuation'];
const TYPO_LINK_SENSITIVE = { quotes: true, dash: true, ellipsis: true };

const TYPO_RULES = {
  orphan: function (text) {
    return matchAll_(text, /(?<=^|[\s (\[„"'])[aiouwzAIOUWZ] (?=[^\s ])/g, function (m) {
      return { start: m.index, end: m.index + 2, edits: [{ at: m.index + 1, remove: 1, insert: TYPO_NBSP }] };
    });
  },
  quotes: function (text) {
    return matchAll_(text, /([„"])([^„“”"\n\r\u000b]{1,300})([“”"])/g, function (m) {
      const open = m[1];
      const close = m[3];
      if (open === '„' && close === '”') return null;
      const end = m.index + m[0].length;
      const edits = [];
      if (close !== '”') edits.push({ at: end - 1, remove: 1, insert: '”' });
      if (open !== '„') edits.push({ at: m.index, remove: 1, insert: '„' });
      return { start: m.index, end: end, edits: edits };
    });
  },
  dash: function (text) {
    const spaced = matchAll_(text, /(?<=\S) - (?=\S)/g, function (m) {
      return { start: m.index, end: m.index + 3, edits: [{ at: m.index + 1, remove: 1, insert: '–' }] };
    });
    const ranges = matchAll_(text, /(?<=(?:^|[^\w\-\/.])(?:\d{1,4}|(?:s|ss|str|pp|p)\.\s?\d{1,4}))-(?=\d{1,4}(?![\w\-\/]))/g, function (m) {
      const before = /\d+$/.exec(text.slice(0, m.index));
      const after = /^\d+/.exec(text.slice(m.index + 1));
      return {
        start: m.index - before[0].length,
        end: m.index + 1 + after[0].length,
        edits: [{ at: m.index, remove: 1, insert: '–' }],
      };
    });
    return spaced.concat(ranges).sort(function (a, b) { return a.start - b.start; });
  },
  ellipsis: function (text) {
    return matchAll_(text, /(?<!\.)\.\.\.(?!\.)/g, function (m) {
      return { start: m.index, end: m.index + 3, edits: [{ at: m.index, remove: 3, insert: '…' }] };
    });
  },
  spaces: function (text) {
    return matchAll_(text, / {2,}/g, function (m) {
      return { start: m.index, end: m.index + m[0].length, edits: [{ at: m.index + 1, remove: m[0].length - 1, insert: '' }] };
    });
  },
  punctuation: function (text) {
    const before = matchAll_(text, /(?<=[^\s ]) +(?=[,.;:!?](?:\s|$)|\))/g, function (m) {
      const end = m.index + m[0].length;
      return { start: m.index, end: end + 1, edits: [{ at: m.index, remove: m[0].length, insert: '' }] };
    });
    const after = matchAll_(text, /(?<=[(„]) +/g, function (m) {
      return { start: m.index - 1, end: m.index + m[0].length, edits: [{ at: m.index, remove: m[0].length, insert: '' }] };
    });
    return before.concat(after).sort(function (a, b) { return a.start - b.start; });
  },
};

function findTypographyIssues_(text, kinds) {
  const issues = [];
  (kinds || TYPO_KINDS).forEach(function (kind) {
    TYPO_RULES[kind](text).forEach(function (issue) {
      issue.kind = kind;
      issue.original = text.slice(issue.start, issue.end);
      issues.push(issue);
    });
  });
  return issues;
}

function typographyEdits_(issues) {
  const accepted = [];
  issues.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (issue) {
    const clash = issue.edits.some(function (edit) {
      return accepted.some(function (other) {
        return edit.at < other.at + Math.max(other.remove, 1) && other.at < edit.at + Math.max(edit.remove, 1);
      });
    });
    if (!clash) Array.prototype.push.apply(accepted, issue.edits);
  });
  return accepted;
}

function applyTypographyEdits_(text, edits) {
  return edits.slice().sort(function (a, b) { return b.at - a.at; }).reduce(function (result, edit) {
    return result.slice(0, edit.at) + edit.insert + result.slice(edit.at + edit.remove);
  }, text);
}

function matchAll_(text, pattern, build) {
  const results = [];
  let m;
  pattern.lastIndex = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m[0].length === 0) pattern.lastIndex++;
    const issue = build(m);
    if (issue) results.push(issue);
  }
  return results;
}
