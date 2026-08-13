const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function migrateBloodGroup() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campuskart');
    console.log('Connected to database');

    // Find all users without bloodGroup field
    const usersWithoutBloodGroup = await User.find({ bloodGroup: { $exists: false } });
    console.log(`Found ${usersWithoutBloodGroup.length} users without blood group`);

    if (usersWithoutBloodGroup.length > 0) {
      // Update all users without bloodGroup to have a default value
      const result = await User.updateMany(
        { bloodGroup: { $exists: false } },
        { $set: { bloodGroup: 'O+' } }
      );
      console.log(`Updated ${result.modifiedCount} users with default blood group (O+)`);
    }

    // Also check for users with null or empty bloodGroup
    const usersWithNullBloodGroup = await User.find({ 
      $or: [
        { bloodGroup: null },
        { bloodGroup: '' }
      ]
    });
    console.log(`Found ${usersWithNullBloodGroup.length} users with null/empty blood group`);

    if (usersWithNullBloodGroup.length > 0) {
      const result = await User.updateMany(
        { 
          $or: [
            { bloodGroup: null },
            { bloodGroup: '' }
          ]
        },
        { $set: { bloodGroup: 'O+' } }
      );
      console.log(`Updated ${result.modifiedCount} users with null/empty blood group to O+`);
    }

    // Verify the update
    const allUsers = await User.find().select('username bloodGroup');
    console.log('\nAll users after migration:');
    allUsers.forEach(user => {
      console.log(`${user.username}: ${user.bloodGroup || 'N/A'}`);
    });

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateBloodGroup();
