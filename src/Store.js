const DATA_FOLDER_NAME = 'PDZ – dane';
const LEGACY_DATA_FOLDER_PREFIXES = ['PDZ –', 'DocsTools –'];

const STORE = {
  TEXTS: 'teksty',
};

const OWN_DATA_FOLDERS_PROP = 'ownDataFolders';
const LEGACY_OWN_DATA_FOLDERS_PROP = 'dataFolderWritable';
const DATA_FOLDER_OWN_MAX = 20;

function isDataFolderName_(name) {
  return LEGACY_DATA_FOLDER_PREFIXES.some(function (prefix) { return name.indexOf(prefix) === 0; });
}

function ownDataFolders_() {
  try {
    return JSON.parse(userProps_().getProperty(OWN_DATA_FOLDERS_PROP) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function legacyOwnDataFolders_() {
  const saved = (docProps_().getProperty(LEGACY_OWN_DATA_FOLDERS_PROP) || '').split('|');
  if (saved.length !== 2 || saved[0] !== ScriptApp.getScriptId()) return [];
  return saved[1].split(',').filter(Boolean);
}

function setOwnDataFolder_(sourceFolderId, dataFolderId) {
  const own = ownDataFolders_();
  delete own[sourceFolderId];
  if (dataFolderId) own[sourceFolderId] = dataFolderId;
  const keys = Object.keys(own);
  keys.slice(0, Math.max(0, keys.length - DATA_FOLDER_OWN_MAX)).forEach(function (key) { delete own[key]; });
  userProps_().setProperty(OWN_DATA_FOLDERS_PROP, JSON.stringify(own));
}

function usableFolder_(id) {
  if (!id) return false;
  try {
    return !DriveApp.getFolderById(id).isTrashed();
  } catch (e) {
    console.warn('Folder danych ' + id + ' niedostepny: ' + e.message);
    return false;
  }
}

function dataFolderId_(create) {
  const sourceFolderId = getSourceFolderId_();
  const own = ownDataFolders_()[sourceFolderId];
  if (usableFolder_(own)) return own;
  const props = docProps_();
  const savedId = props.getProperty(PROP.DATA_FOLDER);
  if (usableFolder_(savedId)) return savedId;
  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const known = legacyOwnDataFolders_();
  const found = sourceFolder.searchFolders('title = "' + driveQueryValue_(DATA_FOLDER_NAME) + '" and trashed = false');
  let id = null;
  while (found.hasNext()) {
    const candidate = found.next().getId();
    if (known.indexOf(candidate) >= 0) {
      id = candidate;
      setOwnDataFolder_(sourceFolderId, id);
      break;
    }
    if (!id) id = candidate;
  }
  if (!id && create) {
    id = createFolder_(DATA_FOLDER_NAME, sourceFolderId, true);
    setOwnDataFolder_(sourceFolderId, id);
  }
  if (id) props.setProperty(PROP.DATA_FOLDER, id);
  return id;
}

function isAppGrantError_(e) {
  return /not granted the app|appNotAuthorizedToFile/i.test(String(e && e.message));
}

function isAppAccessError_(e) {
  return isAppGrantError_(e) || /insufficientFilePermissions|sufficient permissions/i.test(String(e && e.message));
}

function forgetDataFolder_() {
  setOwnDataFolder_(getSourceFolderId_(), null);
}

function ensureWritableDataFolder_() {
  const sourceFolderId = getSourceFolderId_();
  const id = dataFolderId_(false);
  if (!id || ownDataFolders_()[sourceFolderId] === id) return id;
  const probes = [id];
  const textsId = activeChildFolderId_(DriveApp.getFolderById(id), STORE.TEXTS);
  if (textsId) {
    const index = DriveApp.getFolderById(textsId).searchFiles('title = "' + driveQueryValue_(SOURCE_INDEX_NAME) + '" and trashed = false');
    if (index.hasNext()) probes.push(index.next().getId());
  }
  try {
    probes.forEach(function (probeId) { Drive.Files.update({}, probeId, null, { supportsAllDrives: true }); });
  } catch (e) {
    if (!isAppAccessError_(e)) {
      console.warn('Nie udalo sie sprawdzic folderu danych ' + id + ': ' + e.message);
      return id;
    }
    console.warn('Folder danych ' + id + ' nie jest zapisywalny dla tej kopii dodatku, zakladam nowy: ' + e.message);
    const created = createFolder_(DATA_FOLDER_NAME, sourceFolderId, true);
    setOwnDataFolder_(sourceFolderId, created);
    return created;
  }
  setOwnDataFolder_(sourceFolderId, id);
  return id;
}

function storeFolderId_(name, create) {
  const rootId = dataFolderId_(create);
  if (!rootId) return null;
  const id = activeChildFolderId_(DriveApp.getFolderById(rootId), name);
  if (id) return id;
  return create ? createFolder_(name, rootId, false) : null;
}

function activeChildFolderId_(parent, name) {
  const found = parent.searchFolders('title = "' + driveQueryValue_(name) + '" and trashed = false');
  return found.hasNext() ? found.next().getId() : null;
}

function driveQueryValue_(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
  const files = DriveApp.getFolderById(folderId).searchFiles('title = "' + driveQueryValue_(name) + '" and trashed = false');
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
      Drive.Files.update({ name: name, trashed: false }, fileId, blob, { supportsAllDrives: true });
      return fileId;
    } catch (e) {
      if (isAppGrantError_(e)) {
        console.warn('Plik ' + fileId + ' zalozyla inna kopia dodatku, tworze nowy: ' + e.message);
      } else if (/not ?found|404/i.test(e.message)) {
        console.warn('Plik ' + fileId + ' nie istnieje, tworzę nowy: ' + e.message);
      } else {
        throw e;
      }
    }
  }
  try {
    return Drive.Files.create({ name: name, mimeType: mimeType, parents: [folderId] }, blob, { supportsAllDrives: true }).id;
  } catch (e) {
    if (isAppAccessError_(e)) {
      forgetDataFolder_();
      throw userError_('store.err.foreign');
    }
    throw e;
  }
}

function storeTrash_(fileId) {
  if (!fileId) return;
  try {
    Drive.Files.update({ trashed: true }, fileId, null, { supportsAllDrives: true });
  } catch (e) {
    console.warn('Nie udało się przenieść do kosza ' + fileId + ': ' + e.message);
  }
}
