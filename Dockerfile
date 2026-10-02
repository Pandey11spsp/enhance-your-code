# =========================================================
# Stage 1 - Build the application
# =========================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Production API URL supplied by GitHub Actions
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

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
ENV PORT=3000

# Copy the generated production application
COPY --from=builder /app/.output ./.output

# TanStack Start / Nitro Node.js server
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]