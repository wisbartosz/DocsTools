const UI_LANGUAGES = ['pl', 'en'];

let uiLanguageCache_ = null;

function uiLanguage_() {
  if (uiLanguageCache_) return uiLanguageCache_;
  uiLanguageCache_ = savedUiLanguage_() || accountLanguage_();
  return uiLanguageCache_;
}

function savedUiLanguage_() {
  try {
    const saved = PropertiesService.getUserProperties().getProperty(PROP.UI_LANGUAGE) || '';
    return UI_LANGUAGES.indexOf(saved) >= 0 ? saved : '';
  } catch (e) {
    console.warn('Brak dostępu do ustawień języka: ' + e.message);
    return '';
  }
}

function accountLanguage_() {
  let locale = '';
  try {
    locale = Session.getActiveUserLocale() || '';
  } catch (e) {
    console.warn('Brak dostępu do języka konta: ' + e.message);
  }
  return /^pl/i.test(locale) ? 'pl' : 'en';
}

function t_(key, params) {
  return formatMessage_(uiMessages_()[key] || key, params);
}

function uiMessages_() {
  return Object.assign({}, MESSAGES.pl, MESSAGES[uiLanguage_()]);
}

function formatMessage_(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, function (match, name) {
    return params[name] === undefined ? match : String(params[name]);
  });
}

function saveUiLanguage(value) {
  const language = String(value || '');
  if (language && UI_LANGUAGES.indexOf(language) < 0) throw userError_('err.languageInvalid');
  const props = userProps_();
  if (language) props.setProperty(PROP.UI_LANGUAGE, language);
  else props.deleteProperty(PROP.UI_LANGUAGE);
  uiLanguageCache_ = null;
  showSidebar();
}
