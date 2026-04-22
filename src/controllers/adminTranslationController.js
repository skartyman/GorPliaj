const translationService = require('../services/translationService');

async function handleTranslate(req, res) {
  const { text, targetLangs } = req.body; // targetLangs: ['ru', 'en']
  
  if (!text || !targetLangs || !Array.isArray(targetLangs)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const results = {};
    const targets = {
      ua: 'Ukrainian',
      ru: 'Russian',
      en: 'English'
    };
    for (const lang of targetLangs) {
      const target = targets[lang];
      if (!target) {
        return res.status(400).json({ error: `Unsupported target language: ${lang}` });
      }
      results[lang] = await translationService.translateText(text, target);
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
}

module.exports = { handleTranslate };
