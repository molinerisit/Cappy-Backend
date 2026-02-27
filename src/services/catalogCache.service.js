const CATALOG_CACHE_TTL_MS = 60 * 1000;
const catalogCache = new Map();

function getCatalogCacheKey(prefix, page, limit) {
  return `${prefix}:${page}:${limit}`;
}

function getCachedCatalogResponse(key) {
  const cached = catalogCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    catalogCache.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedCatalogResponse(key, value) {
  catalogCache.set(key, {
    value,
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS
  });
}

function invalidateCatalogCacheByPrefix(prefix) {
  for (const key of catalogCache.keys()) {
    if (key.startsWith(`${prefix}:`)) {
      catalogCache.delete(key);
    }
  }
}

function invalidateCatalogCaches() {
  invalidateCatalogCacheByPrefix('countries');
  invalidateCatalogCacheByPrefix('goals');
}

module.exports = {
  getCatalogCacheKey,
  getCachedCatalogResponse,
  setCachedCatalogResponse,
  invalidateCatalogCacheByPrefix,
  invalidateCatalogCaches
};