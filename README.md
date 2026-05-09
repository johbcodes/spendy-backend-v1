# Spendy Backend API

Professional, scalable backend API for the Spendy expense management system with full multi-tenancy support.

## Features

✅ **Multi-Tenancy** - Complete data isolation between companies
✅ **Authentication** - JWT-based auth with refresh tokens
✅ **Authorization** - Role-based access control (Admin, Approver, Staff, Store Manager)
✅ **Wallet Management** - Create, fund, and transfer between wallets
✅ **Transaction Tracking** - Complete audit trail
✅ **Invoice Management** - Full CRUD operations
✅ **Activity Logging** - Track all user actions
✅ **TypeScript** - Full type safety
✅ **Prisma ORM** - Type-safe database queries
✅ **Input Validation** - Zod schema validation
✅ **Error Handling** - Centralized error handling
✅ **Rate Limiting** - DDoS protection
✅ **Security** - Helmet, CORS, bcrypt

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **Logging:** Winston
- **Security:** Helmet, CORS, rate limiting

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE spendy_db;
```

2. Update `.env` with your database URL:
```
DATABASE_URL="postgresql://username:password@localhost:5432/spendy_db?schema=public"
```

3. Run migrations:
```bash
npm run prisma:migrate
```

## API Endpoints

### Authentication

```
POST   /api/v1/auth/register        - Register new company & admin user
POST   /api/v1/auth/login           - Login
POST   /api/v1/auth/refresh-token   - Refresh access token
POST   /api/v1/auth/logout          - Logout
GET    /api/v1/auth/me              - Get current user
```

### Wallets

```
GET    /api/v1/wallets              - Get all wallets (filtered by role)
POST   /api/v1/wallets              - Create wallet (Admin, Store Manager)
GET    /api/v1/wallets/:id          - Get wallet by ID
PATCH  /api/v1/wallets/:id          - Update wallet (Admin, Store Manager)
DELETE /api/v1/wallets/:id          - Delete wallet (Admin, Store Manager)
POST   /api/v1/wallets/:id/fund     - Fund wallet (Admin, Store Manager, Approver)
POST   /api/v1/wallets/transfer     - Transfer between wallets (Admin, Store Manager, Approver)
GET    /api/v1/wallets/:id/transactions - Get wallet transactions
```

## Multi-Tenancy Architecture

### How It Works

1. **Company Isolation**: All data is scoped to `companyId`
2. **Middleware Enforcement**: `enforceTenancy` middleware validates company context
3. **JWT Payload**: Includes `companyId` for every authenticated request
4. **Database Queries**: All queries automatically filter by `companyId`
5. **Row-Level Security**: Prisma queries ensure no cross-company data leaks

### Example Flow

```
User Login → JWT with companyId → All requests include companyId → DB queries filtered by companyId
```

## Security

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: Separate access (15m) and refresh (7d) tokens
- **Rate Limiting**: 100 requests per 15 minutes
- **CORS**: Configured for frontend origin
- **Helmet**: Security headers
- **Input Validation**: Zod schemas on all inputs

## Database Schema

### Core Models

- **Company** - Multi-tenant companies
- **User** - Users with role-based access
- **Wallet** - Financial wallets (Main, Operations, Events, USER)
- **Transaction** - Transaction history
- **Invoice** - Invoice management
- **Product** - Product catalog
- **Supplier** - Supplier information
- **ActivityLog** - Audit trail

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# View database in Prisma Studio
npm run prisma:studio

# Create new migration
npm run prisma:migrate
```

## Environment Variables

See `.env.example` for all required environment variables.

## Error Handling

All errors return consistent JSON:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [...]  // Optional validation errors
}
```

## Logging

Winston logger with different levels:
- `error` - Critical errors
- `warn` - Warnings
- `info` - General information (default)
- `debug` - Debug information

Logs are written to:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs
- Console - Development mode

## Testing

```bash
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Update `.env` with production values
3. Run `npm run build`
4. Run `npm start`
5. Use process manager (PM2 recommended)

## License

ISC
