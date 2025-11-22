# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository (ai_workshop) contains resources for an AI workshop, including:
1. Documentation for environment setup (SSH keys, PAT, Node.js, GitHub CLI, Claude Code)
2. A directory comparison tool (excelMCPserverSPECFew-shot) that generates Excel reports in sdiff format
3. A complete library management system (library_system_with_superclaude) with comprehensive documentation and implementation plans

## Project: Directory Comparison Tool (excelMCPserverSPECFew-shot)

This tool compares two directories and generates an Excel file with side-by-side comparison similar to Linux's sdiff command.

### Architecture

**Two-phase design for on-premise environments:**
- **Server-side (Linux)**: Collects directory information using `ls` and `md5sum`, outputs JSON
- **Client-side (Node.js)**: Reads JSON files, performs comparison, generates Excel with ExcelJS

**Key principle**: Linux command outputs (permissions, owner, group, timestamps) must never be transformed or converted - use raw string values only.

### Essential Commands

```bash
# Initial setup (run once)
cd excelMCPserverSPECFew-shot
bash setup.sh

# Server-side: Collect directory information (on Linux)
cd server
./collect.sh /path/to/folder1 folder1.json
./collect.sh /path/to/folder2 folder2.json

# Client-side: Compare and generate Excel (on Windows/Mac)
cd client
node compare.js folder1.json folder2.json output.xlsx
```

### Code Architecture

**server/collect.sh**:
- Uses `ls -lAR --time-style=full-iso` to recursively collect file metadata
- Extracts: permissions, owner, group, size, datetime, symlink targets
- Calculates MD5 checksums for regular files
- Outputs structured JSON with all node information

**client/compare.js**:
- Loads two JSON files and maps nodes by path
- Performs detailed comparison: type, permissions, owner, group, size, datetime, checksum
- Generates Excel with:
  - Column A-F: Folder 1 info (name, path, permissions, owner, datetime, checksum)
  - Column G-H: Diff status and filter type
  - Column I-N: Folder 2 info (same structure)
  - Color coding: Pink (differences), Blue/Purple (exists in one folder only)
  - Red text highlights specific changed fields
  - Auto-filter enabled on all columns

**client/package.json**:
- Single dependency: `exceljs` for Excel file generation

### Important Implementation Rules

1. **Never transform Linux command outputs**: Use ls/md5sum results as-is (string values only)
2. **Preserve exact datetime formats**: Use `--time-style=full-iso` for consistent ISO 8601 timestamps
3. **Handle all node types**: Regular files, directories, symlinks
4. **Checksum files only**: Directories get null checksum, or "ディレクトリ" label in Excel

### GitHub Integration

```bash
# View issues
gh issue list -R [username]/[repository] --json number,title,state,createdAt

# View specific issue with attachments
gh issue view <number> --repo <owner>/<repo> --json number,title,body,comments
```

### Environment Variables

Required for Claude Code and GitHub integration:

```
ANTHROPIC_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0
ANTHROPIC_SMALL_FAST_MODEL=us.anthropic.claude-3.5-haiku-20241022-v1:0
AWS_ACCESS_KEY_ID=[personal AWS access key]
AWS_REGION=us-east-1
AWS_SECRET_ACCESS_KEY=[personal AWS secret key]
CLAUDE_CODE_USE_BEDROCK=1
GH_TOKEN=[personal GitHub access token]
```

### Troubleshooting

* **Environment Variables**: After setting, open new command prompt or restart PC to apply changes
* **GitHub Authentication**: Check PAT expiration date and permissions (must be < 1 year)
* **SSH Key Errors**: Verify key registration status
* **Bash script errors on Windows**: Use Git Bash or similar Unix-compatible environment

## Project: Library Management System (library_system_with_superclaude)

A comprehensive library book loan management system for internal company use. Built with Vue.js frontend, Node.js/Express backend, and SQLite database.

### Architecture

**3-Layer Architecture:**
- **Frontend**: Vue.js 3 (Composition API) + Pinia state management
- **Backend**: Node.js + Express.js with layered design (Controllers → Services → Repositories)
- **Database**: SQLite 3 with optimized schema for loan management

**Key Design Patterns:**
- Repository pattern for data access
- Service layer for business logic
- Middleware for authentication, validation, and security
- Cookie-based session authentication

### Essential Commands

