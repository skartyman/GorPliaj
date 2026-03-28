import type { LayoutMode } from './layout-schema';
import type { RuntimeObjectStatus } from './booking-schema';

export type EditorLanguage = 'ru' | 'en' | 'uk';

type LocaleKey =
  | 'editor.pageTitle'
  | 'editor.pageDescription'
  | 'runtime.pageTitle'
  | 'runtime.pageDescription'
  | 'tabs.objects'
  | 'tabs.zones'
  | 'tabs.layoutModes'
  | 'tabs.presets'
  | 'common.show'
  | 'common.hide'
  | 'common.lock'
  | 'common.unlock'
  | 'common.none'
  | 'sidebar.previewLayout'
  | 'sidebar.territoryPresets'
  | 'sidebar.bookablePresets'
  | 'sidebar.presetsHint'
  | 'toolbar.mode.territory'
  | 'toolbar.mode.bookable'
  | 'toolbar.mode.layout'
  | 'toolbar.saveDraft'
  | 'toolbar.loadDraft'
  | 'toolbar.publish'
  | 'toolbar.exportJson'
  | 'toolbar.importJson'
  | 'toolbar.group.core'
  | 'toolbar.group.territory'
  | 'toolbar.group.bookable'
  | 'tool.select'
  | 'tool.hand'
  | 'tool.addRect'
  | 'tool.addText'
  | 'tool.addLine'
  | 'tool.addSea'
  | 'tool.addSand'
  | 'tool.addDeck'
  | 'tool.addPathway'
  | 'tool.addStairs'
  | 'tool.addPier'
  | 'tool.addBuilding'
  | 'tool.addWinterRestaurant'
  | 'tool.addBar'
  | 'tool.addStage'
  | 'tool.addCashier'
  | 'tool.addRoundTable'
  | 'tool.addRectTable'
  | 'tool.addSofa'
  | 'tool.addLoungerBed'
  | 'tool.addBungalow'
  | 'tool.addHookahTable'
  | 'tool.addVipZone'
  | 'tool.addTicketZone'
  | 'tool.addPierSpot'
  | 'inspector.title'
  | 'inspector.empty'
  | 'inspector.duplicate'
  | 'inspector.delete'
  | 'inspector.noZone'
  | 'inspector.locked'
  | 'inspector.hidden'
  | 'inspector.visibleInLayouts'
  | 'inspector.visibleInLayouts.all'
  | 'inspector.visibleInLayouts.custom'
  | 'inspector.layoutList'
  | 'inspector.field.name'
  | 'inspector.field.label'
  | 'inspector.field.width'
  | 'inspector.field.height'
  | 'inspector.field.rotation'
  | 'inspector.field.zone'
  | 'inspector.field.bookingKind'
  | 'inspector.field.capacityMin'
  | 'inspector.field.capacityMax'
  | 'inspector.field.depositType'
  | 'inspector.field.depositValue'
  | 'inspector.field.minSpend'
  | 'inspector.field.combinable'
  | 'inspector.field.combineGroup'
  | 'inspector.field.tableCode'
  | 'inspector.assetKey'
  | 'inspector.renderMode'
  | 'inspector.renderMode.asset'
  | 'inspector.renderMode.shape'
  | 'inspector.useTexture'
  | 'inspector.textureKey'
  | 'inspector.texture.none'
  | 'inspector.opacity'
  | 'inspector.tint'
  | 'inspector.tint.placeholder'
  | 'status.version'
  | 'status.mode'
  | 'status.layoutPreview'
  | 'status.zoom'
  | 'status.selected'
  | 'controls.panHand'
  | 'controls.snapToGrid'
  | 'runtime.layoutMode'
  | 'runtime.timeline'
  | 'runtime.sidebarTitle'
  | 'runtime.sidebarPlaceholder'
  | 'runtime.statusChip'
  | 'category.territory'
  | 'category.structures'
  | 'category.bookable'
  | 'category.event';

type LocaleMessages = Record<LocaleKey, string>;

