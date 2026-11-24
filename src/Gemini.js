const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_ATTEMPTS_PER_MODEL = 2;
const GEMINI_MAX_WAIT_MS = 20000;
const GEMINI_RETRY_BUDGET_MS = 120000;
const GEMINI_MAX_FALLBACKS = 3;
const GEMINI_UNAVAILABLE_PREFIX = 'geminiOff:';
const GEMINI_MIN_FALLBACK_VERSION = 3;
const GEMINI_MODELS_CACHE_KEY = 'geminiModelIds';
const GEMINI_MODELS_CACHE_SECONDS = 6 * 60 * 60;
const GEMINI_UNSTABLE = /preview|exp|latest|tts|image|embedding|live|audio|native|thinking|learnlm|gemma|aqa|robotics|computer/i;

function geminiGenerate_(request, options) {
  const opts = options || {};
  const primary = getModel_();
  const models = opts.fallback === false || !fallbackEnabled_()
    ? [primary]
    : [primary].concat(fallbackModels_(primary));
  const deadline = Date.now() + GEMINI_RETRY_BUDGET_MS;
  const inputChars = JSON.stringify(request.contents || []).length;
  let lastError = null;
  const tried = [];
  let allBusy = true;
  for (let i = 0; i < models.length; i++) {
    const outcome = callGeminiModel_(models[i], request, opts, deadline);
    if (outcome.data) return geminiResult_(outcome.data, models[i], primary, opts, inputChars, outcome.ms);
    lastError = outcome.error;
    tried.push(models[i]);
    allBusy = allBusy && outcome.switchModel;
    if (!outcome.switchModel || Date.now() >= deadline) break;
    if (i + 1 < models.length) console.warn('Gemini: model ' + models[i] + ' niedostępny, próbuję ' + models[i + 1]);
  }
  if (allBusy && tried.length > 1) throw userError_('gemini.allBusy', { models: tried.join(', ') });
  throw lastError;
}

function callGeminiModel_(model, request, opts, deadline) {
  const url = GEMINI_BASE_URL + '/models/' + encodeURIComponent(model) + ':generateContent';
  let body = withThinking_(request, model, opts.thinking);
  const attempts = opts.maxAttempts || GEMINI_ATTEMPTS_PER_MODEL;
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
        headers: { 'x-goog-api-key': getApiKey_() },
      });
    } catch (e) {
      console.warn('Gemini ' + model + ': brak odpowiedzi (' + e.message + ')');
      return { error: userError_('gemini.overloaded'), switchModel: true };
    }
    const code = response.getResponseCode();
    console.log('Gemini ' + model + ' HTTP ' + code + ' po ' + (Date.now() - started) + ' ms (próba ' + attempt + ')');
    if (code === 200) return { data: JSON.parse(response.getContentText()), ms: Date.now() - started };
    const message = geminiErrorMessage_(response);
    if (code === 400 && body !== request && /thinking/i.test(message)) {
      console.warn('Gemini ' + model + ' nie przyjmuje ustawień myślenia, wysyłam bez nich: ' + message);
      body = request;
      continue;
    }
    if (code === 404 || (code === 429 && !hasRetryInfo_(response))) {
      markModelUnavailable_(model);
      return { error: geminiError_(code, message, model), switchModel: true };
    }
    const retryable = code === 429 || code === 500 || code === 503 || code === 504;
    if (retryable && attempt < attempts) {
      const waitMs = retryDelayMs_(response, attempt);
      if (waitMs !== null && Date.now() + waitMs < deadline) {
        console.warn('Gemini ' + model + ' HTTP ' + code + ', ponawiam za ' + waitMs + ' ms');
        Utilities.sleep(waitMs);
        continue;
      }
    }
    return { error: geminiError_(code, message, model), switchModel: retryable || code === 404 };
  }
}

function geminiResult_(data, model, primary, opts, inputChars, ms) {
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    const reason = data.promptFeedback && data.promptFeedback.blockReason;
    throw userError_('gemini.rejected', { reason: reason || t_('gemini.unknownReason') });
  }
  const parts = (candidate.content && candidate.content.parts) || [];
  const text = parts.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('').trim();
  if (!text) {
    throw userError_('gemini.noAnswer', { reason: candidate.finishReason || t_('gemini.unknownReason') });
  }
  const usage = data.usageMetadata || {};
  console.log(JSON.stringify({
    gemini: opts.feature || null,
    model: model,
    fallback: model !== primary,
    ms: ms,
    inputChars: inputChars,
    promptTokens: usage.promptTokenCount || null,
    thoughtsTokens: usage.thoughtsTokenCount || null,
    outputTokens: usage.candidatesTokenCount || null,
  }));
  return { text: text, model: model, fallback: model !== primary, feature: opts.feature || null, usage: usage };
}

