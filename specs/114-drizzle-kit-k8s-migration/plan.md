# Implementation Plan: Drizzle Kit Migrations for K8s Deployments

**Branch**: `114-drizzle-kit-k8s-migration` | **Date**: 2026-01-19 | **Spec**: [GitHub Issue #114](https://github.com/TakashiAihara/yomu/issues/114)
**Input**: GitHub Issue #114 - Migrate to Drizzle Kit migrations for k8s deployments

**Note**: This plan follows the `/speckit.plan` workflow template.

## Summary

Currently, database schema management differs between environments: Docker Compose uses `docker/postgres/init.sql` (runs once on first container creation), while k8s has no migration mechanism and requires manual SQL execution. Drizzle Kit is configured but not being used. This implementation will migrate to Drizzle Kit migrations for all environments, creating a k8s Job for migrations, updating deployment workflows, and establishing a consistent, code-managed schema change process across all environments.

## Clarifications

### Session 2026-01-19

- Q: For the production k8s environment, what should happen if a migration Job fails during deployment? → A: Block deployment, auto-rollback to previous app version, alert on-call engineer
- Q: What observability metrics should be tracked for migration Job execution in production? → A: Migration duration, success/fail count, schema version, alert on >30s
- Q: Should the migration execution script (`migrate.ts`) handle concurrent migration attempts (e.g., if CI/CD accidentally triggers multiple jobs)? → A: Yes, use database advisory locks to ensure only one migration runs at a time
- Q: For the initial migration generation, should we preserve the existing production database data or assume a fresh database setup? → A: Preserve existing data - generate migration that creates tables only if they don't exist
- Q: Should the GitHub Actions workflow require manual approval before running migrations in production, or should it auto-deploy after successful staging tests? → A: Manual approval required for production, auto-deploy for dev/staging

## Technical Context

**Language/Version**: TypeScript (latest stable)
**Primary Framework**: Hono (lightweight, high-performance)
**Secondary Framework**: NestJS (when enterprise patterns needed)
**Architecture**: Clean Architecture + Function-based stateless design
**ORM**: Drizzle ORM (mandated over Prisma)
**Cache**: Valkey (mandated over Redis)
**APIs**: gRPC + tRPC (NO OpenAPI/Swagger)
**Testing**: Vitest (unit, integration, E2E, scenario, LLM-based testing)
**Deployment**: Docker + Kubernetes (k8s) + Google Cloud Run (cost-optimized)
**IaC**: Terraform
**Code Quality**: Biome (linter + formatter)
**Documentation**: Docusaurus (proto/tRPC API docs)
**Observability**: Migration duration metrics, success/fail count, schema version tracking, alert on >30s execution (Kubernetes native logging, GCP Cloud Logging free tier)
**Performance Goals**: Migration execution <30s, zero-downtime deployments
**Constraints**: Stateless migration execution, idempotent migrations, rollback capability
**Scale/Scope**: 3 database tables (users, sessions, bookmarks), single database instance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

**Core Principles**:

- [x] I. Test-First Development: Integration tests for migration execution, contract tests for schema validation
- [x] II. Observability: Migration job logs, success/failure metrics, structured logging
- [x] III. Versioning & Breaking Changes: Migration versioning via Drizzle Kit, rollback strategy documented
- [x] IV. Documentation: Migration workflow documented, deployment procedures updated
- [x] V. Code Quality & Simplicity: Using existing Drizzle Kit tooling, no custom migration framework

**Technical Constraints**:

- [x] Using Hono (primary) - API framework unchanged
- [x] TypeScript as primary language
- [x] Clean Architecture + stateless function design - migrations are stateless
- [x] Drizzle ORM (not Prisma) - already using Drizzle
- [x] Valkey (not Redis) - cache layer unchanged
- [x] gRPC + tRPC for APIs (NO OpenAPI/Swagger) - API layer unchanged
- [x] Vitest for testing
- [x] Docker + Cloud Run deployment - adding k8s Job
- [x] Terraform for IaC - may add Terraform for k8s resources
- [x] Biome for code quality

**Schema-First Workflow**:

- [x] Schema changes require PR approval before implementation - migrations generated from schema
- [x] Contract tests validate schema compliance - will add migration validation tests

**Complexity Justification**: None - using standard Drizzle Kit migration workflow

## Project Structure

### Documentation (this feature)

```text
specs/114-drizzle-kit-k8s-migration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Drizzle Kit best practices, k8s Job patterns
├── data-model.md        # Phase 1 output - Migration schema, job configuration
├── quickstart.md        # Phase 1 output - How to run migrations locally and in k8s
├── contracts/           # Phase 1 output - Migration job contract, schema validation
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Monorepo structure (Turborepo + pnpm workspaces)
apps/
├── api/
│   ├── src/
│   │   └── shared/
│   │       └── db/
│   │           ├── schema.ts          # [EXISTING] Database schema definitions
│   │           └── migrate.ts         # [NEW] Migration execution script
│   └── package.json                   # [MODIFY] Add migration scripts

drizzle/                                # [NEW] Generated migrations directory
└── migrations/
    └── 0000_initial_schema.sql        # [NEW] Initial migration from existing schema

k8s/
├── yomu/
│   ├── deployment.yaml                # [MODIFY] Add initContainer or dependency on migration job
│   ├── migration-job.yaml             # [NEW] K8s Job for running migrations
│   └── configmap.yaml                 # [EXISTING] Environment configuration

docker/
└── postgres/
    └── init.sql                       # [DEPRECATE] Keep for reference, document as deprecated

.github/
└── workflows/
    └── deploy-k8s.yaml                # [MODIFY] Add migration job execution step
```

**Structure Decision**: Using existing Turborepo monorepo structure. Migration code lives in `apps/api/src/shared/db/migrate.ts` for execution. Generated migrations stored in `drizzle/migrations/`. K8s resources added to `k8s/yomu/` directory. CI/CD workflow updated to run migrations before deployment.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this implementation follows all constitution principles and uses standard Drizzle Kit tooling.

---

## Phase 0: Research & Discovery

**Status**: Not started

### Research Tasks

1. **Drizzle Kit Migration Best Practices**
   - How to generate initial migration from existing schema
   - Migration file naming and versioning conventions
   - Rollback strategies and migration history management
   - Best practices for production migrations

2. **Kubernetes Job Patterns for Database Migrations**
   - K8s Job vs InitContainer for migrations
   - Job retry and failure handling strategies
   - Database connection management in k8s Jobs
   - Zero-downtime migration patterns

3. **CI/CD Integration for Migrations**
   - GitHub Actions workflow for migration execution
   - Pre-deployment migration validation
   - Rollback procedures in CI/CD
   - Environment-specific migration strategies (dev, staging, prod)

4. **Docker Compose Migration Strategy**
   - Replacing init.sql with Drizzle migrations
   - Migration execution on container startup
   - Development workflow considerations

### Output

Research findings will be documented in `research.md` with:

- Decision: What approach was chosen
- Rationale: Why it was chosen
- Alternatives considered: What else was evaluated

---

## Phase 1: Design & Contracts

**Status**: Not started
**Prerequisites**: Phase 0 research complete

### Design Artifacts

1. **data-model.md**
   - Migration job configuration schema
   - Migration metadata tracking (if needed)
   - Environment variable requirements
   - Database connection configuration

2. **contracts/**
   - Migration job specification (k8s Job YAML contract)
   - Migration script interface (input/output contract, database advisory locks for concurrency control)
   - Schema validation contract (expected tables, indexes)
   - CI/CD integration contract (workflow steps, manual approval for production, auto-deploy for dev/staging)
   - Migration failure handling (block deployment, auto-rollback to previous app version, alert on-call engineer)

3. **quickstart.md**
   - Local development: How to generate and run migrations
   - K8s deployment: How to execute migration job
   - Rollback procedures
   - Troubleshooting common issues

### Agent Context Update

After Phase 1 design completion, run:

```bash
.specify/scripts/bash/update-agent-context.sh antigravity
```

This will update `.specify/memory/agent-context.md` with:

- Drizzle Kit migration workflow
- K8s Job patterns for migrations
- CI/CD integration approach

---

## Phase 2: Implementation Planning

**Status**: Not started
**Prerequisites**: Phase 1 design complete, user approval received

Implementation tasks will be generated via `/speckit.tasks` command and documented in `tasks.md`.

Expected task categories:

1. Generate initial migration from existing schema (preserve existing data - use IF NOT EXISTS for table creation)
2. Create migration execution script (`migrate.ts`)
3. Create k8s migration Job manifest
4. Update deployment workflow (initContainer or Job dependency)
5. Update CI/CD pipeline
6. Deprecate `docker/postgres/init.sql`
7. Add migration tests (integration, contract)
8. Update documentation

---

## Key Rules

- Use absolute paths for all file references
- ERROR on gate failures or unresolved clarifications
- All schema changes must go through Drizzle Kit migration generation
- Migrations must be idempotent and support rollback
- Zero-downtime deployment requirement
