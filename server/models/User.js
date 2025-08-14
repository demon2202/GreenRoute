const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const RouteHistorySchema = new mongoose.Schema({
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
    mode: { type: String, required: true },
    distance: { type: Number, required: true }, // in kilometers
    duration: { type: Number, required: true }, // in minutes
    co2Saved: { type: Number, required: true }, // in kg
    calories: { type: Number, default: 0 }, // calories burned
    cost: { type: Number, default: 0 }, // cost in local currency
    weather: {
        condition: { type: String },
        temperature: { type: Number },
        humidity: { type: Number }
    },
    rating: { type: Number, min: 1, max: 5 }, // user rating for the route
    notes: { type: String, maxlength: 500 },
    date: { type: Date, default: Date.now }
});

const AchievementSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    category: { type: String, enum: ['distance', 'co2', 'trips', 'streak', 'special'] }
});

const UserSchema = new mongoose.Schema({
    googleId: { type: String, sparse: true },
    displayName: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    image: { type: String },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    theme: { type: String, default: 'light', enum: ['light', 'dark', 'auto'] },
    language: { type: String, default: 'en', enum: ['en', 'es', 'fr', 'de', 'it', 'pt'] },
    timezone: { type: String, default: 'UTC' },
    
    preferences: {
        transportModes: { 
            type: [String], 
            default: ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes'],
            enum: ['Walking', 'Cycling', 'Public Transit', 'Mixed Routes', 'Driving', 'E-Scooter', 'E-Bike']
        },
        sustainabilityPriority: { 
            type: String, 
            default: 'Eco First',
            enum: ['Eco First', 'Balanced', 'Speed First', 'Cost First']
        },
        weatherSensitivity: {
            type: String,
            default: 'Moderate',
            enum: ['Low', 'Moderate', 'High']
        },
        avoidHighways: { type: Boolean, default: false },
        avoidTolls: { type: Boolean, default: false },
        maxWalkingDistance: { type: Number, default: 3, min: 1, max: 20 },
        maxCyclingDistance: { type: Number, default: 15, min: 1, max: 50 },
        monthlyGoal: { type: Number, default: 60, min: 10, max: 500 }, // kg CO2 saved per month
        homeAddress: { 
            formatted: { type: String, default: '' },
            coords: {
                lat: { type: Number },
                lng: { type: Number }
            }
        },
        workAddress: { 
            formatted: { type: String, default: '' },
            coords: {
                lat: { type: Number },
                lng: { type: Number }
            }
        },
        frequentLocations: [{
            name: { type: String, required: true },
            address: { type: String, required: true },
            coords: {
                lat: { type: Number, required: true },
                lng: { type: Number, required: true }
            },
            category: { type: String, enum: ['home', 'work', 'gym', 'shopping', 'restaurant', 'other'] }
        }],
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            weeklyReport: { type: Boolean, default: true },
            achievementUnlocked: { type: Boolean, default: true },
            goalReminders: { type: Boolean, default: true }
        }
    },
    
    tripHistory: [RouteHistorySchema],
    achievements: [AchievementSchema],
    
    stats: {
        currentStreak: { type: Number, default: 0 }, // days with eco-friendly trips
        longestStreak: { type: Number, default: 0 },
        totalCo2Saved: { type: Number, default: 0 },
        totalDistance: { type: Number, default: 0 },
        totalTrips: { type: Number, default: 0 },
        totalCalories: { type: Number, default: 0 },
        favoriteMode: { type: String, default: 'Walking' }
    },
    
    social: {
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        shareStats: { type: Boolean, default: false },
        shareLocation: { type: Boolean, default: false }
    },
    
    subscription: {
        plan: { type: String, enum: ['free', 'premium', 'pro'], default: 'free' },
        startDate: { type: Date },
        endDate: { type: Date },
        autoRenew: { type: Boolean, default: false }
    },
    
    privacy: {
        profileVisible: { type: Boolean, default: true },
        statsVisible: { type: Boolean, default: true },
        locationTracking: { type: Boolean, default: false }
    },
    
    deviceTokens: [{ type: String }], // for push notifications
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    accountStatus: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
    
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ 'tripHistory.date': -1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ 'social.friends': 1 });
UserSchema.index({ createdAt: -1 });

// Hash password before saving the user model
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update lastActive on save
UserSchema.pre('save', function(next) {
    this.lastActive = new Date();
    next();
});