function withThinking_(request, model, level) {
  if (!level) return request;
  let thinkingConfig = null;
  if (/gemini-2\.5-flash/.test(model)) thinkingConfig = { thinkingBudget: 0 };
  else if (/gemini-[34]/.test(model)) thinkingConfig = { thinkingLevel: level };
  if (!thinkingConfig) return request;
  const copy = Object.assign({}, request);
  copy.generationConfig = Object.assign({}, request.generationConfig || {}, { thinkingConfig: thinkingConfig });
  return copy;
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

function hasRetryInfo_(response) {
  try {
    const details = JSON.parse(response.getContentText()).error.details || [];
    return details.some(function (d) { return String(d['@type'] || '').indexOf('RetryInfo') >= 0; });
  } catch (e) {
    return false;
  }
}

function markModelUnavailable_(model) {
  CacheService.getUserCache().put(GEMINI_UNAVAILABLE_PREFIX + model, '1', GEMINI_MODELS_CACHE_SECONDS);
}

function availableModels_(ids) {
  const keys = ids.map(function (id) { return GEMINI_UNAVAILABLE_PREFIX + id; });
  const unavailable = CacheService.getUserCache().getAll(keys);
  return ids.filter(function (id) { return !unavailable[GEMINI_UNAVAILABLE_PREFIX + id]; });
}

function geminiErrorMessage_(response) {
  try {
    return JSON.parse(response.getContentText()).error.message || '';
  } catch (e) {
    return response.getContentText().slice(0, 300);
  }
}

function geminiError_(code, message, model) {
  console.error('Gemini HTTP ' + code + ': ' + message);
  if (code === 400 && /api key/i.test(message)) return userError_('gemini.badKey');
  if (code === 400 && /location|region|country/i.test(message)) return userError_('gemini.region');
  if (code === 403) return userError_('gemini.forbidden');
  if (code === 404) return userError_('gemini.modelNotFound', { model: model || '' });
  if (code === 429) return userError_('gemini.quota');
  if (code >= 500) return userError_('gemini.overloaded');
  return userError_('gemini.other', { code: code, message: message });
}

function fallbackEnabled_() {
  return userProps_().getProperty(PROP.FALLBACK) !== 'false';
}

function saveFallback(enabled) {
  userProps_().setProperty(PROP.FALLBACK, enabled ? 'true' : 'false');
  return getSettings();
}

function fallbackModels_(primary) {
  let ids;
  try {
    ids = cachedModelIds_();
  } catch (e) {
    console.warn('Nie udało się pobrać listy modeli do zapasu: ' + e.message);
    return [];
  }
  return interleaveFamilies_(rankModels_(availableModels_(ids)), primary).slice(0, GEMINI_MAX_FALLBACKS);
}

function cachedModelIds_() {
  const cache = CacheService.getUserCache();
  const cached = cache.get(GEMINI_MODELS_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  const ids = listGeminiModels().map(function (m) { return m.id; });
  cache.put(GEMINI_MODELS_CACHE_KEY, JSON.stringify(ids), GEMINI_MODELS_CACHE_SECONDS);
  return ids;
}

function rankModels_(ids) {
  const version = function (id) {
    const match = /gemini-(\d+(?:\.\d+)?)/.exec(id);
    return match ? parseFloat(match[1]) : 0;
  };
  const family = function (id) {
    if (/flash-lite/.test(id)) return 0;
    if (/flash/.test(id)) return 1;
    return 2;
  };
  return ids
    .filter(function (id) {
      return /^gemini-/.test(id) && !GEMINI_UNSTABLE.test(id) && family(id) < 2 && version(id) >= GEMINI_MIN_FALLBACK_VERSION;
    })
    .sort(function (a, b) { return family(a) - family(b) || version(b) - version(a) || a.localeCompare(b); });
}

function interleaveFamilies_(ranked, primary) {
  const lite = ranked.filter(function (id) { return id !== primary && /flash-lite/.test(id); });
  const flash = ranked.filter(function (id) { return id !== primary && !/flash-lite/.test(id); });
  const first = /flash-lite/.test(primary) ? flash : lite;
  const second = first === flash ? lite : flash;
  const mixed = [];
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    if (first[i]) mixed.push(first[i]);
    if (second[i]) mixed.push(second[i]);
  }
  return mixed;
}

function listGeminiModels() {
  const models = [];
  let pageToken = '';
  do {
    const url = GEMINI_BASE_URL + '/models?pageSize=1000' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers: { 'x-goog-api-key': getApiKey_() } });
    const code = response.getResponseCode();
    if (code !== 200) throw geminiError_(code, geminiErrorMessage_(response), '');
    const data = JSON.parse(response.getContentText());
    (data.models || []).forEach(function (m) {
      const methods = m.supportedGenerationMethods || [];
      if (methods.indexOf('generateContent') >= 0 && /gemini/i.test(m.name)) {
        const id = m.name.replace(/^models\//, '');
        models.push({
          id: id,
          label: m.displayName || m.name,
          inputTokenLimit: m.inputTokenLimit || null,
          stable: !GEMINI_UNSTABLE.test(id),
        });
      }
    });
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  const recommended = rankModels_(models.map(function (m) { return m.id; }));
  const firstLite = recommended.filter(function (id) { return /flash-lite/.test(id); })[0];
  const firstFlash = recommended.filter(function (id) { return !/flash-lite/.test(id); })[0];
  models.forEach(function (m) { m.recommended = m.id === firstLite || m.id === firstFlash; });
  return models;
}

function testGeminiConnection() {
  const result = geminiGenerate_({
    contents: [{ role: 'user', parts: [{ text: t_('ai.testPrompt') }] }],
  }, { maxAttempts: 1, feature: 'test', fallback: false });
  return { model: result.model, reply: result.text };
}
