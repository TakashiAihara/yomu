# Quickstart: CLI Google OAuth

**Feature**: 002-cli-google-oauth
**Date**: 2026-01-04

## Prerequisites

- Node.js 22+
- pnpm 8+
- Running Yomu API server (for token exchange)
- Google account with access to Yomu service

## Installation

```bash
# From repository root
pnpm install

# Build CLI
pnpm --filter @yomu/cli build

# Link globally (optional)
pnpm --filter @yomu/cli link --global
```

## Basic Usage

### Login (Browser Flow - Default)

```bash
# Opens browser for Google login
yomu login

# Expected output:
# Opening browser for Google login...
# ✓ Logged in as user@example.com
```

### Login (Manual Flow)

```bash
# For headless/SSH environments
yomu login --manual

# Expected output:
# Open this URL in your browser:
# https://accounts.google.com/o/oauth2/...
#
# Enter the authorization code: [paste code here]
# ✓ Logged in as user@example.com
```

### Check Status

```bash
yomu status

# Expected output (authenticated):
# ✓ Logged in as user@example.com
# Session expires: 2026-01-11 10:30:00

# Expected output (not authenticated):
# ✗ Not logged in
# Run 'yomu login' to authenticate
```

### Logout

```bash
# Logout current account
yomu logout

# Logout all sessions (on all devices)
yomu logout --all
```

### Switch Accounts

```bash
# List stored accounts
yomu switch

# Switch to specific account
yomu switch user2@example.com
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| YOMU_API_URL | http://localhost:3000 | API server URL |
| YOMU_LOG_LEVEL | info | Log level (error/warn/info/debug) |

### Config File

Location: `~/.config/yomu/config.json`

```json
{
  "apiUrl": "https://api.yomu.example.com",
  "logLevel": "info"
}
```

## Development

### Running Tests

```bash
# Unit tests
pnpm --filter @yomu/cli test

# Watch mode
pnpm --filter @yomu/cli test:watch

# Coverage
pnpm --filter @yomu/cli test:coverage
```

### Development Mode

```bash
# Run CLI in development
pnpm --filter @yomu/cli dev login

# With debug logging
YOMU_LOG_LEVEL=debug pnpm --filter @yomu/cli dev status
```

### Project Structure

```
apps/cli/
├── src/
│   ├── index.ts           # Entry point
│   ├── commands/          # CLI commands
│   ├── auth/              # OAuth flow logic
│   ├── storage/           # Credential storage
│   ├── api/               # tRPC client
│   └── shared/            # Config, logger, errors
└── tests/
    ├── unit/              # Unit tests
    └── integration/       # Integration tests
```

## Troubleshooting

### "Keychain not available"

On headless Linux without Secret Service:
```bash
# CLI automatically falls back to encrypted file storage
# First login will prompt for encryption password
yomu login --manual
```

### "Login timed out"

Browser auth times out after 5 minutes. Solutions:
1. Use `--manual` flag for more time
2. Check browser didn't block the popup
3. Ensure network connectivity

### "Port already in use"

CLI tries ports 8085-8099. If all busy:
1. Close other development servers
2. Use `--manual` flag (no local server needed)

### Debug Mode

```bash
YOMU_LOG_LEVEL=debug yomu login
```

## API Dependency

The CLI requires a running Yomu API server:

```bash
# Start API server first
pnpm --filter @yomu/api dev

# Then use CLI
yomu login
```

## Type Safety

The CLI imports types from the API package for end-to-end type safety:

```typescript
// In CLI code
import type { AppRouter } from '@yomu/api/trpc';
```

This ensures CLI stays in sync with API contract changes.
