FROM node:20-alpine
WORKDIR /app

ARG BUILD_ID
ENV BUILD_ID=${BUILD_ID}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]# rebuild 20250820T174126Z
