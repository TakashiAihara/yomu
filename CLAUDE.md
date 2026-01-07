# yomu Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-04

## Active Technologies

- TypeScript (latest stable)
- PostgreSQL 16
- Valkey (Redis-compatible)

## Project Structure

```text
apps/
  api/     # Hono API server with tRPC
  cli/     # CLI with Google OAuth
docker/
  postgres/init.sql  # Database schema
specs/     # Feature specifications
```

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Copy environment file
cp .env.example .env
# Edit .env with your Google OAuth credentials

# 3. Install dependencies
pnpm install

# 4. Start API server
pnpm --filter @yomu/api dev

# 5. Use CLI
pnpm --filter @yomu/cli exec tsx src/index.ts --help
```

## Commands

```bash
# Run all tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Docker
docker compose up -d    # Start services
docker compose down     # Stop services
docker compose logs -f  # View logs
```

## Code Style

TypeScript (latest stable): Follow standard conventions

## Ports

| Service    | Default Port |
|------------|-------------|
| API        | 3000        |
| PostgreSQL | 5433        |
| Valkey     | 6380        |

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

## Recent Changes
- 003-add-bookmark: Added TypeScript (latest stable)
