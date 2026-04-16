import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'admin-language';

const translations = {
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
    nav: {
      dashboard: 'Дашборд',
      reservations: 'Брони',
      map: 'Карта',
      menu: 'Меню',
      events: 'События',
      news: 'Новости',
      payments: 'Платежи',
      settings: 'Настройки'
    },
    login: {
      eyebrow: 'Доступ в админку',
      title: 'Панель управления GorPliaj',
      description: 'Мобильная страница входа для управления бронированиями, картой зала и контентом.',
      access: 'Доступ',
      admin: 'Единая админка',
      email: 'Email',
      password: 'Пароль',
      error: 'Не удалось войти.',
      submit: 'Войти',
      submitting: 'Входим...'
    },
    protected: {
      loading: 'Проверяем доступ...'
    },
    dashboard: {
      eyebrow: 'Главное рабочее место',
      title: 'Операционная сводка с приоритетом на ежедневную работу',
      description: 'Дашборд показывает текущую нагрузку, быстрые переходы и ближайшие бронирования в одном экране.',
      openReservations: 'Открыть брони',
      viewMap: 'Открыть карту',
      summary: {
        today: 'Броней сегодня',
        pending: 'Ожидают подтверждения',
        confirmed: 'Подтверждено',
        completed: 'Завершено',
        busyTables: 'Занятых столов'
      },
      quickActionsTitle: 'Быстрые действия',
      quickActionsDescription: 'Короткие сценарии для администратора на телефоне и на десктопе.',
      upcomingTitle: 'Ближайшие бронирования',
      upcomingDescription: 'Актуальные брони из live API.',
      latestTitle: 'Последние созданные',
      latestDescription: 'Свежие записи для быстрого контроля.',
      quick: {
        reservationsTitle: 'Брони',
        reservationsDescription: 'Искать, фильтровать и быстро менять статусы.',
        mapTitle: 'Карта зала',
        mapDescription: 'Смотреть загрузку столов и текущую посадку.',
        newsTitle: 'Новости на главной',
        newsDescription: 'Готовить анонсы и важные сообщения.',
        eventsTitle: 'События',
        eventsDescription: 'Планировать афиши, даты и промо.'
      },
      errors: {
        load: 'Не удалось загрузить дашборд.'
      },
      empty: {
        upcoming: 'Ближайших бронирований пока нет.',
        latest: 'Недавних бронирований пока нет.'
      },
      createdFromFeed: 'Создано из текущего административного потока.'
    },
    reservations: {
      title: 'Брони',
      description: 'Операционный список бронирований с фильтрами и быстрыми действиями.',
      eyebrow: 'Живые бронирования',
      heroTitle: 'Быстрый поиск и действия для команды сервиса',
      heroDescription: 'Фильтры остаются удобными на мобильных устройствах, а таблица доступна на широких экранах.',
      resetFilters: 'Сбросить фильтры',
      refresh: 'Обновить',
      searchLabel: 'Поиск по гостю / телефону',
      searchPlaceholder: 'Имя гостя или телефон',
      dateLabel: 'Дата',
      statusLabel: 'Статус',
      showing: 'Показано {visible} из {total} бронирований.',
      loading: 'Загружаем бронирования...',
      empty: 'По текущим фильтрам бронирования не найдены.',
      errors: {
        load: 'Не удалось загрузить бронирования.',
        update: 'Не удалось обновить статус бронирования.'
      },
      summary: {
        visible: 'Видимых броней',
        pending: 'Ожидают',
        confirmed: 'Подтверждено',
        guests: 'Всего гостей'
      },
      columns: {
        reservation: 'Бронь',
        dateTime: 'Дата / время',
        phone: 'Телефон',
        tableZone: 'Стол / зона',
        guests: 'Гости',
        status: 'Статус',
        actions: 'Быстрые действия'
      },
      actions: {
        confirm: 'Подтвердить',
        cancel: 'Отменить',
        complete: 'Завершить',
        save: 'Сохраняем...',
        none: 'Нет действий'
      },
      statuses: {
        all: 'Все'
      }
    },
    reservationDetail: {
      eyebrow: 'Детали бронирования',
      title: 'Бронирование №{id}',
      description: 'Фокусный экран с ключевой информацией и приоритетными действиями администратора.',
      back: 'Назад к броням',
      overviewTitle: 'Обзор брони',
      overviewDescription: 'Подробная карточка бронирования с понятными статусными действиями.',
      loading: 'Загружаем бронирование...',
      errors: {
        load: 'Не удалось загрузить бронирование.',
        update: 'Не удалось обновить статус.'
      },
      guestInfo: 'Информация о госте',
      slotInfo: 'Параметры брони',
      statusActions: 'Действия со статусом',
      statusActionsDescription: 'Используйте действия ниже, чтобы поддерживать актуальное состояние посадки.',
      noActions: 'Для этого бронирования нет доступных переходов статуса.',
      updating: 'Обновляем...',
      setStatus: 'Установить {status}',
      fields: {
        guest: 'Гость',
        phone: 'Телефон',
        guests: 'Количество гостей',
        comments: 'Комментарий',
        date: 'Дата',
        startTime: 'Время начала',
        table: 'Стол',
        zone: 'Зона',
        status: 'Статус'
      }
    },
    map: {
      title: 'Карта площадки',
      description: 'Операционная карта зала с визуальными статусами столов и деталями бронирований.',
      eyebrow: 'Живая схема',
      heroTitle: 'Статусы столов, зоны и быстрый контекст',
      heroDescription: 'Карта начинается как мобильный вертикальный сценарий и расширяется в split-layout на больших экранах.',
      note: 'Нажмите на стол, чтобы увидеть его текущий статус.',
      loading: 'Загружаем карту...',
      errors: {
        load: 'Не удалось загрузить карту.'
      },
      meta: 'Карта: {map} • Зон: {zones} • Столов: {tables}',
      tableDetails: 'Детали стола',
      tableDetailsDescription: 'Выберите стол на карте, чтобы увидеть детали и действия.',
      noTableSelected: 'Выберите стол, чтобы увидеть детали и связанные бронирования.',
      activeReservations: 'Активные бронирования',
      noActiveReservations: 'Для этого стола сейчас нет активных бронирований.',
      holdSoon: 'Удержать стол ({soon})',
      freeSoon: 'Освободить стол ({soon})',
      moveSoon: 'Пересадить бронь ({soon})',
      legend: {
        free: 'Свободен',
        pending: 'Ожидает',
        confirmed: 'Подтвержден',
        held: 'Удержан',
        unavailable: 'Недоступен'
      },
      fields: {
        table: 'Стол',
        zone: 'Зона',
        availability: 'Доступность',
        capacity: 'Вместимость'
      }
    },
    placeholder: {
      workspaceSuffix: '— рабочий раздел',
      heroDescription: '{description} Страница уже собрана под работу на небольших экранах и масштабируется для планшета и десктопа.',
      launchChecklist: 'Чек-лист запуска',
      launchChecklistDescription: 'Компактный план внедрения, который одинаково удобен на мобильных и на десктопе.',
      defaults: {
        eyebrow: 'Рабочее пространство',
        cta: 'Запланировано на следующую итерацию'
      },
      sections: {
        ready: 'Что уже подготовлено',
        next: 'Следующие шаги внедрения'
      },
      items: {
        ready1: 'Сфокусированный hero-блок с главными действиями оператора.',
        ready2: 'Компактные карточки для мобильных и расширенная сетка для десктопа.',
        ready3: 'Ясные плейсхолдеры для будущего CRUD и API-интеграций.',
        next1: 'Подключить live API и заменить статические превью.',
        next2: 'Добавить сценарии создания / редактирования с валидацией и черновиками.',
        next3: 'Расширить аналитику и оповещения для ежедневной работы.'
      },
      timeline: {
        step1: 'Определить структуру контента и приоритеты раздела.',
        step2: 'Подготовить компактные карточки и навигацию для mobile-first сценария.',
        step3: 'Подключить workflow публикации и операционные действия.'
      },
      pages: {
        menu: {
          title: 'Меню',
          description: 'Раздел подготовлен для управления категориями, блюдами, ценами и доступностью.',
          eyebrow: 'Операции с меню',
          cta: 'Дальше: CRUD категорий, сортировка блюд и сезонная доступность.',
          stats: {
            groups: 'Групп меню',
            publish: 'Режимов публикации',
            shortcuts: 'Мобильных быстрых действий'
          },
          section1: 'Блоки редактора',
          section2: 'Рабочий сценарий',
          items1: 'Категории с drag-and-drop сортировкой.',
          items2: 'Карточки блюд с ценой, тегами и статусом наличия.',
          items3: 'Мгновенное превью публичного мобильного меню.',
          items4: 'Быстрые правки для sold out и сезонных позиций.',
          items5: 'Компактные действия для работы с телефона.',
          items6: 'Массовая публикация для дневного и вечернего меню.'
        },
        events: {
          title: 'События',
          description: 'Раздел подготовлен для расписания событий, афиш и видимости в бронировании.',
          eyebrow: 'Планирование событий',
          cta: 'Дальше: календарь, загрузка обложек и статусы продаж.',
          stats: {
            states: 'Статусов событий',
            promo: 'Промо-слотов',
            views: 'Видов расписания'
          },
          section1: 'Контентные модули',
          section2: 'Рабочий процесс',
          items1: 'Заголовок, тизер и медиаматериалы афиши.',
          items2: 'Блоки расписания с открытием дверей и стартом.',
          items3: 'Переключатели видимости для главной и списка событий.',
          items4: 'Закрепление приоритетных событий вверху ленты.',
          items5: 'Показ влияния на бронирования прямо с мобильного.',
          items6: 'Связка с платежами и кампаниями бронирования позже.'
        },
        news: {
          title: 'Новости',
          description: 'Раздел подготовлен для анонсов, историй на главной и операционных сообщений.',
          eyebrow: 'Контент главной',
          cta: 'Дальше: редактор публикаций, окна публикации и избранные истории.',
          stats: {
            blocks: 'Блоков историй',
            highlights: 'Хайлайтов',
            previews: 'Режимов превью'
          },
          section1: 'Редакционная структура',
          section2: 'Публикационные настройки',
          items1: 'Главная hero-история для домашней страницы.',
          items2: 'Короткие обновления с тегами и расписанием.',
          items3: 'Мобильные карточки с понятным порядком приоритетов.',
          items4: 'Черновик, отложенная публикация и опубликовано.',
          items5: 'Закрепление новостей в хайлайтах или быстрое снятие.',
          items6: 'Повторно используемые шаблоны для анонсов и промо.'
        },
        payments: {
          title: 'Платежи',
          description: 'Раздел подготовлен для платежей, депозитов по броням и сверки.',
          eyebrow: 'Финансовый монитор',
          cta: 'Дальше: лента транзакций, фильтры и проверки выплат.',
          stats: {
            states: 'Статусов платежей',
            reconcile: 'Задач на сверку',
            filters: 'Сохранённых фильтров'
          },
          section1: 'Обзор транзакций',
          section2: 'Ежедневные действия',
          items1: 'Отслеживание депозитов, возвратов и зачислений.',
          items2: 'Быстрый поиск по брони, дате и статусу.',
          items3: 'Компактные карточки для сотрудников на площадке.',
          items4: 'Выделение расхождений между бронями и платежами.',
          items5: 'Подготовка сводок для сверки и экспорта.',
          items6: 'Вывод критичных неуспешных платежей наверх.'
        },
        settings: {
          title: 'Настройки',
          description: 'Управление настройками площадки, контактной информацией и контентом главной страницы.',
          eyebrow: 'Настройка системы',
          cta: 'Редактирование профиля заведения и данных для клиентов.',
          stats: {
            roles: 'Ролей доступа',
            blocks: 'Блоков площадки',
            integrations: 'Интеграций'
          },
          section1: 'Области конфигурации',
          section2: 'Операционные задачи',
          items1: 'Профиль площадки, расписания и рабочие окна.',
          items2: 'Роли админов с безопасными мобильными правами.',
          items3: 'Внешние каналы для карт, платежей и сообщений.',
          items4: 'Проверка изменений перед публикацией команде.',
          items5: 'Сохранение критичных контролов видимыми на узких экранах.',
          items6: 'Разделение чувствительных настроек и ежедневных инструментов.'
        },
        sections: {
          general: 'Основная информация',
          contacts: 'Контактная информация',
          workingHours: 'Время работы',
          hero: 'Главный экран',
          social: 'Социальные сети'
        },
        fields: {
          name: 'Название заведения',
          tagline: 'Подзаголовок',
          description: 'Описание',
          address: 'Адрес',
          phone: 'Телефон',
          email: 'Email',
          heroEyebrow: 'Надзаголовок',
          heroTitle: 'Заголовок',
          heroSubtitle: 'Подзаголовок',
          heroDescription: 'Описание'
        },
        days: {
          monday: 'Понедельник',
          tuesday: 'Вторник',
          wednesday: 'Среда',
          thursday: 'Четверг',
          friday: 'Пятница',
          saturday: 'Суббота',
          sunday: 'Воскресенье'
        },
        addSocial: 'Добавить соцсеть',
        save: 'Сохранить изменения',
        saving: 'Сохранение...',
        saveSuccess: 'Настройки успешно сохранены',
        errors: {
          load: 'Не удалось загрузить настройки',
          save: 'Не удалось сохранить настройки'
        }
      }
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
      UNKNOWN: 'Неизвестно'
    }
  },
  en: {
    appTitle: 'GorPliaj Admin',
    brand: 'GorPliaj Admin',
    common: {
      admin: 'Admin',
      loading: 'Loading...',
      logout: 'Logout',
      languageSwitch: 'RU',
      languageAria: 'Switch language to Russian',
      guest: 'Guest',
      noData: '—',
      soon: 'soon',
      unknownStatus: 'UNKNOWN'
    },
    nav: {
      dashboard: 'Dashboard',
      reservations: 'Reservations',
      map: 'Map',
      menu: 'Menu',
      events: 'Events',
      news: 'News',
      payments: 'Payments',
      settings: 'Settings'
    },
    login: {
      eyebrow: 'Admin access',
      title: 'GorPliaj control room',
      description: 'Mobile-first sign-in for reservations, venue map, and content operations.',
      access: 'Access',
      admin: 'Unified admin',
      email: 'Email',
      password: 'Password',
      error: 'Login failed.',
      submit: 'Sign in',
      submitting: 'Signing in...'
    },
    protected: {
      loading: 'Checking access...'
    },
    dashboard: {
      eyebrow: 'Main workspace',
      title: 'Operations overview designed for daily service flow',
      description: 'The dashboard shows current load, fast shortcuts, and upcoming reservations on one screen.',
      openReservations: 'Open reservations',
      viewMap: 'Open map',
      summary: {
        today: 'Reservations today',
        pending: 'Pending reservations',
        confirmed: 'Confirmed reservations',
        completed: 'Completed reservations',
        busyTables: 'Busy tables'
      },
      quickActionsTitle: 'Quick actions',
      quickActionsDescription: 'Shortcuts for operators on phone and desktop.',
      upcomingTitle: 'Upcoming reservations',
      upcomingDescription: 'Current bookings from the live API.',
      latestTitle: 'Latest created',
      latestDescription: 'Fresh entries for quick follow-up.',
      quick: {
        reservationsTitle: 'Reservations',
        reservationsDescription: 'Search, filter, and update statuses quickly.',
        mapTitle: 'Floor map',
        mapDescription: 'Inspect table load and current seating.',
        newsTitle: 'Homepage news',
        newsDescription: 'Prepare announcements and highlights.',
        eventsTitle: 'Events',
        eventsDescription: 'Plan posters, dates, and promotions.'
      },
      errors: {
        load: 'Failed to load dashboard.'
      },
      empty: {
        upcoming: 'No upcoming reservations yet.',
        latest: 'No recent reservations yet.'
      },
      createdFromFeed: 'Created from the current admin feed.'
    },
    reservations: {
      title: 'Reservations',
      description: 'Operational reservation list with filters and quick actions.',
      eyebrow: 'Live bookings',
      heroTitle: 'Fast lookup and actions for service staff',
      heroDescription: 'Filters remain thumb-friendly on small screens, while the table stays available on wide layouts.',
      resetFilters: 'Reset filters',
      refresh: 'Refresh',
      searchLabel: 'Search by guest / phone',
      searchPlaceholder: 'Guest name or phone',
      dateLabel: 'Date',
      statusLabel: 'Status',
      showing: 'Showing {visible} of {total} reservations.',
      loading: 'Loading reservations...',
      empty: 'No reservations found for the current filters.',
      errors: {
        load: 'Failed to load reservations.',
        update: 'Failed to update reservation status.'
      },
      summary: {
        visible: 'Visible bookings',
        pending: 'Pending',
        confirmed: 'Confirmed',
        guests: 'Guests total'
      },
      columns: {
        reservation: 'Reservation',
        dateTime: 'Date / time',
        phone: 'Phone',
        tableZone: 'Table / zone',
        guests: 'Guests',
        status: 'Status',
        actions: 'Quick actions'
      },
      actions: {
        confirm: 'Confirm',
        cancel: 'Cancel',
        complete: 'Complete',
        save: 'Saving...',
        none: 'No actions'
      },
      statuses: {
        all: 'All'
      }
    },
    reservationDetail: {
      eyebrow: 'Reservation detail',
      title: 'Reservation #{id}',
      description: 'Focused detail screen with priority info and actions for operators.',
      back: 'Back to reservations',
      overviewTitle: 'Reservation overview',
      overviewDescription: 'Detailed reservation card with clear status actions.',
      loading: 'Loading reservation...',
      errors: {
        load: 'Failed to load reservation.',
        update: 'Failed to update status.'
      },
      guestInfo: 'Guest information',
      slotInfo: 'Reservation slot',
      statusActions: 'Status actions',
      statusActionsDescription: 'Use the actions below to keep seating flow updated.',
      noActions: 'No status changes are available for this reservation.',
      updating: 'Updating...',
      setStatus: 'Set {status}',
      fields: {
        guest: 'Guest',
        phone: 'Phone',
        guests: 'Guests count',
        comments: 'Comments',
        date: 'Date',
        startTime: 'Start time',
        table: 'Table',
        zone: 'Zone',
        status: 'Status'
      }
    },
    map: {
      title: 'Venue map',
      description: 'Operational venue map with visual table statuses and reservation details.',
      eyebrow: 'Live floor',
      heroTitle: 'Table statuses, zones, and quick context',
      heroDescription: 'The map begins as a mobile vertical workflow and expands into a split layout on larger screens.',
      note: 'Tap any table to inspect its current status.',
      loading: 'Loading map...',
      errors: {
        load: 'Failed to load map.'
      },
      meta: 'Map: {map} • Zones: {zones} • Tables: {tables}',
      tableDetails: 'Table details',
      tableDetailsDescription: 'Select a table on the map to inspect details and actions.',
      noTableSelected: 'Select a table to see details and linked reservations.',
      activeReservations: 'Active reservations',
      noActiveReservations: 'There are no active reservations for this table.',
      holdSoon: 'Hold table ({soon})',
      freeSoon: 'Free table ({soon})',
      moveSoon: 'Move reservation ({soon})',
      legend: {
        free: 'Free',
        pending: 'Pending',
        confirmed: 'Confirmed',
        held: 'Held',
        unavailable: 'Unavailable'
      },
      fields: {
        table: 'Table',
        zone: 'Zone',
        availability: 'Availability',
        capacity: 'Capacity'
      }
    },
    placeholder: {
      workspaceSuffix: 'workspace',
      heroDescription: '{description} The page is already structured for mobile-first usage and scales to tablet and desktop.',
      launchChecklist: 'Launch checklist',
      launchChecklistDescription: 'Compact rollout plan that works well on mobile and desktop.',
      defaults: {
        eyebrow: 'Workspace',
        cta: 'Planned for the next iteration'
      },
      sections: {
        ready: 'What is ready now',
        next: 'Next implementation steps'
      },
      items: {
        ready1: 'Focused hero block with the most important operator actions.',
        ready2: 'Compact cards for mobile and wider desktop grid.',
        ready3: 'Clear placeholders for future CRUD and API integrations.',
        next1: 'Connect live API endpoints and replace static previews.',
        next2: 'Add create / edit flows with validation and drafts.',
        next3: 'Expand analytics and alerts for daily operations.'
      },
      timeline: {
        step1: 'Define content structure and priorities for the section.',
        step2: 'Prepare compact cards and navigation for mobile-first usage.',
        step3: 'Connect publishing workflow and operational actions.'
      },
      pages: {
        menu: {
          title: 'Menu',
          description: 'Prepared for category, dish, price, and availability management.',
          eyebrow: 'Menu operations',
          cta: 'Next: category CRUD, dish sorting, and seasonal availability.',
          stats: {
            groups: 'Menu groups',
            publish: 'Publishing modes',
            shortcuts: 'Mobile shortcuts'
          },
          section1: 'Editor blocks',
          section2: 'Operator flow',
          items1: 'Categories with drag-and-drop ordering.',
          items2: 'Dish cards with price, tags, and stock state.',
          items3: 'Instant preview for public mobile menu pages.',
          items4: 'Quick updates for sold-out and seasonal items.',
          items5: 'Compact actions for phone-sized screens.',
          items6: 'Bulk publishing for lunch and evening menus.'
        },
        events: {
          title: 'Events',
          description: 'Prepared for event schedule, poster content, and booking visibility.',
          eyebrow: 'Event planning',
          cta: 'Next: calendar, cover uploads, and sale states.',
          stats: {
            states: 'Event states',
            promo: 'Promo slots',
            views: 'Schedule views'
          },
          section1: 'Content modules',
          section2: 'Operator workflow',
          items1: 'Headline, teaser, and poster media.',
          items2: 'Schedule blocks with doors open and start time.',
          items3: 'Visibility toggles for homepage and event list.',
          items4: 'Pin high-priority events at the top of the feed.',
          items5: 'Show booking impact directly from mobile.',
          items6: 'Connect payments and booking campaigns later.'
        },
        news: {
          title: 'News',
          description: 'Prepared for announcements, homepage stories, and operational highlights.',
          eyebrow: 'Homepage content',
          cta: 'Next: article composer, publish windows, and featured stories.',
          stats: {
            blocks: 'Story blocks',
            highlights: 'Highlights',
            previews: 'Preview modes'
          },
          section1: 'Editorial layout',
          section2: 'Publishing controls',
          items1: 'Featured hero story for the homepage.',
          items2: 'Short updates with tags and scheduling.',
          items3: 'Mobile cards with clear priority order.',
          items4: 'Draft, scheduled, and published states.',
          items5: 'Pin stories to highlights or remove them quickly.',
          items6: 'Reusable templates for announcements and promos.'
        },
        payments: {
          title: 'Payments',
          description: 'Prepared for payment records, booking deposits, and reconciliation.',
          eyebrow: 'Finance monitor',
          cta: 'Next: transaction feed, filters, and payout checks.',
          stats: {
            states: 'Payment states',
            reconcile: 'Reconcile tasks',
            filters: 'Saved filters'
          },
          section1: 'Transaction overview',
          section2: 'Daily controls',
          items1: 'Track deposits, refunds, and settlements.',
          items2: 'Fast lookup by reservation, date, or status.',
          items3: 'Compact cards for on-site staff.',
          items4: 'Flag mismatches between bookings and payments.',
          items5: 'Prepare reconciliation summaries for export.',
          items6: 'Surface urgent failed payments at the top.'
        },
        settings: {
          title: 'Settings',
          description: 'Manage venue settings, contact information, and homepage content.',
          eyebrow: 'System setup',
          cta: 'Edit venue profile and customer-facing data.',
          stats: {
            roles: 'Access roles',
            blocks: 'Venue blocks',
            integrations: 'Integrations'
          },
          section1: 'Configuration areas',
          section2: 'Operational tasks',
          items1: 'Venue profile, schedules, and operating windows.',
          items2: 'Admin roles with mobile-safe permissions.',
          items3: 'External channels for maps, payments, and messaging.',
          items4: 'Review changes before publishing to staff.',
          items5: 'Keep critical controls visible on narrow screens.',
          items6: 'Separate sensitive settings from daily tools.'
        },
        sections: {
          general: 'General Information',
          contacts: 'Contact Information',
          workingHours: 'Working Hours',
          hero: 'Hero Section',
          social: 'Social Media'
        },
        fields: {
          name: 'Venue Name',
          tagline: 'Tagline',
          description: 'Description',
          address: 'Address',
          phone: 'Phone',
          email: 'Email',
          heroEyebrow: 'Eyebrow',
          heroTitle: 'Title',
          heroSubtitle: 'Subtitle',
          heroDescription: 'Description'
        },
        days: {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday',
          saturday: 'Saturday',
          sunday: 'Sunday'
        },
        addSocial: 'Add Social Network',
        save: 'Save Changes',
        saving: 'Saving...',
        saveSuccess: 'Settings saved successfully',
        errors: {
          load: 'Failed to load settings',
          save: 'Failed to save settings'
        }
      }
    },
    status: {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      AWAITING_PAYMENT: 'Awaiting payment',
      HELD: 'Held',
      SEATED: 'Seated',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No show',
      UNAVAILABLE: 'Unavailable',
      FREE: 'Free',
      UNKNOWN: 'Unknown'
    }
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
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || 'ru');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'ru' ? 'ru' : 'en';
    document.title = getValueByPath(translations[language], 'appTitle') || 'Admin';
  }, [language]);

  const value = useMemo(() => {
    const dictionary = translations[language] || translations.ru;
    return {
      language,
      locale: language === 'ru' ? 'ru-RU' : 'en-US',
      toggleLanguage: () => setLanguage((prev) => (prev === 'ru' ? 'en' : 'ru')),
      t(path, params) {
        const message = getValueByPath(dictionary, path) ?? getValueByPath(translations.ru, path) ?? path;
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
