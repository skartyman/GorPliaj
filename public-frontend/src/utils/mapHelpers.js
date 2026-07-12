const DEFAULT_BED_ASSET_URL = 'https://pub-6d1f04082d9e4584a48596bdac463b42.r2.dev/menu/1778407987243-d869a9bf9505fca824818b2d.png';

export const STATIC_TYPE_ACCENTS = {
  BAR: 'bar',
  STAGE: 'stage',
  ENTRANCE: 'entrance',
  WC: 'wc',
  LABEL: 'label',
  DECOR: 'decor',
  STAIRS: 'stairs',
  PATH: 'path'
};

export function parseStyleJson(styleJson) {
  if (!styleJson) return {};
  try {
    const style = typeof styleJson === 'string' ? JSON.parse(styleJson) : styleJson;
    return {
      background: typeof style?.background === 'string' ? style.background : undefined,
      borderColor: typeof style?.borderColor === 'string' ? style.borderColor : undefined,
      color: typeof style?.color === 'string' ? style.color : undefined,
      borderRadius: Number.isFinite(style?.borderRadius) ? `${style.borderRadius}px` : undefined,
      opacity: Number.isFinite(style?.opacity) ? Math.max(0.2, Math.min(1, style.opacity)) : undefined
    };
  } catch {
    return {};
  }
}

export function parseMetaJson(metaJson) {
  if (!metaJson) return {};

  try {
    const parsed = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    if (!parsed || typeof parsed !== 'object') return {};

    const subType = typeof parsed.subType === 'string' ? parsed.subType : '';
    const normalizedSubType = String(subType || '').toUpperCase();
    const svgUrl = typeof parsed.svgUrl === 'string' ? parsed.svgUrl : '';

    return {
      interactionMode: typeof parsed.interactionMode === 'string' ? parsed.interactionMode : '',
      isSelectable: parsed.interactionMode === 'DECOR' ? false : (Boolean(parsed.isSelectable) || normalizedSubType === 'BED'),
      subType,
      svgUrl: svgUrl || (normalizedSubType === 'BED' ? DEFAULT_BED_ASSET_URL : ''),
      svgCode: typeof parsed.svgCode === 'string' ? parsed.svgCode : '',
      texture: typeof parsed.texture === 'string' ? parsed.texture : '',
      textureUrl: typeof parsed.textureUrl === 'string' ? parsed.textureUrl : '',
      points: Array.isArray(parsed.points) ? parsed.points : [],
      pathData: typeof parsed.pathData === 'string' ? parsed.pathData : '',
      opacity: Number.isFinite(Number(parsed.opacity)) ? Number(parsed.opacity) : 1,
      strokeColor: typeof parsed.strokeColor === 'string' ? parsed.strokeColor : '',
      strokeWidth: Number.isFinite(Number(parsed.strokeWidth)) ? Number(parsed.strokeWidth) : 2,
      text: typeof parsed.text === 'string' ? parsed.text : '',
      fontSize: Number.isFinite(Number(parsed.fontSize)) ? Number(parsed.fontSize) : undefined,
      fontColor: typeof parsed.fontColor === 'string' ? parsed.fontColor : undefined,
      calloutLine: typeof parsed.calloutLine === 'string' ? parsed.calloutLine : '',
      price: parsed.price ?? parsed.objectPrice ?? '',
      priceUnit: typeof parsed.priceUnit === 'string' ? parsed.priceUnit : '',
      depositRequired: Boolean(parsed.depositRequired),
      depositAmount: parsed.depositAmount ?? parsed.deposit ?? '',
      photoUrl: typeof parsed.photoUrl === 'string' ? parsed.photoUrl : ''
    };
  } catch {
    return {};
  }
}

export function pointsToSvg(points) {
  return (points || []).map((point) => `${Number(point.x) || 0},${Number(point.y) || 0}`).join(' ');
}

export function getObjectZIndex(object) {
  const value = Number(object?.zIndex);
  return Number.isFinite(value) ? value : 2;
}

export function getObjectRenderPriority(object, meta = parseMetaJson(object?.metaJson)) {
  const type = String(object?.type || '').toUpperCase();
  const subType = String(meta?.subType || '').toUpperCase();
  if (subType === 'POLYGON') return 0;
  if (type === 'PATH') return 1;
  if (type === 'TABLE') return 3;
  return 2;
}

export function compareMapObjects(a, b) {
  const zIndexDiff = getObjectZIndex(a) - getObjectZIndex(b);
  if (zIndexDiff) return zIndexDiff;
  return getObjectRenderPriority(a) - getObjectRenderPriority(b);
}

export function hasRenderableObjectGraphic(object, meta, label) {
  if (meta.svgUrl || meta.svgCode) return true;
  if (meta.textureUrl) return true;
  if (meta.points?.length >= 3) return true;
  if (meta.pathData) return true;
  if (label && object.type !== 'TABLE') return true;
  return false;
}

export function isSelectableMapObject(object, meta) {
  if (meta.interactionMode === 'DECOR') return false;
  if (object.type === 'TABLE') return false;
  return meta.isSelectable;
}

export function zoneDisplayName(zone, locale) {
  if (!zone) return '';
  const name = zone.name;
  if (!name) return zone.label || '';
  if (typeof name === 'string') return name;
  return name[locale] || name.ua || name.ru || name.en || zone.label || '';
}
