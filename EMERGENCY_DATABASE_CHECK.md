# 🚨 EMERGENCY: Database Data Check

## IMPORTANT: No Database Changes Were Made
- No migrations were executed
- No database connections were changed
- Only TypeScript code and SQL script files were created (not run)

## Immediate Steps to Verify Database

### 1. Check Railway Environment Variables
1. Go to Railway Dashboard
2. Select your backend service
3. Go to Variables tab
4. Verify `DATABASE_URL` is pointing to your AWS RDS instance:
   ```
   DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/your-database-name
   ```

### 2. Verify AWS RDS Status
1. Log into AWS Console
2. Go to RDS
3. Check your database instance is running
4. Verify the endpoint matches Railway's DATABASE_URL

### 3. Connect Directly to Database
Use a database client (pgAdmin, TablePlus, or psql) to connect directly:

```bash
# Using psql
psql "postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/your-database-name"

# Once connected, check tables
\dt

# Check patient count
SELECT COUNT(*) FROM patients;

# Check recent patients
SELECT patient_id, first_name, last_name, created_at 
FROM patients 
ORDER BY created_at DESC 
LIMIT 10;
```

### 4. Check for Multiple Databases
You might have multiple databases (dev/staging/prod):

```sql
-- List all databases
\l

-- Check which database you're connected to
SELECT current_database();

-- Check schema
\dn
```

### 5. Check Railway Logs for Database Errors
```bash
railway logs --service backend | grep -i "database\|error\|connection"
```

## Possible Causes

### Scenario 1: Wrong Database URL
- Railway might be pointing to a different database (dev vs prod)
- Solution: Update DATABASE_URL in Railway to correct AWS RDS instance

### Scenario 2: Database Connection Failed
- AWS RDS security group might be blocking Railway
- Solution: Check AWS RDS security groups allow Railway IPs

### Scenario 3: Different Schema/Database
- Might be connected to right server but wrong database/schema
- Solution: Verify database name in connection string

### Scenario 4: AWS RDS Issue
- RDS instance might have been restored/recreated
- Check AWS RDS events/logs

## Data Recovery Options

### If Data is in Different Database:
1. Find correct database
2. Update Railway DATABASE_URL
3. Restart service

### If Data was Deleted:
1. Check AWS RDS automated backups
2. Restore from snapshot if available
3. Check if AWS RDS has point-in-time recovery enabled

### Check for Backups:
```bash
# In AWS Console
# RDS → Automated backups → Select your instance
# Look for recent snapshots
```

## What Was NOT Changed

These files were created but NOT executed:
- `/packages/backend/src/scripts/database-migration.sql` - NOT RUN
- `/packages/backend/src/scripts/migrate-stripe-customers.ts` - NOT RUN

No DROP, DELETE, or TRUNCATE commands were written or executed.

## Emergency Contact Points

1. **Check Railway Variables**: Ensure DATABASE_URL is correct
2. **Check AWS RDS Console**: Verify instance is running and accessible
3. **Check Recent Deployments**: See if someone else made changes
4. **Check AWS CloudTrail**: Look for recent RDS modifications

## Quick Verification Script

Run this to check your current database:

```sql
-- Check database info
SELECT 
    current_database() as database,
    current_user as user,
    version() as postgres_version;

-- Check table counts
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Check patients table specifically
SELECT 
    COUNT(*) as total_patients,
    MIN(created_at) as oldest_patient,
    MAX(created_at) as newest_patient
FROM patients;
```

## IMPORTANT NOTE
The code changes made were ONLY:
1. TypeScript files for Stripe integration
2. SQL script files (not executed)
3. Documentation files

NO database queries were run, NO migrations executed, NO data was deleted by the recent commits.