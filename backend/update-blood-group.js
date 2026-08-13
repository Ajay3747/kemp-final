const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

// Usage: node update-blood-group.js username bloodgroup
// Example: node update-blood-group.js bnm "B+"

const [, , username, bloodGroup] = process.argv;

if (!username || !bloodGroup) {
  console.log('Usage: node update-blood-group.js <username> <bloodgroup>');
  console.log('Example: node update-blood-group.js bnm "B+"');
  process.exit(1);
}

async function updateBloodGroup() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campuskart');
    console.log('Connected to database');

    const user = await User.findOne({ username });
    if (!user) {
      console.error(`User "${username}" not found`);
      process.exit(1);
    }

    console.log(`Updating ${username} blood group from "${user.bloodGroup}" to "${bloodGroup}"`);
    user.bloodGroup = bloodGroup;
    await user.save();
    console.log('Successfully updated!');
    console.log(`New blood group: ${user.bloodGroup}`);
    process.exit(0);
  } catch (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
}

updateBloodGroup();
