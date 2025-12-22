const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        sparse: true
    },
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String
    },
    image: {
        type: String,
        default: ''
    },
    theme: {
        type: String,
        default: 'light',
        enum: ['light', 'dark', 'auto']
    },
    // FIXED: Simplified preferences schema to avoid nested field conflicts
    preferences: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: () => new Map([
            ['transportModes', ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes']],
            ['sustainabilityPriority', 'Eco First'],
            ['weatherSensitivity', 'Moderate'],
            ['maxWalkingDistance', 3],
            ['maxCyclingDistance', 15],
            ['monthlyGoal', 60],
            ['homeAddress', ''],
            ['workAddress', '']
        ])
    },
    tripHistory: [{
        originName: { type: String, required: true },
        destinationName: { type: String, required: true },
        originCoords: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        },
        destinationCoords: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        },
        mode: { 
            type: String, 
            required: true,
            lowercase: true
        },
        distance: { 
            type: Number, 
            required: true,
            min: 0
        },
        duration: { 
            type: Number, 
            required: true,
            min: 0
        },
        co2Saved: { 
            type: Number, 
            required: true,
            min: 0
        },
        calories: { 
            type: Number, 
            default: 0,
            min: 0
        },
        date: { 
            type: Date, 
            default: Date.now 
        }
    }],
    stats: {
        totalCo2Saved: { type: Number, default: 0 },
        totalTrips: { type: Number, default: 0 },
        totalDistance: { type: Number, default: 0 },
        totalDuration: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Update aggregated stats
UserSchema.methods.updateAggregatedStats = function() {
    if (!this.tripHistory || this.tripHistory.length === 0) {
        this.stats = {
            totalCo2Saved: 0,
            totalTrips: 0,
            totalDistance: 0,
            totalDuration: 0
        };
        return;
    }

    this.stats.totalCo2Saved = this.tripHistory.reduce((sum, trip) => 
        sum + (parseFloat(trip.co2Saved) || 0), 0
    );
    this.stats.totalTrips = this.tripHistory.length;
    this.stats.totalDistance = this.tripHistory.reduce((sum, trip) => 
        sum + (parseFloat(trip.distance) || 0), 0
    );
    this.stats.totalDuration = this.tripHistory.reduce((sum, trip) => 
        sum + (parseInt(trip.duration) || 0), 0
    );
};

module.exports = mongoose.model('User', UserSchema);
