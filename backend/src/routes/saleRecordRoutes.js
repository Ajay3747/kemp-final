const express = require('express');
const router = express.Router();
const SaleRecord = require('../models/SaleRecord');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Create a new sale record
router.post('/sales-records', isAuthenticated, async (req, res) => {
  try {
    const {
      productId,
      productName,
      salePrice,
      buyerName,
      buyerRollNumber,
      buyerPhone,
      sellerName,
      sellerRollNumber,
      saleDate,
      paymentMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!productName || !salePrice || !buyerName || !buyerRollNumber || !sellerName || !sellerRollNumber) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['productName', 'salePrice', 'buyerName', 'buyerRollNumber', 'sellerName', 'sellerRollNumber']
      });
    }

    // Create new sale record
    const saleRecord = new SaleRecord({
      productId: productId || null,
      productName,
      salePrice,
      buyerName,
      buyerRollNumber,
      buyerPhone: buyerPhone || '',
      sellerId: req.user.userId, // From authenticated user
      sellerName,
      sellerRollNumber,
      saleDate: saleDate || new Date(),
      paymentMethod: paymentMethod || 'cash',
      notes: notes || ''
    });

    await saleRecord.save();

    res.status(201).json({
      message: 'Sale record created successfully',
      saleRecord
    });
  } catch (error) {
    console.error('Error creating sale record:', error);
    res.status(500).json({ 
      message: 'Failed to create sale record', 
      error: error.message 
    });
  }
});

// Get all sale records (Admin only)
router.get('/sales-records', isAuthenticated, async (req, res) => {
  try {
    const saleRecords = await SaleRecord.find()
      .sort({ saleDate: -1 })
      .populate('sellerId', 'username email')
      .populate('productId', 'title');

    res.status(200).json(saleRecords);
  } catch (error) {
    console.error('Error fetching sale records:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sale records', 
      error: error.message 
    });
  }
});

// Get sale records for a specific seller
router.get('/sales-records/seller/:sellerId', isAuthenticated, async (req, res) => {
  try {
    const { sellerId } = req.params;

    const saleRecords = await SaleRecord.find({ sellerId })
      .sort({ saleDate: -1 })
      .populate('productId', 'title');

    res.status(200).json(saleRecords);
  } catch (error) {
    console.error('Error fetching seller sale records:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sale records', 
      error: error.message 
    });
  }
});

// Get sale record statistics
router.get('/sales-records/stats', isAuthenticated, async (req, res) => {
  try {
    const totalSales = await SaleRecord.countDocuments();
    const totalRevenue = await SaleRecord.aggregate([
      { $group: { _id: null, total: { $sum: '$salePrice' } } }
    ]);

    const stats = {
      totalSales,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      averageSalePrice: totalSales > 0 ? (totalRevenue[0]?.total || 0) / totalSales : 0
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching sale statistics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch statistics', 
      error: error.message 
    });
  }
});

// Delete all sale records (Reset) - MUST be before /:id route
router.delete('/sales-records/reset-all', isAuthenticated, async (req, res) => {
  try {
    console.log('Deleting all sale records...');
    const result = await SaleRecord.deleteMany({});
    console.log('Delete result:', result);

    res.status(200).json({ 
      message: 'All sale records deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all sale records:', error);
    res.status(500).json({ 
      message: 'Failed to delete all sale records', 
      error: error.message 
    });
  }
});

// Delete a sale record (Admin only)
router.delete('/sales-records/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedRecord = await SaleRecord.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    res.status(200).json({ 
      message: 'Sale record deleted successfully',
      deletedRecord
    });
  } catch (error) {
    console.error('Error deleting sale record:', error);
    res.status(500).json({ 
      message: 'Failed to delete sale record', 
      error: error.message 
    });
  }
});

module.exports = router;
