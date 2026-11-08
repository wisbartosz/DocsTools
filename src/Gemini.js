const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MAX_ATTEMPTS = 4;
const GEMINI_MAX_WAIT_MS = 60000;
const GEMINI_RETRY_BUDGET_MS = 150000;

function geminiGenerate_(request, options) {
  const opts = options || {};
  const maxAttempts = opts.maxAttempts;
  const model = getModel_();
  const url = GEMINI_BASE_URL + '/models/' + encodeURIComponent(model) + ':generateContent';
  const response = geminiFetch_(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(request),
  }, model, maxAttempts);
  const data = JSON.parse(response.getContentText());
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    const reason = data.promptFeedback && data.promptFeedback.blockReason;
    throw userError_('gemini.rejected', { reason: reason || t_('gemini.unknownReason') });
  }
  const parts = (candidate.content && candidate.content.parts) || [];
  const text = parts.map(function (p) { return p.text || ''; }).join('').trim();
  if (!text) {
    throw userError_('gemini.noAnswer', { reason: candidate.finishReason || t_('gemini.unknownReason') });
  }
  return { text: text, model: model, feature: opts.feature || null, usage: data.usageMetadata || null };
}

function geminiFetch_(url, options, model, maxAttempts) {
  const attempts = maxAttempts || GEMINI_MAX_ATTEMPTS;
  const params = Object.assign({
    muteHttpExceptions: true,
    headers: { 'x-goog-api-key': getApiKey_() },
  }, options);
  const deadline = Date.now() + GEMINI_RETRY_BUDGET_MS;
  for (let attempt = 1; ; attempt++) {
    const started = Date.now();
    const response = UrlFetchApp.fetch(url, params);
    const code = response.getResponseCode();
    console.log('Gemini HTTP ' + code + ' po ' + (Date.now() - started) + ' ms (próba ' + attempt + ')');
    if (code === 200) return response;
    const retryable = code === 429 || code === 500 || code === 503;
    let waitMs = retryable && attempt < attempts ? retryDelayMs_(response, attempt) : null;
    if (waitMs !== null && Date.now() + waitMs > deadline) waitMs = null;
    if (waitMs === null) throw geminiError_(code, response, model);
    console.warn('Gemini HTTP ' + code + ', ponawiam za ' + waitMs + ' ms (próba ' + attempt + ')');
    Utilities.sleep(waitMs);
  }
}

function retryDelayMs_(response, attempt) {
  let delayMs = 2000 * Math.pow(2, attempt - 1);
  try {
    const details = JSON.parse(response.getContentText()).error.details || [];
    const info = details.find(function (d) { return String(d['@type'] || '').indexOf('RetryInfo') >= 0; });
    if (info && info.retryDelay) delayMs = Math.ceil(parseFloat(info.retryDelay) * 1000) + 500;
  } catch (e) {
    console.warn('Brak RetryInfo w odpowiedzi Gemini: ' + e.message);
  }
  return delayMs > GEMINI_MAX_WAIT_MS ? null : delayMs;
}

function geminiError_(code, response, model) {
  let message = '';
  try {
    message = JSON.parse(response.getContentText()).error.message || '';
  } catch (e) {
    message = response.getContentText().slice(0, 300);
  }
  console.error('Gemini HTTP ' + code + ': ' + message);
  if (code === 400 && /api key/i.test(message)) return userError_('gemini.badKey');
  if (code === 400 && /location|region|country/i.test(message)) return userError_('gemini.region');
  if (code === 403) return userError_('gemini.forbidden');
  if (code === 404) return userError_('gemini.modelNotFound', { model: model || '' });
  if (code === 429) return userError_('gemini.quota');
  if (code >= 500) return userError_('gemini.overloaded');
  return userError_('gemini.other', { code: code, message: message });
}

function listGeminiModels() {
  const models = [];
  let pageToken = '';
  do {
    const url = GEMINI_BASE_URL + '/models?pageSize=1000' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const data = JSON.parse(geminiFetch_(url, { method: 'get' }).getContentText());
    (data.models || []).forEach(function (m) {
      const methods = m.supportedGenerationMethods || [];
      if (methods.indexOf('generateContent') >= 0 && /gemini/i.test(m.name)) {
        models.push({
          id: m.name.replace(/^models\//, ''),
          label: m.displayName || m.name,
          inputTokenLimit: m.inputTokenLimit || null,
        });
      }
    });
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return models;
}

function testGeminiConnection() {
  const result = geminiGenerate_({
    contents: [{ role: 'user', parts: [{ text: t_('ai.testPrompt') }] }],
  }, { maxAttempts: 1, feature: 'test' });
  return { model: result.model, reply: result.text };
}
