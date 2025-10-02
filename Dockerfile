FROM n8nio/n8n:latest

# Create directory for custom assets
USER root
RUN mkdir -p /home/node/.n8n/custom
USER node

# Copy EON logo
COPY eon-logo.png /home/node/.n8n/custom/logo.png

# Expose the n8n port
EXPOSE 5678

# Set environment variables for Railway
ENV N8N_HOST=0.0.0.0
ENV N8N_PERSONALIZATION_ENABLED=true

# The entrypoint is already set in the base image