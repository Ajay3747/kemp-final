const CommunityPost = require('../models/CommunityPost');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Product = require('../models/Product');

// Create a post and notify all users (except author)
exports.createPost = async (req, res) => {
  try {
    const { userId, title, content, productId, type, lostFoundStatus, location } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ message: 'userId and title are required' });
    }

    const isLostFound = type === 'lostfound';
    // Found posts are no longer creatable — the board only accepts Lost
    // reports; recovery happens via Contact Owner + Mark Resolved instead.
    if (isLostFound && lostFoundStatus !== 'lost') {
      return res.status(400).json({ message: "Lost & Found posts can only be created with status 'lost'." });
    }

    const user = await User.findById(userId).select('username isAdmin collegeEmail phone rollNo department');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle image upload - convert to base64 data URL like products
    let imageUrl = '';
    if (req.file) {
      imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // A post may optionally point at one of the poster's own product
    // listings, which is what lets "View Product" -> "Chat with Seller" ->
    // "Deal Now" work unambiguously later. Silently drop invalid/foreign
    // product ids rather than failing the whole post.
    let linkedProductId = null;
    if (productId) {
      const product = await Product.findById(productId).select('sellerId');
      if (product && product.sellerId.toString() === userId) {
        linkedProductId = product._id;
      }
    }

    const post = await CommunityPost.create({
      userId,
      username: user.username,
      title,
      content: content || '',
      imageUrl,
      productId: linkedProductId,
      type: isLostFound ? 'lostfound' : 'general',
      lostFoundStatus: isLostFound ? lostFoundStatus : null,
      location: isLostFound ? (location || '') : ''
    });

    // notify all users (except the author)
    try {
      const recipients = await User.find({ _id: { $ne: userId } }).select('_id');
      const notificationTitle = isLostFound
        ? `Lost item: ${title}`
        : `New community post: ${title}`;
      const notifications = recipients.map(r => ({
        recipientId: r._id,
        senderId: userId,
        productId: post._id,
        type: 'community_post',
        title: notificationTitle,
        message: `${user.username} shared ${title}`,
        buyerDetails: {
          name: user.username,
          email: user.collegeEmail,
          phone: user.phone,
          rollNo: user.rollNo,
          department: user.department
        },
        productDetails: {
          title,
          imageUrl
        }
      }));

      if (notifications.length) {
        await Notification.insertMany(notifications);
      }
    } catch (notifyError) {
      console.error('Community notification error:', notifyError);
    }

    res.status(201).json(post);
  } catch (error) {
    console.error('Create community post error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get all posts
exports.getPosts = async (_req, res) => {
  try {
    const posts = await CommunityPost.find()
      .sort({ isPinned: -1, createdAt: -1 })
      .populate('productId', 'title price imageUrl status sellerId');
    res.json(posts);
  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Delete a post (owner only)
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await CommunityPost.findByIdAndDelete(id);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete community post error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Mark a Lost & Found post as resolved (owner only)
exports.resolveLostFound = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to resolve this post' });
    }

    if (post.type !== 'lostfound') {
      return res.status(400).json({ message: 'Only Lost & Found posts can be resolved' });
    }

    post.lostFoundStatus = 'resolved';
    await post.save();

    res.json({ message: 'Post marked as resolved', post });
  } catch (error) {
    console.error('Resolve lost & found post error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Reveal a Lost & Found post owner's contact number (authenticated users
// only — req.user is set by the isAuthenticated middleware on this route).
// Phone numbers are never included in the public getPosts feed; they are
// only handed out through this dedicated, auth-gated lookup.
exports.getContactInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.type !== 'lostfound') {
      return res.status(400).json({ message: 'Contact info is only available for Lost & Found posts' });
    }

    const owner = await User.findById(post.userId).select('username phone phoneNumber');
    if (!owner) {
      return res.status(404).json({ message: 'Post owner not found' });
    }

    res.json({
      username: owner.username,
      phone: owner.phone || owner.phoneNumber || ''
    });
  } catch (error) {
    console.error('Get contact info error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Like/Unlike a post
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(userId).select('username collegeEmail phone rollNo department');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const likeIndex = post.likes.indexOf(userId);
    let liked = false;

    if (likeIndex === -1) {
      // Add like
      post.likes.push(userId);
      liked = true;

      // Notify post owner (if not liking own post)
      if (post.userId.toString() !== userId) {
        await Notification.create({
          recipientId: post.userId,
          senderId: userId,
          productId: post._id,
          type: 'community_like',
          title: `${user.username} liked your post`,
          message: `${user.username} liked your post: "${post.title}"`,
          buyerDetails: {
            name: user.username,
            email: user.collegeEmail,
            phone: user.phone,
            rollNo: user.rollNo,
            department: user.department
          },
          productDetails: {
            title: post.title,
            imageUrl: post.imageUrl
          }
        });
      }
    } else {
      // Remove like
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json({ liked, likesCount: post.likes.length, likes: post.likes });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, text } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ message: 'userId and text are required' });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(userId).select('username collegeEmail phone rollNo department');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const comment = {
      userId,
      username: user.username,
      text,
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    // Notify post owner (if not commenting on own post)
    if (post.userId.toString() !== userId) {
      await Notification.create({
        recipientId: post.userId,
        senderId: userId,
        productId: post._id,
        type: 'community_comment',
        title: `${user.username} commented on your post`,
        message: `${user.username} commented: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        buyerDetails: {
          name: user.username,
          email: user.collegeEmail,
          phone: user.phone,
          rollNo: user.rollNo,
          department: user.department
        },
        productDetails: {
          title: post.title,
          imageUrl: post.imageUrl
        }
      });
    }

    res.json({ comment: post.comments[post.comments.length - 1], commentsCount: post.comments.length });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get comments for a post
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await CommunityPost.findById(id).select('comments');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post.comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
