# =========================================================
# Stage 1 - Build the application
# =========================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install exact dependencies
RUN npm ci

# Copy application source
COPY . .

# Build TanStack Start / Nitro application
RUN npm run build


# =========================================================
# Stage 2 - Production runtime
# =========================================================

FROM node:22-alpine AS runner

WORKDIR /app

# Production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Copy the generated production application
COPY --from=builder /app/.output ./.output

# TanStack Start / Nitro server
EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]