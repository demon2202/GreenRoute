const mongoose = require('mongoose');

const CaptureAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cellId: {
        type: String,
        required: true
    },
    startedAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Automatic TTL index: document gets deleted 5 minutes (300s) after startedAt
    },
    startLat: {
        type: Number,
        required: true
    },
    startLng: {
        type: Number,
        required: true
    },
    requiredDuration: {
        type: Number,
        required: true
    }
});

// Compound index to ensure clean query lookups
CaptureAttemptSchema.index({ userId: 1, cellId: 1 });

module.exports = mongoose.model('CaptureAttempt', CaptureAttemptSchema);
