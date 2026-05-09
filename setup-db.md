# PostgreSQL Database Setup for Spendy

Your PostgreSQL requires authentication. Here are your options:

## Option 1: Set a Password for Your PostgreSQL User

Run this command in your terminal:

```bash
# This will prompt you to enter a password
# Use a simple password like: spendy123
psql postgres
```

Once connected to PostgreSQL, run:

```sql
-- Set password for your user
ALTER USER aidenpete WITH PASSWORD 'spendy123';

-- Create the database
CREATE DATABASE spendy_db;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spendy_db TO aidenpete;

-- Exit
\q
```

Then update the `.env` file in `spendy-backend`:

```env
DATABASE_URL="postgresql://aidenpete:spendy123@localhost:5432/spendy_db?schema=public"
```

## Option 2: Use Postgres Superuser

If your PostgreSQL installation has a `postgres` superuser without password, try:

```bash
# Create database as postgres user
psql -U postgres -c "CREATE DATABASE spendy_db;"
```

Then update `.env` to:

```env
DATABASE_URL="postgresql://postgres@localhost:5432/spendy_db?schema=public"
```

## Option 3: Simplest - Let Me Know Your Setup

Tell me:
1. Do you know your PostgreSQL password?
2. Did you set one up when installing PostgreSQL?
3. Or would you like to set a new password now?

Once you choose an option and update the `.env` file, we can continue with:

```bash
cd /Users/aidenpete/Desktop/Spendy_V2/spendy-backend

# Generate Prisma client
npm run prisma:generate

# Run migrations (this will create the database if it doesn't exist)
npm run prisma:migrate

# Start the server
npm run dev
```

## Quick Test After Setup

```bash
# Test if you can connect
psql spendy_db

# If successful, you'll see:
# spendy_db=#

# Then type \q to exit
```

Let me know which option works for you!
