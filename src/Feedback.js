const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwdEQe6JjeLi2XnQLCZpjJgY6kG95DORTJyWZLufTRO_-ROWQdPnG9XZ1cSf6JVZXYx/exec';
const FEEDBACK_MAX_CHARS = 5000;
const FEEDBACK_CLIENT_FIELDS = ['lastError', 'view', 'browser'];

function sendFeedback(message, replyTo, clientContext) {
  const text = String(message || '').trim();
  if (!text) throw userError_('feedback.err.empty');
  if (text.length > FEEDBACK_MAX_CHARS) throw userError_('feedback.err.tooLong', { max: FEEDBACK_MAX_CHARS });
  const email = String(replyTo || '').trim();
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw userError_('feedback.err.email');

  const payload = { message: text, replyTo: email, context: feedbackContext_(clientContext || {}) };
  let result = null;
  try {
    const response = UrlFetchApp.fetch(FEEDBACK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    result = JSON.parse(response.getContentText());
  } catch (e) {
    console.error('Feedback relay failed: ' + e);
  }
  if (!result || !result.ok) throw userError_(result && result.error === 'busy' ? 'feedback.err.busy' : 'feedback.err.failed');
  return true;
}

function feedbackContext_(clientContext) {
  const user = userProps_();
  const context = {
    version: APP_VERSION,
    language: uiLanguage_(),
    locale: Session.getActiveUserLocale(),
    model: user.getProperty(PROP.MODEL) || '-',
    apiKey: user.getProperty(PROP.API_KEY) ? 'yes' : 'no',
    sourceFolder: docProps_().getProperty(PROP.SOURCE_FOLDER) ? 'yes' : 'no',
  };
  FEEDBACK_CLIENT_FIELDS.forEach(field => {
    if (clientContext[field]) context[field] = String(clientContext[field]).slice(0, 300);
  });
  return context;
}