const ru: LocaleMessages = {
  'editor.pageTitle': 'Редактор плана',
  'editor.pageDescription': 'Территория, режимы раскладки и бронируемые объекты.',
  'runtime.pageTitle': 'Runtime-карта бронирования',
  'runtime.pageDescription': 'Просмотр карты в боевом режиме со статусами объектов.',
  'tabs.objects': 'Объекты',
  'tabs.zones': 'Зоны',
  'tabs.layoutModes': 'Режимы',
  'tabs.presets': 'Пресеты',
  'common.show': 'Показать',
  'common.hide': 'Скрыть',
  'common.lock': 'Заблокировать',
  'common.unlock': 'Разблокировать',
  'common.none': 'нет',
  'sidebar.previewLayout': 'Предпросмотр режима',
  'sidebar.territoryPresets': 'Пресеты территории',
  'sidebar.bookablePresets': 'Пресеты бронируемых объектов',
  'sidebar.presetsHint': 'Визуальные настройки пресетов берутся из общего реестра ассетов.',
  'toolbar.mode.territory': 'Территория',
  'toolbar.mode.bookable': 'Бронируемые',
  'toolbar.mode.layout': 'Конфигурация',
  'toolbar.saveDraft': 'Сохранить',
  'toolbar.loadDraft': 'Загрузить',
  'toolbar.publish': 'Опубликовать',
  'toolbar.exportJson': 'Экспорт JSON',
  'toolbar.importJson': 'Импорт JSON',
  'toolbar.group.core': 'Инструменты',
  'toolbar.group.territory': 'Территория',
  'toolbar.group.bookable': 'Бронируемое',
  'tool.select': 'Выбор',
  'tool.hand': 'Рука',
  'tool.addRect': 'Прямоугольник',
  'tool.addText': 'Текст',
  'tool.addLine': 'Линия',
  'tool.addSea': 'Море',
  'tool.addSand': 'Песок',
  'tool.addDeck': 'Настил',
  'tool.addPathway': 'Дорожка',
  'tool.addStairs': 'Ступени',
  'tool.addPier': 'Пирс',
  'tool.addBuilding': 'Здание',
  'tool.addWinterRestaurant': 'Зимний ресторан',
  'tool.addBar': 'Бар',
  'tool.addStage': 'Сцена',
  'tool.addCashier': 'Касса',
  'tool.addRoundTable': 'Круглый стол',
  'tool.addRectTable': 'Прямоугольный стол',
  'tool.addSofa': 'Диван',
  'tool.addLoungerBed': 'Лежак',
  'tool.addBungalow': 'Бунгало',
  'tool.addHookahTable': 'Кальянный столик',
  'tool.addVipZone': 'VIP-зона',
  'tool.addTicketZone': 'Билетная зона',
  'tool.addPierSpot': 'Место на пирсе',
  'inspector.title': 'Инспектор',
  'inspector.empty': 'Выберите объект для редактирования.',
  'inspector.duplicate': 'Дублировать',
  'inspector.delete': 'Удалить',
  'inspector.noZone': 'Без зоны',
  'inspector.locked': 'Заблокирован',
  'inspector.hidden': 'Скрыт',
  'inspector.visibleInLayouts': 'Видимость в режимах',
  'inspector.visibleInLayouts.all': 'Во всех',
  'inspector.visibleInLayouts.custom': 'Выборочно',
  'inspector.layoutList': 'Список режимов',
  'inspector.field.name': 'Название',
  'inspector.field.label': 'Метка',
  'inspector.field.width': 'Ширина',
  'inspector.field.height': 'Высота',
  'inspector.field.rotation': 'Поворот',
  'inspector.field.zone': 'Зона',
  'inspector.field.bookingKind': 'Тип бронирования',
  'inspector.field.capacityMin': 'Мин. вместимость',
  'inspector.field.capacityMax': 'Макс. вместимость',
  'inspector.field.depositType': 'Тип депозита',
  'inspector.field.depositValue': 'Сумма депозита',
  'inspector.field.minSpend': 'Минимальный чек',
  'inspector.field.combinable': 'Можно объединять',
  'inspector.field.combineGroup': 'Группа объединения',
  'inspector.field.tableCode': 'Код стола',
  'inspector.assetKey': 'Ключ ассета',
  'inspector.renderMode': 'Режим рендера',
  'inspector.renderMode.asset': 'Ассет',
  'inspector.renderMode.shape': 'Фигура',
  'inspector.useTexture': 'Использовать текстуру',
  'inspector.textureKey': 'Текстура',
  'inspector.texture.none': 'Нет',
  'inspector.opacity': 'Прозрачность',
  'inspector.tint': 'Цветовой фильтр',
  'inspector.tint.placeholder': 'rgba(59,130,246,0.12)',
  'status.version': 'Версия',
  'status.mode': 'Режим',
  'status.layoutPreview': 'Просмотр режима',
  'status.zoom': 'Масштаб',
  'status.selected': 'Выбрано',
  'controls.panHand': 'Рука',
  'controls.snapToGrid': 'Привязка к сетке',
  'runtime.layoutMode': 'Режим',
  'runtime.timeline': 'Время',
  'runtime.sidebarTitle': 'Панель бронирования',
  'runtime.sidebarPlaceholder': 'Здесь будет очередь, фильтры и действия по бронированиям.',
  'runtime.statusChip': 'Статус',
  'category.territory': 'Территория',
  'category.structures': 'Постройки',
  'category.bookable': 'Бронируемое',
  'category.event': 'Событие'
};

