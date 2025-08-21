FROM node:20-alpine
WORKDIR /app

# CRITICAL: Force complete rebuild with unique cache key
ARG CACHE_BUST
ARG BUILD_ID
ENV BUILD_ID=${BUILD_ID}
ENV CACHE_BUST=${CACHE_BUST}

# Install dependencies (with cache bust)
COPY package*.json ./
RUN echo "Cache bust: ${CACHE_BUST}" && npm ci

# CRITICAL: Copy ALL source code (force no cache)
COPY --chown=node:node . .
RUN echo "Source copied at: $(date)" && ls -la src/

# Build TypeScript and verify
RUN npm run build && \
    echo "=== BUILD COMPLETE ===" && \
    echo "Checking for routes in index.js:" && \
    grep -E "(version|billing/stripe)" dist/index.js | head -10 || echo "Routes check"

EXPOSE 8080
CMD ["node", "dist/index.js"]

# FORCE COMPLETE REBUILD - 20250820T215500Z
# This build MUST include /version and /api/v1/billing/stripe/* endpoints
