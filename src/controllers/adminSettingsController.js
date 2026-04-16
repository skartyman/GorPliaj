const prisma = require('../lib/prisma.js');

// Получить настройки
async function getSettings(req, res) {
  try {
    const settings = await prisma.frontendSettings.findFirst();
    res.json(settings || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Server error'});
  }
}

// Обновить настройки
async function updateSettings(req, res) {
  const {
    title, description, keywords, logoUrl, faviconUrl,
    phone, email, address, workingHours, socialMedia,
    heroTitle, heroSubtitle, footerText
  } = req.body;
  try {
    const settings = await prisma.frontendSettings.upsert({
      where: {id: 1},
      create: {
        title, description, keywords, logoUrl, faviconUrl,
        phone, email, address, workingHours, socialMedia,
        heroTitle, heroSubtitle, footerText
      },
      update: {
        title, description, keywords, logoUrl, faviconUrl,
        phone, email, address, workingHours, socialMedia,
        heroTitle, heroSubtitle, footerText
      },
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Server error'});
  }
}

// Обновить настройки частично
async function patchSettings(req, res) {
  try {
    const settings = await prisma.frontendSettings.update({
      where: { id: 1 },
      data: req.body,
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getSettings, updateSettings, patchSettings };
