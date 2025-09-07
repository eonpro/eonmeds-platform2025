FROM node:20-alpine
WORKDIR /app

# NUCLEAR OPTION: Force complete rebuild - 2025-08-20T22:45:00Z
# This MUST deploy /version and /api/v1/billing/stripe/* endpoints
ARG CACHE_BUST
ARG BUILD_ID
ENV BUILD_ID=${BUILD_ID}
ENV CACHE_BUST=${CACHE_BUST}
ENV FORCE_DEPLOY_TIME="2025-08-20T22:45:00Z"

# Install dependencies (with cache bust)
COPY package*.json ./
RUN echo "Cache bust: ${CACHE_BUST:-NO_CACHE_BUST}" && \
    echo "Force deploy time: ${FORCE_DEPLOY_TIME}" && \
    npm ci

# CRITICAL: Copy ALL source code (force no cache)
COPY --chown=node:node . .
RUN echo "Source copied at: $(date)" && \
    echo "=== Verifying index.ts contains version endpoint ===" && \
    grep -n "app.get('/version'" src/index.ts || echo "WARNING: /version endpoint NOT FOUND in index.ts!" && \
    echo "=== Checking for Stripe routes ===" && \
    grep -n "billing/stripe" src/index.ts || echo "WARNING: Stripe routes NOT FOUND!" && \
    ls -la src/

# Build TypeScript and verify
RUN npm run build && \
    echo "=== BUILD COMPLETE ===" && \
    echo "Checking for routes in built index.js:" && \
    grep -E "(version|billing/stripe)" dist/index.js | head -10 || echo "Routes check failed" && \
    echo "=== dist/index.js size ===" && \
    ls -la dist/index.js

EXPOSE 8080
CMD ["node", "dist/index.js"]

# FORCE COMPLETE REBUILD - must include all Stripe endpoints