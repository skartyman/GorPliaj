const prisma = require('../lib/prisma');
const { autoTranslateObject } = require('./translationService');
const { localizeField, normalizeLocalizedField } = require('../utils/localization');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeOptionalText(value) {
  const result = normalizeText(value);
  return result || null;
}

function normalizeBoolean(value, fallbackValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallbackValue;
}

function normalizeInteger(value, fallbackValue = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? parsed : fallbackValue;
}

function normalizeMenuSection(value, fallbackValue = 'KITCHEN') {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return normalized === 'BAR' ? 'BAR' : fallbackValue;
}

function slugify(value) {
  // Для слагификации берем UA версию, если это объект
  const text = (value && typeof value === 'object') ? localizeField(value, 'ua') : value;
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toAdminCategory(category) {
  return {
    id: category.id,
    name: normalizeLocalizedField(category.name),
    slug: category.slug,
    section: category.section || 'KITCHEN',
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    noPhoto: category.noPhoto || false,
    itemsCount: category._count?.items ?? category.items?.length ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    items: Array.isArray(category.items) ? category.items.map(toAdminItem) : undefined
  };
}

function toAdminItem(item) {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: normalizeLocalizedField(item.name),
    description: normalizeLocalizedField(item.description),
    price: Number(item.price),
    imageUrl: item.imageUrl || '',
    likesCount: Number(item.likesCount || 0),
    isActive: item.isActive,
    isAvailable: item.isAvailable,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    category: item.category
      ? {
          id: item.category.id,
          name: normalizeLocalizedField(item.category.name),
          slug: item.category.slug,
          section: item.category.section || 'KITCHEN',
          isActive: item.category.isActive,
          sortOrder: item.category.sortOrder
        }
      : undefined
  };
}

function buildUniqueSlugCandidate(name, providedSlug) {
  const base = slugify(providedSlug || name);
  return base || `category-${Date.now()}`;
}

