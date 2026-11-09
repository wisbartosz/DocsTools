const MAX_MESSAGE_CHARS = 5000;
const MAX_FIELD_CHARS = 300;
const MAX_CONTEXT_FIELDS = 20;
const HOURLY_LIMIT = 20;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function doGet() {
  return ContentService.createTextOutput('PDZ feedback');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const message = String(data.message || '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (!message) return reply_({ ok: false, error: 'empty' });
    if (!takeSlot_()) return reply_({ ok: false, error: 'busy' });
    const replyTo = EMAIL_PATTERN.test(String(data.replyTo || '').trim()) ? String(data.replyTo).trim() : '';
    const context = data.context && typeof data.context === 'object' ? data.context : {};
    sendMail_(message, replyTo, context);
    return reply_({ ok: true });
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: 'failed' });
  }
}

function sendMail_(message, replyTo, context) {
  const details = Object.keys(context).slice(0, MAX_CONTEXT_FIELDS)
    .map(key => clip_(key, 40) + ': ' + clip_(context[key], MAX_FIELD_CHARS));
  const subject = 'PDZ ' + clip_(context.version || '', 20) + ': ' + clip_(message.split('\n')[0], 70);
  const body = message + '\n\n---\n'
    + (replyTo ? 'Reply-to: ' + replyTo + '\n' : 'Reply-to: -\n')
    + details.join('\n');
  const options = { name: 'PDZ' };
  if (replyTo) options.replyTo = replyTo;
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, body, options);
}

function takeSlot_() {
  if (MailApp.getRemainingDailyQuota() < 1) return false;
  const cache = CacheService.getScriptCache();
  const key = 'sent-' + Math.floor(Date.now() / 3600000);
  const count = Number(cache.get(key) || 0);
  if (count >= HOURLY_LIMIT) return false;
  cache.put(key, String(count + 1), 3600);
  return true;
}

function clip_(value, max) {
  return String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function reply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function sendTestMessage() {
  sendMail_('Test message from the PDZ feedback relay.', '', { version: 'test' });
}
