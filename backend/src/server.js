const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5178'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const communityRoutes = require('./routes/communityRoutes');
const saleRecordRoutes = require('./routes/saleRecordRoutes');
const orderRoutes = require('./routes/orderRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const bloodRequestRoutes = require('./routes/bloodRequestRoutes');
const pushRoutes = require('./routes/pushRoutes');
const { verifyEmailTransport } = require('./utils/emailService');
const { verifyTwilioConfig } = require('./utils/smsService');
const { warmUp: warmUpPersonDetector } = require('./services/imageModeration/localPersonDetector');
const { startWarrantyReminderJob } = require('./jobs/warrantyReminderJob');
app.use('/api/auth', authRoutes);

// Downloads/loads the person-detection model in the background now, so the
// first real listing-image upload isn't the one that pays the ~10s+
// cold-start cost.
warmUpPersonDetector();

// Daily check for warranties entering their "expiring soon" window.
startWarrantyReminderJob();

(async () => {
  try {
    await verifyTwilioConfig();
    console.log('Twilio Verify SMS API configured successfully');
  } catch (error) {
    console.warn('Twilio Verify API warning:', error.message);
  }
})();
app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/sales', saleRecordRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/push', pushRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Image is too large. Please upload an image under 8 MB.' });
  }
  console.error('Error:', err);
  res.status(500).json({ message: 'Server Error', error: err.message });
});

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuskart', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.log('DB Error - Running without MongoDB:', err.message);
  }
};

connectDB();

(async () => {
  try {
    await verifyEmailTransport();
    console.log('Resend email API configured successfully');
  } catch (error) {
    console.warn('Resend email API verification warning:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Set RESEND_API_KEY in backend/.env before testing OTP delivery.');
    }
  }
})();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));