const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'test' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const adminUser = new User({
      username: 'test',
      password: 'test',
      collegeEmail: 'admin@kongu.edu',
      department: 'Administration',
      rollNo: 'ADMIN001',
      phone: '9999999999',
      bloodGroup: 'O+',
      idCard: 'admin-id-card',
      isAdmin: true
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Username: test');
    console.log('Password: test');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