// Update aggregated stats before saving
UserSchema.pre('save', function(next) {
    if (this.isModified('tripHistory')) {
        this.updateAggregatedStats();
    }
    next();
});

// Method to compare entered password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) {
        return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to update aggregated stats
UserSchema.methods.updateAggregatedStats = function() {
    const trips = this.tripHistory;
    let totalCo2 = 0;
    let totalDistance = 0;
    let totalCalories = 0;
    let modeCount = {};
    
    trips.forEach(trip => {
        totalCo2 += parseFloat(trip.co2Saved) || 0;
        totalDistance += parseFloat(trip.distance) || 0;
        totalCalories += parseFloat(trip.calories) || 0;
        
        // Count transport modes
        modeCount[trip.mode] = (modeCount[trip.mode] || 0) + 1;
    });
    
    // Update stats
    this.stats.totalCo2Saved = totalCo2;
    this.stats.totalDistance = totalDistance;
    this.stats.totalTrips = trips.length;
    this.stats.totalCalories = totalCalories;
    
    // Find favorite mode
    let maxCount = 0;
    let favoriteMode = 'Walking';
    for (const mode in modeCount) {
        if (modeCount[mode] > maxCount) {
            maxCount = modeCount[mode];
            favoriteMode = mode;
        }
    }
    this.stats.favoriteMode = favoriteMode;
};

// Method to get detailed stats
UserSchema.methods.getStats = function() {
    const trips = this.tripHistory;
    const now = new Date();
    
    // Calculate different time periods
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeek = new Date(now);
    thisWeek.setDate(now.getDate() - now.getDay());
    thisWeek.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    
    let stats = {
        today: { co2Saved: 0, trips: 0, distance: 0, calories: 0, cost: 0 },
        yesterday: { co2Saved: 0, trips: 0, distance: 0, calories: 0, cost: 0 },
        week: { co2Saved: 0, trips: 0, distance: 0, calories: 0, cost: 0 },
        month: { co2Saved: 0, trips: 0, distance: 0, calories: 0, cost: 0 },
        year: { co2Saved: 0, trips: 0, distance: 0, calories: 0, cost: 0 },
        allTime: { co2Saved: 0, trips: 0, distance: 0, calories: 0, cost: 0 }
    };
    
    trips.forEach(trip => {
        const tripDate = new Date(trip.date);
        const co2 = parseFloat(trip.co2Saved) || 0;
        const distance = parseFloat(trip.distance) || 0;
        const calories = parseFloat(trip.calories) || 0;
        const cost = parseFloat(trip.cost) || 0;
        
        // All time
        stats.allTime.co2Saved += co2;
        stats.allTime.trips += 1;
        stats.allTime.distance += distance;
        stats.allTime.calories += calories;
        stats.allTime.cost += cost;
        
        // Today
        if (tripDate >= today) {
            stats.today.co2Saved += co2;
            stats.today.trips += 1;
            stats.today.distance += distance;
            stats.today.calories += calories;
            stats.today.cost += cost;
        }
        
        // Yesterday
        if (tripDate >= yesterday && tripDate < today) {
            stats.yesterday.co2Saved += co2;
            stats.yesterday.trips += 1;
            stats.yesterday.distance += distance;
            stats.yesterday.calories += calories;
            stats.yesterday.cost += cost;
        }
        
        // This week
        if (tripDate >= thisWeek) {
            stats.week.co2Saved += co2;
            stats.week.trips += 1;
            stats.week.distance += distance;
            stats.week.calories += calories;
            stats.week.cost += cost;
        }
        
        // This month
        if (tripDate >= thisMonth) {
            stats.month.co2Saved += co2;
            stats.month.trips += 1;
            stats.month.distance += distance;
            stats.month.calories += calories;
            stats.month.cost += cost;
        }
        
        // This year
        if (tripDate >= thisYear) {
            stats.year.co2Saved += co2;
            stats.year.trips += 1;
            stats.year.distance += distance;
            stats.year.calories += calories;
            stats.year.cost += cost;
        }
    });
    
    return stats;
};

// Method to calculate monthly progress
UserSchema.methods.getMonthlyProgress = function() {
    const stats = this.getStats();
    const goal = this.preferences.monthlyGoal || 60;
    const progress = Math.min((stats.month.co2Saved / goal) * 100, 100);
    
    return {
        current: Math.round(stats.month.co2Saved * 100) / 100,
        goal: goal,
        progress: Math.round(progress * 100) / 100,
        remaining: Math.max(goal - stats.month.co2Saved, 0),
        onTrack: stats.month.co2Saved >= (goal * (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()))
    };
};

