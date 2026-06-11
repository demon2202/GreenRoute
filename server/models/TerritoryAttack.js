const mongoose = require('mongoose');

const TerritoryAttackSchema = new mongoose.Schema({
    territoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory',
        required: true,
        index: true
    },
    attackerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    attackerName: {
        type: String,
        required: true
    },
    lapsCompleted: {
        type: Number,
        default: 0
    },
    checkpointsVisited: {
        type: [Boolean],
        default: []
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // MongoDB TTL index to auto-delete documents inactive for 24 hours (86400s)
    }
});

// Ensure a single user can have only one active attack session per territory at a time
TerritoryAttackSchema.index({ territoryId: 1, attackerId: 1 }, { unique: true });

module.exports = mongoose.model('TerritoryAttack', TerritoryAttackSchema);
