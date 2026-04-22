const { GROQ_API_KEY } = require('../config/env');

async function translateText(text, targetLang) {
  if (!text) return '';
  
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
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate');
  }
}

/**
 * Автоматически переводит объект локализации.
 * Если на входе строка, она считается украинским текстом.
 * Если на входе объект, недостающие языки заполняются переводом из 'ua'.
 */
async function autoTranslateObject(input) {
  let ua = '';
  let ru = '';
  let en = '';

  if (typeof input === 'string') {
    ua = input.trim();
  } else if (input && typeof input === 'object') {
    ua = input.ua || '';
    ru = input.ru || '';
    en = input.en || '';
  }

  if (!ua) return { ua: '', ru: '', en: '' };

  // Если русского или английского нет, переводим
  if (!ru) {
    try {
      ru = await translateText(ua, 'Russian');
    } catch (e) {
      ru = ua; // fallback
    }
  }

  if (!en) {
    try {
      en = await translateText(ua, 'English');
    } catch (e) {
      en = ua; // fallback
    }
  }

  return { ua, ru, en };
}

module.exports = { translateText, autoTranslateObject };
