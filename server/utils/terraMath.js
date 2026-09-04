/**
 * Terra math helpers — the SINGLE source of truth for activity metrics.
 * Distance, time, speed and eco values shown to the user are computed
 * here from the recorded GPS track. Nothing is hardcoded, nothing is
 * random. If a metric cannot be derived from real data it is reported
 * as unavailable (null / hasElevation=false) rather than invented.
 */

const R = 6371; // Earth radius km

function haversineKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((n) => typeof n === 'number' && Number.isFinite(n))) return 0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Plausible top speeds (km/h) per mode used only to filter GPS spikes
// when computing max speed / distance. They are upper bounds, never
// shown as results.
const MODE_TOP_SPEED = { walking: 18, running: 30, cycling: 75, driving: 240 };

/**
 * Compute metrics from a cleaned track.
 * @param {Array<{lat,lng,ele,ts}>} route raw recorded points (chronological)
 * @param {string} mode walking|running|cycling|driving
 * @param {number|null} durationSec official elapsed seconds (fallback to ts diff)
 */
function computeMetrics(route, mode, durationSec) {
  if (!Array.isArray(route) || route.length === 0) {
    return {
      distanceKm: 0, avgSpeedKmh: 0, maxSpeedKmh: 0,
      elevationGainM: 0, elevationLossM: 0, hasElevation: false,
      bounds: null,
    };
  }

  const topSpeed = MODE_TOP_SPEED[mode] || 75;

  let distanceKm = 0;
  let gainM = 0;
  let lossM = 0;
  let eleCount = 0;
  let maxSpeedKmh = 0;
  const speeds = [];

  const first = route[0];
  const last = route[route.length - 1];
  const latMin = Math.min(...route.map((p) => p.lat));
  const latMax = Math.max(...route.map((p) => p.lat));
  const lngMin = Math.min(...route.map((p) => p.lng));
  const lngMax = Math.max(...route.map((p) => p.lng));

  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    if (!a || !b) continue;

    const segKm = haversineKm(a.lat, a.lng, b.lat, b.lng);

    // dt seconds between samples (ts is epoch MILLISECONDS)
    const dtSec = Math.max(0, ((Number(b.ts) || 0) - (Number(a.ts) || 0)) / 1000);

    // ── Elevation (only from real altitude values) ──
    if (typeof a.ele === 'number' && Number.isFinite(a.ele) && typeof b.ele === 'number' && Number.isFinite(b.ele)) {
      eleCount += 2;
      const dEle = b.ele - a.ele;
      // Ignore tiny noisy deltas (< 2 m) and absurd jumps (> 150 m per sample)
      if (Math.abs(dEle) >= 2 && Math.abs(dEle) <= 150) {
        if (dEle > 0) gainM += dEle;
        else lossM += Math.abs(dEle);
      }
    }

    // ── Distance: skip segments that are obviously GPS teleport spikes
    // (e.g. moving 400 m in 3 seconds on foot). Everything else counts
    // because it represents the user's real movement between samples.
    const dtHours = dtSec / 3600;
    const plausibleKm = dtHours * topSpeed + 0.25; // +250 m of GPS jitter slack
    if (segKm <= plausibleKm || dtSec === 0) {
      distanceKm += segKm;
    }

    // ── Instantaneous speed from consecutive samples (for max/avg) ──
    if (dtSec >= 1.5 && dtSec <= 90 && segKm > 0.002 && segKm <= plausibleKm) {
      const spd = (segKm / dtSec) * 3600;
      if (spd <= topSpeed && spd > 0) speeds.push(spd);
      if (spd > maxSpeedKmh) maxSpeedKmh = spd;
    }
  }

  const hasElevation = eleCount >= 2 && (gainM > 0 || lossM > 0);

  // Official duration (elapsed wall clock) if available else ts span
  let dur = null;
  if (typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0) {
    dur = durationSec;
  } else if (first && last && Number.isFinite(last.ts) && Number.isFinite(first.ts)) {
    dur = Math.max(0, (last.ts - first.ts) / 1000);
  }

  // avg speed: distance over ACTIVE moving seconds only (avoids punishing
  // someone who paused mid-ride without a pause feature). If we have no
  // clean speeds we fall back to distance / elapsed time.
  let avgSpeedKmh = 0;
  if (dur) {
    if (speeds.length >= 3) {
      const movingSeconds = route.reduce((acc, p, i) => {
        if (i === 0) return acc;
        const dt = Math.max(0, ((Number(p.ts) || 0) - (Number(route[i - 1].ts) || 0)) / 1000);
        const seg = haversineKm(route[i - 1].lat, route[i - 1].lng, p.lat, p.lng);
        return acc + (seg > 0.002 && dt >= 1.5 && dt <= 90 ? dt : 0);
      }, 0);
      if (movingSeconds > 0) avgSpeedKmh = (distanceKm / movingSeconds) * 3600;
    }
    if (avgSpeedKmh <= 0 || !Number.isFinite(avgSpeedKmh)) {
      avgSpeedKmh = (distanceKm / dur) * 3600;
    }
  }

  return {
    distanceKm: round1(distanceKm),
    avgSpeedKmh: round1(Math.min(avgSpeedKmh, topSpeed)),
    maxSpeedKmh: round1(Math.min(maxSpeedKmh, topSpeed)),
    elevationGainM: Math.round(gainM),
    elevationLossM: Math.round(lossM),
    hasElevation,
    bounds: {
      sw: [lngMin, latMin],
      ne: [lngMax, latMax],
    },
  };
}

