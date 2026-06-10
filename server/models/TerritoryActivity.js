const mongoose = require('mongoose');

const TerritoryActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    userImage: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        required: true,
        enum: ['capture', 'steal', 'defense']
    },
    cellId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
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
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '90d' // TTL index: automatically deletes document after 90 days
    }
});

// Create 2dsphere index for location bounds querying
TerritoryActivitySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('TerritoryActivity', TerritoryActivitySchema);
