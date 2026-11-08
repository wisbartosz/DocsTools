const SOURCE_INDEX_NAME = 'index.json';

const SOURCE_TYPES = {
  'application/vnd.google-apps.document': { label: 'type.gdoc', read: 'export' },
  'application/pdf': { label: 'type.pdf', read: 'convert' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'type.word', read: 'convert' },
  'application/msword': { label: 'type.word', read: 'convert' },
  'application/vnd.oasis.opendocument.text': { label: 'type.odt', read: 'convert' },
  'application/rtf': { label: 'type.rtf', read: 'convert' },
  'text/plain': { label: 'type.text', read: 'plain' },
  'text/markdown': { label: 'type.markdown', read: 'plain' },
};

function listSources() {
  const index = readSourceIndex_(false);
  return currentSourceFiles_()
    .map(function (file) { return describeSource_(file, index.data[file.getId()]); })
    .sort(function (a, b) { return a.name.localeCompare(b.name, uiLanguage_()); });
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
    entry.errorKey = e.messageKey || 'src.readFailed';
    entry.errorParams = e.messageKey ? e.messageParams : { details: e.message };
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
      return {
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        pages: entry.pages || null,
        chars: entry.chars || 0,
        textFileId: entry.textFileId,
      };
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
  const type = SOURCE_TYPES[file.getMimeType()];
  const item = {
    id: file.getId(),
    name: file.getName(),
    type: type ? t_(type.label) : file.getMimeType(),
    url: file.getUrl(),
    status: 'pending',
    chars: null,
    pages: null,
    error: null,
  };
  if (!type) {
    item.status = 'unsupported';
  } else if (entry && entry.modified !== file.getLastUpdated().toISOString()) {
    item.status = 'changed';
  } else if (entry && entry.pipeline !== TEXT_PIPELINE_VERSION) {
    item.status = 'outdated';
  } else if (entry) {
    item.status = entry.status;
    item.chars = entry.chars || null;
    item.pages = entry.pages || null;
    item.error = entry.errorKey ? t_(entry.errorKey, entry.errorParams) : null;
  }
  return item;
}

function extractText_(file, workFolderId) {
  const type = SOURCE_TYPES[file.getMimeType()];
  if (!type) throw userError_('src.unsupported');
  if (type.read === 'export') return exportAsText_(file.getId());
  if (type.read === 'plain') return file.getBlob().getDataAsString('UTF-8');
  return convertAndExport_(file, workFolderId);
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
    throw userError_('src.convertFailed', { details: e.message });
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
    throw userError_('src.exportFailed', { code: response.getResponseCode() });
  }
  return response.getContentText('UTF-8');
}
