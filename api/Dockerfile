FROM node:20-slim as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --production

# --- Final Production Stage ---
FROM node:20-slim

WORKDIR /app

# Copy production node_modules and code
COPY --from=builder /app/node_modules /app/node_modules
COPY package*.json ./
COPY --from=builder /app/dist /app/dist

# Config Defaults
ENV PORT=8000
ENV CORS_ORIGINS="*"
ENV JWT_ALGORITHM="HS256"
ENV JWT_EXPIRATION_DAYS="90"
ENV DATA_DIR="/app/data"

EXPOSE 8000

CMD ["node", "dist/index.js"]
