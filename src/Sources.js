const SOURCE_INDEX_NAME = 'index.json';

const CONVERTIBLE_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/msword': 'Word',
  'application/vnd.oasis.opendocument.text': 'ODT',
  'application/rtf': 'RTF',
};

const PLAIN_TYPES = {
  'text/plain': 'Tekst',
  'text/markdown': 'Markdown',
};

function sourceTypeLabel_(mimeType) {
  if (mimeType === MimeType.GOOGLE_DOCS) return 'Dokument Google';
  return CONVERTIBLE_TYPES[mimeType] || PLAIN_TYPES[mimeType] || null;
}

function listSources() {
  const index = readSourceIndex_(false);
  return currentSourceFiles_()
    .map(function (file) { return describeSource_(file, index.data[file.getId()]); })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'pl'); });
}

function cleanupSources() {
  const index = readSourceIndex_(false);
  if (!index.folderId) return { removed: 0 };
  const current = {};
  currentSourceFiles_().forEach(function (file) { current[file.getId()] = true; });
  let removed = 0;
  Object.keys(index.data).forEach(function (id) {
    if (current[id]) return;
    storeTrash_(index.data[id].textFileId);
    storeTrash_(index.data[id].rawFileId);
    delete index.data[id];
    removed++;
  });
  if (removed) storeWriteJson_(index.folderId, SOURCE_INDEX_NAME, index);
  return { removed: removed };
}

function processSource(fileId) {
  const index = readSourceIndex_(true);
  const file = DriveApp.getFileById(fileId);
  const previous = index.data[fileId] || {};
  const entry = {
    name: file.getName(),
    mimeType: file.getMimeType(),
    modified: file.getLastUpdated().toISOString(),
    processedAt: new Date().toISOString(),
    pipeline: TEXT_PIPELINE_VERSION,
    textFileId: previous.textFileId || null,
    rawFileId: previous.rawFileId || null,
  };
  try {
    const raw = extractText_(file, index.folderId);
    const cleaned = cleanSourceText_(raw);
    entry.rawFileId = storeWriteText_(index.folderId, entry.rawFileId, file.getName() + ' (surowy).txt', raw);
    entry.textFileId = storeWriteText_(index.folderId, entry.textFileId, file.getName() + '.txt', cleaned.text);
    entry.chars = cleaned.text.length;
    entry.pages = cleaned.pages;
    entry.status = cleaned.text ? 'ok' : 'empty';
  } catch (e) {
    console.error('Przetwarzanie ' + file.getName() + ': ' + e.message);
    entry.status = 'error';
    entry.error = e.name === 'UserError' ? e.message : 'Nie udało się odczytać tekstu: ' + e.message;
  }
  index.data[fileId] = entry;
  storeWriteJson_(index.folderId, SOURCE_INDEX_NAME, index);
  return describeSource_(file, entry);
}

function getReadySources_() {
  const index = readSourceIndex_(false);
  return currentSourceFiles_()
    .map(function (file) {
      const entry = index.data[file.getId()];
      if (describeSource_(file, entry).status !== 'ok') return null;
      return { id: file.getId(), name: file.getName(), pages: entry.pages || null, textFileId: entry.textFileId };
    })
    .filter(Boolean);
}

function readSourceIndex_(create) {
  const folderId = storeFolderId_(STORE.TEXTS, create);
  if (!folderId) return { folderId: null, fileId: null, data: {} };
  const doc = storeReadJson_(folderId, SOURCE_INDEX_NAME);
  doc.folderId = folderId;
  return doc;
}

function currentSourceFiles_() {
  const files = [];
  collectFiles_(DriveApp.getFolderById(getSourceFolderId_()), files);
  const activeDocId = DocumentApp.getActiveDocument().getId();
  return files.filter(function (file) { return file.getId() !== activeDocId; });
}

function collectFiles_(folder, out) {
  const files = folder.getFiles();
  while (files.hasNext()) out.push(files.next());
  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const sub = folders.next();
    if (!isDataFolderName_(sub.getName())) collectFiles_(sub, out);
  }
}

function describeSource_(file, entry) {
  const mimeType = file.getMimeType();
  const item = {
    id: file.getId(),
    name: file.getName(),
    type: sourceTypeLabel_(mimeType) || mimeType,
    url: file.getUrl(),
    status: 'pending',
    chars: null,
    pages: null,
    error: null,
  };
  if (!sourceTypeLabel_(mimeType)) {
    item.status = 'unsupported';
  } else if (entry && entry.modified !== file.getLastUpdated().toISOString()) {
    item.status = 'changed';
  } else if (entry && entry.pipeline !== TEXT_PIPELINE_VERSION) {
    item.status = 'outdated';
  } else if (entry) {
    item.status = entry.status;
    item.chars = entry.chars || null;
    item.pages = entry.pages || null;
    item.error = entry.error || null;
  }
  return item;
}

function extractText_(file, workFolderId) {
  const mimeType = file.getMimeType();
  if (mimeType === MimeType.GOOGLE_DOCS) return exportAsText_(file.getId());
  if (PLAIN_TYPES[mimeType]) return file.getBlob().getDataAsString('UTF-8');
  if (CONVERTIBLE_TYPES[mimeType]) return convertAndExport_(file, workFolderId);
  throw userError_('Nieobsługiwany typ pliku.');
}

function convertAndExport_(file, workFolderId) {
  let copy;
  try {
    copy = Drive.Files.copy(
      { name: 'PDZ (tymczasowy) – ' + file.getName(), mimeType: MimeType.GOOGLE_DOCS, parents: [workFolderId] },
      file.getId(),
      { ocrLanguage: 'pl', supportsAllDrives: true }
    );
  } catch (e) {
    throw userError_('Dysk Google nie przekonwertował pliku na tekst (' + e.message + '). Możliwa przyczyna: plik jest za duży albo to skan słabej jakości.');
  }
  try {
    return exportAsText_(copy.id);
  } finally {
    Drive.Files.remove(copy.id, { supportsAllDrives: true });
  }
}

function exportAsText_(fileId) {
  const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '/export?mimeType=text%2Fplain';
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw userError_('Dysk Google nie wyeksportował tekstu (HTTP ' + response.getResponseCode() + '). Dokument może być większy niż 10 MB tekstu.');
  }
  return response.getContentText('UTF-8');
}