```bash
# Backend setup and development
cd library_system_with_superclaude/server
npm install
cp .env.example .env
# Edit .env file - change SESSION_SECRET
npm run init-db        # Initialize SQLite database with schema + seed data
npm run dev            # Start development server (port 3000)

# Frontend setup and development
cd library_system_with_superclaude/client
npm install
npm run dev            # Start Vite development server (port 5173)

# Testing
cd server
npm test               # Run all tests (Jest)
npm run test:unit      # Unit tests only
npm run test:api       # API integration tests only

cd client
npm test               # Component tests (Vitest)

# Production deployment
npm run build          # Build for production
npm start              # Start production server
```

### Core Business Logic

**Loan Management Rules:**
- Maximum 3 books per user simultaneously
- 2-week (14 days) loan period
- Automatic inventory tracking (available_stock decremented/incremented)
- Status tracking: 'active', 'returned', 'overdue'

**User Roles:**
- **Regular users**: Book search, loan, return, view own loans
- **Administrators**: All user functions + user management, book management, system statistics

### Database Schema

**Critical Tables:**
```sql
-- Users: Authentication and role management
users (id, username, password_hash, email, role, created_at, updated_at)

-- Books: Inventory with stock tracking
books (id, isbn, title, author, publisher, published_year, category,
       total_stock, available_stock, created_at, updated_at)

-- Loans: Relationship tracking with business rules
loans (id, user_id, book_id, loan_date, due_date, return_date, status, created_at)
```

### API Endpoints

```bash
# Authentication
POST /api/auth/register    # User registration
POST /api/auth/login       # Login with session
POST /api/auth/logout      # Logout and destroy session

# Book management
GET    /api/books          # List books (with search/filter)
GET    /api/books/:id      # Book details
POST   /api/books          # Create book (admin only)
PUT    /api/books/:id      # Update book (admin only)
DELETE /api/books/:id      # Delete book (admin only)

# Loan management
POST /api/loans            # Borrow a book
GET  /api/loans/my-loans   # User's active loans
PUT  /api/loans/:id/return # Return a book
GET  /api/loans/overdue    # Overdue loans (admin only)

# User management
GET    /api/users          # List users (admin only)
GET    /api/users/:id      # User details
PUT    /api/users/:id      # Update user
DELETE /api/users/:id      # Delete user (admin only)
```

### Security Implementation

**Authentication:**
- bcrypt password hashing (10 rounds)
- HTTPOnly session cookies with SameSite protection
- Session timeout (30 minutes default)
- Rate limiting (5 login attempts per minute per IP)

**Input Validation:**
- express-validator for all API inputs
- SQL injection prevention via prepared statements
- XSS protection through Vue's automatic escaping + HTTPOnly cookies
- CSRF protection via SameSite cookies

### Testing Strategy

**Test Types:**
```bash
# Unit Tests (50-60% coverage target)
tests/unit/services/loanService.test.js     # Business logic tests
tests/unit/services/userService.test.js     # User management tests
tests/unit/services/bookService.test.js     # Book management tests

# Integration Tests (30-40% coverage target)
tests/integration/api/loans.test.js         # Loan API endpoints
tests/integration/api/auth.test.js          # Authentication flows
tests/integration/api/books.test.js         # Book management APIs

# E2E Tests (10-20% coverage target)
tests/e2e/user-loan-journey.spec.ts         # Complete user workflows
tests/e2e/admin-management.spec.ts          # Admin functionality
tests/e2e/responsive-design.spec.ts         # Multi-device testing
```

**Test Data:**
- Automated test database setup/teardown
- Consistent seed data for reliable tests
- Mock external dependencies in unit tests

### Development Workflow

**Branch Strategy:**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes

**Performance Targets:**
- API response time: 95th percentile < 500ms
- Page transitions: < 1 second
- Support: Up to 50 concurrent users

### Common Issues and Solutions

**Session Problems:**
- Symptom: Users logged out immediately after login
- Cause: Missing or invalid SESSION_SECRET in .env
- Solution: Set strong random SESSION_SECRET in .env file

**Database Lock Errors:**
- Symptom: "database is locked" during concurrent operations
- Cause: Multiple simultaneous write transactions
- Solution: Enable WAL mode in SQLite configuration

**CORS Issues:**
- Symptom: Frontend cannot access backend APIs
- Cause: Incorrect CORS origin configuration
- Solution: Verify CORS settings in server/src/app.js match frontend URL