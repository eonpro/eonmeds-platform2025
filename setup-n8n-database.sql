-- Create a separate database for N8N
CREATE DATABASE IF NOT EXISTS n8n;

-- Grant all privileges to eonmeds_admin
GRANT ALL PRIVILEGES ON DATABASE n8n TO eonmeds_admin;