/**
 * Eco / sustainability metrics for a finished activity.
 * Baseline = the same driving-emission model GreenRoute already uses
 * elsewhere (0.21 kg CO₂ per km). Cycling / walking / running emit ~0.
 */
function ecoMetrics(mode, distanceKm) {
  const HUMAN = ['cycling', 'walking', 'running'].includes(mode);
  const co2SavedKg = HUMAN ? round2(distanceKm * 0.21) : 0;

  // Deterministic, explainable 0–100 score. No random values.
  const base = { cycling: 95, walking: 90, running: 92, driving: 12 }[mode] || 50;
  const distanceBonus = Math.min(5, Math.floor(distanceKm / 10));
  const ecoScore = Math.max(0, Math.min(100, Math.round(base + (HUMAN ? distanceBonus : 0))));

  // Very rough kcal estimate (active modes only).
  const kcalPerKm = { cycling: 32, walking: 62, running: 82, driving: 0 }[mode] || 0;
  const caloriesKcal = Math.round(kcalPerKm * distanceKm);

  return { co2SavedKg, ecoScore, caloriesKcal };
}

function round1(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}
function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Down-sample / cap a raw track. Callers (client) run this before upload;
 * the server runs it again as a safety net so a malicious client can never
 * push more than MAX_POINTS points or points outside valid ranges.
 */
function cleanRoute(route, maxPoints = 4000) {
  if (!Array.isArray(route)) return [];
  const out = [];
  let last = null;
  for (const p of route) {
    const lat = Number(p?.lat);
    const lng = Number(p?.lng);
    const ts = Number(p?.ts);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const ele = p.ele == null || !Number.isFinite(Number(p.ele)) ? null : Number(p.ele);

    // skip exact duplicates
    if (last && last.lat === lat && last.lng === lng) continue;
    out.push({ lat, lng, ele, ts });
    last = out[out.length - 1];
    if (out.length >= maxPoints) break;
  }
  return out;
}

function durationSeconds(startISO, endISO) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  return Math.max(0, Math.round((e - s) / 1000));
}

module.exports = {
  haversineKm,
  computeMetrics,
  ecoMetrics,
  cleanRoute,
  durationSeconds,
  round1,
  round2,
};
