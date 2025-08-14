#!/bin/bash

# Connect to AWS RDS PostgreSQL
# Your database details from the backend configuration:
# Host: eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com
# Database: eonmeds
# User: eonmeds_admin
# Port: 5432

echo "Connecting to AWS RDS PostgreSQL..."
psql "postgresql://eonmeds_admin@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=require"

# You'll be prompted for the password
# Once connected, you can run the SQL commands
