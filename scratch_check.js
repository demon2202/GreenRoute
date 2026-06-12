require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function check() {
    console.log('Connecting to MONGO_URI...');
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            bufferCommands: false
        });
        console.log('Connected to MongoDB successfully.');
        
        const users = await User.find({}, 'displayName email stats tripHistory').lean();
        console.log('Total users:', users.length);
        users.forEach((u, i) => {
            console.log(`${i+1}. Name: "${u.displayName}", Email: "${u.email}", CO2 Saved: ${u.stats?.totalCo2Saved}, Trips: ${u.tripHistory?.length || 0}`);
            if (u.tripHistory && u.tripHistory.length > 0) {
                console.log(`   Trip history samples:`, JSON.stringify(u.tripHistory.slice(0, 2), null, 2));
            }
        });
        mongoose.connection.close();
    } catch (err) {
        console.error('Database connection or query error:', err.message || err);
        process.exit(1);
    }
}

check();