// Method to update streak
UserSchema.methods.updateStreak = function() {
    const trips = this.tripHistory;
    if (trips.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Check backwards from today
    while (true) {
        const dayTrips = trips.filter(trip => {
            const tripDate = new Date(trip.date);
            tripDate.setHours(0, 0, 0, 0);
            return tripDate.getTime() === checkDate.getTime();
        });
        
        if (dayTrips.length > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    this.stats.currentStreak = currentStreak;
    if (currentStreak > this.stats.longestStreak) {
        this.stats.longestStreak = currentStreak;
    }
};

// Method to check and unlock achievements
UserSchema.methods.checkAchievements = function() {
    const stats = this.getStats();
    const newAchievements = [];
    
    // Define achievements
    const achievements = [
        { id: 'first_trip', name: 'First Journey', description: 'Complete your first eco-friendly trip', icon: '🚶', condition: () => stats.allTime.trips >= 1 },
        { id: 'eco_warrior', name: 'Eco Warrior', description: 'Save 100kg of CO2', icon: '🌱', condition: () => stats.allTime.co2Saved >= 100 },
        { id: 'distance_master', name: 'Distance Master', description: 'Travel 1000km eco-friendly', icon: '🏃', condition: () => stats.allTime.distance >= 1000 },
        { id: 'streak_week', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', condition: () => this.stats.currentStreak >= 7 },
        { id: 'hundred_trips', name: 'Century Club', description: 'Complete 100 trips', icon: '💯', condition: () => stats.allTime.trips >= 100 }
    ];
    
    achievements.forEach(achievement => {
        const alreadyUnlocked = this.achievements.some(a => a.id === achievement.id);
        if (!alreadyUnlocked && achievement.condition()) {
            this.achievements.push({
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                category: achievement.id.includes('streak') ? 'streak' : 
                         achievement.id.includes('distance') ? 'distance' :
                         achievement.id.includes('co2') || achievement.id.includes('eco') ? 'co2' : 'trips'
            });
            newAchievements.push(achievement);
        }
    });
    
    return newAchievements;
};

// Method to get leaderboard position
UserSchema.methods.getLeaderboardPosition = async function(metric = 'co2Saved') {
    const User = this.constructor;
    const metricPath = `stats.total${metric.charAt(0).toUpperCase() + metric.slice(1)}`;
    
    const position = await User.countDocuments({
        [metricPath]: { $gt: this.stats[`total${metric.charAt(0).toUpperCase() + metric.slice(1)}`] },
        accountStatus: 'active'
    });
    
    return position + 1;
};

// Static method to find users with similar preferences for recommendations
UserSchema.statics.findSimilarUsers = function(userId, preferences, limit = 10) {
    return this.find({
        _id: { $ne: userId },
        'preferences.transportModes': { $in: preferences.transportModes },
        'preferences.sustainabilityPriority': preferences.sustainabilityPriority,
        accountStatus: 'active'
    })
    .select('displayName stats achievements preferences.sustainabilityPriority')
    .limit(limit);
};

// Static method to get leaderboard
UserSchema.statics.getLeaderboard = function(metric = 'totalCo2Saved', limit = 50) {
    const sortField = `stats.${metric}`;
    return this.find({ 
        accountStatus: 'active',
        'privacy.statsVisible': true,
        [sortField]: { $gt: 0 }
    })
    .select('displayName image stats achievements')
    .sort({ [sortField]: -1 })
    .limit(limit);
};

// Static method to get user analytics
UserSchema.statics.getAnalytics = async function() {
    const totalUsers = await this.countDocuments({ accountStatus: 'active' });
    const activeToday = await this.countDocuments({ 
        lastActive: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        accountStatus: 'active'
    });
    
    const pipeline = [
        { $match: { accountStatus: 'active' } },
        {
            $group: {
                _id: null,
                totalCo2Saved: { $sum: '$stats.totalCo2Saved' },
                totalTrips: { $sum: '$stats.totalTrips' },
                totalDistance: { $sum: '$stats.totalDistance' },
                avgTripsPerUser: { $avg: '$stats.totalTrips' }
            }
        }
    ];
    
    const [aggregateStats] = await this.aggregate(pipeline);
    
    return {
        totalUsers,
        activeToday,
        ...aggregateStats
    };
};

module.exports = mongoose.model('User', UserSchema);
