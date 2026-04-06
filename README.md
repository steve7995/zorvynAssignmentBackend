# Finance Data Processing & Access Control Backend

A RESTful backend API for a finance dashboard system with role-based access control, built with **Node.js**, **Express**, and **SQLite**.

---

## Tech Stack

| Layer         | Choice                    | Why                                        |
|---------------|---------------------------|--------------------------------------------|
| Runtime       | Node.js                   | Fast, widely used, easy to set up          |
| Framework     | Express.js                | Minimal, flexible, huge ecosystem          |
| Database      | SQLite (via sql.js)       | Zero config, file-based, great for demos   |
| Auth          | JWT (jsonwebtoken)        | Stateless, simple token-based auth         |
| Password Hash | bcryptjs                  | Secure password hashing                    |
| IDs           | UUID v4                   | Globally unique, no auto-increment issues  |

---

## Quick Start

### Prerequisites
- Node.js v16+ installed

### Installation

```bash
# Clone / unzip the project
cd finance-backend

# Install dependencies
npm install

# Start the server
npm start

# Or with auto-reload during development
npm run dev
```

The server starts at **http://localhost:3000**

A default admin user is automatically created:
- **Email:** `admin@example.com`
- **Password:** `admin123`

---

## Project Structure

```
finance-backend/
├── src/
│   ├── app.js                  # Entry point — sets up Express + routes
│   ├── controllers/
│   │   ├── authController.js   # Login & register logic
│   │   ├── userController.js   # User CRUD (admin only)
│   │   ├── recordController.js # Financial records CRUD
│   │   └── dashboardController.js  # Summary/analytics endpoints
│   ├── middleware/
│   │   ├── auth.js             # JWT verification middleware
│   │   └── authorize.js        # Role-based access middleware
│   ├── models/
│   │   ├── database.js         # SQLite init, tables, save/load
│   │   └── seed.js             # Seeds default admin user
│   ├── routes/
│   │   ├── authRoutes.js       # POST /login, POST /register
│   │   ├── userRoutes.js       # GET/PATCH users
│   │   ├── recordRoutes.js     # CRUD for financial records
│   │   └── dashboardRoutes.js  # Summary endpoints
│   └── utils/
│       ├── helpers.js          # DB query helper (sql.js wrapper)
│       └── validators.js       # Input validation functions
├── .env                        # Config (port, JWT secret)
├── package.json
└── README.md
```

---

## Roles & Permissions

| Action                  | Viewer | Analyst | Admin |
|-------------------------|--------|---------|-------|
| Login                   | ✅     | ✅      | ✅    |
| View own profile        | ✅     | ✅      | ✅    |
| View records            | ✅     | ✅      | ✅    |
| View dashboard summary  | ❌     | ✅      | ✅    |
| Create records          | ❌     | ❌      | ✅    |
| Update records          | ❌     | ❌      | ✅    |
| Delete records          | ❌     | ❌      | ✅    |
| Manage users            | ❌     | ❌      | ✅    |
| Register new users      | ❌     | ❌      | ✅    |

---

## API Reference

### Authentication

#### Login
```
POST /api/auth/login
Body: { "email": "admin@example.com", "password": "admin123" }
Returns: { token, user }
```

#### Register (Admin only)
```
POST /api/auth/register
Headers: Authorization: Bearer <token>
Body: { "name": "Jane", "email": "jane@test.com", "password": "pass123", "role": "analyst" }
```

---

### Users

| Method | Endpoint          | Role  | Description          |
|--------|-------------------|-------|----------------------|
| GET    | /api/users/me     | Any   | Get own profile      |
| GET    | /api/users        | Admin | List all users       |
| GET    | /api/users/:id    | Admin | Get user by ID       |
| PATCH  | /api/users/:id    | Admin | Update role/status   |

**PATCH body examples:**
```json
{ "role": "analyst" }
{ "is_active": false }
```

---

### Financial Records

