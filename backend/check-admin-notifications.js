const mongoose = require('mongoose');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');
const Report = require('./src/models/Report');
require('dotenv').config();

const checkAdminNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected\n');

    // Find all admins
    const admins = await User.find({ $or: [{ role: 'admin' }, { isAdmin: true }] });
    console.log('=== ADMINS IN DATABASE ===');
    console.log('Total admins:', admins.length);
    admins.forEach(admin => {
      console.log(`- ID: ${admin._id}, Username: ${admin.username}, Role: ${admin.role}, isAdmin: ${admin.isAdmin}`);
    });
    console.log('');

    // Find all reports
    const reports = await Report.find();
    console.log('=== REPORTS IN DATABASE ===');
    console.log('Total reports:', reports.length);
    reports.forEach(report => {
      console.log(`- Report ID: ${report._id}`);
      console.log(`  Reported User: ${report.reportedUsername}`);
      console.log(`  Reporting Staff: ${report.reportingStaffUsername}`);
      console.log(`  Text: ${report.reportText}`);
      console.log(`  Date: ${report.reportedAt}`);
    });
    console.log('');

    // Find all staff_report notifications
    const staffReportNotifications = await Notification.find({ type: 'staff_report' })
      .populate('recipientId', 'username')
      .populate('senderId', 'username');
    console.log('=== STAFF REPORT NOTIFICATIONS ===');
    console.log('Total staff_report notifications:', staffReportNotifications.length);
    staffReportNotifications.forEach(notif => {
      console.log(`- Notification ID: ${notif._id}`);
      console.log(`  Recipient: ${notif.recipientId?.username} (${notif.recipientId?._id})`);
      console.log(`  Sender: ${notif.senderId?.username} (${notif.senderId?._id})`);
      console.log(`  Title: ${notif.title}`);
      console.log(`  Message: ${notif.message}`);
      console.log(`  Created: ${notif.createdAt}`);
      console.log('');
    });

    // Check notifications for each admin
    for (const admin of admins) {
      const adminNotifications = await Notification.find({ recipientId: admin._id });
      console.log(`\n=== NOTIFICATIONS FOR ADMIN: ${admin.username} (${admin._id}) ===`);
      console.log('Total notifications:', adminNotifications.length);
      console.log('Staff reports:', adminNotifications.filter(n => n.type === 'staff_report').length);
      adminNotifications.forEach(notif => {
        console.log(`  - Type: ${notif.type}, Title: ${notif.title}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkAdminNotifications();
