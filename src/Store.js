const DATA_FOLDER_NAME = 'PDZ – dane';
const LEGACY_DATA_FOLDER_PREFIXES = ['PDZ –', 'DocsTools –'];

const STORE = {
  TEXTS: 'teksty',
};

function isDataFolderName_(name) {
  return LEGACY_DATA_FOLDER_PREFIXES.some(function (prefix) { return name.indexOf(prefix) === 0; });
}

function dataFolderId_(create) {
  const props = docProps_();
  const savedId = props.getProperty(PROP.DATA_FOLDER);
  if (savedId) {
    try {
      if (!DriveApp.getFolderById(savedId).isTrashed()) return savedId;
    } catch (e) {
      console.warn('Folder danych ' + savedId + ' niedostępny: ' + e.message);
    }
  }
  const sourceFolder = DriveApp.getFolderById(getSourceFolderId_());
  const existing = sourceFolder.getFoldersByName(DATA_FOLDER_NAME);
  let id = existing.hasNext() ? existing.next().getId() : null;
  if (!id && create) id = createFolder_(DATA_FOLDER_NAME, sourceFolder.getId(), true);
  if (id) props.setProperty(PROP.DATA_FOLDER, id);
  return id;
}

function storeFolderId_(name, create) {
  const rootId = dataFolderId_(create);
  if (!rootId) return null;
  const existing = DriveApp.getFolderById(rootId).getFoldersByName(name);
  if (existing.hasNext()) return existing.next().getId();
  return create ? createFolder_(name, rootId, false) : null;
}

function createFolder_(name, parentId, fallbackToRoot) {
  const metadata = { name: name, mimeType: MimeType.FOLDER };
  try {
    return Drive.Files.create(Object.assign({ parents: [parentId] }, metadata), null, { supportsAllDrives: true }).id;
  } catch (e) {
    if (!fallbackToRoot) throw e;
    console.warn('Brak zapisu w folderze źródeł, folder danych w Mój dysk: ' + e.message);
    return Drive.Files.create(metadata).id;
  }
}

function storeReadJson_(folderId, name) {
  const files = DriveApp.getFolderById(folderId).getFilesByName(name);
  if (!files.hasNext()) return { fileId: null, data: {} };
  const file = files.next();
  return { fileId: file.getId(), data: JSON.parse(file.getBlob().getDataAsString('UTF-8') || '{}') };
}

function storeWriteJson_(folderId, name, doc) {
  const blob = Utilities.newBlob(JSON.stringify(doc.data, null, 1), 'application/json', name);
  doc.fileId = storeWriteBlob_(folderId, doc.fileId, name, 'application/json', blob);
  return doc;
}

function storeWriteText_(folderId, fileId, name, text) {
  return storeWriteBlob_(folderId, fileId, name, 'text/plain', Utilities.newBlob(text, 'text/plain', name));
}

function storeReadText_(fileId) {
  return DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
}

function storeWriteBlob_(folderId, fileId, name, mimeType, blob) {
  if (fileId) {
    try {
      Drive.Files.update({ name: name }, fileId, blob, { supportsAllDrives: true });
      return fileId;
    } catch (e) {
      console.warn('Plik ' + fileId + ' niedostępny, tworzę nowy: ' + e.message);
    }
  }
  return Drive.Files.create({ name: name, mimeType: mimeType, parents: [folderId] }, blob, { supportsAllDrives: true }).id;
}

function storeTrash_(fileId) {
  if (!fileId) return;
  try {
    Drive.Files.update({ trashed: true }, fileId, null, { supportsAllDrives: true });
  } catch (e) {
    console.warn('Nie udało się przenieść do kosza ' + fileId + ': ' + e.message);
  }
}
