# Yomu

Reading application with Google OAuth authentication.

## Requirements

- Node.js >= 18.0.0
- pnpm 10.15.0+
- Docker & Docker Compose

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure (database only)

```bash
docker compose up -d postgres valkey
```

This starts:

- PostgreSQL (port 5433)
- Valkey/Redis (port 6380)

Or start everything including the API:

```bash
docker compose up -d
```

This starts:

- PostgreSQL (port 5433)
- Valkey/Redis (port 6380)
- API server (port 3000)

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set the following:

#### Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Desktop app or Web application)
3. Add authorized redirect URI: `http://localhost:8085/callback`
4. Copy Client ID and Client Secret to `.env`

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8085/callback
```

#### Session secret

Generate a secure random string (minimum 32 characters):

```bash
openssl rand -base64 32
```

Set the generated value in `.env`:

```
SESSION_SECRET=your-generated-secret
```

#### Database and cache

Default values work with docker-compose:

```
DATABASE_URL=postgresql://yomu:yomu@localhost:5433/yomu
VALKEY_URL=redis://localhost:6380
```

## Development

### Option 1: Docker (recommended)

Start all services with Docker:

```bash
docker compose up -d
```

The API is available at <http://localhost:3000>

### Option 2: Local development

Start database and cache with Docker:

```bash
docker compose up -d postgres valkey
```

Then start API server locally:

```bash
pnpm --filter @yomu/api dev
```

### Run CLI

```bash
pnpm --filter @yomu/cli dev -- <command>
```

CLI commands:

- `login` - Sign in with Google OAuth
- `logout` - Sign out
- `status` - Show current authentication status
- `switch` - Switch between accounts

### Available commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests (watch mode) |
| `pnpm test:run` | Run tests once |
| `pnpm lint` | Run linter |
| `pnpm lint:fix` | Fix lint errors |
| `pnpm typecheck` | Run TypeScript type checking |

## Database Migrations

This project uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for database schema management and migrations.

### Generate Migration

After modifying the database schema in `apps/api/src/shared/db/schema.ts`:

```bash
pnpm --filter @yomu/api db:generate
```

This creates a timestamped SQL migration file in `drizzle/migrations/`.

### Run Migrations

**Local development** (Docker Compose):

```bash
docker-compose up  # Migrations run automatically on API startup
```

**Manual execution**:

```bash
pnpm --filter @yomu/api db:migrate
```

**Kubernetes deployment**:
Migrations run automatically via GitHub Actions before application deployment. Manual approval required for production.

### Migration Workflow

1. Modify `apps/api/src/shared/db/schema.ts`
2. Generate migration: `pnpm --filter @yomu/api db:generate`
3. Review generated SQL in `drizzle/migrations/`
4. Test locally with Docker Compose
5. Commit and push to trigger automated deployment

For detailed migration procedures, rollback strategies, and troubleshooting, see:

- **[Migration Quickstart Guide](specs/114-drizzle-kit-k8s-migration/quickstart.md)**
- Migration script: `apps/api/src/shared/db/migrate.ts`
- K8s Job: `k8s/yomu/migration-job.yaml`

## Project Structure

```
yomu/
├── apps/
│   ├── api/          # Hono + tRPC API server
│   └── cli/          # CLI application
├── packages/
│   ├── biome-config/ # Shared Biome configuration
│   └── tsconfig/     # Shared TypeScript configuration
├── docker/
│   └── postgres/     # PostgreSQL initialization scripts
└── docker-compose.yml
```

## License

MIT
