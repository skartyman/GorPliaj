const prisma = require('../lib/prisma');

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

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toAdminCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
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
    name: item.name,
    description: item.description || '',
    price: Number(item.price),
    imageUrl: item.imageUrl || '',
    isActive: item.isActive,
    isAvailable: item.isAvailable,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    category: item.category
      ? {
          id: item.category.id,
          name: item.category.name,
          slug: item.category.slug,
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
  const name = normalizeText(input.name);
  const slugBase = buildUniqueSlugCandidate(name, input.slug);

  if (!name) {
    return { type: 'INVALID', message: 'Category name is required.' };
  }

  const slug = await ensureUniqueCategorySlug(slugBase);
  const category = await prisma.menuCategory.create({
    data: {
      name,
      slug,
      sortOrder: normalizeInteger(input.sortOrder, 0),
      isActive: normalizeBoolean(input.isActive, true)
    }
  });

  return { type: 'SUCCESS', category: toAdminCategory(category) };
}

async function updateCategory(id, input) {
  const existing = await prisma.menuCategory.findUnique({ where: { id } });

  if (!existing) {
    return { type: 'NOT_FOUND' };
  }

  const name = Object.prototype.hasOwnProperty.call(input, 'name') ? normalizeText(input.name) : existing.name;
  if (!name) {
    return { type: 'INVALID', message: 'Category name is required.' };
  }

  const slugSeed = Object.prototype.hasOwnProperty.call(input, 'slug') ? input.slug : existing.slug;
  const slug = await ensureUniqueCategorySlug(buildUniqueSlugCandidate(name, slugSeed), id);

  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      name,
      slug,
      sortOrder: Object.prototype.hasOwnProperty.call(input, 'sortOrder')
        ? normalizeInteger(input.sortOrder, existing.sortOrder)
        : existing.sortOrder,
      isActive: Object.prototype.hasOwnProperty.call(input, 'isActive')
        ? normalizeBoolean(input.isActive, existing.isActive)
        : existing.isActive
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
  const name = normalizeText(input.name);
  const priceNumber = Number(input.price);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { type: 'INVALID', message: 'A valid category is required.' };
  }

  if (!name) {
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
      name,
      description: normalizeOptionalText(input.description),
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
  const name = Object.prototype.hasOwnProperty.call(input, 'name') ? normalizeText(input.name) : existing.name;
  const priceNumber = Object.prototype.hasOwnProperty.call(input, 'price') ? Number(input.price) : Number(existing.price);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { type: 'INVALID', message: 'A valid category is required.' };
  }

  if (!name) {
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
      name,
      description: Object.prototype.hasOwnProperty.call(input, 'description')
        ? normalizeOptionalText(input.description)
        : existing.description,
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

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listItems,
  createItem,
  updateItem,
  deleteItem
};
