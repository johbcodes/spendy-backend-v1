# PostgreSQL Manual Setup - Step by Step

Follow these steps **exactly** in your Terminal to set up PostgreSQL for Spendy.

## Step 1: Open Terminal

Open a new Terminal window (don't use the one I'm running in).

## Step 2: Check PostgreSQL is Running

```bash
pg_isready
```

**Expected output:**
```
/tmp:5432 - accepting connections
```

If you see this, PostgreSQL is running. Continue to Step 3.

## Step 3: Connect to PostgreSQL

Try connecting to PostgreSQL. Run this command:

```bash
psql postgres
```

### If it connects successfully (you see `postgres=#`):

Great! Continue to **Step 4**.

### If it asks for a password:

You have a few options:

**Option A: Try with your macOS password**
- Enter your Mac login password
- If it works, continue to Step 4

**Option B: Try common default passwords**
- Try: `postgres`
- Try: (empty password - just press Enter)
- Try: `admin`

**Option C: Create a password file**

If none of the above work, run:

```bash
echo "localhost:5432:*:$USER:" > ~/.pgpass
chmod 600 ~/.pgpass
psql postgres
```

**Option D: Use the postgres superuser**

```bash
psql -U postgres postgres
```

(Try the same passwords as above if asked)

---

## Step 4: Once Connected to PostgreSQL

You should see a prompt like `postgres=#` or `postgres=>`

Now run these commands **one by one**:

### 4.1: Create the database

```sql
CREATE DATABASE spendy_db;
```

**Expected output:**
```
CREATE DATABASE
```

### 4.2: Create a user (optional, for security)

```sql
CREATE USER spendy_user WITH PASSWORD 'spendy123';
```

**Expected output:**
```
CREATE ROLE
```

### 4.3: Grant privileges

```sql
GRANT ALL PRIVILEGES ON DATABASE spendy_db TO spendy_user;
```

**Expected output:**
```
GRANT
```

### 4.4: For PostgreSQL 15+ (additional step)

```sql
\c spendy_db
GRANT ALL ON SCHEMA public TO spendy_user;
```

**Expected output:**
```
You are now connected to database "spendy_db" as user "your_username".
GRANT
```

### 4.5: Exit PostgreSQL

```sql
\q
```

You should be back to your normal Terminal prompt.

---

## Step 5: Test the Connection

Now test that you can connect to the new database:

```bash
psql -U spendy_user -d spendy_db
```

**If it asks for a password:** Enter `spendy123`

**If it connects successfully:**
You should see: `spendy_db=>`

Type `\q` to exit.

---

## Step 6: Tell Me Which Worked

Once you complete the above steps, tell me **which option worked**:

- **Option 1:** Connected with `psql postgres` (no password)
- **Option 2:** Connected with `psql postgres` (with password - tell me the password)
- **Option 3:** Connected with `psql -U postgres postgres`
- **Option 4:** Created spendy_user (tell me you created the user)

I'll then update the `.env` file with the correct connection string!

---

## Troubleshooting

### Error: "psql: command not found"

PostgreSQL might not be in your PATH. Try:

```bash
/opt/homebrew/bin/psql postgres
```

### Error: "connection to server on socket failed"

PostgreSQL isn't running. Start it:

```bash
brew services restart postgresql@17
```

Wait 5 seconds, then try Step 3 again.

### Error: "database already exists"

That's fine! Skip creating the database and continue to Step 4.2.

### Still Having Issues?

Tell me the **exact error message** you're seeing and I'll help!

---

## Quick Reference

**What we need for the `.env` file:**

After you complete the steps, I need to know:

1. ✅ Did you create `spendy_user`? (yes/no)
2. ✅ If no, which user worked? (`aidenpete` or `postgres`)
3. ✅ Does it need a password? (yes/no)
4. ✅ If yes, what's the password?

Then I can set up the correct DATABASE_URL!
