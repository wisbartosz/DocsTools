const APP_SHORT_NAME = 'PDZ';
const APP_NAME = 'Przybornik dyplomowanej Żabki';
const APP_VERSION = '0.9.1';

function onOpen() {
  DocumentApp.getUi()
    .createMenu(APP_SHORT_NAME)
    .addItem(t_('menu.open', { name: APP_NAME }), 'showSidebar')
    .addToUi();
}

function onInstall() {
  onOpen();
}

function showSidebar() {
  const template = HtmlService.createTemplateFromFile('Sidebar');
  template.mode = 'sidebar';
  const html = template.evaluate().setTitle(APP_NAME);
  DocumentApp.getUi().showSidebar(html);
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function userError_(key, params) {
  const error = new Error(t_(key, params));
  error.name = 'UserError';
  error.messageKey = key;
  error.messageParams = params || null;
  return error;
}
