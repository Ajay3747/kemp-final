const mongoose = require('mongoose');
const User = require('./src/models/User');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const seedTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');

    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'test' });
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Updating test user with image data...');
      
      // Create a simple test image (1x1 red pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 
        0x00, 0x00, 0x03, 0x00, 0x01, 0x3b, 0x6e, 0x6b, 0xd9, 0x00, 0x00, 0x00, 
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
      ]);
      
      existingUser.idCardData = testImageBuffer;
      existingUser.idCardMimeType = 'image/png';
      existingUser.idCard = 'test-image.png';
      await existingUser.save();
      console.log('Test user updated with image data!');
      await mongoose.disconnect();
      return;
    }

    // Create a simple test image (1x1 red pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 
      0x00, 0x00, 0x03, 0x00, 0x01, 0x3b, 0x6e, 0x6b, 0xd9, 0x00, 0x00, 0x00, 
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);

    // Create test user
    const testUser = new User({
      username: 'test',
      password: 'test',
      collegeEmail: 'testuser@kongu.edu',
      department: 'Computer Science',
      rollNo: 'CS001',
      phone: '9876543210',
      bloodGroup: 'A+',
      idCard: 'test-image.png',
      idCardData: testImageBuffer,
      idCardMimeType: 'image/png',
      role: 'user',
      isApproved: true
    });

    await testUser.save();
    console.log('✓ Test user created successfully!');
    console.log('  Username: test');
    console.log('  Password: test');
    console.log('  Email: testuser@kongu.edu');
    console.log('  Role: user (pending approval)');
    console.log('  ID Card: Test image (1x1 red pixel PNG)');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding test user:', error.message);
    process.exit(1);
  }
};

seedTestUser();
