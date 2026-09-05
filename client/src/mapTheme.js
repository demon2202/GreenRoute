// ─────────────────────────────────────────────────────────────
// Global map colour preference (USER-chosen — independent of the
// app's light/dark chrome theme).
//   'normal' → standard/colourful basemap (route-planner look)
//   'dark'   → black basemap
// Defaults before the user picks: route planner → normal, TERRA → dark.
// Stored in localStorage for instant effect + synced to the account so it
// follows the user across devices (server POST /api/mapstyle).
// ─────────────────────────────────────────────────────────────
import axios from 'axios';

const KEY = 'gr_map_style';

export function readMapStyle() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'normal' || v === 'dark' ? v : null;
  } catch { return null; }
}

/** Per-surface default used only until the user makes a choice. */
export function surfaceDefault(surface) {
  return surface === 'terra' ? 'dark' : 'normal';
}

/** Resolve the map style to actually use for a given surface. */
export function resolveMapStyle(surface = 'general') {
  return readMapStyle() || surfaceDefault(surface);
}

/** Persist locally + (best effort) to the account. */
export async function setMapStyle(style) {
  if (style !== 'normal' && style !== 'dark') return;
  try { localStorage.setItem(KEY, style); } catch { /* noop */ }
  try {
    await axios.post('/api/mapstyle', { mapStyle: style });
  } catch { /* offline / not logged in — local still applies */ }
}

/** Copy the account value into localStorage when a user logs in (once). */
export function seedMapStyleFromUser(user) {
  if (!user || !user.mapStyle) return;
  if (user.mapStyle !== 'normal' && user.mapStyle !== 'dark') return;
  if (readMapStyle()) return; // local choice wins
  try { localStorage.setItem(KEY, user.mapStyle); } catch { /* noop */ }
}
