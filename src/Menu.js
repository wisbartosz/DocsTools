const APP_SHORT_NAME = 'PDZ';
const APP_NAME = 'Przybornik dyplomowanej Żabki';

function onOpen() {
  DocumentApp.getUi()
    .createMenu(APP_SHORT_NAME)
    .addItem('Otwórz ' + APP_NAME, 'showSidebar')
    .addToUi();
}

function onInstall() {
  onOpen();
}

function showSidebar() {
  const html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle(APP_NAME);
  DocumentApp.getUi().showSidebar(html);
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function userError_(message) {
  const error = new Error(message);
  error.name = 'UserError';
  return error;
}
