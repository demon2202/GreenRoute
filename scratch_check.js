require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');
        const users = await User.find({}, 'displayName email stats');
        console.log('Total users:', users.length);
        users.forEach((u, i) => {
            console.log(`${i+1}. Name: "${u.displayName}", Email: "${u.email}", CO2 Saved: ${u.stats?.totalCo2Saved}`);
        });
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

check();
