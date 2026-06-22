const prisma = require('../lib/prisma.js');
const { autoTranslateObject } = require('../services/translationService');
const { normalizeLocalizedField } = require('../utils/localization');

const LOCALIZED_SETTINGS_FIELDS = ['title', 'description', 'keywords', 'heroTitle', 'heroSubtitle', 'aboutTitle', 'aboutText', 'footerText', 'address'];

function normalizeSettings(settings) {
  if (!settings) return {};

  const normalized = { ...settings };
  for (const field of LOCALIZED_SETTINGS_FIELDS) {
    normalized[field] = normalizeLocalizedField(settings[field]);
  }

  return normalized;
}

// Получить настройки
async function getSettings(req, res) {
  try {
    const settings = await prisma.frontendSettings.findFirst();
    res.json(normalizeSettings(settings));
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
    heroTitle, heroSubtitle, aboutTitle, aboutText, aboutImageUrl, footerText, mapEmbedUrl
  } = req.body;

  try {
    // Автоперевод текстовых полей
    const titleObj = title ? await autoTranslateObject(title) : null;
    const descriptionObj = description ? await autoTranslateObject(description) : null;
    const keywordsObj = keywords ? await autoTranslateObject(keywords) : null;
    const heroTitleObj = heroTitle ? await autoTranslateObject(heroTitle) : null;
    const heroSubtitleObj = heroSubtitle ? await autoTranslateObject(heroSubtitle) : null;
    const aboutTitleObj = aboutTitle ? await autoTranslateObject(aboutTitle) : null;
    const aboutTextObj = aboutText ? await autoTranslateObject(aboutText) : null;
    const footerTextObj = footerText ? await autoTranslateObject(footerText) : null;
    const addressObj = address ? await autoTranslateObject(address) : null;

    const settings = await prisma.frontendSettings.upsert({
      where: {id: 1},
      create: {
        title: titleObj,
        description: descriptionObj,
        keywords: keywordsObj,
        logoUrl, faviconUrl,
        phone, email,
        address: addressObj,
        workingHours, socialMedia,
        heroTitle: heroTitleObj,
        heroSubtitle: heroSubtitleObj,
        aboutTitle: aboutTitleObj,
        aboutText: aboutTextObj,
        aboutImageUrl,
        footerText: footerTextObj,
        mapEmbedUrl
      },
      update: {
        title: titleObj,
        description: descriptionObj,
        keywords: keywordsObj,
        logoUrl, faviconUrl,
        phone, email,
        address: addressObj,
        workingHours, socialMedia,
        heroTitle: heroTitleObj,
        heroSubtitle: heroSubtitleObj,
        aboutTitle: aboutTitleObj,
        aboutText: aboutTextObj,
        aboutImageUrl,
        footerText: footerTextObj,
        mapEmbedUrl
      },
    });
    res.json(normalizeSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Server error'});
  }
}

// Обновить настройки частично
async function patchSettings(req, res) {
  try {
    const data = { ...req.body };
    
    // Если в патче есть текстовые поля, переводим их
    for (const field of LOCALIZED_SETTINGS_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field) && data[field]) {
        data[field] = await autoTranslateObject(data[field]);
      }
    }

    const settings = await prisma.frontendSettings.update({
      where: { id: 1 },
      data,
    });
    res.json(normalizeSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getSettings, updateSettings, patchSettings };
