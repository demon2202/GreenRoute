// In-memory data cache to enable instant, silky-smooth tab navigation without loading flicker
const memoryStore = new Map();

export const getCachedData = (key, fallback = null) => {
  if (memoryStore.has(key)) {
    return memoryStore.get(key);
  }
  try {
    const local = localStorage.getItem(`gr_cache_${key}`);
    if (local) {
      const parsed = JSON.parse(local);
      memoryStore.set(key, parsed);
      return parsed;
    }
  } catch {
    /* ignore storage errors */
  }
  return fallback;
};

export const setCachedData = (key, data) => {
  memoryStore.set(key, data);
  try {
    localStorage.setItem(`gr_cache_${key}`, JSON.stringify(data));
  } catch {
    /* ignore storage errors */
  }
};

/**
 * Clear all cached data on logout.
 * Prevents cross-account data leakage on shared devices (audit §5.8).
 */
export const clearAllCache = () => {
  memoryStore.clear();
  try {
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('gr_cache_'));
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore storage errors */
  }
};
