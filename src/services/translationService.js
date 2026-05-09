const { GROQ_API_KEY } = require('../config/env');
const { cleanText } = require('../utils/localization');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(message, fallbackMs) {
  const match = String(message || '').match(/try again in\s+(\d+)s/i);
  return match ? (Number(match[1]) + 1) * 1000 : fallbackMs;
}

async function translateText(text, targetLang) {
  const sourceText = cleanText(text);
  if (!sourceText) return '';
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text to ${targetLang}. 
            Output ONLY the translated text, no explanations, no quotes.`
            },
            {
              role: 'user',
              content: sourceText
            }
          ],
          temperature: 0.3
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Groq request failed with ${response.status}`);
      }

      const translatedText = data.choices?.[0]?.message?.content;
      if (!translatedText) {
        throw new Error('Groq response did not include translated text.');
      }

      return cleanText(translatedText);
    } catch (error) {
      lastError = error;
      const message = error?.message || '';
      const canRetry = /rate limit|429|temporarily|timeout/i.test(message);
      if (!canRetry || attempt === 2) break;
      await sleep(getRetryDelayMs(message, 2500 * (attempt + 1)));
    }
  }

  console.error('Translation error:', lastError);
  throw new Error('Failed to translate');
}

/**
 * Автоматически переводит объект локализации.
 * Если на входе строка, она считается украинским текстом.
 * Если на входе объект, недостающие языки заполняются переводом из 'ua'.
 */
function extractLocalizedInput(input) {
  if (input == null) {
    return { ua: '', ru: '', en: '' };
  }

  if (typeof input === 'string') {
    return { ua: cleanText(input), ru: '', en: '' };
  }

  if (typeof input !== 'object') {
    return { ua: cleanText(input), ru: '', en: '' };
  }

  return {
    ua: cleanText(input.ua ?? input.uk ?? input.ru ?? input.en),
    ru: cleanText(input.ru),
    en: cleanText(input.en)
  };
}

async function autoTranslateObject(input) {
  const localized = extractLocalizedInput(input);
  let { ua, ru, en } = localized;

  if (!ua) return { ua: '', ru: '', en: '' };

  // Если русского или английского нет, переводим
  if (!ru) {
    try {
      ru = await translateText(ua, 'Russian');
    } catch (e) {
      ru = localized.ru || '';
    }
  }

  if (!en) {
    try {
      en = await translateText(ua, 'English');
    } catch (e) {
      en = localized.en || '';
    }
  }

  return { ua, ru, en };
}

module.exports = { translateText, autoTranslateObject };
