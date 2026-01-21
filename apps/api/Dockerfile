# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/biome-config/package.json ./packages/biome-config/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source files
COPY drizzle.config.ts ./
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Build
RUN pnpm --filter @yomu/api build

# Generate migrations
WORKDIR /app
RUN npx drizzle-kit generate --config ./drizzle.config.ts

# Production stage
FROM node:22-alpine AS runner

# Install pnpm for running
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# Copy package files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/biome-config/package.json ./packages/biome-config/

# Install dependencies (including tsx for migrations)
RUN pnpm install --no-frozen-lockfile

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy migration files from builder
COPY --from=builder /app/drizzle ./apps/api/drizzle/

# Set working directory to api
WORKDIR /app/apps/api

# Environment variables (to be overridden)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