const en: LocaleMessages = {
  ...ru,
  'editor.pageTitle': 'Floor Plan Editor',
  'editor.pageDescription': 'Territory, layout modes, and bookable objects.',
  'runtime.pageTitle': 'Booking Runtime Map',
  'runtime.pageDescription': 'Runtime view with layout modes and object statuses.',
  'tabs.objects': 'Objects',
  'tabs.zones': 'Zones',
  'tabs.layoutModes': 'Layouts',
  'tabs.presets': 'Presets',
  'common.show': 'Show',
  'common.hide': 'Hide',
  'common.lock': 'Lock',
  'common.unlock': 'Unlock',
  'common.none': 'none',
  'toolbar.mode.territory': 'Territory',
  'toolbar.mode.bookable': 'Bookable',
  'toolbar.mode.layout': 'Layout',
  'toolbar.saveDraft': 'Save Draft',
  'toolbar.loadDraft': 'Load Draft',
  'toolbar.publish': 'Publish',
  'tool.hand': 'Hand',
  'tool.addStairs': 'Stairs',
  'inspector.title': 'Inspector',
  'inspector.empty': 'Select an object to edit.',
  'inspector.duplicate': 'Duplicate',
  'inspector.delete': 'Delete'
};

const uk: LocaleMessages = {
  ...ru,
  'editor.pageTitle': 'Редактор плану',
  'runtime.pageTitle': 'Runtime-мапа бронювання',
  'inspector.title': 'Інспектор'
};

const dictionaries: Record<EditorLanguage, LocaleMessages> = { ru, en, uk };

const DEFAULT_LANGUAGE: EditorLanguage = 'ru';

export function normalizeEditorLanguage(language?: string): EditorLanguage {
  return language === 'en' || language === 'uk' || language === 'ru' ? language : DEFAULT_LANGUAGE;
}

export function t(key: LocaleKey, language?: string): string {
  const resolvedLanguage = normalizeEditorLanguage(language);
  return dictionaries[resolvedLanguage][key] || dictionaries[DEFAULT_LANGUAGE][key] || key;
}

const RUNTIME_STATUS_LABELS: Record<EditorLanguage, Record<RuntimeObjectStatus, string>> = {
  ru: {
    AVAILABLE: 'Доступно',
    RESERVED_SOON: 'Скоро бронь',
    BOOKED_NOW: 'Занято сейчас',
    SEATED: 'Гости на месте',
    BLOCKED: 'Заблокировано',
    DISABLED: 'Отключено',
    HIDDEN_BY_LAYOUT: 'Скрыто режимом'
  },
  en: {
    AVAILABLE: 'Available',
    RESERVED_SOON: 'Reserved soon',
    BOOKED_NOW: 'Booked now',
    SEATED: 'Seated',
    BLOCKED: 'Blocked',
    DISABLED: 'Disabled',
    HIDDEN_BY_LAYOUT: 'Hidden by layout'
  },
  uk: {
    AVAILABLE: 'Доступно',
    RESERVED_SOON: 'Незабаром бронь',
    BOOKED_NOW: 'Зайнято зараз',
    SEATED: 'Гості на місці',
    BLOCKED: 'Заблоковано',
    DISABLED: 'Вимкнено',
    HIDDEN_BY_LAYOUT: 'Сховано режимом'
  }
};

export function getRuntimeStatusLabel(status: RuntimeObjectStatus, language?: string): string {
  return RUNTIME_STATUS_LABELS[normalizeEditorLanguage(language)][status] || status;
}

const LAYOUT_MODE_LABELS: Record<EditorLanguage, Record<string, string>> = {
  ru: {
    day_beach_restaurant: 'День: пляж + ресторан',
    night_restaurant_event: 'Вечер: ресторан + событие',
    winter_restaurant: 'Зимний ресторан'
  },
  en: {
    day_beach_restaurant: 'Day: beach + restaurant',
    night_restaurant_event: 'Night: restaurant + event',
    winter_restaurant: 'Winter restaurant'
  },
  uk: {
    day_beach_restaurant: 'День: пляж + ресторан',
    night_restaurant_event: 'Вечір: ресторан + подія',
    winter_restaurant: 'Зимовий ресторан'
  }
};

