# CampusKART Backend

Backend for CampusKART login and authentication system.

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file with:
```
MONGO_URI=mongodb://localhost:27017/campuskart
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

## Running the Server

```bash
npm start       # Production
npm run dev     # Development with nodemon
```

## API Endpoints

### Login
- **POST** `/api/auth/login`
- Body: `{ username, password }`

### Signup
- **POST** `/api/auth/signup`
- Body: FormData with `{ username, password, confirmPassword, department, rollNo, phone, collegeEmail, idCard }`

## Features

- User authentication with JWT tokens
- Password hashing with bcryptjs
- College email verification
- ID card upload support
- MongoDB database integration

## Requirements

- Node.js
- MongoDB
├── package.json                # NPM package configuration
└── README.md                   # Project documentation
```

## Setup Instructions

1. Clone the repository to your local machine.
2. Navigate to the `backend` directory.
3. Run `npm install` to install the required dependencies.
4. Configure the database connection in `src/config/database.js`.
5. Start the server using `npm start`.

## Usage

- The backend provides endpoints for user registration and login.
- Use the defined routes in `src/routes/authRoutes.js` to interact with the authentication system.

## Dependencies

- Express: Web framework for Node.js
- Mongoose: MongoDB object modeling tool
- Bcrypt: Password hashing library
- Other dependencies as listed in `package.json`.

## License

This project is licensed under the MIT License.