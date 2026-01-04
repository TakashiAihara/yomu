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

### 2. Start infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5433)
- Valkey/Redis (port 6380)

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set the following:

#### Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set authorized redirect URI: `http://localhost:3000/auth/callback`
4. Copy Client ID and Client Secret to `.env`

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
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

### Start API server

```bash
pnpm --filter @yomu/api dev
```

### Run CLI

```bash
pnpm --filter @yomu/cli dev -- <command>
```

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
