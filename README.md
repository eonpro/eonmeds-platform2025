# EONMeds Backend API

HIPAA-compliant telehealth platform backend for the Hispanic community.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 👥 Role-based access control (RBAC) with 5 user roles
- 📝 Comprehensive audit logging for HIPAA compliance
- 🏷️ Patient hashtag system for status tracking
- 🔒 Security-first design with helmet, CORS, and rate limiting
- 📊 PostgreSQL database with UUID primary keys

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- npm or yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database:**
   ```bash
   # Create database
   createdb eonmeds

   # Run schema
   psql -d eonmeds -f src/config/schema.sql
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user

## User Roles

1. **superadmin** - Full system access
2. **admin** - Administrative access
3. **provider** - Healthcare provider access
4. **sales_rep** - Sales and marketing access
5. **patient** - Patient portal access

## Security Features

- Password hashing with bcrypt (10 rounds)
- Account lockout after 5 failed attempts
- JWT tokens with 7-day expiration
- Refresh tokens with 30-day expiration
- Comprehensive audit logging
- Input validation and sanitization
- CORS protection
- Helmet.js security headers

## Database Schema

Key tables:
- `users` - User accounts with RBAC
- `roles` - User roles and permissions
- `patients` - Patient records with hashtags
- `audit_logs` - HIPAA-compliant audit trail
- `hashtag_configs` - Hashtag visual configuration

## Development

### Project Structure
```
src/
├── config/         # Database and app configuration
├── controllers/    # Route controllers
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript types
└── utils/          # Helper functions
```

### Testing API
```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

## License

Copyright © 2024 EONMeds. All rights reserved. 