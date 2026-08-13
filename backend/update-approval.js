const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const updateApproval = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');

    // Update test user to be approved
    const result = await User.findOneAndUpdate(
      { username: 'test' },
      { isApproved: true },
      { new: true }
    );

    if (result) {
      console.log('✓ Test user updated successfully!');
      console.log('  Username:', result.username);
      console.log('  Approved:', result.isApproved);
      console.log('  Role:', result.role);
    } else {
      console.log('User not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error updating user:', error.message);
    process.exit(1);
  }
};

updateApproval();
