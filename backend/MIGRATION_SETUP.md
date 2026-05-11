# Database Migration Setup Guide

## Quick Start

### 1. Install Alembic

```bash
cd backend
pip install alembic
```

### 2. Initialize Alembic (if not already done)

```bash
alembic init migrations
```

### 3. Configure Alembic

Edit `backend/migrations/env.py`:

```python
from database import Base
from db_models import *  # Import all models

# In the run_migrations_online() function:
target_metadata = Base.metadata
```

### 4. Create Initial Migration

```bash
alembic revision --autogenerate -m "Initial schema creation"
```

### 5. Review Migration

Check `backend/migrations/versions/` for the generated migration file.

### 6. Apply Migration

```bash
alembic upgrade head
```

## Database Setup

### PostgreSQL Installation

**Windows (using WSL):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE console_sensei;

# Create user
CREATE USER console_user WITH PASSWORD 'secure_password';

# Grant privileges
ALTER ROLE console_user SET client_encoding TO 'utf8';
ALTER ROLE console_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE console_user SET default_transaction_deferrable TO on;
ALTER ROLE console_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE console_sensei TO console_user;

# Exit
\q
```

### Update .env

```bash
DATABASE_URL=postgresql://console_user:secure_password@localhost:5432/console_sensei
```

## Verification

### Test Connection

```python
from database import verify_connection, init_db

# Verify connection
if verify_connection():
    print("✓ Database connection successful")
    
    # Initialize tables
    if init_db():
        print("✓ Database tables created")
    else:
        print("✗ Failed to create tables")
else:
    print("✗ Database connection failed")
```

### Check Tables

```bash
psql -U console_user -d console_sensei -c "\dt"
```

## Common Issues

### Connection Refused

**Problem:** `psycopg2.OperationalError: could not connect to server`

**Solution:**
1. Verify PostgreSQL is running: `sudo service postgresql status`
2. Check DATABASE_URL in .env
3. Verify credentials

### Permission Denied

**Problem:** `psycopg2.OperationalError: FATAL: Ident authentication failed`

**Solution:**
1. Edit `/etc/postgresql/*/main/pg_hba.conf`
2. Change `ident` to `md5` for local connections
3. Restart PostgreSQL: `sudo service postgresql restart`

### Database Already Exists

**Problem:** `ERROR: database "console_sensei" already exists`

**Solution:**
```bash
# Drop existing database
psql -U postgres -c "DROP DATABASE console_sensei;"

# Recreate
psql -U postgres -c "CREATE DATABASE console_sensei;"
```

## Backup & Restore

### Backup Database

```bash
pg_dump -U console_user -d console_sensei > backup.sql
```

### Restore Database

```bash
psql -U console_user -d console_sensei < backup.sql
```

## Production Deployment

### Environment Variables

```bash
# .env.production
DATABASE_URL=postgresql://user:password@prod-db-host:5432/console_sensei
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_RECYCLE=3600
```

### Run Migrations

```bash
# On production server
alembic upgrade head
```

### Monitor Connections

```bash
# Check active connections
psql -U console_user -d console_sensei -c "SELECT count(*) FROM pg_stat_activity;"
```

## Troubleshooting

### Check Migration Status

```bash
alembic current
alembic history
```

### Rollback Migration

```bash
# Rollback one version
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision_id>
```

### View SQL

```bash
# See SQL without executing
alembic upgrade head --sql
```

## Next Steps

1. ✅ Set up PostgreSQL
2. ✅ Create database and user
3. ✅ Configure Alembic
4. ✅ Create initial migration
5. ✅ Apply migration
6. ✅ Verify tables created
7. ✅ Update backend routes to use database
8. ✅ Test API endpoints
