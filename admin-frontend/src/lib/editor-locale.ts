import type { LayoutMode } from './layout-schema';
import type { RuntimeObjectStatus } from './booking-schema';

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
  | 'tool.addRoundTable'
  | 'tool.addRectTable'
  | 'tool.addLoungerBed'
  | 'tool.addBungalow'
  | 'tool.addHookahTable'
  | 'tool.addVipZone'
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
  'editor.pageTitle': 'Редактор плана зала',
  'editor.pageDescription': 'Территория, режимы раскладки и бронируемые объекты с рендером ассетов.',
  'runtime.pageTitle': 'Runtime-карта бронирования',
  'runtime.pageDescription': 'Просмотр карты в боевом режиме с режимами и статусами объектов.',
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
  'sidebar.presetsHint': 'Все пресеты получают визуальные настройки из централизованного реестра ассетов.',
  'toolbar.mode.territory': 'Режим территории',
  'toolbar.mode.bookable': 'Режим бронируемых',
  'toolbar.mode.layout': 'Режим конфигурации',
  'toolbar.saveDraft': 'Сохранить черновик',
  'toolbar.loadDraft': 'Загрузить черновик',
  'toolbar.publish': 'Опубликовать',
  'toolbar.exportJson': 'Экспорт JSON',
  'toolbar.importJson': 'Импорт JSON',
  'toolbar.group.core': 'Инструменты',
  'toolbar.group.territory': 'Территория',
  'toolbar.group.bookable': 'Бронируемое',
  'tool.select': 'Выбор',
  'tool.hand': 'Панорама',
  'tool.addSea': 'Море',
  'tool.addSand': 'Песок',
  'tool.addDeck': 'Настил',
  'tool.addPathway': 'Дорожка',
  'tool.addStairs': 'Лестница',
  'tool.addPier': 'Пирс',
  'tool.addBuilding': 'Здание',
  'tool.addWinterRestaurant': 'Зимний зал',
  'tool.addBar': 'Бар',
  'tool.addStage': 'Сцена',
  'tool.addRoundTable': 'Круглый стол',
  'tool.addRectTable': 'Прямой стол',
  'tool.addLoungerBed': 'Лежак',
  'tool.addBungalow': 'Бунгало',
  'tool.addHookahTable': 'Кальянный стол',
  'tool.addVipZone': 'VIP-зона',
  'tool.addPierSpot': 'Место на пирсе',
  'inspector.title': 'Свойства',
  'inspector.empty': 'Выберите объект для редактирования.',
  'inspector.duplicate': 'Дублировать',
  'inspector.delete': 'Удалить',
  'inspector.noZone': 'Без зоны',
  'inspector.locked': 'заблокирован',
  'inspector.hidden': 'скрыт',
  'inspector.visibleInLayouts': 'видимость в режимах',
  'inspector.visibleInLayouts.all': 'во всех',
  'inspector.visibleInLayouts.custom': 'выборочно',
  'inspector.layoutList': 'Список режимов',
  'inspector.assetKey': 'assetKey',
  'inspector.renderMode': 'режим рендера',
  'inspector.renderMode.asset': 'asset',
  'inspector.renderMode.shape': 'fallback-фигура',
  'inspector.useTexture': 'использовать текстуру',
  'inspector.textureKey': 'textureKey',
  'inspector.texture.none': 'нет',
  'inspector.opacity': 'прозрачность',
  'inspector.tint': 'цветовой фильтр',
  'inspector.tint.placeholder': 'rgba(59,130,246,0.12)',
  'status.version': 'Версия',
  'status.mode': 'Режим',
  'status.layoutPreview': 'Просмотр режима',
  'status.zoom': 'Масштаб',
  'status.selected': 'Выбрано',
  'controls.panHand': 'Рука панорамы',
  'controls.snapToGrid': 'Привязка к сетке',
  'runtime.layoutMode': 'Режим',
  'runtime.timeline': 'Таймлайн',
  'runtime.sidebarTitle': 'Панель бронирования',
  'runtime.sidebarPlaceholder': 'Здесь будет очередь, фильтры и действия по бронированиям.',
  'runtime.statusChip': 'Статус',
  'category.territory': 'Территория',
  'category.structures': 'Постройки',
  'category.bookable': 'Бронируемое',
  'category.event': 'Событие'
};

const dictionaries = { ru };

export const ACTIVE_LOCALE = 'ru' as const;

export function t(key: LocaleKey): string {
  return dictionaries[ACTIVE_LOCALE][key] || key;
}

export const RUNTIME_STATUS_LABELS: Record<RuntimeObjectStatus, string> = {
  AVAILABLE: 'Доступно',
  RESERVED_SOON: 'Скоро бронь',
  BOOKED_NOW: 'Занято сейчас',
  SEATED: 'Гости на месте',
  BLOCKED: 'Заблокировано',
  DISABLED: 'Отключено',
  HIDDEN_BY_LAYOUT: 'Скрыто режимом'
};

const LAYOUT_MODE_LABELS: Record<string, string> = {
  day_beach_restaurant: 'День: пляж + ресторан',
  night_restaurant_event: 'Вечер: ресторан + событие',
  winter_restaurant: 'Зимний ресторан'
};

export function getLayoutModeLabel(layoutOrCode: Pick<LayoutMode, 'code' | 'name'> | string): string {
  const code = typeof layoutOrCode === 'string' ? layoutOrCode : layoutOrCode.code;
  const fallback = typeof layoutOrCode === 'string' ? layoutOrCode : layoutOrCode.name;
  return LAYOUT_MODE_LABELS[code] || fallback || code;
}
