const translationService = require('../services/translationService');

async function handleTranslate(req, res) {
  const { text, targetLangs } = req.body; // targetLangs: ['ru', 'en']
  
  if (!text || !targetLangs || !Array.isArray(targetLangs)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const results = {};
    for (const lang of targetLangs) {
      results[lang] = await translationService.translateText(text, lang === 'en' ? 'English' : 'Russian');
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
}

module.exports = { handleTranslate };
