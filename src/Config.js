const PROP = {
  API_KEY: 'geminiApiKey',
  MODEL: 'geminiModel',
  AI_NOTICE: 'aiNoticeAccepted',
  UI_LANGUAGE: 'uiLanguage',
  SOURCE_FOLDER: 'sourceFolderId',
  DATA_FOLDER: 'dataFolderId',
};

function userProps_() {
  return PropertiesService.getUserProperties();
}

function docProps_() {
  return PropertiesService.getDocumentProperties();
}

function getSettings() {
  const folderId = docProps_().getProperty(PROP.SOURCE_FOLDER) || '';
  let folderName = null;
  if (folderId) {
    try {
      folderName = DriveApp.getFolderById(folderId).getName();
    } catch (e) {
      folderName = null;
    }
  }
  return {
    hasApiKey: !!userProps_().getProperty(PROP.API_KEY),
    model: userProps_().getProperty(PROP.MODEL) || '',
    aiNoticeAccepted: userProps_().getProperty(PROP.AI_NOTICE) === 'true',
    uiLanguageSetting: savedUiLanguage_(),
    sourceFolderId: folderId,
    sourceFolderName: folderName,
  };
}

function saveApiKey(key) {
  const value = String(key || '').trim();
  if (!value) throw userError_('err.apiKeyEmpty');
  userProps_().setProperty(PROP.API_KEY, value);
  return getSettings();
}

function clearApiKey() {
  userProps_().deleteProperty(PROP.API_KEY);
  return getSettings();
}

function saveModel(model) {
  const value = String(model || '').trim();
  if (!value) throw userError_('err.modelEmpty');
  userProps_().setProperty(PROP.MODEL, value);
  return getSettings();
}

function acceptAiNotice() {
  userProps_().setProperty(PROP.AI_NOTICE, 'true');
  return getSettings();
}

function saveSourceFolder(input) {
  const id = parseDriveId_(input);
  if (!id) throw userError_('err.folderInvalid');
  let folder;
  try {
    folder = DriveApp.getFolderById(id);
    folder.getName();
  } catch (e) {
    throw userError_('err.folderNotFound');
  }
  const props = docProps_();
  if (props.getProperty(PROP.SOURCE_FOLDER) !== id) {
    props.setProperty(PROP.SOURCE_FOLDER, id);
    props.deleteProperty(PROP.DATA_FOLDER);
  }
  return getSettings();
}

function getApiKey_() {
  const key = userProps_().getProperty(PROP.API_KEY);
  if (!key) throw userError_('err.noApiKey');
  return key;
}

function getModel_() {
  const model = userProps_().getProperty(PROP.MODEL);
  if (!model) throw userError_('err.noModel');
  return model;
}

function getSourceFolderId_() {
  const id = docProps_().getProperty(PROP.SOURCE_FOLDER);
  if (!id) throw userError_('err.noFolder');
  return id;
}

function parseDriveId_(input) {
  const text = String(input || '').trim();
  const fromUrl = text.match(/\/folders\/([A-Za-z0-9_-]+)/) || text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(text) ? text : null;
}
