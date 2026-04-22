const prisma = require('../lib/prisma');
const { normalizeLocalizedField } = require('../utils/localization');

function toPublicCategory(category) {
  return {
    id: category.id,
    name: normalizeLocalizedField(category.name),
    slug: category.slug,
    section: category.section || 'KITCHEN',
    sortOrder: category.sortOrder,
    items: category.items
      .filter((item) => item.isActive && item.isAvailable)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        name: normalizeLocalizedField(item.name),
        description: normalizeLocalizedField(item.description),
        price: Number(item.price),
        imageUrl: item.imageUrl || '',
        likesCount: Number(item.likesCount || 0),
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder
      }))
  };
}

async function getMenu() {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { id: 'asc' }
    ],
    include: {
      items: {
        where: {
          isActive: true,
          isAvailable: true
        },
        orderBy: [
          { sortOrder: 'asc' },
          { id: 'asc' }
        ]
      }
    }
  });

  return categories.map(toPublicCategory).filter((category) => category.items.length > 0);
}

async function setMenuItemLike(itemId, liked) {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      likesCount: true,
      isActive: true,
      isAvailable: true,
      name: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          sortOrder: true
        }
      }
    }
  });

  if (!item || !item.isActive || !item.isAvailable || !item.category?.isActive) {
    return { type: 'NOT_FOUND' };
  }

  const nextLikesCount = liked
    ? Number(item.likesCount || 0) + 1
    : Math.max(0, Number(item.likesCount || 0) - 1);

  const updatedItem = await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      likesCount: nextLikesCount
    },
    select: {
      id: true,
      likesCount: true,
      name: true
    }
  });

  return {
    type: 'SUCCESS',
    item: {
      id: updatedItem.id,
      name: normalizeLocalizedField(updatedItem.name),
      likesCount: Number(updatedItem.likesCount || 0)
    }
  };
}

module.exports = {
  getMenu,
  setMenuItemLike
};
