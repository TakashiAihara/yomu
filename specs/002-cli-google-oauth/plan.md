# Implementation Plan: CLI Application with Google OAuth Authentication

**Branch**: `002-cli-google-oauth` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-cli-google-oauth/spec.md`

## Summary

Build a CLI application (`yomu`) that authenticates users via Google OAuth using the existing API backend. The CLI will support two authentication methods for MVP (localhost redirect and manual code entry), with Device Authorization Flow planned for future. The CLI uses tRPC for type-safe communication with the backend and follows the `gh auth login` pattern for UX.

## Technical Context

**Language/Version**: TypeScript (latest stable)
**Primary Framework**: N/A (CLI application, not web framework)
**CLI Framework**: Commander.js (lightweight, well-maintained CLI framework)
**Architecture**: Clean Architecture + Function-based stateless design
**ORM**: N/A (CLI doesn't directly access database)
**Cache**: N/A (CLI uses local credential storage)
**APIs**: tRPC client connecting to existing API server
**Testing**: Vitest (unit, integration)
**Deployment**: npm package distribution
**IaC**: N/A (CLI is distributed as npm package)
**Code Quality**: Biome (linter + formatter)
**Documentation**: Inline help, README
**Observability**: Structured logging via pino (configurable log levels)
**Performance Goals**: Login completion <30s (browser), <60s (manual), status check <1s
**Constraints**: Cross-platform (Linux, macOS, Windows), Node.js 22+
**Scale/Scope**: Single-user CLI, multiple stored accounts with single active

### Key Dependencies

| Package | Purpose |
|---------|---------|
| commander | CLI framework and command parsing |
| @trpc/client | Type-safe API client for backend communication |
| keytar | Cross-platform OS keychain access |
| conf | Encrypted file-based config fallback for headless |
| open | Cross-platform browser opening |
| pino | Structured logging |
| ora | Terminal spinners for UX |
| chalk | Terminal colors |

### Integration Points

- **Backend API**: `apps/api` tRPC router at `auth.*` endpoints
  - `auth.initiateSignIn` - Start OAuth flow, get auth URL
  - `auth.handleCallback` - Exchange code for session
  - `auth.signOut` - Terminate session
  - `auth.getProfile` - Get user profile
  - `auth.refreshSession` - Refresh session token

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Core Principles**:
- [x] I. Test-First Development: Tests recommended for features (unit, integration, E2E, scenario)
- [x] II. Observability: Structured logging via pino, info-level for auth events, debug for flow details
- [x] III. Versioning & Breaking Changes: SemVer for CLI package, CHANGELOG maintained
- [x] IV. Documentation: CLI --help, README with usage examples
- [x] V. Code Quality & Simplicity: Biome configured, YAGNI principles followed

**Technical Constraints**:
- [x] Using Hono (primary) or NestJS (when justified) - N/A, CLI uses tRPC client only
- [x] TypeScript as primary language
- [x] Clean Architecture + stateless function design
- [x] Drizzle ORM (not Prisma) - N/A, no direct DB access
- [x] Valkey (not Redis) - N/A, no caching layer
- [x] gRPC + tRPC for APIs (NO OpenAPI/Swagger) - Using tRPC client
- [x] Vitest for testing
- [x] Docker + Cloud Run deployment - N/A, npm package distribution
- [x] Terraform for IaC - N/A
- [x] Biome for code quality

**Schema-First Workflow**:
- [x] Schema changes require PR approval before implementation - tRPC types from API
- [x] Contract tests validate schema compliance - Using AppRouter type from API

**Complexity Justification**: None needed, following standard patterns

## Project Structure

### Documentation (this feature)

```text
specs/002-cli-google-oauth/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/cli/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── commands/
│   │   ├── login.ts                # yomu login [--manual]
│   │   ├── logout.ts               # yomu logout [--all]
│   │   ├── status.ts               # yomu status
│   │   └── switch.ts               # yomu switch [email]
│   ├── auth/
│   │   ├── browser-flow.ts         # Localhost redirect flow
│   │   ├── manual-flow.ts          # Manual code entry flow
│   │   ├── token-manager.ts        # Token refresh logic
│   │   └── callback-server.ts      # Local HTTP server for callback
│   ├── storage/
│   │   ├── credential-store.ts     # Keychain + file fallback abstraction
│   │   ├── keychain.ts             # OS keychain via keytar
│   │   └── file-store.ts           # Encrypted file storage via conf
│   ├── api/
│   │   └── client.ts               # tRPC client setup
│   ├── shared/
│   │   ├── config.ts               # CLI configuration
│   │   ├── logger.ts               # Pino logger setup
│   │   └── errors.ts               # Error types and handling
│   └── lib/
│       ├── browser.ts              # Browser opening utility
│       └── port.ts                 # Port availability check
└── tests/
    ├── unit/
    │   ├── commands/
    │   ├── auth/
    │   └── storage/
    └── integration/
        └── auth-flow.test.ts
```

**Structure Decision**: Monorepo app in `apps/cli/` following existing `apps/api/` pattern. Clean Architecture with commands → auth/storage → api layers.

## Complexity Tracking

> No violations - following standard CLI patterns.
