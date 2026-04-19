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

module.exports = { translateText };
