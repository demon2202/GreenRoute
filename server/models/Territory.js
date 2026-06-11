const mongoose = require('mongoose');

const TerritorySchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    boundary: {
        type: [[Number]], // Array of [lng, lat] coordinates representing the closed polygon loop
        required: true
    },
    area: {
        type: Number, // Enclosed area in km²
        required: true
    },
    perimeter: {
        type: Number, // Boundary perimeter in km
        required: true
    },
    defenseLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    strength: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    territoryType: {
        type: String,
        enum: ['park', 'block', 'trail', 'custom'],
        default: 'custom'
    },
    status: {
        type: String,
        enum: ['active', 'under_attack'],
        default: 'active'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [lng, lat] centroid of the territory polygon
            required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastVisitedAt: {
        type: Date,
        default: Date.now
    },
    battlesCount: {
        type: Number,
        default: 0
    },
    captureHistory: [{
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ownerName: { type: String },
        capturedAt: { type: Date },
        duration: { type: Number } // Duration owned in seconds
    }]
});

// Create 2dsphere spatial index on centroid coordinate
TerritorySchema.index({ location: '2dsphere' });
TerritorySchema.index({ createdAt: 1 });

module.exports = mongoose.model('Territory', TerritorySchema);
