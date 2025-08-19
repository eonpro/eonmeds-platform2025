#!/bin/bash

# AWS RDS Database Connection Details
DB_HOST="eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="eonmeds"
DB_USER="eonmeds_admin"

echo "Running tracking tables migration..."
echo "You'll be prompted for the database password"

# Run the migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f packages/backend/src/migrations/create-tracking-tables.sql

echo "Migration complete!"
