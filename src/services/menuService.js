const menu = [
  {
    id: 1,
    category: { uk: 'Напої', en: 'Drinks' },
    name: { uk: 'Лимонад манго-маракуя', en: 'Mango-passionfruit lemonade' },
    price: 420
  },
  {
    id: 2,
    category: { uk: 'Закуски', en: 'Starters' },
    name: { uk: 'Тартар із тунця', en: 'Tuna tartare' },
    price: 780
  },
  {
    id: 3,
    category: { uk: 'Основні страви', en: 'Main courses' },
    name: { uk: 'Паста з морепродуктами', en: 'Seafood pasta' },
    price: 980
  },
  {
    id: 4,
    category: { uk: 'Гриль', en: 'Grill' },
    name: { uk: 'Лобстер на вугіллі', en: 'Charcoal lobster' },
    price: 1900
  },
  {
    id: 5,
    category: { uk: 'Десерти', en: 'Desserts' },
    name: { uk: 'Кокосовий мус', en: 'Coconut mousse' },
    price: 490
  }
];

function getMenu() {
  return menu;
}

module.exports = { getMenu };
