const Product = require('../models/Product');
const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const { moderateListingImage } = require('../services/imageModeration/imageModerationService');
const { REASON_CODES } = require('../services/imageModeration/config');

const MODERATION_HTTP_STATUS = {
  [REASON_CODES.INVALID_FILE]: 400,
  [REASON_CODES.CONTENT_REJECTED]: 422,
  [REASON_CODES.SERVICE_UNAVAILABLE]: 503
};

// Backend is the final authority on warranty data — never trust it from the
// frontend alone. `warrantyAvailable` may arrive as a real boolean (JSON
// body) or as the string "true"/"false" (multipart form-data, used by
// createProduct because of the image field), so both are accepted.
// Returns `{ provided: false }` when warrantyAvailable is absent entirely
// (e.g. a partial update not touching warranty), so callers can distinguish
// "not being changed" from "explicitly set to false".
function parseWarrantyInput({ warrantyAvailable, warrantyDuration }) {
  if (warrantyAvailable === undefined) {
    return { provided: false };
  }

  let available;
  if (typeof warrantyAvailable === 'boolean') {
    available = warrantyAvailable;
  } else if (typeof warrantyAvailable === 'string' && ['true', 'false'].includes(warrantyAvailable.toLowerCase())) {
    available = warrantyAvailable.toLowerCase() === 'true';
  } else {
    return { provided: true, error: 'warrantyAvailable must be a boolean (true or false).' };
  }

  if (!available) {
    // No warranty — duration is always cleared, regardless of what was sent.
    return { provided: true, warrantyAvailable: false, warrantyDuration: null };
  }

  const duration = typeof warrantyDuration === 'string' ? warrantyDuration.trim() : '';
  if (!duration) {
    return { provided: true, error: 'warrantyDuration is required when warrantyAvailable is true (e.g. "6 months").' };
  }

  return { provided: true, warrantyAvailable: true, warrantyDuration: duration };
}

// Create a new product listing
exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, category, condition, sellerId } = req.body;

    if (!title || !description || !price || !category || !sellerId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const warrantyInput = parseWarrantyInput(req.body);
    if (warrantyInput.error) {
      return res.status(400).json({ message: warrantyInput.error });
    }
    // Warranty is optional on create — omitted entirely defaults to "no warranty".
    const warrantyAvailable = warrantyInput.provided ? warrantyInput.warrantyAvailable : false;
    const warrantyDuration = warrantyInput.provided ? warrantyInput.warrantyDuration : null;

    // Get seller information
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Image moderation is the backend's final authority — this re-checks the
    // actual submitted file server-side regardless of any frontend precheck,
    // so a listing cannot be created with a disallowed image by calling this
    // API directly. Listings without an image skip straight through.
    if (req.file) {
      const moderation = await moderateListingImage(req.file);
      if (!moderation.allowed) {
        const status = MODERATION_HTTP_STATUS[moderation.code] || 422;
        return res.status(status).json({
          message: moderation.reason || 'This image is not allowed for marketplace listings.',
          moderation
        });
      }
    }

    // Create product
    const product = new Product({
      title,
      description,
      price: parseFloat(price),
      category,
      condition: condition || 'used',
      sellerId,
      sellerName: seller.username,
      sellerEmail: seller.collegeEmail,
      sellerPhone: seller.phone,
      warrantyAvailable,
      warrantyDuration,
      imageUrl: req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null,
      imageData: req.file ? req.file.buffer : null,
      imageMimeType: req.file ? req.file.mimetype : null
    });

    await product.save();

    // Update user profile - increment products listed
    await UserProfile.findOneAndUpdate(
      { userId: sellerId },
      { $inc: { productsListed: 1 }, updatedAt: new Date() },
      { new: true }
    );

    res.status(201).json({ 
      message: 'Product created successfully', 
      productId: product._id,
      product 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Pre-submit image check used by the listing form's live "Checking image..."
// UX. Runs the exact same moderation pipeline as createProduct, but never
// touches the database — nothing here is persisted, so a rejected image
// leaves no trace. createProduct still re-runs this check on the actual
// submitted file; this endpoint is a UX convenience only, never the
// authority.
exports.moderateImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image was uploaded.' });
    }

    const moderation = await moderateListingImage(req.file);
    res.status(200).json(moderation);
  } catch (error) {
    console.error('Moderate image error:', error);
    res.status(500).json({ message: "We couldn't verify your image right now. Please try again in a moment." });
  }
};

