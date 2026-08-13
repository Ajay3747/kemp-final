const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const seedStaffUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');

    // Check if staff user already exists
    const existingStaff = await User.findOne({ username: 'test', role: 'staff' });
    if (existingStaff) {
      console.log('Staff user already exists!');
      await mongoose.disconnect();
      return;
    }

    // Create staff user
    const staffUser = new User({
      username: 'test',
      password: 'test',
      collegeEmail: 'staff@kongu.edu',
      department: 'Student Affairs',
      rollNo: 'STAFF001',
      phone: '8888888888',
      bloodGroup: 'O+',
      idCard: 'staff-id-card',
      role: 'staff',
      isApproved: true
    });

    await staffUser.save();
    console.log('✓ Staff user created successfully!');
    console.log('  Username: test');
    console.log('  Password: test');
    console.log('  Role: staff');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding staff user:', error.message);
    process.exit(1);
  }
};

seedStaffUser();
