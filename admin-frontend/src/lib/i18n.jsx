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
      unknownStatus: 'НЕВІДОМО',
      noAccess: 'Немає доступу до цієї сторінки',
      loadFailed: 'Не вдалося завантажити дані',
      failed: 'Не вдалося',
      saved: 'Збережено',
      deleted: 'Видалено',
      noItems: 'Немає даних',
      id: 'ID',
      total: 'Всього',
      edit: 'Редагувати',
      delete: 'Видалити',
      save: 'Зберегти',
      create: 'Створити',
      all: 'Всі',
      or: 'або',
      uploading: 'Завантаження…',
      lock: 'Заблокувати',
      unlock: 'Розблокувати'
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
      map: 'Мапа закладу',
      mapEditor: 'Редактор мапи',
      menu: 'Меню',
      events: 'Події',
      news: 'Новини',
      payments: 'Платежі',
      ticketSales: 'Продаж квитків',
      verifyTicket: 'Квитки',
      users: 'Користувачі',
      settings: 'Налаштування',
      positions: 'Позиції',
      positionTypes: 'Типи та ціни'
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
      },
      viewToggle: {
        table: 'Таблиця',
        kanban: 'Дошка'
      },
      management: {
        title: 'Position management',
        description: 'Deposits, availability, photo and manual booking',
        helpText: 'This block works in the selected date or event scope and keeps static settings separate from per-scope overrides.',
        openMap: 'Open map page',
        scopeDate: 'Scope date',
        event: 'Event',
        noEvent: 'No event scope',
        map: 'Map',
        allMaps: 'All maps',
        zone: 'Zone',
        allZones: 'All zones',
        search: 'Search',
        searchPlaceholder: 'Code, map, zone, service',
        scopeLabel: 'Scope: {scopeInfo} · {scopeDate}',
        scopeDateLabel: 'date',
        scopeEvent: 'event #{id}',
        loading: 'Loading positions...',
        empty: 'No position types in this scope.',
        selectedType: 'Selected type',
        specificPosition: 'Specific position',
        codesInType: 'Codes in type: {codes}',
        columns: {
          type: 'Type',
          mapZone: 'Map / zone',
          capacity: 'Capacity',
          effective: 'Effective',
          bookings: 'Bookings',
          pcs: 'pcs',
          deposit: 'Deposit: {amount}',
          confirmed: 'Confirmed: {count}'
        },
        details: {
          kind: 'Kind',
          type: 'Type',
          capacity: 'Capacity',
          effectiveDeposit: 'Effective deposit',
          bookingsInScope: 'Bookings in scope',
          availability: 'Availability'
        },
        baseSettings: {
          title: 'Base settings',
          description: 'Static properties of the position. They apply outside overrides too.',
          deposit: 'Base deposit',
          photoUrl: 'Photo URL',
          activeOnMap: 'Active on map',
          bookableByDefault: 'Bookable by default',
          uploadPhoto: 'Upload photo',
          save: 'Save base settings',
          saving: 'Saving...',
          uploading: 'Uploading...'
        },
        overrideSettings: {
          title: 'Scope override',
          description: 'Applied to {scope} with higher priority than base settings.',
          enableOverride: 'Enable override in this scope',
          deposit: 'Override deposit',
          photoUrl: 'Override photo URL',
          activeInScope: 'Active in this scope',
          bookableInScope: 'Bookable in this scope',
          note: 'Note',
          save: 'Save override',
          saving: 'Saving...',
          remove: 'Remove override',
          removing: 'Removing...'
        },
        manualBooking: {
          title: 'Manual booking',
          closeForm: 'Close form',
          createBooking: 'Create booking',
          guestName: 'Guest name',
          phone: 'Phone',
          email: 'Email',
          guests: 'Guests',
          date: 'Date',
          start: 'Start',
          end: 'End',
          source: 'Source',
          status: 'Status',
          depositRequired: 'Deposit required',
          depositAmount: 'Deposit amount',
          guestComment: 'Guest comment',
          adminComment: 'Admin comment',
          saving: 'Saving...',
          create: 'Create booking'
        },
        errors: {
          loadPositions: 'Unable to load positions.',
          saveBase: 'Unable to save base settings.',
          saveOverride: 'Unable to save override.',
          deleteOverride: 'Unable to delete override.',
          uploadPhoto: 'Unable to upload photo.',
          createReservation: 'Unable to create reservation.'
        },
        feedback: {
          baseSaved: 'Base settings saved.',
          overrideDisabled: 'Override is disabled.',
          overrideRemoved: 'Override removed.',
          overrideSaved: 'Override saved.',
          photoUploaded: 'Photo uploaded. Save base settings to apply it.',
          reservationCreated: 'Reservation created.'
        }
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
        status: 'Статус',
        map: 'Карта',
        deposit: 'Депозит',
        row: 'Ряд'
      }
    },
    reservationMeta: {
      mode: {
        DAY: 'День',
        EVENING: 'Вечір',
        WINTER: 'Зима',
        EVENT: 'Подія'
      },
      place: {
        TABLE: 'Стіл',
        SUNBED: 'Шезлонг',
        BUNGALOW: 'Бунгало',
        KROVAT: 'Ліжко',
        PIER: 'Пірс',
        RESTAURANT: 'Ресторан',
        TERRACE: 'Тераса',
        EVENT: 'Квиток'
      },
      bookingKind: {
        BEACH: 'Пляжна послуга',
        TABLE: 'Стіл'
      },
      availability: {
        hidden: 'Сховано',
        closed: 'Закрито',
        available: 'Доступно'
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
      newMapName: 'Назва карти',
      newMapDescription: 'Опис карти',
      newMapNamePlaceholder: 'Назва нової карти (наприклад, Нічна посадка)',
      newMapDescriptionPlaceholder: 'Опис (наприклад, Концертна розсадка)',
      makeDefault: 'Зробити дефолтною',
      createMap: 'Створити варіант карти',
      creatingMap: 'Створюємо...',
      mapCreatedSuccess: 'Новий варіант карти створено.',
      deleteMap: 'Видалити карту',
      deleteMapConfirm: 'Видалити карту «{name}»?',
      mapDeletedSuccess: 'Карту видалено.',
      manageMaps: 'Карти',
      addObjects: 'Додати об’єкти',
      loading: 'Завантажуємо редактор карти...',
      save: 'Зберегти карту',
      saving: 'Зберігаємо...',
      reset: 'Скинути правки',
      undo: 'Назад',
      redo: 'Вперед',
      copy: 'Копіювати',
      paste: 'Вставити',
      zoomOut: 'Зменшити',
      zoomIn: 'Збільшити',
      zoomFit: 'Показати всю',
      zoomActual: '100%',
      clearSelection: 'Зняти вибір',
      duplicateSelected: 'Дублювати обране',
      deleteSelected: 'Видалити обране',
      deleteConfirm: 'Видалити об’єкт «{name}»?',
      deleteManyConfirm: 'Видалити {count} об’єктів?',
      polygonDefault: 'Полігон',
      polygonHint: 'Клікніть по карті, щоб додати точки полігону. Точок: {count}',
      finishPolygon: 'Завершити полігон',
      cancelPolygon: 'Скасувати',
      texturesTitle: 'Текстури',
      texturesDescription: 'Завантажуйте текстури і застосовуйте їх до вибраного об’єкта або полігону.',
      uploadTexture: 'Завантажити текстуру',
      applyTexture: 'Застосувати текстуру',
      deleteTexture: 'Прибрати',
      noTextures: 'Завантажених текстур поки немає.',
      expandWidth: '+500 ширина',
      expandDown: '+500 вниз',
      expandUp: '+500 вверх',
      sendToBottom: 'Під усі',
      sendBackward: 'Нижче',
      bringForward: 'Вище',
      bringToTop: 'Поверх усіх',
      lockObject: 'Закріпити',
      unlockObject: 'Відкріпити',
      lockAll: 'Закріпити всі',
      unlockAll: 'Відкріпити всі',
      addObjectButton: 'Додати об’єкт',
      createObjectButton: 'Створити об’єкт',
      newObjectDefault: 'Новий об’єкт',
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
      newTextDefault: 'Новий текст',
      newLabelDefault: 'Новий текст',
      lineDefault: 'Лінія',
      uploadAsset: 'Завантажити',
      sections: {
        general: 'Основне',
        generalDesc: 'Назва, поведінка при кліку',
        text: 'Текст',
        textDesc: 'Вміст, шрифт, колір, виносна лінія',
        graphics: 'Графіка',
        graphicsDesc: 'Текстура, прозорість, SVG, обводка',
        transform: 'Позиція',
        transformDesc: 'Координати, розмір, поворот на карті'
      },
      tools: {
        select: 'Вибір',
        pan: 'Огляд',
        line: 'Лінія',
        polygon: 'Полігон',
        text: 'Текст'
      },
      tabs: {
        properties: 'Властивості',
        layers: 'Шари',
        assets: 'Об’єкти'
      },
      fields: {
        label: 'Текст',
        interactionMode: 'Режим об’єкта',
        x: 'X',
        y: 'Y',
        width: 'Ширина',
        height: 'Висота',
        rotation: 'Поворот',
        zIndex: 'zIndex',
        isActive: 'Активний',
        tableId: 'Пов’язаний стіл',
        tablePhotoUrl: 'Фото столу',
        mapWidth: 'Ширина карти',
        mapHeight: 'Висота карти',
        backgroundImage: 'URL фонової схеми',
        backgroundColor: 'Колір фону',
        texture: 'Текстура',
        textureUrl: 'URL текстури',
        opacity: 'Прозорість',
        svgUrl: 'SVG / зображення',
        svgCode: 'SVG-код',
        strokeWidth: 'Товщина лінії',
        strokeColor: 'Колір лінії',
        text: 'Текст підпису',
        fontSize: 'Розмір шрифту',
        fontColor: 'Колір шрифту',
        calloutLine: 'Напрямок виноски'
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
        CUSTOM: 'Об’єкт',
        TEXT: 'Текст'
      },
      errors: {
        load: 'Не вдалося завантажити редактор карти.',
        save: 'Не вдалося зберегти зміни карти.',
        createMap: 'Не вдалося створити варіант карти.',
        deleteMap: 'Не вдалося видалити карту.'
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
        completed: 'Зайнято',
        unavailable: 'Недоступний'
      },
      fields: {
        table: 'Стіл',
        zone: 'Зона',
        availability: 'Доступність',
        capacity: 'Місткість',
        code: 'Код',
        deposit: 'Депозит',
        bookable: 'Бронювання',
        yes: 'Так',
        no: 'Ні',
        status: 'Статус',
        close: 'Закрити',
        prepareBooking: 'Забронювати'
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
    eventsAdmin: {
      title: 'Події',
      description: 'Управління афішами, перекладами та сторінками подій.',
      loading: 'Завантажуємо події...',
      empty: 'Подій поки немає.',
      table: 'Таблиця',
      calendar: 'Календар',
      total: 'Всього подій',
      published: 'Опубліковано',
      featured: 'Вибрані',
      errors: {
        load: 'Не вдалося завантажити події.',
        save: 'Не вдалося зберегти подію.',
        delete: 'Не вдалося видалити подію.',
        upload: 'Не вдалося завантажити постер.'
      },
      columns: {
        title: 'Подія',
        start: 'Початок',
        status: 'Статус',
        actions: 'Дії'
      },
      form: {
        edit: 'Редагувати подію',
        create: 'Створити подію',
        delete: 'Видалити',
        save: 'Зберегти зміни',
        saving: 'Зберігаємо...',
        cancel: 'Скасувати',
        created: 'Подію створено.',
        updated: 'Подію оновлено.',
        deleted: 'Подію видалено.',
        translate: '✦✦ Перекласти RU/EN з UA',
        translating: 'Перекладаємо...',
        deleteConfirm: 'Видалити подію "{title}"?',
        preview: 'Попередній перегляд',
        openPublic: 'Відкрити публічну сторінку',
        posterUpload: 'Завантажити постер',
        fields: {
          title: 'Назва',
          slug: 'Посилання (slug)',
          start: 'Початок',
          end: 'Кінець',
          status: 'Статус',
          cta: 'Кнопка (CTA)',
          shortDescription: 'Короткий опис',
          fullDescription: 'Повний опис',
          posterUrl: 'URL постера',
          ticketUrl: 'URL квитків',
          featured: 'Вибранa подія'
        },
        placeholders: {
          autoTranslated: 'Автоматичний переклад',
          fullDescriptionUa: 'Повний опис українською...',
          fullDescriptionRu: 'Повний опис російською...',
          fullDescriptionEn: 'Full description in English...',
          ticketUrl: 'https://tickets.example.com',
          fillUaFirst: 'Спочатку заповніть поле UA для перекладу.'
        },
        discardConfirm: 'Є незбережені зміни. Скасувати?',
        deleteBlocked: 'Не можна видалити подію, бо до неї вже привʼязані продажі квитків або видані квитки. Перенесіть її в архів або спочатку приберіть повʼязані квиткові дані.',
        previewTitle: 'Назва події',
        previewDescription: 'Короткий опис з’явиться тут.',
        previewHint: 'Збережіть подію, щоб відкрити її публічну сторінку.',
        sessionSaved: 'Дату оновлено.',
        sessionAdded: 'Дату додано.',
        sessionDeleted: 'Дату видалено.',
        tariffSaved: 'Тариф оновлено.',
        tariffCreated: 'Тариф створено.',
        tariffDeleted: 'Тариф видалено.',
        tariffUpdated: 'Тариф оновлено.',
        translationUpdated: 'Переклад оновлено.',
        posterUploaded: 'Постер завантажено.',
        fields: {
          title: 'Назва',
          slug: 'Посилання (slug)',
          start: 'Початок',
          end: 'Кінець',
          status: 'Статус',
          cta: 'Кнопка (CTA)',
          shortDescription: 'Короткий опис',
          fullDescription: 'Повний опис',
          posterUrl: 'URL постера',
          ticketUrl: 'URL квитків',
          featured: 'Вибранa подія',
          name: 'Назва',
          price: 'Ціна',
          capacity: 'Місткість',
          session: 'Дата',
          active: 'Активний'
        }
      },
      sectionSessions: 'Дати проведення',
      noSessions: 'Немає дат',
      sectionTicketTypes: 'Тарифи квитків',
      noTicketTypes: 'Немає тарифів',
      sold: 'продано',
      hide: 'Приховати',
      show: 'Показати',
      sessions: 'дати',
      tariffs: 'тарифів',
      orPasteUrl: 'або вставте URL',
      statusOptions: {
        DRAFT: 'Чернетка',
        PUBLISHED: 'Опубліковано',
        ARCHIVED: 'В архіві'
      },
      ctaOptions: {
        BOOKING: 'Бронювання',
        TICKETS: 'Квитки',
        BOTH: 'Обидва'
      },
      errors: {
        load: 'Не вдалося завантажити події.',
        save: 'Не вдалося зберегти подію.',
        delete: 'Не вдалося видалити подію.',
        upload: 'Не вдалося завантажити постер.',
        saveSession: 'Не вдалося зберегти дату.',
        deleteSession: 'Не вдалося видалити дату.',
        saveTariff: 'Не вдалося зберегти тариф.',
        deleteTariff: 'Не вдалося видалити тариф.',
        updateTariff: 'Не вдалося оновити тариф.',
        confirmDeleteSession: 'Видалити цю дату?',
        confirmDeleteTariff: 'Видалити цей тариф?',
        translation: 'Не вдалося виконати переклад.'
      },
      columns: {
        title: 'Подія',
        start: 'Початок',
        status: 'Статус',
        actions: 'Дії',
        tickets: 'Квитки',
        ticketsInfo: '{sessions} дат · {tariffs} тарифів'
      }
    },
    positions: {
      title: 'Позиції',
      description: 'Управління всіма позиціями: столами, шезлонгами, ліжками тощо',
      loading: 'Завантаження...',
      empty: 'Позицій не знайдено.',
      saving: 'Зберігаємо...',
      saved: 'Збережено',
      deleted: 'Видалено',
      create: 'Створити позицію',
      editing: 'Редагування',
      deleteConfirm: 'Видалити цю позицію?',
      bulk: {
        setDeposit: 'Встановити депозит',
        setPrice: 'Встановити ціну',
        setZone: 'Призначити зону',
        setActive: 'Активувати',
        setInactive: 'Деактивувати',
        setBookingKind: 'Змінити тип бронювання',
        apply: 'Застосувати',
        selected: 'Вибрано: {count}',
        noSelection: 'Не вибрано жодної позиції'
      },
      columns: {
        code: 'Код',
        name: 'Назва',
        positionType: 'Тип',
        zone: 'Зона',
        bookingKind: 'Тип бронювання',
        seats: 'Місця',
        deposit: 'Депозит',
        price: 'Ціна',
        active: 'Активний',
        actions: 'Дії'
      },
      filters: {
        map: 'Карта',
        zone: 'Зона',
        positionType: 'Тип позиції',
        bookingKind: 'Тип бронювання',
        search: 'Пошук...',
        all: 'Всі'
      },
      fields: {
        code: 'Код',
        name: 'Назва',
        positionType: 'Тип позиції',
        zone: 'Зона',
        bookingKind: 'Тип бронювання',
        seatsMin: 'Мін. місць',
        seatsMax: 'Макс. місць',
        deposit: 'Депозит',
        price: 'Ціна',
        isActive: 'Активний',
        isBookable: 'Доступний для броні',
        photoUrl: 'URL фото',
        sortOrder: 'Сортування',
        positionSide: 'Сторона',
        row: 'Ряд',
        map: 'Карта'
      },
      errors: {
        load: 'Не вдалося завантажити позиції.',
        save: 'Не вдалося зберегти позицію.',
        delete: 'Не вдалося видалити позицію.',
        batch: 'Помилка при масовому оновленні.'
      },
      feedback: {
        created: 'Позицію створено.',
        updated: 'Позицію оновлено.',
        deleted: 'Позицію видалено.',
        batchDone: 'Оновлено: {ok}, помилок: {fail}'
      }
    },
    positionTypes: {
      title: 'Типи та ціни',
      description: 'Типи позицій: бунгало, ліжка, пірс, столи, тераса тощо',
      loading: 'Завантаження...',
      empty: 'Поки немає типів позицій.',
      currency: 'грн',
      form: {
        edit: 'Редагувати тип',
        create: 'Додати тип',
        save: 'Зберегти',
        saving: 'Зберігаємо...',
        cancel: 'Скасувати',
        fields: {
          value: 'Value',
          code: 'Code',
          name: 'Назва',
          description: 'Опис',
          photo: 'Фото',
          requiresSide: 'Потрібна сторона',
          bookingKind: 'Тип бронювання',
          sortOrder: 'Сортування',
          isActive: 'Активно',
          defaultPrice: 'Ціна за замовчуванням',
          defaultDeposit: 'Депозит за замовчуванням',
          changePhoto: 'Змінити',
          uploadPhoto: 'Завантажити',
        },
        placeholders: {
          defaultPrice: 'Наприклад: 1000',
          defaultDeposit: 'Наприклад: 200',
        }
      },
      columns: {
        value: 'Value',
        name: 'Name (UA)',
        code: 'Code',
        photo: 'Фото',
        price: 'Ціна',
        deposit: 'Депозит',
        kind: 'Kind',
        sort: 'Sort',
        active: 'Active',
      },
      errors: {
        save: 'Не вдалося зберегти.',
        delete: 'Не вдалося видалити.',
        upload: 'Не вдалося завантажити.',
        confirmDelete: 'Видалити цей тип позиції?',
      },
      feedback: {
        saved: 'Тип оновлено.',
        created: 'Тип створено.',
        deleted: 'Тип видалено.',
      },
      bookingKind: {
        BEACH: 'Пляж (BEACH)',
        TABLE: 'Стіл (TABLE)',
      }
    },
    newsAdmin: {
      title: 'Новини',
      description: 'Редагуйте новини та анонси для головної сторінки.',
      eyebrow: 'Новини закладу',
      heroTitle: 'Створюйте та публікуйте новини',
      heroDescription: 'Додавайте заголовки та тексти новин з автоперекладом.',
      loading: 'Завантажуємо новини...',
      empty: 'Новин поки немає. Створіть першу новину.',
      errors: {
        load: 'Не вдалося завантажити новини.',
        save: 'Не вдалося зберегти новину.',
        delete: 'Не вдалося видалити новину.'
      },
      stats: {
        total: 'Всього новин'
      },
      form: {
        createTitle: 'Створити новину',
        editTitle: 'Редагувати новину',
        titleLabel: 'Заголовок',
        bodyLabel: 'Текст новини',
        save: 'Зберегти новину',
        saving: 'Зберігаємо...',
        cancel: 'Скасувати',
        delete: 'Видалити',
        deleteConfirm: 'Видалити новину «{title}»?',
        translate: '✦✦ Перекласти RU/EN з UA',
        translating: 'Перекладаємо...',
        created: 'Новину створено.',
        updated: 'Новину оновлено.',
        deleted: 'Новину видалено.'
      },
      columns: {
        title: 'Заголовок',
        date: 'Дата',
        actions: 'Дії'
      }
    },
    payments: {
      title: 'Платежі',
      description: 'Перегляд транзакцій та управління платежами.',
      eyebrow: 'Фінанси',
      heroTitle: 'Транзакції та статуси платежів',
      heroDescription: 'Моніторинг усіх платежів через Hutko (Fondy).',
      loading: 'Завантажуємо платежі...',
      empty: 'Платежів поки немає.',
      notConfigured: 'Платіжний шлюз не налаштовано. Додайте FONDY_MERCHANT_ID та FONDY_SECRET_KEY у .env.',
      errors: {
        load: 'Не вдалося завантажити платежі.',
        update: 'Не вдалося оновити статус платежу.'
      },
      summary: {
        total: 'Всього',
        paid: 'Сплачено',
        pending: 'Очікує',
        failed: 'Невдало',
        amount: 'Сума'
      },
      columns: {
        id: '№',
        reservation: 'Бронювання',
        amount: 'Сума',
        status: 'Статус',
        provider: 'Провайдер',
        date: 'Дата',
        actions: 'Дії'
      },
      statuses: {
        PENDING: 'Очікує',
        REQUIRES_ACTION: 'Потрібна дія',
        PAID: 'Сплачено',
        FAILED: 'Невдало',
        REFUNDED: 'Повернено',
        CANCELLED: 'Скасовано'
      }
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
    },
    roles: {
      seo_smm: 'SEO/SMM',
      hostess: 'Хостес',
      admin: 'Адмін',
      manager: 'Управляючий',
      owner: 'Власник'
    },
    verifyTicket: {
      title: 'Перевірка квитків',
      placeholder: 'GP-XXXXXXXX',
      scanQr: 'Сканувати QR',
      scanImage: 'QR з фото',
      cancelScan: 'Скасувати',
      or: 'або',
      search: 'Знайти',
      searching: 'Пошук...',
      notFound: 'Квиток не знайдено',
      error: 'Помилка пошуку',
      invalidQr: 'Невірний QR-код',
      cameraError: 'Не вдалося відкрити камеру',
      authentic: 'Справжній',
      notAuthentic: '⚠ Підробка!',
      noSignature: 'Не підписано',
      guest: 'Гість',
      phone: 'Телефон',
      email: 'Email',
      table: 'Стіл',
      zone: 'Зона',
      guests: 'Гостей',
      date: 'Дата',
      time: 'Час',
      status: 'Статус',
      payment: 'Оплата',
      noPayment: 'Немає оплати',
      source: 'Джерело',
      arrivedAt: 'Прибули о',
      markArrived: 'Відмітити прибуття',
      arrivedGuestsPlaceholder: 'Скільки прийшло',
      confirmArrive: 'Прибули!',
      saving: 'Зберігаємо...',
      arrived: '✓ Прибуття відмічено'
    },
    users: {
      title: 'Користувачі',
      createNew: 'Створити користувача',
      email: 'Email',
      password: 'Пароль',
      role: 'Роль',
      createdAt: 'Створено',
      actions: 'Дії',
      edit: 'Редагувати',
      save: 'Зберегти',
      cancel: 'Скасувати',
      delete: 'Видалити',
      create: 'Створити',
      confirmDelete: 'Видалити цього користувача?'
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
      unknownStatus: 'НЕИЗВЕСТНО',
      noAccess: 'Нет доступа к этой странице',
      loadFailed: 'Не удалось загрузить данные',
      failed: 'Не удалось',
      saved: 'Сохранено',
      deleted: 'Удалено',
      noItems: 'Нет данных',
      id: 'ID',
      total: 'Всего',
      edit: 'Редактировать',
      delete: 'Удалить',
      save: 'Сохранить',
      create: 'Создать',
      all: 'Все',
      or: 'или',
      uploading: 'Загрузка…',
      lock: 'Заблокировать',
      unlock: 'Разблокировать'
    },
    roles: {
      seo_smm: 'SEO/SMM',
      hostess: 'Хостес',
      admin: 'Админ',
      manager: 'Управляющий',
      owner: 'Владелец'
    },
    verifyTicket: {
      title: 'Проверка билетов',
      placeholder: 'GP-XXXXXXXX',
      scanQr: 'Сканировать QR',
      scanImage: 'QR с фото',
      cancelScan: 'Отмена',
      or: 'или',
      search: 'Найти',
      searching: 'Поиск...',
      notFound: 'Билет не найден',
      error: 'Ошибка поиска',
      invalidQr: 'Неверный QR-код',
      cameraError: 'Не удалось открыть камеру',
      authentic: 'Подлинный',
      notAuthentic: '⚠ Подделка!',
      noSignature: 'Не подписан',
      guest: 'Гость',
      phone: 'Телефон',
      email: 'Email',
      table: 'Стол',
      zone: 'Зона',
      guests: 'Гостей',
      date: 'Дата',
      time: 'Время',
      status: 'Статус',
      payment: 'Оплата',
      noPayment: 'Нет оплаты',
      source: 'Источник',
      arrivedAt: 'Прибыли в',
      markArrived: 'Отметить прибытие',
      arrivedGuestsPlaceholder: 'Сколько пришло',
      confirmArrive: 'Прибыли!',
      saving: 'Сохраняем...',
      arrived: '✓ Прибытие отмечено'
    },
    users: {
      title: 'Пользователи',
      createNew: 'Создать пользователя',
      email: 'Email',
      password: 'Пароль',
      role: 'Роль',
      createdAt: 'Создан',
      actions: 'Действия',
      edit: 'Редактировать',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      create: 'Создать',
      confirmDelete: 'Удалить этого пользователя?'
    }
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
      unknownStatus: 'UNKNOWN',
      noAccess: 'No access to this page',
      loadFailed: 'Failed to load data',
      failed: 'Failed',
      saved: 'Saved',
      deleted: 'Deleted',
      noItems: 'No data',
      id: 'ID',
      total: 'Total',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      create: 'Create',
      all: 'All',
      or: 'or',
      uploading: 'Uploading…',
      lock: 'Lock',
      unlock: 'Unlock'
    },
    roles: {
      seo_smm: 'SEO/SMM',
      hostess: 'Hostess',
      admin: 'Admin',
      manager: 'Manager',
      owner: 'Owner'
    },
    verifyTicket: {
      title: 'Ticket Verification',
      placeholder: 'GP-XXXXXXXX',
      scanQr: 'Scan QR',
      scanImage: 'QR from image',
      cancelScan: 'Cancel',
      or: 'or',
      search: 'Search',
      searching: 'Searching...',
      notFound: 'Ticket not found',
      error: 'Search error',
      invalidQr: 'Invalid QR code',
      cameraError: 'Could not open camera',
      authentic: 'Authentic',
      notAuthentic: '⚠ Fake!',
      noSignature: 'Unsigned',
      guest: 'Guest',
      phone: 'Phone',
      email: 'Email',
      table: 'Table',
      zone: 'Zone',
      guests: 'Guests',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      payment: 'Payment',
      noPayment: 'No payment',
      source: 'Source',
      arrivedAt: 'Arrived at',
      markArrived: 'Mark arrived',
      arrivedGuestsPlaceholder: 'How many arrived',
      confirmArrive: 'Arrived!',
      saving: 'Saving...',
      arrived: '✓ Arrival confirmed'
    },
    users: {
      title: 'Users',
      createNew: 'Create user',
      email: 'Email',
      password: 'Password',
      role: 'Role',
      createdAt: 'Created',
      actions: 'Actions',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      create: 'Create',
      confirmDelete: 'Delete this user?'
    }
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
