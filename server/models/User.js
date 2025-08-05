const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const RouteHistorySchema = new mongoose.Schema({
    originName: { type: String, required: true },
    destinationName: { type: String, required: true },
    mode: { type: String, required: true },
    distance: { type: Number, required: true },
    duration: { type: Number, required: true },
    co2Saved: { type: Number, required: true },
    date: { type: Date, default: Date.now } // Added date field
});

const UserSchema = new mongoose.Schema({
    googleId: { type: String },
    displayName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    image: { type: String },
    theme: { type: String, default: 'light' },
    preferences: {
        transportModes: { type: [String], default: ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes'] },
        sustainabilityPriority: { type: String, default: 'Eco First' },
        maxWalkingDistance: { type: Number, default: 3 },
        maxCyclingDistance: { type: Number, default: 15 },
        monthlyGoal: { type: Number, default: 60 },
        homeAddress: { type: String, default: '' },
        workAddress: { type: String, default: '' }
    },
    tripHistory: [RouteHistorySchema] // Uses the updated schema
});

// Hash password before saving the user model
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);