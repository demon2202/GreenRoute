const mongoose = require('mongoose');

const TerraPointSchema = new mongoose.Schema({
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    timestamp: { type: Date, required: true },
    altitude: { type: Number },
    accuracy: { type: Number }
}, { _id: false });

const TerraActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    mode: { type: String, required: true, trim: true, lowercase: true, maxlength: 30 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    distanceKm: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, required: true, min: 0 },
    elevationGainM: { type: Number, min: 0 },
    averageSpeedKmh: { type: Number, min: 0 },
    maxSpeedKmh: { type: Number, min: 0 },
    storyCaption: { type: String, trim: true, maxlength: 280, default: '' },
    storyBackground: { type: String, enum: ['map', 'photo', 'black'], default: 'map' },
    storyTemplate: { type: String, enum: ['photo', 'route', 'minimal'], default: 'photo' },
    storyPhoto: { type: String, maxlength: 1600000, default: '' },
    routeCoordinates: { type: [TerraPointSchema], required: true, validate: v => v.length <= 20000 }
}, { timestamps: true });

TerraActivitySchema.index({ userId: 1, endedAt: -1 });

module.exports = mongoose.model('TerraActivity', TerraActivitySchema);
