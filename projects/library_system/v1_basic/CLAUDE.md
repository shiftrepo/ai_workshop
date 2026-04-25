# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack library lending management system (図書貸出管理システム) built for managing book loans in an organization. The system tracks book borrowing, returns, and provides both user and admin functionality.

**Key Business Rules:**
- Users can borrow up to 3 books simultaneously
- Loan period is 2 weeks (14 days)
- Admin users can register/delete books and view all loan records
- Regular users can only borrow, return, and view their own loans

## Architecture

### Backend (Node.js + Express + SQLite)

**Three-tier architecture:**
- **Models** (`src/models/`): Data access layer for User, Book, and Loan entities
- **Controllers** (`src/controllers/`): Business logic for auth, books, loans, and status
- **Routes** (`src/routes/`): API endpoint definitions with middleware

**Authentication Flow:**
- Session-based authentication using `express-session` with HTTP-only cookies
- Passwords hashed with bcrypt (salt rounds: 10)
- Two middleware functions: `requireAuth` (any logged-in user) and `requireAdmin` (admin only)
- Session stored in req.session with userId, isAdmin, and name fields

**Database Schema:**
- `users`: user_id (unique), password_hash, name, is_admin
- `books`: book_id (unique), title, author, isbn, status (available/borrowed)
- `loans`: user_id, book_id, borrowed_at, due_date, returned_at, status (active/returned/overdue)

**Important Route Pattern:**
- `/api/book/add` for book registration (note: singular "book")
- `/api/books/*` for book queries (note: plural "books")
- This dual routing is intentional - both are registered in app.js

### Frontend (Vue.js 3 + Vite)

**Component Structure:**
- `views/`: Page-level components (Login, Register, Dashboard, Books, MyLoans, AdminBooks, AdminLoans)
- `components/`: Reusable components (currently only NavBar)
- `services/api.js`: Centralized API client using axios with withCredentials: true
- `router/`: Vue Router configuration with navigation guards

**State Management:**
- User info stored in localStorage (isAuthenticated, user object)
- Session managed server-side via cookies
- Navigation guard checks localStorage before allowing access to protected routes

**API Integration:**
- Base URL proxied through Vite dev server (`/api` → `http://localhost:3000`)
- All API modules exported from services/api.js: authAPI, bookAPI, loanAPI, statusAPI

## Development Commands

### Initial Setup
```bash
# Backend
cd backend
npm install
npm run init-db  # Creates SQLite database and seeds with demo data

# Frontend
cd frontend
npm install
```

### Running the Application
```bash
# Backend (choose one)
cd backend
npm start      # Production mode
npm run dev    # Development mode with auto-restart (nodemon)

# Frontend
cd frontend
npm run dev    # Starts Vite dev server on port 5004 (configured for EC2 external access)
```

### Database Operations
```bash
cd backend

# Reset database (CAUTION: deletes all data)
rm database/library.db
npm run init-db

# Test password hashes (if login fails)
node test-login.js

# Generate new password hashes
node generate-hashes.js
```

### Testing
```bash
cd backend

# Run all API tests
./test-all-apis.sh

# Unit tests (when implemented)
npm test
```

## Critical Configuration

### Environment Variables (backend/.env)
```
PORT=3000
SESSION_SECRET=library-system-secret-key-change-in-production
DB_PATH=./database/library.db
NODE_ENV=development
CORS_ORIGIN=http://ec2-54-197-153-19.compute-1.amazonaws.com:5004
```

### Vite Configuration (frontend/vite.config.js)
External access requires:
- `host: '0.0.0.0'` to bind to all interfaces
- `allowedHosts` array with EC2 hostname to prevent host header attacks
- Proxy configuration for `/api` requests

## Known Issues and Gotchas

### Password Hash Problem
The initial seed.sql had **invalid bcrypt hashes**. If login fails:
1. Run `node generate-hashes.js` to create valid hashes
2. Update `database/seed.sql` with the new hashes
3. Delete and reinitialize database: `rm database/library.db && npm run init-db`
4. **Restart the backend server** - it caches the database connection

### Session Cookie Issues
- CORS_ORIGIN in backend .env must exactly match the frontend URL
- credentials: true must be set in both cors (backend) and axios (frontend)
- Session cookies won't work across different domains/ports without proper CORS setup

### External Access Configuration
For EC2 deployment:
1. Backend CORS_ORIGIN must use the EC2 public hostname
2. Frontend vite.config.js must include the hostname in allowedHosts
3. EC2 security group must allow inbound traffic on the frontend port (5004)

## Demo Accounts

**Admin:**
- UserID: `admin`
- Password: `admin123`

**Regular Users:**
- UserID: `tanaka` / `sato` / `suzuki` / `yamada`
- Password: `user123`

## API Reference

Full API documentation is in API.md. Key endpoints:

**Authentication:** POST /api/login, POST /api/register, POST /api/logout
**Books:** GET /api/books, POST /api/book/add (admin), DELETE /api/books/:bookId (admin)
**Loans:** POST /api/borrow, POST /api/return, GET /api/loans (admin)
**Status:** GET /api/status/my, GET /api/status/user/:userId, GET /api/status/book/:bookId

All responses are JSON with `{ success: boolean, message: string, ...data }` structure.
