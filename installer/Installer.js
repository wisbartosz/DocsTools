const REPO = 'wisbartosz/DocsTools';
const SCRIPT_API_URL = 'https://script.googleapis.com/v1/projects/';
const SCRIPT_API_SETTINGS_URL = 'https://script.google.com/home/usersettings';
const BACKUP_PREFIX = 'PDZ backup';
const ADDON_TITLE = 'Przybornik dyplomowanej Żabki';

const TEXTS = {
  pl: {
    title: 'Instalator PDZ',
    heading: 'Instalator Przybornika dyplomowanej Żabki',
    loading: 'Sprawdzam wersje…',
    yourVersion: 'Wersja w Twoim dokumencie: {version}',
    latestVersion: 'Najnowsza wersja: {version}',
    upToDate: 'Masz najnowszą wersję.',
    whatsNew: 'Co nowego',
    update: 'Zaktualizuj do {version}',
    rollback: 'Przywróć poprzednią wersję',
    updated: 'Gotowe, zainstalowano wersję {version}. Odśwież dokument (F5), żeby zobaczyć zmiany.',
    rolledBack: 'Gotowe, przywrócono poprzednią wersję. Odśwież dokument (F5).',
    installHeading: 'Dodaj Przybornik do swojego dokumentu',
    installHint: 'Wklej link do dokumentu Google, w którym piszesz pracę. Jeśli dokument ma już Przybornik, zaktualizuj go z panelu Przybornika (Ustawienia → Sprawdź aktualizacje).',
    installPlaceholder: 'https://docs.google.com/document/d/…',
    install: 'Zainstaluj',
    installed: 'Gotowe. Otwórz dokument (albo odśwież go klawiszem F5) – w menu pojawi się PDZ.',
    working: 'Pracuję…',
    'err.userApiDisabled': 'Najpierw włącz jednorazowo „Google Apps Script API” na swoim koncie: otwórz {url}, przestaw przełącznik na Włączony, odczekaj chwilę i spróbuj ponownie.',
    'err.notFound': 'Nie znaleziono skryptu dokumentu albo nie masz do niego dostępu. Otwórz instalator z panelu Przybornika w swoim dokumencie.',
    'err.notPdz': 'Ten skrypt nie wygląda na Przybornik dyplomowanej Żabki – nic nie zmieniam.',
    'err.badDoc': 'To nie wygląda na link do dokumentu Google.',
    'err.createFailed': 'Google nie pozwolił dodać Przybornika do tego dokumentu ({code}): {message}. Sprawdź, czy masz prawo edycji dokumentu.',
    'err.noBackup': 'Nie ma zapisanej poprzedniej wersji do przywrócenia.',
    'err.github': 'Nie udało się pobrać wersji z GitHuba ({code}).',
    'err.other': 'Błąd ({code}): {message}',
  },
  en: {
    title: 'PDZ Installer',
    heading: 'Przybornik dyplomowanej Żabki installer',
    loading: 'Checking versions…',
    yourVersion: 'Version in your document: {version}',
    latestVersion: 'Latest version: {version}',
    upToDate: 'You have the latest version.',
    whatsNew: 'What\'s new',
    update: 'Update to {version}',
    rollback: 'Restore the previous version',
    updated: 'Done, version {version} is installed. Reload the document (F5) to see the changes.',
    rolledBack: 'Done, the previous version is restored. Reload the document (F5).',
    installHeading: 'Add the toolkit to your document',
    installHint: 'Paste the link to the Google Doc you are writing your thesis in. If the document already has the toolkit, update it from the toolkit sidebar (Settings → Check for updates).',
    installPlaceholder: 'https://docs.google.com/document/d/…',
    install: 'Install',
    installed: 'Done. Open the document (or reload it with F5) – PDZ will appear in the menu.',
    working: 'Working…',
    'err.userApiDisabled': 'First turn on "Google Apps Script API" once for your account: open {url}, switch it On, wait a moment and try again.',
    'err.notFound': 'The document\'s script was not found or you have no access to it. Open the installer from the toolkit sidebar in your document.',
    'err.notPdz': 'This script does not look like Przybornik dyplomowanej Żabki – nothing was changed.',
    'err.badDoc': 'This does not look like a Google Doc link.',
    'err.createFailed': 'Google did not allow adding the toolkit to this document ({code}): {message}. Check that you can edit the document.',
    'err.noBackup': 'There is no saved previous version to restore.',
    'err.github': 'Could not download the version from GitHub ({code}).',
    'err.other': 'Error ({code}): {message}',
  },
};

function lang_() {
  return /^pl/i.test(Session.getActiveUserLocale() || '') ? 'pl' : 'en';
}

function texts_() {
  return TEXTS[lang_()];
}

function t_(key, params) {
  const text = texts_()[key] || key;
  return params ? text.replace(/\{(\w+)\}/g, function (m, k) { return params[k] === undefined ? m : String(params[k]); }) : text;
}

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Page');
  template.scriptId = (e && e.parameter && e.parameter.scriptId) || '';
  template.lang = lang_();
  template.texts = texts_();
  return template.evaluate().setTitle(t_('title'));
}

function getStatus(scriptId) {
  const files = readContent_(scriptId);
  const latest = latestRelease_();
  return {
    current: pdzVersion_(files),
    latest: { version: latest.version, notes: (latest.notes && latest.notes[lang_()]) || '' },
    hasBackup: !!latestBackup_(scriptId),
  };
}

