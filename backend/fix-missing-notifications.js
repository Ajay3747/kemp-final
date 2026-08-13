const mongoose = require('mongoose');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');
const Report = require('./src/models/Report');
require('dotenv').config();

const createMissingNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected\n');

    // Find all reports
    const reports = await Report.find();
    console.log(`Found ${reports.length} reports in database\n`);

    // Find all admins
    const admins = await User.find({ $or: [{ role: 'admin' }, { isAdmin: true }] });
    console.log(`Found ${admins.length} admins in database\n`);

    if (admins.length === 0) {
      console.log('❌ No admins found! Cannot create notifications.');
      await mongoose.disconnect();
      return;
    }

    let createdCount = 0;

    for (const report of reports) {
      // Check if notifications already exist for this report
      const existingNotif = await Notification.findOne({ 
        'metadata.reportId': report._id 
      });

      if (existingNotif) {
        console.log(`⏭️  Skipping report ${report._id} - notifications already exist`);
        continue;
      }

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        recipientId: admin._id,
        senderId: report.reportingStaffId,
        type: 'staff_report',
        title: `User reported: ${report.reportedUsername}`,
        message: `${report.reportingStaffUsername} reported ${report.reportedUsername}. Reason: ${report.reportText}`,
        metadata: {
          reportId: report._id,
          reportedUserId: report.reportedUserId,
          reportedUsername: report.reportedUsername,
          reportedRollNo: report.reportedRollNo,
          reportingStaffId: report.reportingStaffId,
          reportingStaffUsername: report.reportingStaffUsername
        },
        createdAt: report.reportedAt
      }));

      await Notification.insertMany(notifications);
      createdCount += notifications.length;
      console.log(`✅ Created ${notifications.length} notification(s) for report ${report._id}`);
    }

    console.log(`\n🎉 Successfully created ${createdCount} notification(s) for ${reports.length} report(s)`);

    // Verify
    const staffReportNotifications = await Notification.find({ type: 'staff_report' });
    console.log(`\n📊 Total staff_report notifications now: ${staffReportNotifications.length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

createMissingNotifications();