export function getLayoutModeLabel(layoutOrCode: Pick<LayoutMode, 'code' | 'name'> | string, language?: string): string {
  const code = typeof layoutOrCode === 'string' ? layoutOrCode : layoutOrCode.code;
  const fallback = typeof layoutOrCode === 'string' ? layoutOrCode : layoutOrCode.name;
  return LAYOUT_MODE_LABELS[normalizeEditorLanguage(language)][code] || fallback || code;
}

const TOOL_TO_LABEL_KEY: Record<string, LocaleKey> = {
  select: 'tool.select',
  hand: 'tool.hand',
  addRect: 'tool.addRect',
  addText: 'tool.addText',
  addLine: 'tool.addLine',
  addSea: 'tool.addSea',
  addSand: 'tool.addSand',
  addDeck: 'tool.addDeck',
  addPathway: 'tool.addPathway',
  addStairs: 'tool.addStairs',
  addPier: 'tool.addPier',
  addBuilding: 'tool.addBuilding',
  addWinterRestaurant: 'tool.addWinterRestaurant',
  addBar: 'tool.addBar',
  addStage: 'tool.addStage',
  addCashier: 'tool.addCashier',
  addRoundTable: 'tool.addRoundTable',
  addRectTable: 'tool.addRectTable',
  addSofa: 'tool.addSofa',
  addLoungerBed: 'tool.addLoungerBed',
  addBungalow: 'tool.addBungalow',
  addHookahTable: 'tool.addHookahTable',
  addVipZone: 'tool.addVipZone',
  addTicketZone: 'tool.addTicketZone',
  addPierSpot: 'tool.addPierSpot'
};

const TERRITORY_TYPE_TOOL_MAP: Record<string, string> = {
  sea: 'addSea',
  sand: 'addSand',
  deck: 'addDeck',
  pathway: 'addPathway',
  stairs: 'addStairs',
  pier: 'addPier',
  building: 'addBuilding',
  winter_restaurant: 'addWinterRestaurant',
  bar: 'addBar',
  stage: 'addStage',
  cashier: 'addCashier'
};

const BOOKABLE_TYPE_TOOL_MAP: Record<string, string> = {
  round_table: 'addRoundTable',
  rect_table: 'addRectTable',
  sofa: 'addSofa',
  lounger_bed: 'addLoungerBed',
  bungalow: 'addBungalow',
  hookah_table: 'addHookahTable',
  vip_zone: 'addVipZone',
  ticket_zone: 'addTicketZone',
  pier_bed: 'addPierSpot'
};

const TECHNICAL_NAMES = new Set(['Territory object', 'Bookable object']);

export function getToolDisplayLabel(tool: string, language?: string): string {
  const key = TOOL_TO_LABEL_KEY[tool];
  return key ? t(key, language) : tool;
}

export function getObjectTypeDisplayLabel(object: { kind?: string; type?: string; objectType?: string }, language?: string): string {
  if (object.kind === 'bookable' && object.objectType) {
    const tool = BOOKABLE_TYPE_TOOL_MAP[object.objectType];
    return getToolDisplayLabel(tool || 'addRoundTable', language);
  }

  if (object.type) {
    const tool = TERRITORY_TYPE_TOOL_MAP[object.type];
    return getToolDisplayLabel(tool || 'addRect', language);
  }

  return object.kind === 'bookable' ? getToolDisplayLabel('addRoundTable', language) : getToolDisplayLabel('addRect', language);
}

export function getLocalizedObjectName(object: { name?: string; kind?: string; type?: string; objectType?: string }, language?: string): string {
  const name = (object.name || '').trim();
  const typeName = getObjectTypeDisplayLabel(object, language);
  if (!name || TECHNICAL_NAMES.has(name)) return typeName;

  const normalizedName = name.toLowerCase();
  const technicalAliases = new Set(['sea', 'beach sand', 'sand', 'deck', 'pathway', 'territory object', 'bookable object']);
  if (technicalAliases.has(normalizedName)) return typeName;

  return name;
}

export function getDefaultNameByTool(tool: string, language?: string): string {
  return getToolDisplayLabel(tool, language);
}