| Method | Endpoint           | Role           | Description             |
|--------|--------------------|----------------|-------------------------|
| GET    | /api/records       | All logged in  | List records (filtered) |
| GET    | /api/records/:id   | All logged in  | Get single record       |
| POST   | /api/records       | Admin          | Create record           |
| PUT    | /api/records/:id   | Admin          | Update record           |
| DELETE | /api/records/:id   | Admin          | Soft-delete record      |

**Create/Update body:**
```json
{
  "type": "income",          // "income" or "expense"
  "amount": 5000,            // positive number
  "category": "Salary",      // any string
  "date": "2025-03-01",      // YYYY-MM-DD format
  "description": "March pay" // optional
}
```

**Filter query params:**
```
GET /api/records?type=expense&category=Rent&start_date=2025-01-01&end_date=2025-12-31&page=1&limit=10
```

---

### Dashboard Analytics

| Method | Endpoint                        | Role           | Description                |
|--------|---------------------------------|----------------|----------------------------|
| GET    | /api/dashboard/summary          | Analyst, Admin | Income, expenses, balance  |
| GET    | /api/dashboard/category-totals  | Analyst, Admin | Totals grouped by category |
| GET    | /api/dashboard/monthly-trends   | Analyst, Admin | Last 12 months trends      |
| GET    | /api/dashboard/recent-activity  | Analyst, Admin | 10 most recent entries     |

**Summary response example:**
```json
{
  "totalIncome": 5000,
  "totalExpenses": 1200,
  "netBalance": 3800
}
```

---

## Validation & Error Handling

The API validates all inputs and returns clear error messages:

| Scenario                  | Status | Response                                    |
|---------------------------|--------|---------------------------------------------|
| Missing required field    | 400    | `{ "error": "Missing required fields: ..." }` |
| Invalid email format      | 400    | `{ "error": "Invalid email format" }`       |
| Negative amount           | 400    | `{ "error": "Amount must be a positive number" }` |
| Invalid date              | 400    | `{ "error": "Date must be in YYYY-MM-DD format" }` |
| Duplicate email           | 409    | `{ "error": "Email already exists" }`       |
| Wrong credentials         | 401    | `{ "error": "Invalid email or password" }`  |
| No token                  | 401    | `{ "error": "Missing or invalid Authorization header" }` |
| Insufficient role         | 403    | `{ "error": "Access denied. Required role(s): admin..." }` |
| Deactivated account       | 403    | `{ "error": "Account is deactivated" }`     |
| Record not found          | 404    | `{ "error": "Record not found" }`           |
| Unknown route             | 404    | `{ "error": "Route not found: ..." }`       |

---

## Design Decisions & Assumptions

1. **SQLite via sql.js** — Chose a pure JavaScript SQLite implementation so there's zero native compilation needed. The DB persists to a file (`database.sqlite`) and is loaded into memory on startup.

2. **Soft Delete** — Records are never physically deleted. A `is_deleted` flag is set to `1`, which keeps audit history intact. All queries filter out deleted records.

3. **Admin-only registration** — New users can only be created by an admin. There's no public signup endpoint. This matches the "internal finance dashboard" scenario.

4. **JWT auth** — Tokens expire in 24 hours. No refresh token mechanism (kept simple). The token contains `userId` and `role`.

5. **Pagination** — Record listing supports `page` and `limit` params with a max of 100 records per page. Response includes total count and total pages.

6. **Category is free-text** — Categories aren't restricted to a fixed list. This gives flexibility but could be normalized in a production system.

7. **Single-user record ownership** — Each record tracks which user created it (`user_id`), but all authenticated users can view all records. In production, you might add per-user filtering.

---

## Testing the API

Use any HTTP client (Postman, curl, Insomnia, Thunder Client in VS Code):

```bash
# 1. Login to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 2. Use the token for authenticated requests
curl http://localhost:3000/api/records \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Create a financial record
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"type":"income","amount":5000,"category":"Salary","date":"2025-03-01"}'
```

---

## Optional Enhancements Included

- ✅ JWT Authentication
- ✅ Pagination (page, limit, total count)
- ✅ Filtering (by type, category, date range)
- ✅ Soft delete
- ✅ Input validation with clear errors
- ✅ Proper HTTP status codes
- ✅ API documentation (this README)
- ✅ Default admin seeding