async function ensureUniqueCategorySlug(baseSlug, excludeId) {
  let attempt = 0;
  let candidate = baseSlug;

  while (true) {
    const existing = await prisma.menuCategory.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${attempt + 1}`;
  }
}

async function listCategories() {
  const categories = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      _count: {
        select: { items: true }
      }
    }
  });

  return categories.map(toAdminCategory);
}

async function createCategory(input) {
  const nameObj = await autoTranslateObject(input.name);
  const slugBase = buildUniqueSlugCandidate(nameObj, input.slug);

  if (!nameObj.ua) {
    return { type: 'INVALID', message: 'Category name is required.' };
  }

  const slug = await ensureUniqueCategorySlug(slugBase);
  const category = await prisma.menuCategory.create({
    data: {
      name: nameObj,
      slug,
      section: normalizeMenuSection(input.section, 'KITCHEN'),
      sortOrder: normalizeInteger(input.sortOrder, 0),
      isActive: normalizeBoolean(input.isActive, true),
      noPhoto: normalizeBoolean(input.noPhoto, false)
    }
  });

  return { type: 'SUCCESS', category: toAdminCategory(category) };
}

async function updateCategory(id, input) {
  const existing = await prisma.menuCategory.findUnique({ where: { id } });

  if (!existing) {
    return { type: 'NOT_FOUND' };
  }

  let nameObj = existing.name;
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    nameObj = await autoTranslateObject(input.name);
  }

  const slugSeed = Object.prototype.hasOwnProperty.call(input, 'slug') ? input.slug : existing.slug;
  const slug = await ensureUniqueCategorySlug(buildUniqueSlugCandidate(nameObj, slugSeed), id);

  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      name: nameObj,
      slug,
      section: Object.prototype.hasOwnProperty.call(input, 'section')
        ? normalizeMenuSection(input.section, existing.section || 'KITCHEN')
        : (existing.section || 'KITCHEN'),
      sortOrder: Object.prototype.hasOwnProperty.call(input, 'sortOrder')
        ? normalizeInteger(input.sortOrder, existing.sortOrder)
        : existing.sortOrder,
      isActive: Object.prototype.hasOwnProperty.call(input, 'isActive')
        ? normalizeBoolean(input.isActive, existing.isActive)
        : existing.isActive,
      noPhoto: Object.prototype.hasOwnProperty.call(input, 'noPhoto')
        ? normalizeBoolean(input.noPhoto, existing.noPhoto)
        : existing.noPhoto
    }
  });

  return { type: 'SUCCESS', category: toAdminCategory(category) };
}

async function deleteCategory(id) {
  const existing = await prisma.menuCategory.findUnique({ where: { id } });
  if (!existing) {
    return { type: 'NOT_FOUND' };
  }

  await prisma.menuCategory.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

async function listItems() {
  const items = await prisma.menuItem.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      category: true
    }
  });

  return items.map(toAdminItem);
}

async function createItem(input) {
  const categoryId = Number(input.categoryId);
  const nameObj = await autoTranslateObject(input.name);
  const descriptionObj = input.description ? await autoTranslateObject(input.description) : null;
  const priceNumber = Number(input.price);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { type: 'INVALID', message: 'A valid category is required.' };
  }

  if (!nameObj.ua) {
    return { type: 'INVALID', message: 'Item name is required.' };
  }

  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return { type: 'INVALID', message: 'A valid price is required.' };
  }

  const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  if (!category) {
    return { type: 'INVALID', message: 'Category not found.' };
  }

  const item = await prisma.menuItem.create({
    data: {
      categoryId,
      name: nameObj,
      description: descriptionObj,
      price: priceNumber,
      imageUrl: normalizeOptionalText(input.imageUrl),
      isActive: normalizeBoolean(input.isActive, true),
      isAvailable: normalizeBoolean(input.isAvailable, true),
      sortOrder: normalizeInteger(input.sortOrder, 0)
    },
    include: {
      category: true
    }
  });

  return { type: 'SUCCESS', item: toAdminItem(item) };
}

async function updateItem(id, input) {
  const existing = await prisma.menuItem.findUnique({
    where: { id },
    include: { category: true }
  });

  if (!existing) {
    return { type: 'NOT_FOUND' };
  }

  const categoryId = Object.prototype.hasOwnProperty.call(input, 'categoryId')
    ? Number(input.categoryId)
    : existing.categoryId;

  let nameObj = existing.name;
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    nameObj = await autoTranslateObject(input.name);
  }

  let descriptionObj = existing.description;
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    descriptionObj = input.description ? await autoTranslateObject(input.description) : null;
  }

  const priceNumber = Object.prototype.hasOwnProperty.call(input, 'price') ? Number(input.price) : Number(existing.price);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { type: 'INVALID', message: 'A valid category is required.' };
  }

  if (!nameObj || (typeof nameObj === 'object' && !nameObj.ua)) {
    return { type: 'INVALID', message: 'Item name is required.' };
  }

  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return { type: 'INVALID', message: 'A valid price is required.' };
  }

  const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  if (!category) {
    return { type: 'INVALID', message: 'Category not found.' };
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      categoryId,
      name: nameObj,
      description: descriptionObj,
      price: priceNumber,
      imageUrl: Object.prototype.hasOwnProperty.call(input, 'imageUrl')
        ? normalizeOptionalText(input.imageUrl)
        : existing.imageUrl,
      isActive: Object.prototype.hasOwnProperty.call(input, 'isActive')
        ? normalizeBoolean(input.isActive, existing.isActive)
        : existing.isActive,
      isAvailable: Object.prototype.hasOwnProperty.call(input, 'isAvailable')
        ? normalizeBoolean(input.isAvailable, existing.isAvailable)
        : existing.isAvailable,
      sortOrder: Object.prototype.hasOwnProperty.call(input, 'sortOrder')
        ? normalizeInteger(input.sortOrder, existing.sortOrder)
        : existing.sortOrder
    },
    include: {
      category: true
    }
  });

  return { type: 'SUCCESS', item: toAdminItem(item) };
}

async function deleteItem(id) {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    return { type: 'NOT_FOUND' };
  }

  await prisma.menuItem.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

async function getInsights() {
  const [items, categoryCount, activeCategoryCount] = await Promise.all([
    prisma.menuItem.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        likesCount: true,
        isAvailable: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [{ likesCount: 'desc' }, { id: 'asc' }]
    }),
    prisma.menuCategory.count(),
    prisma.menuCategory.count({ where: { isActive: true } })
  ]);

  const totalLikes = items.reduce((sum, item) => sum + Number(item.likesCount || 0), 0);
  const activeItemsCount = items.length;
  const availableItemsCount = items.filter((item) => item.isAvailable).length;
  const likedItemsCount = items.filter((item) => Number(item.likesCount || 0) > 0).length;
  const topLikedItems = items.slice(0, 5).map((item) => ({
    id: item.id,
    name: normalizeLocalizedField(item.name),
    likesCount: Number(item.likesCount || 0),
    categoryName: normalizeLocalizedField(item.category?.name)
  }));

  return {
    summary: {
      totalLikes,
      activeItemsCount,
      availableItemsCount,
      likedItemsCount,
      categoryCount,
      activeCategoryCount
    },
    topLikedItems
  };
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  getInsights
};
