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
# rebuild 20250819T231243Z
# rebuild-clean 20250819T231322Z
# force-rebuild-final 20250819T232107Z
# rebuild 20250820T011007Z
# rebuild 20250820T011530Z
# force-rebuild-1755653563
