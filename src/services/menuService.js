const prisma = require('../lib/prisma');

function toPublicCategory(category) {
  return {
    id: category.id,
    name: {
      uk: category.name,
      en: category.name
    },
    slug: category.slug,
    sortOrder: category.sortOrder,
    items: category.items
      .filter((item) => item.isActive && item.isAvailable)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        name: {
          uk: item.name,
          en: item.name
        },
        description: {
          uk: item.description || '',
          en: item.description || ''
        },
        price: Number(item.price),
        imageUrl: item.imageUrl || '',
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

module.exports = {
  getMenu
};
