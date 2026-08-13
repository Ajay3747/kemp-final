# CampusKART - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Frontend Details](#frontend-details)
6. [Backend Details](#backend-details)
7. [Workflow](#workflow)
8. [Features](#features)
9. [Setup Instructions](#setup-instructions)

---

## 🎯 Project Overview

**CampusKART** is a campus marketplace platform for students to buy and sell items within their college community. It includes user authentication, product listings, community posts, notifications, and administrative dashboards.

### Key Functionalities:
- **User Management**: Student registration with college email verification and ID card upload
- **Marketplace**: Buy and sell products with reviews and ratings
- **Community**: Social posts and interactions
- **Multi-Role System**: User, Staff, and Admin roles
- **Blood Group Tracking**: Emergency contact information
- **Notification System**: Real-time updates for users
- **Sale Records**: Transaction history tracking

---

## 🛠 Technology Stack

### Frontend Technologies:
- **React 18.3.1** - UI library
- **JavaScript (ES6+)** - Programming language
- **Vite 5.3.1** - Build tool and dev server
- **React Router DOM 6.30.1** - Client-side routing
- **Tailwind CSS 3.4.4** - Utility-first CSS framework
- **Lucide React** - Icon library
- **GSAP** - Animation library
- **Leaflet & React Leaflet** - Interactive maps

### Backend Technologies:
- **Node.js** - Runtime environment
- **Express.js 4.18.2** - Web framework
- **JavaScript** - Programming language
- **MongoDB** - NoSQL database
- **Mongoose 7.0.0** - ODM for MongoDB

### Security & Authentication:
- **bcryptjs 2.4.3** - Password hashing
- **jsonwebtoken 9.0.0** - JWT tokens for authentication
- **CORS** - Cross-Origin Resource Sharing

### File Handling:
- **Multer 1.4.5** - Multipart/form-data handling for file uploads

### Development Tools:
- **Nodemon** - Auto-restart server on changes
- **ESLint** - Code linting
- **PostCSS & Autoprefixer** - CSS processing

---

## 🏗 Architecture

### System Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          React Frontend (Port 5173/5174)             │  │
│  │  • Pages (Login, Home, Buying, Selling, etc.)        │  │
│  │  • Components (Navbar, Footer, Cards, etc.)          │  │
│  │  • Routing (React Router)                            │  │
│  │  • State Management (React Hooks)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTP/HTTPS Requests
                    (REST API Calls)
                            │
┌─────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Express Backend (Port 5000)                 │  │
│  │  • Routes (Auth, Products, Community, etc.)          │  │
│  │  • Controllers (Business Logic)                      │  │
│  │  • Middleware (Auth, Error Handling)                 │  │
│  │  • Models (Schema Definitions)                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    Mongoose ODM
                            │
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          MongoDB (Port 27017)                        │  │
│  │  Collections:                                         │  │
│  │  • users                                              │  │
│  │  • products                                           │  │
│  │  • communityposts                                     │  │
│  │  • notifications                                      │  │
│  │  • salerecords                                        │  │
│  │  • staffdashboards                                    │  │
│  │  • userprofiles                                       │  │
│  │  • reports                                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema

### 1. **User Model** (`users` collection)
```javascript
{
  username: String (unique, required),
  password: String (hashed, required),
  collegeEmail: String (unique, required, @kongu.edu),
  department: String (required),
  rollNo: String (unique, required),
  phone: String (required),
  bloodGroup: String (required) // O+, O-, A+, A-, B+, B-, AB+, AB-
  idCard: String (filename),
  idCardData: Buffer (image binary data),
  idCardMimeType: String,
  role: String (user/staff/admin, default: user),
  isAdmin: Boolean (default: false),
  isApproved: Boolean (default: false),
  createdAt: Date
}
```

### 2. **Product Model** (`products` collection)
```javascript
{
  title: String (required),
  description: String (required),
  price: Number (required),
  category: String (required),
  condition: String (new/like-new/used/fair),
  sellerId: ObjectId (ref: User),
  sellerName: String,
  sellerEmail: String,
  sellerPhone: String,
  imageUrl: String,
  imageData: Buffer,
  imageMimeType: String,
  stockAvailable: Number (default: 1),
  reviews: [
    {
      buyerId: ObjectId,
      buyerName: String,
      rating: Number,
      comment: String,
      createdAt: Date
    }
  ],
  averageRating: Number,
  totalReviews: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 3. **CommunityPost Model** (`communityposts` collection)
```javascript
{
  userId: ObjectId (ref: User),
  username: String,
  content: String,
  imageUrl: String,
  likes: [ObjectId],
  comments: [
    {
      userId: ObjectId,
      username: String,
      text: String,
      createdAt: Date
    }
  ],
  createdAt: Date
}
```

### 4. **Notification Model** (`notifications` collection)
```javascript
{
  userId: ObjectId (ref: User),
  type: String,
  message: String,
  link: String,
  isRead: Boolean,
  createdAt: Date
}
```

### 5. **SaleRecord Model** (`salerecords` collection)
```javascript
{
  productId: ObjectId (ref: Product),
  sellerId: ObjectId (ref: User),
  buyerId: ObjectId (ref: User),
  price: Number,
  quantity: Number,
  totalAmount: Number,
  saleDate: Date,
  status: String
}
```

### 6. **StaffDashboard Model** (`staffdashboards` collection)
```javascript
{
  staffId: ObjectId (ref: User),
  username: String,
  department: String,
  usersApprovedCount: Number,
  usersPendingCount: Number,
  totalUsersManaged: Number,
  itemsModeratedCount: Number,
  flaggedItemsCount: Number,
  reportsCount: Number,
  performanceRating: Number
}
```

### 7. **UserProfile Model** (`userprofiles` collection)
```javascript
{
  userId: ObjectId (ref: User),
  username: String,
  collegeEmail: String,
  department: String,
  phone: String,
  verificationStatus: String
}
```

---

## 🎨 Frontend Details

### Project Structure:
```
frontend/
├── src/
│   ├── assets/              # Static assets
│   ├── components/          # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ItemCard.jsx
│   │   ├── Post.jsx
│   │   ├── ChromaKeyVideo.jsx
│   │   ├── CampusMap.jsx
│   │   └── DragonFollower/
│   ├── pages/               # Page components
│   │   ├── LoginPage.jsx
│   │   ├── Home.jsx
│   │   ├── Buying.jsx
│   │   ├── Selling.jsx
│   │   ├── Community.jsx
│   │   ├── Profile.jsx
│   │   ├── Notifications.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminUsersManagement.jsx
│   │   ├── StaffDashboard.jsx
│   │   └── StaffUserApproval.jsx
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/
│   ├── images/
│   └── videos/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── eslint.config.js
```

### Key Frontend Features:

#### 1. **Routing System**:
- `/` - Login/Signup page
- `/home` - Main dashboard
- `/buying` - Browse products
- `/selling` - List products for sale
- `/community` - Social feed
- `/profile` - User profile
- `/notifications` - User notifications
- `/admin-login` - Admin authentication
- `/admin-dashboard` - Admin panel
- `/admin-users-management` - User management
- `/staff-login` - Staff authentication
- `/staff-dashboard` - Staff panel
- `/staff-approval` - User approval queue

#### 2. **Authentication Flow**:
```
User Input → Validation → API Call → JWT Token → LocalStorage → Protected Routes
```

#### 3. **State Management**:
- **useState** for component-level state
- **LocalStorage** for persistent data (tokens, user info)
- **useEffect** for side effects and data fetching

#### 4. **Styling Approach**:
- **Tailwind CSS** for utility classes
- **Custom CSS** for animations
- **Responsive Design** with mobile-first approach
- **Dark theme** with gradient backgrounds

---

## ⚙️ Backend Details

### Project Structure:
```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── communityController.js
│   │   └── notificationController.js
│   ├── middleware/
│   │   └── authMiddleware.js # JWT verification
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── CommunityPost.js
│   │   ├── Notification.js
│   │   ├── SaleRecord.js
│   │   ├── StaffDashboard.js
│   │   ├── UserProfile.js
│   │   └── Report.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── communityRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── saleRecordRoutes.js
│   └── server.js             # Entry point
├── migrate-blood-group.js    # Database migration script
├── update-blood-group.js     # Blood group update utility
├── package.json
└── .env                      # Environment variables
```

### API Endpoints:

#### **Authentication (`/api/auth`)**:
- `POST /login` - User login
- `POST /signup` - User registration (with file upload)
- `GET /user/:id` - Get user details
- `GET /idcard/:id` - Get user ID card image
- `GET /admin/users` - Get all users (Admin)
- `DELETE /admin/user/:id` - Delete user (Admin)

#### **Products (`/api/products`)**:
- `GET /` - Get all products
- `POST /` - Create product (with file upload)
- `GET /:id` - Get product details
- `PUT /:id` - Update product
- `DELETE /:id` - Delete product
- `POST /:id/review` - Add product review

#### **Community (`/api/community`)**:
- `GET /posts` - Get all posts
- `POST /posts` - Create post
- `POST /posts/:id/like` - Like post
- `POST /posts/:id/comment` - Comment on post
- `DELETE /posts/:id` - Delete post

#### **Notifications (`/api/notifications`)**:
- `GET /user/:userId` - Get user notifications
- `POST /` - Create notification
- `PUT /:id/read` - Mark as read

#### **Sales (`/api/sales`)**:
- `GET /` - Get all sales
- `POST /` - Record sale
- `GET /user/:userId` - Get user sales

### Security Features:

1. **Password Hashing**:
```javascript
bcrypt.hash(password, 10) // 10 salt rounds
```

2. **JWT Authentication**:
```javascript
jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '24h' })
```

3. **Middleware Protection**:
```javascript
verifyToken → check user authentication → allow/deny access
```

4. **Email Validation**:
- Must end with `@kongu.edu`

5. **CORS Configuration**:
- Allowed origins: localhost:5173, localhost:5174
- Credentials: true

---

## 🔄 Workflow

### 1. **User Registration Flow**:
```
1. User fills signup form (username, password, email, department, roll no, phone, blood group)
2. User uploads ID card image
3. Frontend validates inputs (email format, password match)
4. Form data sent to backend as multipart/form-data
5. Backend validates data
6. Password is hashed with bcrypt
7. ID card stored as Buffer in MongoDB
8. User document created with isApproved: false
9. UserProfile created for regular users
10. Success response sent to frontend
11. User redirected to login
12. Staff approves user
13. User can now login and access platform
```

### 2. **Login Flow**:
```
1. User enters credentials
2. Frontend sends POST to /api/auth/login
3. Backend finds user by username
4. bcrypt.compare verifies password
5. JWT token generated with userId and isAdmin flag
6. Token and user data sent to frontend
7. Token stored in localStorage
8. User data stored in localStorage
9. User redirected to /home
10. Navbar shows based on authentication
```

### 3. **Product Listing Flow**:
```
1. Seller navigates to /selling
2. Fills product form (title, description, price, category, condition)
3. Uploads product image
4. Frontend sends multipart/form-data to /api/products
5. Backend extracts sellerId from JWT token
6. Image stored as Buffer in MongoDB
7. Product document created with seller details
8. Product appears in /buying page for all users
9. Buyers can view, review, and purchase
```

### 4. **Admin User Management Flow**:
```
1. Admin logs in with hardcoded credentials
2. Navigates to /admin-users-management
3. Selects "Users" or "Staff" category
4. Backend fetches all users from database
5. User data including blood group displayed in table
6. Admin can search by username, email, roll no, or blood group
7. Admin can view ID cards
8. Admin can delete users
9. All changes reflected immediately
```

### 5. **Blood Group Feature Flow**:
```
1. User selects blood group from dropdown during signup (O+, O-, A+, A-, B+, B-, AB+, AB-)
2. Blood group sent with signup data
3. Backend validates blood group is provided
4. Blood group stored in User document
5. getAllUsers API returns bloodGroup field
6. Admin dashboard displays blood group in separate column
7. Admin can search users by blood group
8. Blood group displayed with red badge styling for visibility
```

---

## ✨ Features

### User Features:
- ✅ Secure registration with college email verification
- ✅ ID card upload for verification
- ✅ Blood group information for emergencies
- ✅ Browse and search products
- ✅ List products for sale
- ✅ Rate and review products
- ✅ Post in community feed
- ✅ Like and comment on posts
- ✅ Receive notifications
- ✅ View transaction history
- ✅ Update profile

### Staff Features:
- ✅ Approve/reject user registrations
- ✅ View pending users
- ✅ Moderate content
- ✅ Handle reports
- ✅ Dashboard with statistics

### Admin Features:
- ✅ Full user management (view, delete)
- ✅ View all users and staff
- ✅ Search by username, email, roll number, blood group
- ✅ View user ID cards
- ✅ Access to all platform data
- ✅ Dashboard with analytics

---

## 🚀 Setup Instructions

### Prerequisites:
- Node.js (v14+)
- MongoDB (v4.4+)
- npm or yarn

### Backend Setup:

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create `.env` file**:
```env
MONGO_URI=mongodb://localhost:27017/campuskart
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

4. **Start MongoDB**:
```bash
mongod
```

5. **Run migration for blood group** (for existing users):
```bash
node migrate-blood-group.js
```

6. **Start backend server**:
```bash
npm start          # Production
npm run dev        # Development with nodemon
```

Server runs on: `http://localhost:5000`

### Frontend Setup:

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

4. **Build for production**:
```bash
npm run build
```

### Default Admin Credentials:
- **Username**: `admin@kongu`
- **Password**: `kongu_admin_012`

### Testing:
1. Register a new user at `http://localhost:5173`
2. Staff approves user (or set isApproved: true in DB)
3. Login with user credentials
4. Explore features: buy, sell, post, comment
5. Login as admin to manage users

---

## 📊 Data Flow Example

### Complete Purchase Flow:

```
BUYER                    FRONTEND                BACKEND                 DATABASE
  │                         │                       │                       │
  │  Browse Products        │                       │                       │
  ├────────────────────────>│                       │                       │
  │                         │   GET /api/products   │                       │
  │                         ├──────────────────────>│                       │
  │                         │                       │  Find all products    │
  │                         │                       ├──────────────────────>│
  │                         │                       │  Return products[]    │
  │                         │                       │<──────────────────────┤
  │                         │   Products data       │                       │
  │  Display Products       │<──────────────────────┤                       │
  │<────────────────────────┤                       │                       │
  │                         │                       │                       │
  │  Click "Buy"            │                       │                       │
  ├────────────────────────>│                       │                       │
  │                         │  POST /api/sales      │                       │
  │                         ├──────────────────────>│                       │
  │                         │                       │  Create SaleRecord    │
  │                         │                       ├──────────────────────>│
  │                         │                       │  Update Product stock │
  │                         │                       ├──────────────────────>│
  │                         │                       │  Create Notification  │
  │                         │                       ├──────────────────────>│
  │                         │                       │  Success              │
  │                         │                       │<──────────────────────┤
  │                         │  Purchase confirmed   │                       │
  │  Confirmation shown     │<──────────────────────┤                       │
  │<────────────────────────┤                       │                       │
```

---

## 🔐 Security Best Practices Implemented

1. **Password Security**: Bcrypt hashing with 10 salt rounds
2. **Authentication**: JWT tokens with 24-hour expiration
3. **Authorization**: Middleware checks for protected routes
4. **Input Validation**: Email format, required fields
5. **File Upload**: Size limits, type restrictions
6. **CORS**: Configured allowed origins
7. **Environment Variables**: Sensitive data in .env
8. **SQL Injection Prevention**: Mongoose schema validation
9. **XSS Prevention**: React's built-in protection

---

## 📝 Notes

- **MongoDB** stores images as Buffer data for efficiency
- **JWT tokens** stored in localStorage (consider httpOnly cookies for production)
- **File uploads** limited to 50MB
- **Blood group** field added for emergency contact purposes
- **Role-based access** controls who can access what
- **Staff approval** required for new user accounts
- **Admin credentials** are hardcoded (should be in secure vault for production)

---

## 🐛 Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**:
   - Ensure MongoDB is running: `mongod`
   - Check MONGO_URI in .env

2. **CORS Error**:
   - Verify frontend port matches CORS config
   - Check backend is running on port 5000

3. **JWT Error**:
   - Clear localStorage
   - Check JWT_SECRET in .env

4. **File Upload Error**:
   - Check file size < 50MB
   - Verify multer middleware configuration

5. **Blood Group Not Showing**:
   - Run migration script: `node migrate-blood-group.js`
   - Restart backend server
   - Clear browser cache

---

## 📈 Future Enhancements

- WebSocket for real-time notifications
- Payment gateway integration
- Email verification
- Password reset functionality
- Image compression
- Search optimization
- Analytics dashboard
- Mobile app
- Chat system between buyers and sellers
- Advanced filtering and sorting

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Platform**: Windows  
**License**: MIT
