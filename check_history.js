require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- User: ${u.displayName} (${u.email}), Trips Count: ${u.tripHistory?.length || 0}`);
            if (u.tripHistory && u.tripHistory.length > 0) {
                console.log('  Trips:', JSON.stringify(u.tripHistory, null, 2));
            }
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
