import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'admin-language';

const translations = {
  ua: {
    appTitle: 'Адмінка GorPliaj',
    brand: 'GorPliaj Admin',
    common: {
      admin: 'Адмінка',
      loading: 'Завантаження...',
      logout: 'Вийти',
      hideSidebar: 'Сховати меню',
      showSidebar: 'Показати меню',
      languageSwitch: 'RU',
      languageAria: 'Переключити мову на російську',
      guest: 'Гість',
      noData: '—',
      soon: 'скоро',
      unknownStatus: 'НЕВІДОМО'
    },
    install: {
      title: 'Встановити адмінку',
      description: 'Додайте GorPliaj Admin як окремий додаток.',
      cta: 'Встановити',
      installing: 'Відкриваємо...'
    },
    nav: {
      dashboard: 'Дашборд',
      reservations: 'Бронювання',
      map: 'Карта',
      mapEditor: 'Редактор карти',
      menu: 'Меню',
      events: 'Події',
      news: 'Новини',
      payments: 'Платежі',
      settings: 'Налаштування'
    },
    login: {
      eyebrow: 'Доступ до адмінки',
      title: 'Панель управління GorPliaj',
      description: 'Мобільна сторінка входу для управління бронюваннями, картою залу та контентом.',
      access: 'Доступ',
      admin: 'Єдина адмінка',
      email: 'Email',
      password: 'Пароль',
      error: 'Не вдалося увійти.',
      submit: 'Увійти',
      submitting: 'Входимо...'
    },
    protected: {
      loading: 'Перевіряємо доступ...'
    },
    dashboard: {
      eyebrow: 'Головне робоче місце',
      title: 'Операційне зведення з пріоритетом на щоденну роботу',
      description: 'Дашборд показує поточне навантаження, швидкі переходи та найближчі бронювання на одному екрані.',
      openReservations: 'Відкрити бронювання',
      viewMap: 'Відкрити карту',
      openMenu: 'Відкрити меню',
      summary: {
        today: 'Бронювань сьогодні',
        pending: 'Очікують підтвердження',
        confirmed: 'Підтверджено',
        completed: 'Завершено',
        busyTables: 'Зайнятих столів',
        totalLikes: 'Всього лайків',
        likedItems: 'Популярних страв',
        menuItems: 'Активних страв'
      },
      quickActionsTitle: 'Швидкі дії',
      quickActionsDescription: 'Короткі сценарії для адміністратора на телефоні та на десктопі.',
      likesTitle: 'Лідери за лайками',
      likesDescription: 'Топ страв, які користувачі найчастіше відмічають у публічному меню.',
      upcomingTitle: 'Найближчі бронювання',
      upcomingDescription: 'Актуальні броні з live API.',
      latestTitle: 'Останні створені',
      latestDescription: 'Свіжі записи для швидкого контролю.',
      quick: {
        reservationsTitle: 'Бронювання',
        reservationsDescription: 'Шукати, фільтрувати та швидко змінювати статуси.',
        mapTitle: 'Карта залу',
        mapDescription: 'Дивитися завантаження столів та поточну посадку.',
        menuTitle: 'Меню та лайки',
        menuDescription: 'Редагувати страви та відстежувати інтерес гостей до позицій.',
        newsTitle: 'Новини на головній',
        newsDescription: 'Готувати анонси та важливі повідомлення.',
        eventsTitle: 'Події',
        eventsDescription: 'Планувати афіші, дати та промо.'
      },
      errors: {
        load: 'Не вдалося завантажити дашборд.',
        loadInsights: 'Не вдалося завантажити статистику меню.'
      },
      empty: {
        upcoming: 'Найближчих бронювань поки немає.',
        latest: 'Нещодавніх бронювань поки немає.',
        likes: 'Поки немає страв з лайками.'
      },
      createdFromFeed: 'Створено з поточного адміністративного потоку.',
      noCategory: 'Без категорії'
    },
    reservations: {
      title: 'Бронювання',
      description: 'Операційний список бронювань з фільтрами та швидкими діями.',
      eyebrow: 'Живі бронювання',
      heroTitle: 'Швидкий пошук та дії для команди сервісу',
      heroDescription: 'Фільтри залишаються зручними на мобільних пристроях, а таблиця доступна на широких екранах.',
      resetFilters: 'Скинути фільтри',
      refresh: 'Оновити',
      searchLabel: 'Пошук за гостем / телефоном',
      searchPlaceholder: 'Ім’я гостя або телефон',
      dateLabel: 'Дата',
      statusLabel: 'Статус',
      showing: 'Показано {visible} з {total} бронювань.',
      loading: 'Завантажуємо бронювання...',
      empty: 'За поточними фільтрами бронювань не знайдено.',
      errors: {
        load: 'Не вдалося завантажити бронювання.',
        update: 'Не вдалося оновити статус бронювання.'
      },
      summary: {
        visible: 'Видимих броней',
        pending: 'Очікують',
        confirmed: 'Підтверджено',
        guests: 'Всього гостей'
      },
      columns: {
        reservation: 'Бронь',
        dateTime: 'Дата / час',
        phone: 'Телефон',
        tableZone: 'Стіл / зона',
        modePlace: 'Режим / тип',
        guests: 'Гості',
        status: 'Статус',
        actions: 'Швидкі дії'
      },
      actions: {
        confirm: 'Підтвердити',
        cancel: 'Скасувати',
        complete: 'Завершити',
        save: 'Зберігаємо...',
        none: 'Немає дій'
      },
      statuses: {
        all: 'Всі'
      }
    },
    reservationDetail: {
      eyebrow: 'Деталі бронювання',
      title: 'Бронювання №{id}',
      description: 'Фокусний екран з ключовою інформацією та пріоритетними діями адміністратора.',
      back: 'Назад до бронювань',
      overviewTitle: 'Огляд броні',
      overviewDescription: 'Детальна картка бронювання зі зрозумілими статусними діями.',
      loading: 'Завантажуємо бронювання...',
      errors: {
        load: 'Не вдалося завантажити бронювання.',
        update: 'Не вдалося оновити статус.'
      },
      guestInfo: 'Інформація про гостя',
      slotInfo: 'Параметри броні',
      statusActions: 'Дії зі статусом',
      statusActionsDescription: 'Використовуйте дії нижче, щоб підтримувати актуальний стан посадки.',
      noActions: 'Для цього бронювання немає доступних переходів статусу.',
      updating: 'Оновлюємо...',
      setStatus: 'Встановити {status}',
      fields: {
        guest: 'Гість',
        phone: 'Телефон',
        guests: 'Кількість гостей',
        mode: 'Режим',
        placeType: 'Тип місця',
        comments: 'Коментар',
        date: 'Дата',
        startTime: 'Час початку',
        table: 'Стіл',
        zone: 'Зона',
        status: 'Статус'
      }
    },
    reservationMeta: {
      mode: {
        DAY: 'День',
        EVENING: 'Вечір',
        WINTER: 'Зима'
      },
      place: {
        TABLE: 'Стіл',
        SUNBED: 'Шезлонг',
        BUNGALOW: 'Бунгало',
        PIER: 'Пірс',
        EVENT: 'Квиток'
      }
    },
    mapEditor: {
      title: 'Редактор карти',
      description: 'Адмінський редактор об’єктів поточної карти без впливу на публічний flow бронювання.',
      eyebrow: 'Редактор схеми майданчика',
      heroTitle: 'Створюйте, переміщуйте, дублюйте та налаштовуйте об’єкти майданчика',
      heroDescription: 'Редактор завантажує поточну дефолтну карту, дозволяє налаштовувати повноцінний фон плану закладу, додавати нові об’єкти та зберігає актуальний список назад через admin API.',
      note: 'Використовуйте верхню панель для швидкого додавання об’єктів, а праву колонку — для точного налаштування обраного елемента.',
      editorNote: 'Додавайте нові елементи у вкладці «Об’єкти», а точні параметри змінюйте у «Властивостях».',
      mapVariant: 'Варіант карти',
      defaultMapBadge: 'дефолт',
      newMapPreset: 'Тип нової карти',
      newMapNamePlaceholder: 'Назва нової карти (наприклад, Нічна посадка)',
      newMapDescriptionPlaceholder: 'Опис (наприклад, Концертна розсадка)',
      makeDefault: 'Зробити дефолтною',
      createMap: 'Створити варіант карти',
      creatingMap: 'Створюємо...',
      mapCreatedSuccess: 'Новий варіант карти створено.',
      loading: 'Завантажуємо редактор карти...',
      save: 'Зберегти карту',
      saving: 'Зберігаємо...',
      reset: 'Скинути правки',
      zoomOut: 'Зменшити',
      zoomIn: 'Збільшити',
      zoomFit: 'Показати всю',
      zoomActual: '100%',
      clearSelection: 'Зняти вибір',
      duplicateSelected: 'Дублювати обране',
      deleteSelected: 'Видалити обране',
      deleteConfirm: 'Видалити об’єкт «{name}»?',
      addObject: '+ {type}',
      rotateLeft: '↺ -15°',
      rotateRight: '↻ +15°',
      saveSuccess: 'Зміни карти збережено.',
      meta: 'Карта: {map} • Розмір: {size} • Об’єктів: {objects} • Столів: {tables}',
      canvasTitle: 'Полотно для редагування',
      canvasDescription: 'Клікніть по об’єкту для вибору, тягніть для переміщення та використовуйте ручки для resize.',
      mapSettingsTitle: 'Налаштування карти',
      mapSettingsDescription: 'Задайте колір та зображення фону, щоб перетворити сітку на повноцінну карту закладу.',
      propertiesTitle: 'Властивості об’єкта',
      propertiesDescription: 'Точні координати та параметри активного об’єкта.',
      noSelection: 'Оберіть об’єкт на схемі, щоб редагувати його властивості.',
      unassignedTable: 'Без прив’язки до столу',
      newLabelDefault: 'Новий текст',
      lineDefault: 'Лінія',
      uploadAsset: 'Завантажити',
      sections: {
        general: 'Основне',
        graphics: 'Графіка',
        transform: 'Позиція'
      },
      tools: {
        select: 'Вибір',
        pan: 'Огляд',
        line: 'Лінія'
      },
      tabs: {
        properties: 'Властивості',
        layers: 'Шари',
        assets: 'Об’єкти'
      },
      fields: {
        label: 'Текст',
        x: 'X',
        y: 'Y',
        width: 'Ширина',
        height: 'Висота',
        rotation: 'Поворот',
        zIndex: 'zIndex',
        isActive: 'Активний',
        tableId: 'Пов’язаний стіл',
        tablePhotoUrl: 'Фото столу',
        backgroundImage: 'URL фонової схеми',
        backgroundColor: 'Колір фону',
        texture: 'Текстура',
        svgUrl: 'SVG / зображення',
        svgCode: 'SVG-код',
        strokeWidth: 'Товщина лінії',
        strokeColor: 'Колір лінії'
      },
      objectType: {
        TABLE: 'Стіл',
        BAR: 'Бар',
        STAGE: 'Сцена',
        ENTRANCE: 'Вхід',
        WC: 'WC',
        LABEL: 'Напис',
        POOL: 'Басейн',
        WALL: 'Стіна',
        DECOR: 'Декор',
        STAIRS: 'Сходи',
        PATH: 'Доріжка',
        CUSTOM: 'Об’єкт'
      },
      errors: {
        load: 'Не вдалося завантажити редактор карти.',
        save: 'Не вдалося зберегти зміни карти.',
        createMap: 'Не вдалося створити варіант карти.'
      }
    },
    menuAdmin: {
      title: 'Меню',
      description: 'Повноцінний редактор меню з категоріями, позиціями, видимістю та стоп-листом.',
      eyebrow: 'Управління меню',
      heroTitle: 'Редагуйте категорії та страви з live бази даних',
      heroDescription: 'Розділ підходить для щоденної роботи адміністратора: швидкі правки, перемикання видимості та контроль доступності прямо на одному екрані.',
      refresh: 'Оновити дані',
      saving: 'Зберігаємо...',
      cancelEdit: 'Скасувати',
      newCategoryTitle: 'Нова категорія',
      editCategoryTitle: 'Редагування категорії',
      categoryFormSubtitle: 'Створіть розділ меню, налаштуйте slug та порядок виводу.',
      newItemTitle: 'Нова позиція',
      editItemTitle: 'Редагування позиції',
      itemFormSubtitle: 'Додайте страву або напій, ціну та поточний статус наявності.',
      categoriesListTitle: 'Категорії меню',
      categoriesListSubtitle: 'Керуйте структурою меню та видимістю розділів.',
      itemsListTitle: 'Позиції меню',
      itemsListSubtitle: 'Робочий список страв зі швидкими перемикачами та редагуванням.',
      emptyCategories: 'Категорій поки немає. Створіть першу категорію, щоб почати роботу.',
      emptyItems: 'Позиції меню поки не додані.',
      emptyCategoryItems: 'У цій категорії поки немає позицій.',
      fields: {
        category: 'Категорія',
        categoryName: 'Назва категорії',
        categorySlug: 'Slug',
        section: 'Розділ',
        itemName: 'Назва позиції',
        description: 'Опис',
        price: 'Ціна',
        imageUrl: 'Image URL',
        uploadImage: 'Завантажити фото',
        sortOrder: 'Порядок',
        visibleOnSite: 'Показувати на сайті',
        availableNow: 'Доступно зараз'
      },
      placeholders: {
        categoryName: 'Наприклад, Основні страви',
        categorySlug: 'main-courses',
        itemName: 'Наприклад, Сібас на грилі',
        description: 'Короткий опис страви або напою'
      },
      stats: {
        categories: 'Всього категорій',
        activeCategories: 'Активних категорій',
        totalItems: 'Всього позицій',
        visibleItems: 'Видимих позицій',
        availableItems: 'Доступно до замовлення',
        stopList: 'У стоп-листі'
      },
      actions: {
        addCategory: 'Додати категорію',
        saveCategory: 'Зберегти категорію',
        addItem: 'Додати позицію',
        saveItem: 'Зберегти позицію',
        edit: 'Змінити',
        delete: 'Видалити'
      },
      errors: {
        load: 'Не вдалося завантажити редактор меню.',
        saveCategory: 'Не вдалося зберегти категорію.',
        saveItem: 'Не вдалося зберегти позицію.',
        uploadItemImage: 'Не вдалося завантажити фото позиції.',
        deleteCategory: 'Не вдалося видалити категорію.',
        deleteItem: 'Не вдалося видалити позицію.'
      },
      feedback: {
        categoryCreated: 'Категорія створена.',
        categoryUpdated: 'Категорія оновлена.',
        categoryDeleted: 'Категорія видалена.',
        categoryVisibilityUpdated: 'Видимість категорії оновлена.',
        itemCreated: 'Позиція створена.',
        itemUpdated: 'Позиція оновлена.',
        itemDeleted: 'Позиція видалена.',
        itemVisibilityUpdated: 'Видимість позиції оновлена.',
        itemAvailabilityUpdated: 'Доступність позиції оновлена.',
        itemImageUploaded: 'Фото позиції завантажено.'
      },
      confirmDeleteCategory: 'Видалити категорію «{name}» разом з усіма позиціями?',
      confirmDeleteItem: 'Видалити позицію «{name}»?',
      selectCategory: 'Оберіть категорію',
      sections: {
        kitchen: 'Кухня',
        bar: 'Бар'
      },
      visible: 'Видно',
      hidden: 'Приховано',
      available: 'Доступно',
      stopListLabel: 'Стоп-лист',
      itemsCountSuffix: 'поз.'
    },
    map: {
      title: 'Карта майданчика',
      description: 'Операційна карта залу з візуальними статусами столів та деталями бронювань.',
      openEditor: 'Відкрити редактор',
      eyebrow: 'Жива схема',
      heroTitle: 'Статуси столів, зони та швидкий контекст',
      heroDescription: 'Карта починається як мобільний вертикальний сценарій і розширюється в split-layout на великих екранах.',
      note: 'Натисніть на стіл, щоб побачити його поточний статус.',
      loading: 'Завантажуємо карту...',
      errors: {
        load: 'Не вдалося завантажити карту.'
      },
      meta: 'Карта: {map} • Зон: {zones} • Столів: {tables}',
      tableDetails: 'Деталі столу',
      tableDetailsDescription: 'Оберіть стіл на карті, щоб побачити деталі та дії.',
      noTableSelected: 'Оберіть стіл, щоб побачити деталі та пов’язані бронювання.',
      activeReservations: 'Активні бронювання',
      noActiveReservations: 'Для цього столу зараз немає активних бронювань.',
      holdSoon: 'Утримати стіл ({soon})',
      freeSoon: 'Звільнити стіл ({soon})',
      moveSoon: 'Пересадити броню ({soon})',
      legend: {
        free: 'Вільний',
        pending: 'Очікує',
        confirmed: 'Підтверджений',
        held: 'Утриманий',
        unavailable: 'Недоступний'
      },
      fields: {
        table: 'Стіл',
        zone: 'Зона',
        availability: 'Доступність',
        capacity: 'Місткість'
      },
      tablePhotoAlt: 'Фото столу {table}'
    },
    status: {
      PENDING: 'Очікує',
      CONFIRMED: 'Підтверджено',
      AWAITING_PAYMENT: 'Чекає оплату',
      HELD: 'Утримано',
      SEATED: 'Гості на місці',
      COMPLETED: 'Завершено',
      CANCELLED: 'Скасовано',
      NO_SHOW: 'Не прийшли',
      UNAVAILABLE: 'Недоступно',
      FREE: 'Вільно',
      UNKNOWN: 'Невідомо'
    },
    settings: {
      title: 'Налаштування',
      description: 'Управління основними параметрами закладу, SEO та контактними даними.',
      eyebrow: 'Конфігурація сайту',
      save: 'Зберегти налаштування',
      saving: 'Зберігаємо...',
      saveSuccess: 'Налаштування успішно збережені.',
      errors: {
        load: 'Не вдалося завантажити налаштування.',
        save: 'Не вдалося зберегти налаштування.'
      },
      sections: {
        general: 'Загальні налаштування',
        hero: 'Головний блок (Hero)',
        seo: 'SEO параметри',
        contacts: 'Контактна інформація',
        workingHours: 'Години роботи',
        socialMedia: 'Соціальні мережі',
        footer: 'Підвал сайту (Footer)'
      },
      fields: {
        title: 'Заголовок сайту',
        description: 'Опис (Meta Description)',
        keywords: 'Ключові слова',
        logoUrl: 'URL логотипу',
        faviconUrl: 'URL фавікону',
        heroTitleRu: 'Заголовок Hero (RU)',
        heroTitleEn: 'Заголовок Hero (EN)',
        heroSubtitleRu: 'Підзаголовок Hero (RU)',
        heroSubtitleEn: 'Підзаголовок Hero (EN)',
        footerTextRu: 'Текст у підвалі (RU)',
        footerTextEn: 'Текст у підвалі (EN)',
        phone: 'Телефон',
        email: 'Email',
        address: 'Адреса',
        workingHours: 'Години роботи',
        socialMedia: 'Соціальні мережі'
      }
    }
  },
  ru: {
    appTitle: 'Админка GorPliaj',
    brand: 'GorPliaj Admin',
    common: {
      admin: 'Админка',
      loading: 'Загрузка...',
      logout: 'Выйти',
      languageSwitch: 'EN',
      languageAria: 'Переключить язык на английский',
      guest: 'Гость',
      noData: '—',
      soon: 'скоро',
      unknownStatus: 'НЕИЗВЕСТНО'
    },
    // ... остальное RU остается без изменений
  },
  en: {
    appTitle: 'GorPliaj Admin',
    brand: 'GorPliaj Admin',
    common: {
      admin: 'Admin',
      loading: 'Loading...',
      logout: 'Logout',
      languageSwitch: 'UA',
      languageAria: 'Switch language to Ukrainian',
      guest: 'Guest',
      noData: '—',
      soon: 'soon',
      unknownStatus: 'UNKNOWN'
    },
    // ... остальное EN остается без изменений
  }
};

const I18nContext = createContext(null);

function getValueByPath(source, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), source);
}

function interpolate(message, params = {}) {
  return String(message).replace(/\{(.*?)\}/g, (_, key) => String(params[key] ?? ''));
}

export function AdminI18nProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || 'ua');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'ua' ? 'uk' : language;
    document.title = getValueByPath(translations[language], 'appTitle') || 'Admin';
  }, [language]);

  const value = useMemo(() => {
    const dictionary = translations[language] || translations.ua;
    return {
      language,
      locale: language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US'),
      toggleLanguage: () => {
        const order = ['ua', 'ru', 'en'];
        const next = order[(order.indexOf(language) + 1) % order.length];
        setLanguage(next);
      },
      t(path, params) {
        const message = getValueByPath(dictionary, path) ?? getValueByPath(translations.ua, path) ?? path;
        return interpolate(message, params);
      }
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useAdminI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useAdminI18n must be used within AdminI18nProvider');
  }

  return context;
}
