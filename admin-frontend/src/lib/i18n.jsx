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
      waiters: 'Офіціанти',
      settings: 'Налаштування',
      positions: 'Позиції',
      positionTypes: 'Типи та ціни',
      reports: 'Звіти',
      reportsSchedule: 'Розклад звітів'
    },
    login: {
      eyebrow: 'Доступ до адмінки',
      title: 'Панель управління GorPliaj',
      description: 'Мобільна сторінка входу для управління бронюваннями, мапою залу та контентом.',
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
      eyebrow: 'Робочий пульт',
      title: 'Що потрібно зробити зараз',
      description: 'Швидкі дії для зміни та зрозумілі показники для контролю дня.',
      heroKpi: {
        reservationsToday: 'Бронювання сьогодні',
        activeGuests: 'Гостей активно',
        awaitingConfirmation: 'Чекають підтвердження'
      },
      quickActions: {
        createBooking: {
          title: 'Створити бронювання вручну',
          description: 'Для гостя від хостес: вибрати місце, дату, час і одразу створити бронювання.',
          meta: 'Хостес'
        },
        openMap: {
          title: 'Відкрити мапу посадки',
          description: 'Швидко вибрати вільне місце, посадити гостя або перевірити поточні бронювання.',
          meta: 'Мапа'
        },
        stopList: {
          title: 'Скласти стоп-лист',
          description: 'Відкрити меню та швидко вимкнути позиції, яких сьогодні немає в наявності.',
          meta: '{count} вже в стопі'
        },
        scanTickets: {
          title: 'Скан квитків',
          description: 'Перевірити QR, квиток на афішу або код бронювання біля входу.',
          meta: 'Вхід'
        }
      },
      metrics: {
        revenue: 'Виручка оплат',
        paidPayments: 'Оплачено платежів',
        paidTickets: 'Оплачено квитків',
        menuItems: 'Позиції меню'
      },
      charts: {
        reservations7days: 'Бронювання за 7 днів',
        reservations7daysDesc: 'За датами відвідування, не за датою створення.',
        revenue7days: 'Виручка за 7 днів',
        revenue7daysDesc: 'Тільки платежі зі статусом PAID.',
        statusShare: 'Статуси бронювань',
        statusShareDesc: 'Швидко видно, де зависли заявки.',
        menuDemand: 'Меню та попит',
        menuDemandDesc: 'Лайки гостей та доступність позицій.',
        totalLikes: 'лайків всього',
        inStopList: 'у стоп-листі'
      },
      statusShare: {
        pending: 'Очікують',
        confirmed: 'Підтверджено',
        completed: 'Завершено',
        cancelled: 'Скасовано'
      },
      attention: {
        title: 'Бронювання, які потребують уваги',
        description: 'Тільки найближчі активні заявки, без довгої таблиці.',
        empty: 'Зараз немає термінових бронювань.',
        guest: 'Гість'
      },
      quickLinks: {
        title: 'Швидкі переходи',
        description: 'Другий рядок посилань для адміна, коли потрібно не шукати в меню.',
        payments: 'Платежі',
        ticketSales: 'Продаж квитків',
        menuEditor: 'Редактор меню',
        events: 'Афіша',
        allReservations: 'Всі бронювання'
      },
      emptyLikes: 'Поки немає статистики лайков.',
      errors: {
        loadReservations: 'Не вдалося завантажити броні.',
        loadDashboard: 'Не вдалося завантажити дашборд.'
      }
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
        seat: 'Посадити',
        complete: 'Завершити',
        noShow: 'Не зʼявився',
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
        title: 'Керування наявністю',
        description: 'Депозити, доступність, фото та ручне бронювання',
        openMap: 'Відкрити мапу',
        scopeDate: 'Дата',
        event: 'Подія',
        noEvent: 'Без події',
        map: 'Мапа',
        allMaps: 'Усі мапи',
        zone: 'Зона',
        allZones: 'Усі зони',
        search: 'Пошук',
        searchPlaceholder: 'Код, мапа, зона, сервіс',
        loading: 'Завантажуємо позиції...',
        empty: 'Позицій не знайдено.',
        flat: {
          code: 'Код',
          type: 'Тип',
          zone: 'Зона / Мапа',
          capacity: 'Місця',
          deposit: 'Депозит',
          status: 'Статус',
          bookings: 'Броні',
          actions: 'Дії',
          toggleAvailability: 'Переключити доступність',
          photo: 'Фото',
          createBooking: 'Створити бронь',
          depositTitle: 'Депозит',
          photoTitle: 'Фото',
          photoUrl: 'URL фото',
          cancel: 'Скасувати',
          save: 'Зберегти',
          saving: 'Зберігаємо...'
        },
        columns: {
          type: 'Тип',
          mapZone: 'Мапа / зона',
          capacity: 'Місця',
          effective: 'Статус',
          bookings: 'Броні',
          pcs: 'шт',
          deposit: 'Депозит: {amount}',
          confirmed: 'Підтверджено: {count}'
        },
        baseSettings: {
          title: 'Базові налаштування',
          description: 'Статичні властивості позиції.',
          deposit: 'Базовий депозит',
          photoUrl: 'URL фото',
          activeOnMap: 'Активна на мапі',
          bookableByDefault: 'Доступна для броні',
          uploadPhoto: 'Завантажити фото',
          save: 'Зберегти',
          saving: 'Зберігаємо...',
          uploading: 'Завантаження...'
        },
        manualBooking: {
          title: 'Створити бронь',
          closeForm: 'Закрити форму',
          createBooking: 'Нова бронь',
          guestName: 'Ім\'я гостя',
          phone: 'Телефон',
          email: 'Email',
          guests: 'Гостей',
          date: 'Дата',
          start: 'Початок',
          end: 'Кінець',
          source: 'Джерело',
          status: 'Статус',
          depositRequired: 'Потрібен депозит',
          depositAmount: 'Сума депозиту',
          guestComment: 'Коментар гостя',
          adminComment: 'Коментар адміна',
          saving: 'Зберігаємо...',
          create: 'Створити бронь'
        },
        errors: {
          loadPositions: 'Не вдалося завантажити позиції.',
          saveBase: 'Не вдалося зберегти.',
          uploadPhoto: 'Не вдалося завантажити фото.',
          createReservation: 'Не вдалося створити бронювання.'
        },
        feedback: {
          baseSaved: 'Збережено.',
          reservationCreated: 'Бронювання створено.'
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
        map: 'Мапа',
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
      title: 'Редактор мапи',
      description: 'Адмінський редактор об’єктів поточної мапи без впливу на публічний flow бронювання.',
      eyebrow: 'Редактор схеми майданчика',
      heroTitle: 'Створюйте, переміщуйте, дублюйте та налаштовуйте об’єкти майданчика',
      heroDescription: 'Редактор завантажує поточну дефолтну мапу, дозволяє налаштовувати повноцінний фон плану закладу, додавати нові об’єкти та зберігає актуальний список назад через admin API.',
      note: 'Використовуйте верхню панель для швидкого додавання об’єктів, а праву колонку — для точного налаштування обраного елемента.',
      editorNote: 'Додавайте нові елементи у вкладці «Об’єкти», а точні параметри змінюйте у «Властивостях».',
      mapVariant: 'Варіант мапи',
      defaultMapBadge: 'дефолт',
      newMapPreset: 'Тип нової мапи',
      newMapName: 'Назва мапи',
      newMapDescription: 'Опис мапи',
      newMapNamePlaceholder: 'Назва нової мапи (наприклад, Нічна посадка)',
      newMapDescriptionPlaceholder: 'Опис (наприклад, Концертна розсадка)',
      makeDefault: 'Зробити дефолтною',
      createMap: 'Створити варіант мапи',
      creatingMap: 'Створюємо...',
      mapCreatedSuccess: 'Новий варіант мапи створено.',
      deleteMap: 'Видалити мапу',
      deleteMapConfirm: 'Видалити мапу «{name}»?',
      mapDeletedSuccess: 'Мапу видалено.',
      manageMaps: 'Мапи',
      addObjects: 'Додати об’єкти',
      loading: 'Завантажуємо редактор мапи...',
      save: 'Зберегти мапу',
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
      polygonHint: 'Клікніть по мапі, щоб додати точки полігону. Точок: {count}',
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
      saveSuccess: 'Зміни мапи збережено.',
      meta: 'Мапа: {map} • Розмір: {size} • Об’єктів: {objects} • Столів: {tables}',
      canvasTitle: 'Полотно для редагування',
      canvasDescription: 'Клікніть по об’єкту для вибору, тягніть для переміщення та використовуйте ручки для resize.',
      mapSettingsTitle: 'Налаштування мапи',
      mapSettingsDescription: 'Задайте колір та зображення фону, щоб перетворити сітку на повноцінну мапу закладу.',
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
        transformDesc: 'Координати, розмір, поворот на мапі'
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
        mapWidth: 'Ширина мапи',
        mapHeight: 'Висота мапи',
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
        load: 'Не вдалося завантажити редактор мапи.',
        save: 'Не вдалося зберегти зміни мапи.',
        createMap: 'Не вдалося створити варіант мапи.',
        deleteMap: 'Не вдалося видалити мапу.'
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
        noPhoto: 'Без фото',
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
      title: 'Мапа майданчика',
      description: 'Операційна мапа залу з візуальними статусами столів та деталями бронювань.',
      openEditor: 'Відкрити редактор',
      eyebrow: 'Жива схема',
      heroTitle: 'Статуси столів, зони та швидкий контекст',
      heroDescription: 'Мапа починається як мобільний вертикальний сценарій і розширюється в split-layout на великих екранах.',
      note: 'Натисніть на стіл, щоб побачити його поточний статус.',
      loading: 'Завантажуємо мапу...',
      errors: {
        load: 'Не вдалося завантажити мапу.'
      },
      meta: 'Мапа: {map} • Зон: {zones} • Столів: {tables}',
      tableDetails: 'Деталі столу',
      tableDetailsDescription: 'Оберіть стіл на мапі, щоб побачити деталі та дії.',
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
        onPremises: 'На заведення',
        unavailable: 'Недоступний'
      },
      onPremises: 'На заведення',
      onPremisesNote: 'Прізвище гостя та від кого (напр. Петренко, від А.Ф.)',
      onPremisesNotePlaceholder: 'Петренко, від А.Ф.',
      onPremisesNoteRequired: 'Для «На заведення» обовʼязково вкажіть прізвище гостя та від кого.',
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
      ON_PREMISES: 'На заведення',
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
        map: 'Мапа',
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
        priceWeekday: 'Ціна (будні)',
        priceWeekend: 'Ціна (вихідні)',
        depositWeekday: 'Депозит (будні)',
        depositWeekend: 'Депозит (вихідні)',
        isActive: 'Активний',
        isBookable: 'Доступний для броні',
        photoUrl: 'URL фото',
        sortOrder: 'Сортування',
        positionSide: 'Сторона',
        row: 'Ряд',
        map: 'Мапа'
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
          priceWeekday: 'Ціна (будні)',
          priceWeekend: 'Ціна (вихідні)',
          depositWeekday: 'Депозит (будні)',
          depositWeekend: 'Депозит (вихідні)',
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
        type: 'Тип',
        target: 'За що',
        reservation: 'Бронювання',
        amount: 'Сума',
        status: 'Статус',
        provider: 'Провайдер',
        date: 'Дата',
        actions: 'Дії'
      },
      type: {
        reservation: 'Бронювання',
        ticket: 'Квиток'
      },
      statuses: {
        PENDING: 'Очікує',
        REQUIRES_ACTION: 'Потрібна дія',
        PAID: 'Сплачено',
        FAILED: 'Невдало',
        REFUNDED: 'Повернено',
        CANCELLED: 'Скасовано'
      },
      actions: {
        MARK_AS_PAID: 'Підтвердити оплату',
        MARK_AS_CANCELLED: 'Скасувати',
        MARK_AS_FAILED: 'Позначити невдалим'
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
    },
    ticketSales: {
      page: {
        title: 'Продаж квитків',
        description: 'Створіть дні події та одразу додавайте тарифи всередині потрібного дня. Так видно, який квиток до якої дати відноситься.',
        event: 'Подія',
        noEvents: 'Немає подій',
        selectEvent: 'Оберіть подію вище, або створіть дати та тарифи на сторінці «Події».'
      },
      errors: {
        loadEvents: 'Не вдалося завантажити події.',
        loadSales: 'Не вдалося завантажити продажі.',
        saveSession: 'Не вдалося зберегти дату події.',
        deleteSession: 'Не вдалося видалити дату події.',
        saveType: 'Не вдалося зберегти тип квитка.',
        updateType: 'Не вдалося оновити тип квитка.',
        deleteType: 'Не вдалося видалити тип квитка.',
        createOrder: 'Не вдалося створити замовлення.',
        updateOrder: 'Не вдалося оновити замовлення.'
      },
      feedback: {
        sessionSaved: 'Дату події оновлено.',
        sessionCreated: 'Дату події додано.',
        sessionDeleted: 'Дату події видалено.',
        typeSaved: 'Тип квитка оновлено.',
        typeCreated: 'Тип квитка створено та доступний для продажі.',
        typeUpdated: 'Тип квитка оновлено.',
        typeDeleted: 'Тип квитка видалено.',
        orderCreated: 'Замовлення {number} створено.',
        orderStatusUpdated: 'Статус замовлення оновлено.'
      },
      confirm: {
        deleteSession: 'Видалити цю дату події? Якщо по ній вже є замовлення або квитки, видалення буде заборонено.',
        deleteType: 'Видалити цей тип квитка? Якщо по ньому вже були продажі, видалення буде заборонено.'
      },
      noSession: 'Без окремої дати',
      sessionForm: {
        editTitle: 'Редагування дати події',
        listTitle: 'Дати та тарифи',
        listSubtitle: 'Кожна дата показує свої тарифи. Кнопка «Тариф на цю дату» одразу підставляє потрібний день у форму справа.',
        name: 'Назва (UA)',
        namePlaceholder: 'Наприклад: Перший вечір',
        start: 'Початок',
        end: 'Кінець',
        admissionMode: 'Умови входу',
        ticketed: 'За квитком',
        free: 'Вхід вільний',
        active: 'Активна для продажі',
        save: 'Зберегти дату',
        add: 'Додати дату',
        cancel: 'Скасувати'
      },
      typeForm: {
        editTitle: 'Редагування тарифу',
        newTitle: 'Новий тариф',
        subtitle: 'Головне поле — дата. Якщо тариф створюється кнопкою з потрібного дня, дата вже обрана.',
        session: 'Для якої дати продаємо квиток',
        selectSession: 'Оберіть дату',
        generalSession: 'Загальний продаж події',
        sessionHint: 'Покупач побачить цей тариф саме для обраної дати.',
        name: 'Назва (UA)',
        price: 'Ціна',
        capacity: 'Кількість квитків',
        salesStart: 'Початок продаж',
        salesEnd: 'Кінець продаж',
        visible: 'Показувати на сайті',
        save: 'Зберегти тариф',
        add: 'Створити тариф',
        cancel: 'Скасувати'
      },
      orderForm: {
        title: 'Ручне замовлення',
        subtitle: 'Створення замовлення менеджером або касиром. Дата події визначається обраним типом квитка.',
        customer: 'Покупець',
        email: 'Email',
        phone: 'Телефон',
        type: 'Тип квитка',
        selectType: 'Оберіть тип квитка',
        generalDate: 'загальна дата',
        quantity: 'Кількість',
        paid: 'Оплата вже отримана',
        create: 'Створити замовлення'
      },
      sessions: {
        active: 'Активна для продажі',
        hidden: 'Прихована з сайту',
        freeEntry: 'Вхід вільний',
        ticketedEntry: 'Потрібен квиток',
        freeNoTariff: 'Для цієї дати вхід вільний — тариф не потрібен.',
        tariffForDate: 'Тариф на цю дату',
        editDate: 'Редагувати дату',
        deleteDate: 'Видалити дату',
        noTariff: 'На цю дату ще немає тарифу. Натисніть «Тариф на цю дату».',
        generalTitle: 'Загальний продаж події',
        generalDesc: 'Для події без окремих днів тариф створюється як загальний.',
        createTariff: 'Створити тариф',
        noTariffs: 'Тарифів поки немає.',
        unassignedTitle: 'Тарифи без прив\'язки до дати',
        unassignedDesc: 'Відкрийте тариф та оберіть день, щоб він з\'явився в продажі коректно.'
      },
      columns: {
        order: 'Замовлення',
        date: 'Дата',
        generalDate: 'Загальна дата події',
        customer: 'Покупець',
        tickets: 'Квитки',
        amount: 'Сума',
        status: 'Статус',
        actions: 'Дії',
        code: 'Код',
        type: 'Тип квитка',
        holder: 'Власник',
        created: 'Створено'
      },
      card: {
        sold: 'продано',
        onSite: 'на сайті',
        hidden: 'скритий',
        sales: 'Продажі:',
        now: 'зараз',
        noEnd: 'без закінчення',
        hide: 'Приховати',
        show: 'Показати',
        edit: 'Редагувати',
        duplicate: 'Копіювати',
        delete: 'Видалити'
      },
      orderActions: {
        paid: 'Оплачено',
        cancel: 'Скасувати'
      },
      orders: {
        title: 'Замовлення',
        loading: 'Завантаження...',
        empty: 'Замовлень поки немає.'
      },
      tickets: {
        title: 'Випущені квитки',
        loading: 'Завантаження...',
        empty: 'Квитків поки немає.'
      }
    }
  },
  ru: {
    appTitle: 'Админка GorPliaj',
    brand: 'GorPliaj Admin',
    payments: {
      title: 'Платежи',
      description: 'Просмотр транзакций и управление платежами.',
      eyebrow: 'Финансы',
      heroTitle: 'Транзакции и статусы платежей',
      heroDescription: 'Мониторинг всех платежей через Hutko (Fondy).',
      loading: 'Загружаем платежи...',
      empty: 'Платежей пока нет.',
      notConfigured: 'Платёжный шлюз не настроен. Добавьте FONDY_MERCHANT_ID и FONDY_SECRET_KEY в .env.',
      errors: {
        load: 'Не удалось загрузить платежи.',
        update: 'Не удалось обновить статус платежа.'
      },
      summary: {
        total: 'Всего',
        paid: 'Оплачено',
        pending: 'Ожидает',
        failed: 'Неудачно',
        amount: 'Сумма'
      },
      columns: {
        id: '№',
        type: 'Тип',
        target: 'За что',
        reservation: 'Бронирование',
        amount: 'Сумма',
        status: 'Статус',
        provider: 'Провайдер',
        date: 'Дата',
        actions: 'Действия'
      },
      type: {
        reservation: 'Бронирование',
        ticket: 'Билет'
      },
      statuses: {
        PENDING: 'Ожидает',
        REQUIRES_ACTION: 'Требует действия',
        PAID: 'Оплачено',
        FAILED: 'Неудачно',
        REFUNDED: 'Возвращено',
        CANCELLED: 'Отменено'
      },
      actions: {
        MARK_AS_PAID: 'Подтвердить оплату',
        MARK_AS_CANCELLED: 'Отменить',
        MARK_AS_FAILED: 'Отметить неудачным'
      }
    },
    map: {
      legend: {
        free: 'Свободно',
        pending: 'Ожидает',
        confirmed: 'Подтверждено',
        held: 'Удержано',
        completed: 'Занято',
        onPremises: 'На заведении',
        unavailable: 'Недоступно'
      },
      onPremises: 'На заведении',
      onPremisesNote: 'Фамилия гостя и от кого (напр. Петренко, от А.Ф.)',
      onPremisesNotePlaceholder: 'Петренко, от А.Ф.',
      onPremisesNoteRequired: 'Для «На заведении» обязательно укажите фамилию гостя и от кого.'
    },
    status: {
      PENDING: 'Ожидает',
      CONFIRMED: 'Подтверждено',
      AWAITING_PAYMENT: 'Ждёт оплату',
      HELD: 'Удержано',
      SEATED: 'Гости на месте',
      COMPLETED: 'Завершено',
      CANCELLED: 'Отменено',
      NO_SHOW: 'Не пришли',
      UNAVAILABLE: 'Недоступно',
      FREE: 'Свободно',
      ON_PREMISES: 'На заведении',
      UNKNOWN: 'Неизвестно'
    },
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
    },
    dashboard: {
      eyebrow: 'Рабочий пульт',
      title: 'Что нужно сделать сейчас',
      description: 'Быстрые действия для смены и понятные показатели для контроля дня.',
      heroKpi: {
        reservationsToday: 'Брони сегодня',
        activeGuests: 'Гостей активно',
        awaitingConfirmation: 'Ждут подтверждения'
      },
      quickActions: {
        createBooking: {
          title: 'Создать бронь вручную',
          description: 'Для гостя от хостесс: выбрать место, дату, время и сразу завести бронь.',
          meta: 'Хостесс'
        },
        openMap: {
          title: 'Открыть карту посадки',
          description: 'Быстро выбрать свободное место, посадить гостя или проверить текущие брони.',
          meta: 'Карта'
        },
        stopList: {
          title: 'Составить стоп-лист',
          description: 'Открыть меню и быстро выключить позиции, которых сегодня нет в наличии.',
          meta: '{count} уже в стопе'
        },
        scanTickets: {
          title: 'Скан билетов',
          description: 'Проверить QR, билет на афишу или код бронирования у входа.',
          meta: 'Вход'
        }
      },
      metrics: {
        revenue: 'Выручка оплат',
        paidPayments: 'Оплачено платежей',
        paidTickets: 'Оплачено билетов',
        menuItems: 'Позиции меню'
      },
      charts: {
        reservations7days: 'Брони за 7 дней',
        reservations7daysDesc: 'По датам посещения, не по дате создания.',
        revenue7days: 'Выручка за 7 дней',
        revenue7daysDesc: 'Только платежи со статусом PAID.',
        statusShare: 'Статусы броней',
        statusShareDesc: 'Быстро видно, где зависли заявки.',
        menuDemand: 'Меню и спрос',
        menuDemandDesc: 'Лайки гостей и доступность позиций.',
        totalLikes: 'лайков всего',
        inStopList: 'в стоп-листе'
      },
      statusShare: {
        pending: 'Ожидают',
        confirmed: 'Подтверждены',
        completed: 'Завершены',
        cancelled: 'Отменены'
      },
      attention: {
        title: 'Брони, которые требуют внимания',
        description: 'Только ближайшие активные заявки, без длинной таблицы.',
        empty: 'Сейчас нет срочных броней.',
        guest: 'Гость'
      },
      quickLinks: {
        title: 'Быстрые переходы',
        description: 'Второй ряд ссылок для админа, когда нужно не искать в меню.',
        payments: 'Платежи',
        ticketSales: 'Продажа билетов',
        menuEditor: 'Редактор меню',
        events: 'Афиша',
        allReservations: 'Все брони'
      },
      emptyLikes: 'Пока нет статистики лайков.',
      errors: {
        loadReservations: 'Не удалось загрузить брони.',
        loadDashboard: 'Не удалось загрузить дашборд.'
      }
    },
    reservations: {
      management: {
        title: 'Управление доступностью',
        description: 'Депозиты, доступность, фото и ручное бронирование',
        openMap: 'Открыть карту',
        scopeDate: 'Дата',
        event: 'Событие',
        noEvent: 'Без события',
        map: 'Карта',
        allMaps: 'Все карты',
        zone: 'Зона',
        allZones: 'Все зоны',
        search: 'Поиск',
        searchPlaceholder: 'Код, карта, зона, сервис',
        loading: 'Загрузка позиций...',
        empty: 'Позиций не найдено.',
        flat: {
          code: 'Код',
          type: 'Тип',
          zone: 'Зона / Карта',
          capacity: 'Места',
          deposit: 'Депозит',
          status: 'Статус',
          bookings: 'Брони',
          actions: 'Действия',
          toggleAvailability: 'Переключить доступность',
          photo: 'Фото',
          createBooking: 'Создать бронь',
          depositTitle: 'Депозит',
          photoTitle: 'Фото',
          photoUrl: 'URL фото',
          cancel: 'Отмена',
          save: 'Сохранить',
          saving: 'Сохраняем...'
        },
        columns: {
          type: 'Тип',
          mapZone: 'Карта / зона',
          capacity: 'Места',
          effective: 'Статус',
          bookings: 'Брони',
          pcs: 'шт',
          deposit: 'Депозит: {amount}',
          confirmed: 'Подтверждено: {count}'
        },
        baseSettings: {
          uploadPhoto: 'Загрузить фото',
          uploading: 'Загрузка...'
        },
        manualBooking: {
          title: 'Создать бронь',
          closeForm: 'Закрыть форму',
          createBooking: 'Новая бронь',
          guestName: 'Имя гостя',
          phone: 'Телефон',
          email: 'Email',
          guests: 'Гостей',
          date: 'Дата',
          start: 'Начало',
          end: 'Конец',
          source: 'Источник',
          status: 'Статус',
          depositRequired: 'Нужен депозит',
          depositAmount: 'Сумма депозита',
          guestComment: 'Комментарий гостя',
          adminComment: 'Комментарий админа',
          saving: 'Сохраняем...',
          create: 'Создать бронь'
        },
        errors: {
          loadPositions: 'Не удалось загрузить позиции.',
          saveBase: 'Не удалось сохранить.',
          uploadPhoto: 'Не удалось загрузить фото.',
          createReservation: 'Не удалось создать бронирование.'
        },
        feedback: {
          baseSaved: 'Сохранено.',
          reservationCreated: 'Бронирование создано.'
        }
      }
    },
    ticketSales: {
      page: {
        title: 'Продажа билетов',
        description: 'Создайте дни события и сразу добавляйте тарифы внутри нужного дня. Так видно, какой билет к какой дате относится.',
        event: 'Мероприятие',
        noEvents: 'Нет мероприятий',
        selectEvent: 'Выберите мероприятие выше, или создайте даты и тарифы на странице «События».'
      },
      errors: {
        loadEvents: 'Не удалось загрузить события.',
        loadSales: 'Не удалось загрузить продажи.',
        saveSession: 'Не удалось сохранить дату события.',
        deleteSession: 'Не удалось удалить дату события.',
        saveType: 'Не удалось сохранить тип билета.',
        updateType: 'Не удалось обновить тип билета.',
        deleteType: 'Не удалось удалить тип билета.',
        createOrder: 'Не удалось создать заказ.',
        updateOrder: 'Не удалось обновить заказ.'
      },
      feedback: {
        sessionSaved: 'Дата события обновлена.',
        sessionCreated: 'Дата события добавлена.',
        sessionDeleted: 'Дата события удалена.',
        typeSaved: 'Тип билета обновлён.',
        typeCreated: 'Тип билета создан и доступен для продажи.',
        typeUpdated: 'Тип билета обновлён.',
        typeDeleted: 'Тип билета удалён.',
        orderCreated: 'Заказ {number} создан.',
        orderStatusUpdated: 'Статус заказа обновлён.'
      },
      confirm: {
        deleteSession: 'Удалить эту дату события? Если по ней уже есть заказы или билеты, удаление будет запрещено.',
        deleteType: 'Удалить этот тип билета? Если по нему уже были продажи, удаление будет запрещено.'
      },
      noSession: 'Без отдельной даты',
      sessionForm: {
        editTitle: 'Редактирование даты события',
        listTitle: 'Даты и тарифы',
        listSubtitle: 'Каждая дата показывает свои тарифы. Кнопка «Тариф на эту дату» сразу подставляет нужный день в форму справа.',
        name: 'Название (UA)',
        namePlaceholder: 'Например: Первый вечер',
        start: 'Начало',
        end: 'Конец',
        admissionMode: 'Условия входа',
        ticketed: 'По билету',
        free: 'Вход свободный',
        active: 'Активна для продажи',
        save: 'Сохранить дату',
        add: 'Добавить дату',
        cancel: 'Отмена'
      },
      typeForm: {
        editTitle: 'Редактирование тарифа',
        newTitle: 'Новый тариф',
        subtitle: 'Главное поле — дата. Если тариф создаётся кнопкой из нужного дня, дата уже выбрана.',
        session: 'Для какой даты продаём билет',
        selectSession: 'Выберите дату',
        generalSession: 'Общая продажа события',
        sessionHint: 'Покупатель увидит этот тариф именно для выбранного дня.',
        name: 'Название (UA)',
        price: 'Цена',
        capacity: 'Количество билетов',
        salesStart: 'Начало продаж',
        salesEnd: 'Конец продаж',
        visible: 'Показывать на сайте',
        save: 'Сохранить тариф',
        add: 'Создать тариф',
        cancel: 'Отмена'
      },
      orderForm: {
        title: 'Ручной заказ',
        subtitle: 'Создание заказа менеджером или кассиром. Дата события определяется выбранным типом билета.',
        customer: 'Покупатель',
        email: 'Email',
        phone: 'Телефон',
        type: 'Тип билета',
        selectType: 'Выберите тип билета',
        generalDate: 'общая дата',
        quantity: 'Количество',
        paid: 'Оплата уже получена',
        create: 'Создать заказ'
      },
      sessions: {
        active: 'Активна для продажи',
        hidden: 'Скрыта с сайта',
        freeEntry: 'Вход свободный',
        ticketedEntry: 'Нужен билет',
        freeNoTariff: 'Для этой даты вход свободный — тариф не нужен.',
        tariffForDate: 'Тариф на эту дату',
        editDate: 'Редактировать дату',
        deleteDate: 'Удалить дату',
        noTariff: 'На эту дату ещё нет тарифа. Нажмите «Тариф на эту дату».',
        generalTitle: 'Общая продажа события',
        generalDesc: 'Для события без отдельных дней тариф создаётся как общий.',
        createTariff: 'Создать тариф',
        noTariffs: 'Тарифов пока нет.',
        unassignedTitle: 'Тарифы без привязки к дате',
        unassignedDesc: 'Откройте тариф и выберите день, чтобы он появился в продаже корректно.'
      },
      columns: {
        order: 'Заказ',
        date: 'Дата',
        generalDate: 'Общая дата события',
        customer: 'Покупатель',
        tickets: 'Билеты',
        amount: 'Сумма',
        status: 'Статус',
        actions: 'Действия',
        code: 'Код',
        type: 'Тип билета',
        holder: 'Владелец',
        created: 'Создан'
      },
      card: {
        sold: 'продано',
        onSite: 'на сайте',
        hidden: 'скрыт',
        sales: 'Продажи:',
        now: 'сейчас',
        noEnd: 'без окончания',
        hide: 'Скрыть',
        show: 'Показать',
        edit: 'Редактировать',
        duplicate: 'Копировать',
        delete: 'Удалить'
      },
      orderActions: {
        paid: 'Оплачен',
        cancel: 'Отменить'
      },
      orders: {
        title: 'Заказы',
        loading: 'Загрузка...',
        empty: 'Заказов пока нет.'
      },
      tickets: {
        title: 'Выпущенные билеты',
        loading: 'Загрузка...',
        empty: 'Билетов пока нет.'
      }
    }
    // ... остальное RU остается без изменений
  },
  en: {
    appTitle: 'GorPliaj Admin',
    brand: 'GorPliaj Admin',
    payments: {
      title: 'Payments',
      description: 'View transactions and manage payments.',
      eyebrow: 'Finance',
      heroTitle: 'Transactions and payment statuses',
      heroDescription: 'Monitoring all payments via Hutko (Fondy).',
      loading: 'Loading payments...',
      empty: 'No payments yet.',
      notConfigured: 'Payment gateway is not configured. Add FONDY_MERCHANT_ID and FONDY_SECRET_KEY to .env.',
      errors: {
        load: 'Failed to load payments.',
        update: 'Failed to update payment status.'
      },
      summary: {
        total: 'Total',
        paid: 'Paid',
        pending: 'Pending',
        failed: 'Failed',
        amount: 'Amount'
      },
      columns: {
        id: '№',
        type: 'Type',
        target: 'For',
        reservation: 'Reservation',
        amount: 'Amount',
        status: 'Status',
        provider: 'Provider',
        date: 'Date',
        actions: 'Actions'
      },
      type: {
        reservation: 'Reservation',
        ticket: 'Ticket'
      },
      statuses: {
        PENDING: 'Pending',
        REQUIRES_ACTION: 'Requires action',
        PAID: 'Paid',
        FAILED: 'Failed',
        REFUNDED: 'Refunded',
        CANCELLED: 'Cancelled'
      },
      actions: {
        MARK_AS_PAID: 'Mark as paid',
        MARK_AS_CANCELLED: 'Cancel',
        MARK_AS_FAILED: 'Mark as failed'
      }
    },
    map: {
      legend: {
        free: 'Free',
        pending: 'Pending',
        confirmed: 'Confirmed',
        held: 'Held',
        completed: 'Occupied',
        onPremises: 'On premises',
        unavailable: 'Unavailable'
      },
      onPremises: 'On premises',
      onPremisesNote: 'Guest surname and source (e.g. Petrenko, from A.F.)',
      onPremisesNotePlaceholder: 'Petrenko, from A.F.',
      onPremisesNoteRequired: 'For "On premises" you must provide the guest surname and source.'
    },
    status: {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      AWAITING_PAYMENT: 'Awaiting payment',
      HELD: 'Held',
      SEATED: 'Guests seated',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No show',
      UNAVAILABLE: 'Unavailable',
      FREE: 'Free',
      ON_PREMISES: 'On premises',
      UNKNOWN: 'Unknown'
    },
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
    },
    reservations: {
      management: {
        title: 'Availability management',
        description: 'Deposits, availability, photo and manual booking',
        openMap: 'Open map',
        scopeDate: 'Date',
        event: 'Event',
        noEvent: 'No event',
        map: 'Map',
        allMaps: 'All maps',
        zone: 'Zone',
        allZones: 'All zones',
        search: 'Search',
        searchPlaceholder: 'Code, map, zone, service',
        loading: 'Loading positions...',
        empty: 'No positions found.',
        flat: {
          code: 'Code',
          type: 'Type',
          zone: 'Zone / Map',
          capacity: 'Seats',
          deposit: 'Deposit',
          status: 'Status',
          bookings: 'Bookings',
          actions: 'Actions',
          toggleAvailability: 'Toggle availability',
          photo: 'Photo',
          createBooking: 'Create booking',
          depositTitle: 'Deposit',
          photoTitle: 'Photo',
          photoUrl: 'Photo URL',
          cancel: 'Cancel',
          save: 'Save',
          saving: 'Saving...'
        },
        columns: {
          type: 'Type',
          mapZone: 'Map / zone',
          capacity: 'Seats',
          effective: 'Status',
          bookings: 'Bookings',
          pcs: 'pcs',
          deposit: 'Deposit: {amount}',
          confirmed: 'Confirmed: {count}'
        },
        baseSettings: {
          uploadPhoto: 'Upload photo',
          uploading: 'Uploading...'
        },
        manualBooking: {
          title: 'Create booking',
          closeForm: 'Close form',
          createBooking: 'New booking',
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
          loadPositions: 'Failed to load positions.',
          saveBase: 'Failed to save.',
          uploadPhoto: 'Failed to upload photo.',
          createReservation: 'Failed to create reservation.'
        },
        feedback: {
          baseSaved: 'Saved.',
          reservationCreated: 'Reservation created.'
        }
      }
    },
    dashboard: {
      eyebrow: 'Control Panel',
      title: 'What needs to be done now',
      description: 'Quick actions for the shift and clear metrics for daily control.',
      heroKpi: {
        reservationsToday: 'Reservations today',
        activeGuests: 'Active guests',
        awaitingConfirmation: 'Awaiting confirmation'
      },
      quickActions: {
        createBooking: {
          title: 'Create manual booking',
          description: 'For a guest from hostess: pick a table, date, time and create the booking right away.',
          meta: 'Hostess'
        },
        openMap: {
          title: 'Open seating map',
          description: 'Quickly pick a free table, seat a guest or check current reservations.',
          meta: 'Map'
        },
        stopList: {
          title: 'Build stop list',
          description: 'Open menu and quickly disable items that are not available today.',
          meta: '{count} already stopped'
        },
        scanTickets: {
          title: 'Scan tickets',
          description: 'Check QR, event ticket or booking code at the entrance.',
          meta: 'Entry'
        }
      },
      metrics: {
        revenue: 'Payment revenue',
        paidPayments: 'Paid payments',
        paidTickets: 'Paid tickets',
        menuItems: 'Menu items'
      },
      charts: {
        reservations7days: 'Reservations for 7 days',
        reservations7daysDesc: 'By visit dates, not creation dates.',
        revenue7days: 'Revenue for 7 days',
        revenue7daysDesc: 'Only payments with PAID status.',
        statusShare: 'Reservation statuses',
        statusShareDesc: 'Quickly see where requests are stuck.',
        menuDemand: 'Menu & demand',
        menuDemandDesc: 'Guest likes and item availability.',
        totalLikes: 'total likes',
        inStopList: 'in stop list'
      },
      statusShare: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      attention: {
        title: 'Reservations that need attention',
        description: 'Only the nearest active requests, without a long table.',
        empty: 'No urgent reservations right now.',
        guest: 'Guest'
      },
      quickLinks: {
        title: 'Quick links',
        description: 'Second row of links for admin when you don\'t want to search through the menu.',
        payments: 'Payments',
        ticketSales: 'Ticket sales',
        menuEditor: 'Menu editor',
        events: 'Events',
        allReservations: 'All reservations'
      },
      emptyLikes: 'No like statistics yet.',
      errors: {
        loadReservations: 'Failed to load reservations.',
        loadDashboard: 'Failed to load dashboard.'
      }
    },
    ticketSales: {
      page: {
        title: 'Ticket Sales',
        description: 'Create event dates and add tariffs inside each day. This way you can see which ticket belongs to which date.',
        event: 'Event',
        noEvents: 'No events',
        selectEvent: 'Select an event above, or create dates and tariffs on the Events page.'
      },
      errors: {
        loadEvents: 'Failed to load events.',
        loadSales: 'Failed to load ticket sales.',
        saveSession: 'Failed to save event date.',
        deleteSession: 'Failed to delete event date.',
        saveType: 'Failed to save ticket type.',
        updateType: 'Failed to update ticket type.',
        deleteType: 'Failed to delete ticket type.',
        createOrder: 'Failed to create order.',
        updateOrder: 'Failed to update order.'
      },
      feedback: {
        sessionSaved: 'Event date updated.',
        sessionCreated: 'Event date added.',
        sessionDeleted: 'Event date deleted.',
        typeSaved: 'Ticket type updated.',
        typeCreated: 'Ticket type created and available for sale.',
        typeUpdated: 'Ticket type updated.',
        typeDeleted: 'Ticket type deleted.',
        orderCreated: 'Order {number} created.',
        orderStatusUpdated: 'Order status updated.'
      },
      confirm: {
        deleteSession: 'Delete this event date? If there are already orders or tickets for it, deletion will be blocked.',
        deleteType: 'Delete this ticket type? If there are already sales for it, deletion will be blocked.'
      },
      noSession: 'No separate date',
      sessionForm: {
        editTitle: 'Edit event date',
        listTitle: 'Dates & tariffs',
        listSubtitle: 'Each date shows its own tariffs. The "Tariff for this date" button sets the correct day in the form on the right.',
        name: 'Name (UA)',
        namePlaceholder: 'e.g. First evening',
        start: 'Start',
        end: 'End',
        admissionMode: 'Admission',
        ticketed: 'Ticket required',
        free: 'Free entry',
        active: 'Active for sale',
        save: 'Save date',
        add: 'Add date',
        cancel: 'Cancel'
      },
      typeForm: {
        editTitle: 'Edit tariff',
        newTitle: 'New tariff',
        subtitle: 'The key field is the date. If the tariff is created via the button from a specific day, the date is already set.',
        session: 'For which date are we selling tickets',
        selectSession: 'Select a date',
        generalSession: 'General event sale',
        sessionHint: 'Customers will see this tariff for the selected date.',
        name: 'Name (UA)',
        price: 'Price',
        capacity: 'Number of tickets',
        salesStart: 'Sales start',
        salesEnd: 'Sales end',
        visible: 'Show on site',
        save: 'Save tariff',
        add: 'Create tariff',
        cancel: 'Cancel'
      },
      orderForm: {
        title: 'Manual order',
        subtitle: 'Creating an order by manager or cashier. The event date is determined by the selected ticket type.',
        customer: 'Customer',
        email: 'Email',
        phone: 'Phone',
        type: 'Ticket type',
        selectType: 'Select ticket type',
        generalDate: 'general date',
        quantity: 'Quantity',
        paid: 'Payment already received',
        create: 'Create order'
      },
      sessions: {
        active: 'Active for sale',
        hidden: 'Hidden from site',
        freeEntry: 'Free entry',
        ticketedEntry: 'Ticket required',
        freeNoTariff: 'Entry is free for this date — no tariff is needed.',
        tariffForDate: 'Tariff for this date',
        editDate: 'Edit date',
        deleteDate: 'Delete date',
        noTariff: 'No tariff for this date yet. Click "Tariff for this date".',
        generalTitle: 'General event sale',
        generalDesc: 'For events without separate dates, the tariff is created as general.',
        createTariff: 'Create tariff',
        noTariffs: 'No tariffs yet.',
        unassignedTitle: 'Tariffs without a date',
        unassignedDesc: 'Open a tariff and select a day so it appears in the sale correctly.'
      },
      columns: {
        order: 'Order',
        date: 'Date',
        generalDate: 'General event date',
        customer: 'Customer',
        tickets: 'Tickets',
        amount: 'Amount',
        status: 'Status',
        actions: 'Actions',
        code: 'Code',
        type: 'Ticket type',
        holder: 'Holder',
        created: 'Created'
      },
      card: {
        sold: 'sold',
        onSite: 'on site',
        hidden: 'hidden',
        sales: 'Sales:',
        now: 'now',
        noEnd: 'no end',
        hide: 'Hide',
        show: 'Show',
        edit: 'Edit',
        duplicate: 'Duplicate',
        delete: 'Delete'
      },
      orderActions: {
        paid: 'Paid',
        cancel: 'Cancel'
      },
      orders: {
        title: 'Orders',
        loading: 'Loading...',
        empty: 'No orders yet.'
      },
      tickets: {
        title: 'Issued tickets',
        loading: 'Loading...',
        empty: 'No tickets yet.'
      }
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

