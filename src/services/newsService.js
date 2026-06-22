const prisma = require('../lib/prisma');
const { autoTranslateObject } = require('./translationService');
const { normalizeLocalizedField } = require('../utils/localization');

function toAdminNews(news) {
  return {
    id: news.id,
    title: normalizeLocalizedField(news.title),
    body: normalizeLocalizedField(news.body),
    image: news.image || null,
    createdAt: news.createdAt,
    updatedAt: news.updatedAt
  };
}

async function listAdminNews() {
  const news = await prisma.news.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });
  return news.map(toAdminNews);
}

async function getAdminNewsById(id) {
  const news = await prisma.news.findUnique({ where: { id } });
  return news ? toAdminNews(news) : null;
}

async function createAdminNews(input) {
  const titleObj = await autoTranslateObject(input.title);
  if (!titleObj.ua) return { type: 'INVALID', message: 'News title is required.' };

  const bodyObj = input.body ? await autoTranslateObject(input.body) : { ua: '', ru: '', en: '' };

  const news = await prisma.news.create({
    data: {
      title: titleObj,
      body: bodyObj,
      image: input.image || null
    }
  });

  return { type: 'SUCCESS', news: toAdminNews(news) };
}

async function updateAdminNews(id, input) {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND' };

  let titleObj = existing.title;
  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    titleObj = await autoTranslateObject(input.title);
  }
  if (!titleObj || (typeof titleObj === 'object' && !titleObj.ua)) {
    return { type: 'INVALID', message: 'News title is required.' };
  }

  let bodyObj = existing.body;
  if (Object.prototype.hasOwnProperty.call(input, 'body')) {
    bodyObj = input.body ? await autoTranslateObject(input.body) : { ua: '', ru: '', en: '' };
  }

  const news = await prisma.news.update({
    where: { id },
    data: {
      title: titleObj,
      body: bodyObj,
      ...(Object.prototype.hasOwnProperty.call(input, 'image') ? { image: input.image || null } : {})
    }
  });

  return { type: 'SUCCESS', news: toAdminNews(news) };
}

async function deleteAdminNews(id) {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND' };

  await prisma.news.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

async function listPublicNews({ limit } = {}) {
  const news = await prisma.news.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(Number.isInteger(limit) && limit > 0 ? { take: limit } : {})
  });
  return news.map(toAdminNews);
}

module.exports = {
  listAdminNews,
  getAdminNewsById,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews,
  listPublicNews
};
