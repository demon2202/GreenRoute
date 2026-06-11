const mongoose = require('mongoose');

const GridCellSchema = new mongoose.Schema({
    cellId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    ownerName: {
        type: String,
        required: true
    },
    ownerImage: {
        type: String,
        default: ''
    },
    capturedAt: {
        type: Date,
        default: Date.now
    },
    lastVisitedAt: {
        type: Date,
        default: Date.now
    },
    strength: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    defenseLevel: {
        type: Number,
        default: 1,
        enum: [1, 2, 3]
    },
    battlesCount: {
        type: Number,
        default: 0
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [lng, lat]
            required: true
        }
    },
    history: [{
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ownerName: { type: String },
        capturedAt: { type: Date },
        duration: { type: Number }
    }]
});

// Create 2dsphere index for location bounds querying
GridCellSchema.index({ location: '2dsphere' });
GridCellSchema.index({ capturedAt: 1 });

module.exports = mongoose.model('GridCell', GridCellSchema);
