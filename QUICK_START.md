# Quick Start Guide

## Prerequisites

Before starting, make sure you have:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ installed and running
- ✅ A PostgreSQL client (psql, pgAdmin, or TablePlus)

## Step 1: Install PostgreSQL (if not installed)

### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE spendy_db;

# Create user (optional, or use your existing user)
CREATE USER spendy_user WITH PASSWORD 'spendy_password';
GRANT ALL PRIVILEGES ON DATABASE spendy_db TO spendy_user;

# Exit psql
\q
```

## Step 3: Configure Environment

The `.env` file is already created. Update the `DATABASE_URL` with your credentials:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/spendy_db?schema=public"
```

### Example configurations:

**Using default postgres user:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spendy_db?schema=public"
```

**Using custom user:**
```env
DATABASE_URL="postgresql://spendy_user:spendy_password@localhost:5432/spendy_db?schema=public"
```

## Step 4: Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate

# When prompted, enter a migration name like: "init"
```

## Step 5: Start Development Server

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Server running on port 3001
📚 Environment: development
🔗 API: http://localhost:3001/api/v1
```

## Step 6: Test the API

### Health Check
```bash
curl http://localhost:3001/health
```

### Register a Company & Admin User
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "email": "admin@test.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "country": "Kenya"
  }'
```

This will return:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### Get Wallets (requires auth token)
```bash
curl http://localhost:3001/api/v1/wallets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check firewall/port 5432

### Migration Failed
```bash
# Reset database and try again
npm run prisma:migrate reset
npm run prisma:migrate
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3002
```

## Next Steps

1. ✅ Test authentication endpoints
2. ✅ Test wallet operations
3. ⏳ Build remaining endpoints (users, transactions, invoices)
4. ⏳ Connect frontend to backend

## Useful Commands

```bash
# View database in Prisma Studio
npm run prisma:studio

# Generate Prisma Client
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Build for production
npm run build

# Run production server
npm start
```

## API Testing Tools

Recommended tools for testing APIs:
- **Thunder Client** (VS Code extension) - Lightweight
- **Postman** - Feature-rich
- **Insomnia** - Clean interface
- **curl** - Command line

## Need Help?

Check these files:
- `README.md` - Complete documentation
- `IMPLEMENTATION_STATUS.md` - What's done and what's pending
- `prisma/schema.prisma` - Database schema
- `.env.example` - Environment variables reference
