import { getTextureConfig } from './editor-textures';

export type RenderMode = 'asset' | 'shape';
export type FallbackShape = 'rect' | 'round' | 'circle' | 'pill';

type AssetCategory = 'territory' | 'bookable';

export interface ObjectVisualConfig {
  assetKey?: string;
  renderMode?: RenderMode;
  useTexture?: boolean;
  textureKey?: string;
  opacity?: number;
  tint?: string;
}

export interface AssetDefinition {
  key: string;
  category: AssetCategory;
  path: string;
  renderMode: RenderMode;
  preserveAspectRatio?: string;
  useTexture?: boolean;
  textureKey?: string;
  fallbackShape: FallbackShape;
  tintSupport?: boolean;
}

export const TERRITORY_ASSET_REGISTRY: Record<string, AssetDefinition> = {
  sea: { key: 'sea', category: 'territory', path: '/editor/objects/sea.svg', renderMode: 'asset', preserveAspectRatio: 'none', useTexture: true, textureKey: 'water-lines', fallbackShape: 'rect', tintSupport: true },
  sand: { key: 'sand', category: 'territory', path: '/editor/objects/sand.svg', renderMode: 'asset', preserveAspectRatio: 'none', useTexture: true, textureKey: 'sand-pattern', fallbackShape: 'rect', tintSupport: true },
  deck: { key: 'deck', category: 'territory', path: '/editor/objects/deck.svg', renderMode: 'asset', preserveAspectRatio: 'none', useTexture: true, textureKey: 'wood-pattern', fallbackShape: 'rect', tintSupport: true },
  pathway: { key: 'pathway', category: 'territory', path: '/editor/objects/pathway.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'pill', tintSupport: true },
  stairs: { key: 'stairs', category: 'territory', path: '/editor/objects/stairs.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'rect', tintSupport: true },
  pier: { key: 'pier', category: 'territory', path: '/editor/objects/pier.svg', renderMode: 'asset', preserveAspectRatio: 'none', useTexture: true, textureKey: 'wood-pattern', fallbackShape: 'rect', tintSupport: true },
  building: { key: 'building', category: 'territory', path: '/editor/objects/building.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true },
  winter_restaurant: { key: 'winter_restaurant', category: 'territory', path: '/editor/objects/winter-restaurant.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true },
  bar: { key: 'bar', category: 'territory', path: '/editor/objects/bar.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true },
  stage: { key: 'stage', category: 'territory', path: '/editor/objects/stage.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true }
};

export const BOOKABLE_ASSET_REGISTRY: Record<string, AssetDefinition> = {
  round_table: { key: 'round_table', category: 'bookable', path: '/editor/objects/restaurant-table.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'circle', tintSupport: true },
  rect_table: { key: 'rect_table', category: 'bookable', path: '/editor/objects/terrace-table.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true },
  sofa: { key: 'sofa', category: 'bookable', path: '/editor/objects/vip-zone.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'pill', tintSupport: true },
  lounger_bed: { key: 'lounger_bed', category: 'bookable', path: '/editor/objects/lounger-bed.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'pill', tintSupport: true },
  bungalow: { key: 'bungalow', category: 'bookable', path: '/editor/objects/bungalow.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true },
  hookah_table: { key: 'hookah_table', category: 'bookable', path: '/editor/objects/hookah-table.svg', renderMode: 'asset', preserveAspectRatio: 'xMidYMid meet', fallbackShape: 'round', tintSupport: true },
  vip_zone: { key: 'vip_zone', category: 'bookable', path: '/editor/objects/vip-zone.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'round', tintSupport: true },
  ticket_zone: { key: 'ticket_zone', category: 'bookable', path: '/editor/objects/stage.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'round', tintSupport: false },
  pier_bed: { key: 'pier_bed', category: 'bookable', path: '/editor/objects/pier-spot.svg', renderMode: 'asset', preserveAspectRatio: 'none', fallbackShape: 'pill', tintSupport: true }
};

export function getAssetDefinitionForObject(object: { kind: 'territory' | 'bookable'; type?: string; objectType?: string; visual?: ObjectVisualConfig }): AssetDefinition | null {
  const directKey = object.visual?.assetKey;
  if (object.kind === 'territory') {
    return TERRITORY_ASSET_REGISTRY[directKey || object.type || ''] || null;
  }

  return BOOKABLE_ASSET_REGISTRY[directKey || object.objectType || ''] || null;
}

export function getDefaultVisualConfigForObject(object: { kind: 'territory' | 'bookable'; type?: string; objectType?: string }): ObjectVisualConfig {
  const definition = getAssetDefinitionForObject(object);
  if (!definition) {
    return { renderMode: 'shape', useTexture: false, opacity: 1 };
  }

  return {
    assetKey: definition.key,
    renderMode: definition.renderMode,
    useTexture: Boolean(definition.useTexture),
    textureKey: definition.textureKey,
    opacity: 1
  };
}

export function resolveObjectVisualConfig(object: { kind: 'territory' | 'bookable'; type?: string; objectType?: string; visual?: ObjectVisualConfig }) {
  const definition = getAssetDefinitionForObject(object);
  const visual = {
    ...(definition ? getDefaultVisualConfigForObject(object) : {}),
    ...(object.visual || {})
  };

  const texture = visual.useTexture ? getTextureConfig(visual.textureKey || definition?.textureKey) : null;

  return {
    definition,
    visual,
    texture,
    mode: visual.renderMode || definition?.renderMode || 'shape'
  };
}
