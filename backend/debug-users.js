const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');

    const users = await User.find({});
    console.log('\n=== All Users in Database ===');
    users.forEach(user => {
      console.log(`\nUsername: ${user.username}`);
      console.log(`Role: ${user.role}`);
      console.log(`Password Hash: ${user.password.substring(0, 20)}...`);
      console.log(`Is Approved: ${user.isApproved}`);
    });

    // Try to find staff user
    console.log('\n=== Searching for Staff User ===');
    const staffUser = await User.findOne({ username: 'test', role: 'staff' });
    if (staffUser) {
      console.log('✓ Staff user found!');
      console.log(`  Username: ${staffUser.username}`);
      console.log(`  Role: ${staffUser.role}`);
      console.log(`  Password Hash starts with: ${staffUser.password.substring(0, 20)}...`);
    } else {
      console.log('✗ Staff user NOT found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkUsers();
