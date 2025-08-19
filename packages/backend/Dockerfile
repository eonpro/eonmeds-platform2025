FROM node:20-alpine
WORKDIR /app

# Bust cache per commit
ARG BUILD_ID
ENV BUILD_ID=${BUILD_ID}

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]
# rebuild 20250819T213202Z
# force-rebuild 20250819T223026Z
# force-rebuild 20250819T223843Z
