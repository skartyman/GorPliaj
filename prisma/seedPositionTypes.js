const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const types = [
    {
      value: 'BUNGALOW', name: { ua: 'Бунгало', ru: 'Бунгало', en: 'Bungalow' },
      description: {
        ua: 'Окрема комфортна пляжна зона для відпочинку компанією. Тут більше простору та приватності, ніж на звичайних лежаках: можна зручно розміститися, провести день біля моря, замовити їжу та напої з ресторану й спокійно відпочивати у своїй зоні.',
        ru: 'Отдельная комфортная пляжная зона для отдыха компанией. Здесь больше пространства и приватности, чем на обычных лежаках: можно удобно разместиться, провести день у моря, заказать еду и напитки из ресторана и спокойно отдыхать в своей зоне.',
        en: 'A separate comfortable beach area for group relaxation. More space and privacy than regular sunbeds: settle in comfortably, spend a day by the sea, order food and drinks from the restaurant, and relax in your own zone.'
      },
      code: 'B', requiresSide: true, bookingKind: 'BEACH', sortOrder: 1,
      defaultPrice: 1000
    },
    {
      value: 'KROVAT', name: { ua: 'Ліжко', ru: 'Кровать', en: 'Daybed' },
      description: {
        ua: "Зручне пляжне ліжко з м'яким матрацом — ідеальний варіант для пар або solo-відпочинку. Розташоване з комфортним доступом до моря, у затінку або на сонці — на ваш вибір. Доступне на лівому та правому пляжі.",
        ru: 'Удобная пляжная кровать с мягким матрасом — идеальный вариант для пар или solo-отдыха. Расположена с комфортным доступом к морю, в тени или на солнце — на ваш выбор. Доступна на левом и правом пляже.',
        en: 'Comfortable beach daybed with a soft mattress — ideal for couples or solo relaxation. Positioned with easy access to the sea, in shade or sun — your choice. Available on the left and right beach.'
      },
      code: 'K', requiresSide: true, bookingKind: 'BEACH', sortOrder: 2,
      defaultPrice: 600
    },
    {
      value: 'PIER', name: { ua: 'Пірс', ru: 'Пирс', en: 'Pier' },
      description: {
        ua: 'Ексклюзивна зона на пірсі — найкращий вибір для тих, хто хоче максимально наблизитися до моря. Розкішний краєвид, свіжий вітер і повне відчуття свободи. Підходить для невеликих компаній.',
        ru: 'Эксклюзивная зона на пирсе — лучший выбор для тех, кто хочет максимально приблизиться к морю. Роскошный вид, свежий ветер и полное ощущение свободы. Подходит для небольших компаний.',
        en: 'Exclusive pier area — the best choice for those who want to get as close to the sea as possible. Luxurious views, fresh breeze, and a complete sense of freedom. Suitable for small groups.'
      },
      code: 'P', requiresSide: false, bookingKind: 'BEACH', sortOrder: 3,
      defaultPrice: 1500
    },
    {
      value: 'RESTAURANT', name: { ua: 'Ресторан', ru: 'Ресторан', en: 'Restaurant' },
      description: {
        ua: 'Столи в основній ресторанній зоні. Просторий зал з видом на море — ідеально для обіду, вечері або ділової зустрічі. Повне ресторанне обслуговування.',
        ru: 'Столы в основной ресторанной зоне. Просторный зал с видом на море — идеально для обеда, ужина или деловой встречи. Полное ресторанное обслуживание.',
        en: 'Tables in the main restaurant area. A spacious hall with a sea view — perfect for lunch, dinner, or a business meeting. Full restaurant service.'
      },
      code: 'R', requiresSide: false, bookingKind: 'TABLE', sortOrder: 4,
      defaultDeposit: 200
    },
    {
      value: 'TERRACE', name: { ua: 'Тераса', ru: 'Терраса', en: 'Terrace' },
      description: {
        ua: 'Столи на відкритій терасі — чудовий варіант для вечірнього відпочинку. Легкий вітерець, захід сонця та приємна атмосфера. Доступно у вечірні години або під час подій.',
        ru: 'Столы на открытой террасе — отличный вариант для вечернего отдыха. Легкий ветерок, закат и приятная атмосфера. Доступно в вечерние часы или во время событий.',
        en: 'Tables on the open terrace — a great option for evening relaxation. A light breeze, sunset views, and a pleasant atmosphere. Available during evening hours or events.'
      },
      code: 'T', requiresSide: false, bookingKind: 'TABLE', sortOrder: 5,
      defaultDeposit: 200
    }
  ];
  for (const t of types) {
    await prisma.positionType.upsert({
      where: { value: t.value },
      update: t,
      create: t
    });
    console.log('Seeded:', t.value);
  }
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
