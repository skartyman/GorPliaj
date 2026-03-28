const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function resolveAdminPublicPath(assetPath: string): string {
  if (!assetPath) return normalizeBaseUrl(import.meta.env.BASE_URL || '/');
  if (ABSOLUTE_URL_PATTERN.test(assetPath)) return assetPath;

  const sanitizedPath = assetPath.replace(/^\/+/, '');
  const baseUrl = normalizeBaseUrl(import.meta.env.BASE_URL || '/');

  return `${baseUrl}${sanitizedPath}`;
}
