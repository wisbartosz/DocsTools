const INSTALLER_URL = 'https://script.google.com/macros/s/AKfycbw46Frsvuuh_VpBv5G1iSk2KE_flxFaJ6ZClwq51BneFK9qAsxVmA8LBXYlfBNSNcfT/exec';

function updateUrl_() {
  return INSTALLER_URL + '?scriptId=' + encodeURIComponent(ScriptApp.getScriptId());
}
