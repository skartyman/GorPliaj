require('../src/config/env');

const prisma = require('../src/lib/prisma');
const { translateText } = require('../src/services/translationService');
const { cleanText, normalizeLocalizedField } = require('../src/utils/localization');

const forceUaFromRu = process.env.REPAIR_FORCE_UA_FROM_RU === '1';
const translationDelayMs = Number(process.env.REPAIR_TRANSLATION_DELAY_MS || 2200);
const cyrillicPattern = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const ukrainianSpecificPattern = /[ІіЇїЄєҐґ]/;
const russianSpecificPattern = /[ЁёЫыЭэЪъ]/;
const ukrainianReplacements = [
  [/Отрада/g, 'Відрада'],
  [/Одесса/g, 'Одеса'],
  [/пляж отрада/gi, 'пляж Відрада']
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translate(source, targetLang) {
  const text = cleanText(source);
  if (!text) return '';

  try {
    const translated = cleanText(await translateText(text, targetLang));
    if (translationDelayMs > 0) {
      await sleep(translationDelayMs);
    }
    return translated;
  } catch (error) {
    console.warn(`[repair-localization] Translation to ${targetLang} failed: ${error.message}`);
    return '';
  }
}

async function repairLocalizedField(value) {
  const original = value && typeof value === 'object' ? value : {};
  const normalized = normalizeLocalizedField(value);
  let { ua, ru, en } = normalized;

  if (forceUaFromRu && ru && ua === ru && ru.length > 12 && russianSpecificPattern.test(ru)) {
    ua = await translate(ru, 'Ukrainian') || ua;
  }

  if (!ua && ru) ua = await translate(ru, 'Ukrainian') || ru;
  if (!ua && en) ua = await translate(en, 'Ukrainian') || en;
  if (!ru && ua) ru = await translate(ua, 'Russian') || ua;
  if (!en && ua) en = await translate(ua, 'English') || ua;
  if (ru && ua && ukrainianSpecificPattern.test(ru)) {
    ru = await translate(ua, 'Russian') || ru;
  }
  if (en && ua && cyrillicPattern.test(en)) {
    en = await translate(ua, 'English') || en;
  }

  for (const [pattern, replacement] of ukrainianReplacements) {
    ua = cleanText(ua).replace(pattern, replacement);
  }

  const next = { ua: cleanText(ua), ru: cleanText(ru), en: cleanText(en) };
  const before = JSON.stringify(normalizeLocalizedField(original));
  const after = JSON.stringify(next);

  return { value: next, changed: before !== after };
}

async function updateModelRows(modelName, fields) {
  const rows = await prisma[modelName].findMany();
  let changedCount = 0;

  for (const row of rows) {
    const data = {};
    for (const field of fields) {
      const repaired = await repairLocalizedField(row[field]);
      if (repaired.changed) {
        data[field] = repaired.value;
      }
    }

    if (Object.keys(data).length) {
      await prisma[modelName].update({ where: { id: row.id }, data });
      changedCount += 1;
    }
  }

  console.log(`[repair-localization] ${modelName}: ${changedCount}/${rows.length} rows updated`);
}

async function repairKnownSettings() {
  const settings = await prisma.frontendSettings.findFirst();
  if (!settings) return;

  const data = {};
  const title = normalizeLocalizedField(settings.title);
  if ([title.ua, title.ru, title.en].some((value) => /горпляж/i.test(value))) {
    data.title = { ua: 'Горпляж', ru: 'Горпляж', en: 'GorPliaj' };
  }

  const address = normalizeLocalizedField(settings.address);
  if ([address.ua, address.ru, address.en].some((value) => /отрада|відрада|otrada/i.test(value))) {
    data.address = {
      ua: 'Пляж Відрада 23',
      ru: 'Пляж Отрада 23',
      en: 'Otrada Beach 23'
    };
  }

  if (Object.keys(data).length) {
    await prisma.frontendSettings.update({ where: { id: settings.id }, data });
    console.log('[repair-localization] frontendSettings known values repaired');
  }
}

async function main() {
  await updateModelRows('frontendSettings', ['title', 'description', 'keywords', 'address', 'heroTitle', 'heroSubtitle', 'footerText']);
  await repairKnownSettings();
  await updateModelRows('menuCategory', ['name']);
  await updateModelRows('menuItem', ['name', 'description']);
  await updateModelRows('event', ['title', 'shortDescription', 'fullDescription']);
  await updateModelRows('news', ['title', 'body']);
}

main()
  .catch((error) => {
    console.error('[repair-localization] Failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