function installUpdate(scriptId) {
  const files = readContent_(scriptId);
  const current = pdzVersion_(files);
  const latest = latestRelease_();
  scriptApi_('post', scriptId + '/versions', { description: BACKUP_PREFIX + ' ' + current + ' ' + new Date().toISOString() });
  scriptApi_('put', scriptId + '/content', { files: releaseFiles_(latest.tag) });
  return { version: latest.version };
}

function rollback(scriptId) {
  readContent_(scriptId);
  const backup = latestBackup_(scriptId);
  if (!backup) throw new Error(t_('err.noBackup'));
  const content = scriptApi_('get', scriptId + '/content?versionNumber=' + backup.versionNumber);
  scriptApi_('put', scriptId + '/content', { files: plainFiles_(content.files) });
  return { versionNumber: backup.versionNumber };
}

function installIntoDocument(link) {
  const match = String(link || '').match(/\/document\/d\/([A-Za-z0-9_-]+)/) || String(link || '').match(/^([A-Za-z0-9_-]{25,})$/);
  if (!match) throw new Error(t_('err.badDoc'));
  const latest = latestRelease_();
  const project = scriptApi_('post', '', { title: ADDON_TITLE, parentId: match[1] }, 'err.createFailed');
  scriptApi_('put', project.scriptId + '/content', { files: releaseFiles_(latest.tag) });
  return { version: latest.version };
}

function readContent_(scriptId) {
  const id = String(scriptId || '').trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error(t_('err.notFound'));
  const files = scriptApi_('get', id + '/content').files || [];
  if (!pdzVersion_(files)) throw new Error(t_('err.notPdz'));
  return files;
}

function pdzVersion_(files) {
  const menu = files.filter(function (f) { return f.name === 'Menu'; })[0];
  if (!menu || !/APP_SHORT_NAME = 'PDZ'/.test(menu.source)) return null;
  const version = menu.source.match(/APP_VERSION = '([\d.]+)'/);
  return version ? version[1] : '?';
}

function latestBackup_(scriptId) {
  const versions = (scriptApi_('get', scriptId + '/versions?pageSize=50').versions || [])
    .filter(function (v) { return String(v.description || '').indexOf(BACKUP_PREFIX) === 0; })
    .sort(function (a, b) { return b.versionNumber - a.versionNumber; });
  return versions[0] || null;
}

function plainFiles_(files) {
  return files.map(function (f) { return { name: f.name, type: f.type, source: f.source }; });
}

function scriptApi_(method, path, payload, failureKey) {
  const options = {
    method: method,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  const url = path ? SCRIPT_API_URL + path : SCRIPT_API_URL.replace(/\/$/, '');
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code === 200) return JSON.parse(body || '{}');
  console.error('Apps Script API ' + method + ' ' + url + ' → ' + code + ': ' + body.slice(0, 500));
  if (/has not enabled the Apps Script API|User has not enabled/i.test(body)) {
    throw new Error(t_('err.userApiDisabled', { url: SCRIPT_API_SETTINGS_URL }));
  }
  let message = body.slice(0, 300);
  try {
    message = JSON.parse(body).error.message || message;
  } catch (e) {
    console.warn('Odpowiedź Apps Script API nie jest JSON: ' + e.message);
  }
  if (failureKey) throw new Error(t_(failureKey, { code: code, message: message }));
  if (code === 404 || code === 403) throw new Error(t_('err.notFound'));
  throw new Error(t_('err.other', { code: code, message: message }));
}

function githubToken_() {
  return PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') || '';
}

function githubFetch_(url, raw) {
  const token = githubToken_();
  const headers = { Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    console.error('GitHub ' + url + ' → ' + response.getResponseCode() + ': ' + response.getContentText().slice(0, 300));
    throw new Error(t_('err.github', { code: response.getResponseCode() }));
  }
  return response;
}

function latestRelease_() {
  const url = githubToken_()
    ? 'https://api.github.com/repos/' + REPO + '/contents/latest.json?ref=main'
    : 'https://raw.githubusercontent.com/' + REPO + '/main/latest.json';
  return JSON.parse(githubFetch_(url, true).getContentText());
}

function releaseFiles_(tag) {
  const url = githubToken_()
    ? 'https://api.github.com/repos/' + REPO + '/zipball/' + encodeURIComponent(tag)
    : 'https://codeload.github.com/' + REPO + '/zip/refs/tags/' + encodeURIComponent(tag);
  const blobs = Utilities.unzip(githubFetch_(url, false).getBlob().setContentType('application/zip'));
  const files = [];
  blobs.forEach(function (blob) {
    const match = blob.getName().match(/^[^/]+\/src\/([^/]+)$/);
    if (!match) return;
    const name = match[1];
    const source = blob.getDataAsString('UTF-8');
    if (name === 'appsscript.json') files.push({ name: 'appsscript', type: 'JSON', source: source });
    else if (/\.js$/.test(name)) files.push({ name: name.replace(/\.js$/, ''), type: 'SERVER_JS', source: source });
    else if (/\.html$/.test(name)) files.push({ name: name.replace(/\.html$/, ''), type: 'HTML', source: source });
  });
  if (!files.some(function (f) { return f.name === 'appsscript'; }) || !files.some(function (f) { return f.name === 'Menu'; })) {
    throw new Error(t_('err.github', { code: 'zip' }));
  }
  return files;
}
