const INSTALLER_URL = 'https://script.google.com/macros/s/AKfycbw46Frsvuuh_VpBv5G1iSk2KE_flxFaJ6ZClwq51BneFK9qAsxVmA8LBXYlfBNSNcfT/exec';
const LATEST_RELEASE_URL = 'https://raw.githubusercontent.com/wisbartosz/DocsTools/main/latest.json';
const LATEST_RELEASE_PROP = 'latestRelease';
const LATEST_RELEASE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function updateUrl_() {
  return INSTALLER_URL + '?scriptId=' + encodeURIComponent(ScriptApp.getScriptId());
}

function checkForUpdate(force) {
  const props = PropertiesService.getScriptProperties();
  let saved = null;
  try {
    saved = JSON.parse(props.getProperty(LATEST_RELEASE_PROP) || 'null');
  } catch (e) {
    console.warn('Niepoprawny zapis ostatniego sprawdzenia wersji: ' + e.message);
  }
  if (force || !saved || Date.now() - saved.checkedAt > LATEST_RELEASE_MAX_AGE_MS) {
    const response = UrlFetchApp.fetch(LATEST_RELEASE_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      console.warn('latest.json HTTP ' + response.getResponseCode());
      throw userError_('update.checkFailed');
    }
    saved = { checkedAt: Date.now(), release: JSON.parse(response.getContentText()) };
    props.setProperty(LATEST_RELEASE_PROP, JSON.stringify(saved));
  }
  const latest = saved.release;
  return {
    current: APP_VERSION,
    latest: latest.version,
    available: isNewerVersion_(latest.version, APP_VERSION),
    notes: (latest.notes && latest.notes[uiLanguage_()]) || '',
    installerUrl: updateUrl_(),
  };
}

function isNewerVersion_(candidate, current) {
  const a = String(candidate).split('.').map(Number);
  const b = String(current).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}
