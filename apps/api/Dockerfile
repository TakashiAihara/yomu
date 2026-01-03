# This Dockerfile should be built from the repository root
# docker build -f apps/api/Dockerfile -t yomu-api .

FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

FROM base AS deps

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/biome-config/package.json ./packages/biome-config/

RUN pnpm install --frozen-lockfile --prod --filter @yomu/api...

FROM base AS build

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/biome-config/package.json ./packages/biome-config/

RUN pnpm install --frozen-lockfile --filter @yomu/api...

# Copy source files
COPY packages/tsconfig ./packages/tsconfig
COPY packages/biome-config ./packages/biome-config
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src

RUN pnpm --filter @yomu/api build

FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

WORKDIR /app/apps/api

COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/package.json ./

USER hono

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/index.js"]
