const mongoose = require('mongoose');

/**
 * TERRA Activity
 * A Strava-style "journey" recorded from the user's REAL GPS movement.
 * Stored in its own collection (not embedded in the User doc) so that
 * long recorded tracks never bloat the User document.
 *
 * Ownership rule (enforced in routes): every document has a `user`
 * field, and every read/write is scoped to req.user.id. Never trust a
 * userId sent from the client.
 */

const RoutePointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    // GPS altitude in metres — only stored when the browser actually
    // provides it. `null` means no reliable elevation for that point.
    ele: { type: Number, default: null },
    // epoch ms
    ts: { type: Number, required: true },
  },
  { _id: false }
);

const TerraActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '', trim: true, maxlength: 80 },
    // user-written text displayed on the share card (transparent box)
    caption: { type: String, default: '', trim: true, maxlength: 220 },
    mode: {
      type: String,
      required: true,
      enum: ['walking', 'running', 'cycling', 'driving'],
      default: 'cycling',
    },
    // story card background choice — solid colour was removed from TERRA, so
    // only 'map' or 'photo'. Old enum values are kept so legacy documents can
    // still be saved; the client reads any legacy 'black'/'color' as 'map'.
    bg: { type: String, enum: ['black', 'map', 'photo', 'color'], default: 'map' },
    // card map look — 'dark' (black) or 'normal' (standard/colourful).
    // Legacy 'light' values are treated as 'normal' on read.
    mapStyle: { type: String, enum: ['dark', 'normal', 'light'], default: 'dark' },
    // legacy solid-colour value (kept for old documents; no longer written)
    bgColor: { type: String, default: '' },
    photo: { type: String, default: '' }, // URL of the uploaded custom background photo
    // stats the user chose to show on the story card. Distance/Time/Avg
    // speed are the big numbers (default on); Max/Elevation/Eco add chips
    // + pins on the card's route map.
    cardStats: {
      type: [String],
      default: ['distance', 'time', 'avgSpeed'],
    },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationSec: { type: Number, required: true, min: 0 },

    // ── Authoritative metrics (computed on the server from `route`) ──
    distanceKm: { type: Number, required: true, min: 0 },
    avgSpeedKmh: { type: Number, default: 0 },
    maxSpeedKmh: { type: Number, default: 0 },
    elevationGainM: { type: Number, default: 0 },
    elevationLossM: { type: Number, default: 0 },
    hasElevation: { type: Boolean, default: false },
    co2SavedKg: { type: Number, default: 0 },
    caloriesKcal: { type: Number, default: 0 },
    ecoScore: { type: Number, default: 0, min: 0, max: 100 },

    // raw recorded track (down-sampled client-side; extra safety cap here)
    route: { type: [RoutePointSchema], default: [] },

    // bbox  sw:[lng,lat], ne:[lng,lat]
    bounds: {
      sw: { type: [Number], default: [] },
      ne: { type: [Number], default: [] },
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Index on user+date so "recent journeys" is a fast query.
TerraActivitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('TerraActivity', TerraActivitySchema);
