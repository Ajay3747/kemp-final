const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const migrateUsersRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');

    // Update users that don't have a role field
    const result = await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );

    console.log(`Updated ${result.modifiedCount} users with role='user'`);

    // Verify the update
    const totalUsers = await User.countDocuments();
    const staffUsers = await User.countDocuments({ role: 'staff' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    console.log(`Total users: ${totalUsers}`);
    console.log(`Staff users: ${staffUsers}`);
    console.log(`Regular users: ${regularUsers}`);

    await mongoose.disconnect();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
};

migrateUsersRole();