// Get all products (public - visible to everyone)
exports.getAllProducts = async (req, res) => {
  try {
    const { category, searchTerm, minPrice, maxPrice, condition } = req.query;

    // Build filter — RESERVED (an active Deal Now in progress) and SOLD
    // (COMPLETED) products stay out of the public listing. $nin also matches
    // legacy documents that predate this field (status simply absent).
    let filter = { isActive: true, status: { $nin: ['RESERVED', 'SOLD'] } };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (condition && condition !== 'All') {
      filter.condition = condition;
    }

    // Logged-in requester never sees their own listings/store in the
    // Dealing feed — enforced here, not just hidden client-side.
    if (req.user?.userId) {
      filter.sellerId = { $ne: req.user.userId };
    }

    // Seller's phone is never exposed through this public listing — only
    // name/email. It only becomes visible to the buyer, on their own order,
    // once the seller accepts the deal (see orderController).
    const products = await Product.find(filter)
      .select('-sellerPhone')
      .populate('sellerId', 'username collegeEmail')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get products by seller
exports.getProductsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const products = await Product.find({ sellerId, isActive: true })
      .select('-sellerPhone')
      .populate('sellerId', 'username collegeEmail')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Get products by seller error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select('-sellerPhone')
      .populate('sellerId', 'username collegeEmail department');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { title, description, price, category, condition, stockAvailable } = req.body;

    const warrantyInput = parseWarrantyInput(req.body);
    if (warrantyInput.error) {
      return res.status(400).json({ message: warrantyInput.error });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only the listing's own seller may modify it — enforced here, not just
    // hidden client-side (isAuthenticated on the route guarantees req.user).
    if (product.sellerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the seller can update this listing.' });
    }

    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    if (category) product.category = category;
    if (condition) product.condition = condition;
    if (stockAvailable !== undefined) product.stockAvailable = stockAvailable;

    if (warrantyInput.provided) {
      product.warrantyAvailable = warrantyInput.warrantyAvailable;
      product.warrantyDuration = warrantyInput.warrantyDuration;
    }

    product.updatedAt = new Date();
    await product.save();

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user ? req.user.userId : req.headers['userid']; // Support middleware or header

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only allow seller to delete their own product
    if (userId && product.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the seller can delete this product.' });
    }

    // Soft delete: set isActive to false
    product.isActive = false;
    product.updatedAt = new Date();
    await product.save();

    // Update user profile - decrement products listed
    await UserProfile.findOneAndUpdate(
      { userId: product.sellerId },
      { $inc: { productsListed: -1 }, updatedAt: new Date() }
    );

    res.json({ message: 'Product deleted successfully (soft delete)', productId });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Add review to product
exports.addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { buyerId, buyerName, rating, comment } = req.body;

    if (!buyerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid review data' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add review
    product.reviews.push({
      buyerId,
      buyerName,
      rating,
      comment: comment || ''
    });

    // Calculate average rating
    const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = parseFloat((totalRating / product.reviews.length).toFixed(2));
    product.totalReviews = product.reviews.length;

    await product.save();

    res.json({ message: 'Review added successfully', product });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get user's profile and stats
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const userProfile = await UserProfile.findOne({ userId })
      .populate('userId', 'username collegeEmail department phone');

    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    // Get user's active products
    const products = await Product.find({ sellerId: userId, isActive: true });

    res.json({
      ...userProfile.toObject(),
      activeProducts: products.length
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio, verificationStatus } = req.body;

    const userProfile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        bio: bio || undefined,
        verificationStatus: verificationStatus || undefined,
        updatedAt: new Date(),
        lastActive: new Date()
      },
      { new: true }
    );

    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.json({ message: 'Profile updated successfully', userProfile });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
