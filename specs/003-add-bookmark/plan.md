# Implementation Plan: ブックマーク追加機能

**Branch**: `003-add-bookmark` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-add-bookmark/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

CLIからブックマークを管理する機能を実装。認証済みユーザーがURLをブックマークに追加し、一覧表示・削除できる。既存のtRPC API基盤を活用し、Clean Architectureパターンに従って実装。データはPostgreSQLに永続化し、Drizzle ORMで管理。

## Technical Context

<!--
  ACTION REQUIRED: Fill in the feature-specific technical details below.

  IMPORTANT: Yomu project has mandated technical constraints in the constitution
  (.specify/memory/constitution.md). The following stack is REQUIRED:

  - Language: TypeScript
  - Framework: Hono (primary), NestJS (when appropriate)
  - Architecture: Clean Architecture, function-based stateless design
  - ORM: Drizzle ORM
  - Cache: Valkey
  - APIs: gRPC + tRPC
  - Testing: Vitest (unit, integration, E2E, scenario tests)
  - Deployment: Docker + Google Cloud Run
  - IaC: Terraform
  - Code Quality: Biome
  - Documentation: Docusaurus (for proto/tRPC docs)
  - Workflow: Schema-first (schema PR approved before implementation)
-->

**Language/Version**: TypeScript (latest stable)
**Primary Framework**: Hono (lightweight, high-performance)
**Secondary Framework**: NestJS (not needed for this feature)
**Architecture**: Clean Architecture + Function-based stateless design
**ORM**: Drizzle ORM (mandated over Prisma)
**Cache**: Valkey (not needed for this feature - simple CRUD operations)
**APIs**: tRPC (type-safe CLI ↔ API communication)
**Testing**: Vitest (unit, integration, contract tests)
**Deployment**: Docker + Google Cloud Run (cost-optimized)
**IaC**: Terraform
**Code Quality**: Biome (linter + formatter)
**Documentation**: Docusaurus (tRPC API docs) + inline JSDoc
**Observability**: Structured logging via existing logger (apps/api/src/shared/logging)
**Performance Goals**: <200ms API response, 100 concurrent users (initial)
**Constraints**: Stateless functions, <50MB memory per request
**Scale/Scope**: 3 CLI commands (add/list/remove), 3 tRPC endpoints, 1 database table

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

**Core Principles**:
- [x] I. Test-First Development: Unit tests for use-cases, integration tests for database operations, contract tests for tRPC endpoints
- [x] II. Observability: Structured logging for bookmark CRUD operations, error context for validation failures
- [x] III. Versioning & Breaking Changes: New feature (no breaking changes), follows existing API patterns
- [x] IV. Documentation: Inline JSDoc for tRPC procedures, CLI help text for commands
- [x] V. Code Quality & Simplicity: Simple CRUD operations, minimal abstractions, Biome enforced

**Technical Constraints**:
- [x] Using Hono (primary) - existing API infrastructure
- [x] TypeScript as primary language
- [x] Clean Architecture + stateless function design - following apps/api/src/auth pattern
- [x] Drizzle ORM (not Prisma) - for bookmark schema and queries
- [x] Valkey (not needed) - no caching required for simple CRUD
- [x] tRPC for APIs (NO OpenAPI/Swagger) - extending existing tRPC router
- [x] Vitest for testing
- [x] Docker + Cloud Run deployment - existing infrastructure
- [x] Terraform for IaC - no changes needed (uses existing database)
- [x] Biome for code quality

**Schema-First Workflow**:
- [x] Schema changes require PR approval before implementation - database schema + tRPC contracts
- [x] Contract tests validate schema compliance - tRPC endpoint contract tests

**Complexity Justification**: No violations - feature follows existing patterns and principles

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── api/                          # Hono API server with tRPC
│   └── src/
│       ├── bookmarks/            # NEW: Bookmark feature module
│       │   ├── domain/
│       │   │   └── bookmark.ts   # Entity & value objects
│       │   ├── use-cases/
│       │   │   ├── create-bookmark.ts
│       │   │   ├── list-bookmarks.ts
│       │   │   └── delete-bookmark.ts
│       │   ├── infrastructure/
│       │   │   └── bookmark-repository.ts  # Drizzle ORM queries
│       │   └── presentation/
│       │       └── bookmark-router.ts      # tRPC router
│       ├── shared/
│       │   └── db/
│       │       └── schema.ts     # MODIFY: Add bookmarks table schema
│       └── trpc.ts               # MODIFY: Mount bookmarks router
│
└── cli/                          # CLI application
    └── src/
        ├── commands/
        │   └── bookmark.ts       # NEW: bookmark add/list/remove subcommands
        └── api/
            └── client.ts         # MODIFY: Add bookmark tRPC client methods

docker/
└── postgres/
    └── init.sql                  # MODIFY: Add bookmarks table

tests/
└── contract/
    └── bookmarks.test.ts         # NEW: tRPC endpoint contract tests
```

**Structure Decision**:
Turborepo monorepo with 2 apps (API + CLI) following Clean Architecture.
Bookmark feature follows existing auth module pattern with domain/use-cases/infrastructure/presentation layers.
Database schema managed by Drizzle ORM, initialized via Docker postgres init.sql.

## Post-Design Re-evaluation

**Date**: 2026-01-04
**Status**: ✅ All constitution principles satisfied after Phase 0-1 design

### Constitution Compliance Verified

**Core Principles**:
- ✅ **Test-First Development**: Quickstart includes unit tests (use-cases), integration tests (repository), and contract tests (tRPC endpoints)
- ✅ **Observability**: Structured logging added in all use-cases (create, list, delete) with context
- ✅ **Versioning**: New feature with no breaking changes, follows existing API patterns
- ✅ **Documentation**: Contracts documented with JSDoc, CLI commands have help text, quickstart.md provides implementation guide
- ✅ **Code Quality**: Simple CRUD operations, no premature abstractions, Biome enforced

**Technical Constraints**:
- ✅ All mandated technologies used (Drizzle, tRPC, Hono, Vitest, Biome)
- ✅ Clean Architecture layers properly separated
- ✅ Schema-first workflow followed (contracts defined in Phase 1)

**Design Quality**:
- Data model is normalized and indexed appropriately
- Business rules enforced at database and application layers
- Error handling follows existing patterns (BookmarkError → TRPCError mapping)
- No additional dependencies required

### Artifacts Generated

- ✅ `research.md`: Technical decisions documented
- ✅ `data-model.md`: Entity model, schema, validation rules
- ✅ `contracts/`: tRPC API contract specifications
- ✅ `quickstart.md`: Step-by-step implementation guide

**Ready to proceed to Phase 2** (tasks.md generation with `/speckit.tasks`)

## Complexity Tracking

No violations - feature follows existing patterns and YAGNI principles.
