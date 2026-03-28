import { resolveAdminPublicPath } from './admin-public-path';

export type TextureKey = 'water-lines' | 'sand-pattern' | 'wood-pattern';

export interface TextureConfig {
  key: TextureKey;
  path: string;
  size?: string;
  opacity?: number;
}

export const EDITOR_TEXTURE_REGISTRY: Record<TextureKey, TextureConfig> = {
  'water-lines': {
    key: 'water-lines',
    path: resolveAdminPublicPath('editor/textures/water-lines.svg'),
    size: '180px 180px',
    opacity: 0.35
  },
  'sand-pattern': {
    key: 'sand-pattern',
    path: resolveAdminPublicPath('editor/textures/sand-pattern.svg'),
    size: '110px 110px',
    opacity: 0.3
  },
  'wood-pattern': {
    key: 'wood-pattern',
    path: resolveAdminPublicPath('editor/textures/wood-pattern.svg'),
    size: '180px 80px',
    opacity: 0.28
  }
};

export function getTextureConfig(textureKey?: string | null): TextureConfig | null {
  if (!textureKey) return null;
  return EDITOR_TEXTURE_REGISTRY[textureKey as TextureKey] || null;
}
