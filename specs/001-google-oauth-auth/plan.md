# Implementation Plan: Google OAuth Authentication

**Branch**: `001-google-oauth-auth` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-google-oauth-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Google OAuth 2.0 authentication as the primary authentication mechanism for Yomu. Users will sign in using their Google accounts, with automatic account creation on first login. The system will support multiple concurrent sessions, handle OAuth error scenarios gracefully, and provide comprehensive logging for security monitoring. Technical approach uses Hono framework with tRPC for type-safe APIs, Drizzle ORM for data persistence, and follows schema-first development with Clean Architecture principles.

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
**Secondary Framework**: NestJS (when enterprise patterns needed)
**Architecture**: Clean Architecture + Function-based stateless design
**ORM**: Drizzle ORM (mandated over Prisma)
**Cache**: Valkey (mandated over Redis)
**APIs**: gRPC + tRPC (NO OpenAPI/Swagger)
**Testing**: Vitest (unit, integration, E2E, scenario, LLM-based testing)
**Deployment**: Docker + Google Cloud Run (cost-optimized)
**IaC**: Terraform
**Code Quality**: Biome (linter + formatter)
**Documentation**: Docusaurus (proto/tRPC API docs)
**Observability**: Google Cloud Logging (free tier), structured logging for auth events, session lifecycle, and errors
**Performance Goals**: OAuth callback processing <200ms, complete sign-in flow <30 seconds (including Google redirect)
**Constraints**: Stateless functions only, secure token storage (server-side only), HTTPS required
**Scale/Scope**: Support 10,000+ concurrent users with multiple sessions per user, 5 primary tRPC endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

**Core Principles**:
- [x] I. Test-First Development: Vitest unit tests for OAuth flow, integration tests for Google API, E2E tests for sign-in journey
- [x] II. Observability: Structured logging for auth attempts (success/failure), session creation/termination, error events with anonymized user IDs
- [x] III. Versioning & Breaking Changes: Initial v0.1.0, SemVer for future OAuth scope changes, breaking changes will document migration
- [x] IV. Documentation: tRPC schema docs via Docusaurus, inline JSDoc for auth functions, ADR for OAuth provider choice
- [x] V. Code Quality & Simplicity: Biome configured, OAuth library minimized, direct Google OAuth 2.0 without unnecessary abstraction layers

**Technical Constraints**:
- [x] Using Hono (primary) - Lightweight framework ideal for OAuth callbacks and session middleware
- [x] TypeScript as primary language
- [x] Clean Architecture + stateless function design - Auth functions pure, session state in database only
- [x] Drizzle ORM (not Prisma) - For User and Session entity persistence
- [x] Valkey (not Redis) - Session token storage with TTL
- [x] gRPC + tRPC for APIs (NO OpenAPI/Swagger) - tRPC for auth endpoints (sign-in, sign-out, profile)
- [x] Vitest for testing - Unit, integration, contract, E2E tests
- [x] Docker + Cloud Run deployment - Stateless containers, auto-scaling for auth traffic
- [x] Terraform for IaC - Google Cloud project, OAuth credentials, Cloud Run services
- [x] Biome for code quality - Linting + formatting enforced in pre-commit

**Schema-First Workflow**:
- [x] Schema changes require PR approval before implementation - tRPC router schema PR first
- [x] Contract tests validate schema compliance - Vitest contract tests for tRPC endpoints

**Complexity Justification**: None - OAuth implementation follows standard patterns, no violations

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── auth/                    # Clean Architecture: Auth domain
│   ├── domain/             # Entities and business logic
│   │   ├── user.ts         # User entity
│   │   └── session.ts      # Session entity
│   ├── use-cases/          # Application business rules
│   │   ├── sign-in.ts      # OAuth sign-in flow
│   │   ├── sign-out.ts     # Session termination
│   │   └── get-profile.ts  # Retrieve user profile
│   ├── infrastructure/     # External interfaces
│   │   ├── google-oauth.ts # Google OAuth 2.0 client
│   │   ├── user-repo.ts    # User persistence (Drizzle)
│   │   └── session-store.ts # Session storage (Valkey)
│   └── presentation/       # tRPC routers
│       └── auth-router.ts  # Auth endpoints (tRPC)
├── shared/
│   ├── db/                 # Drizzle ORM setup
│   │   ├── schema.ts       # User, Session tables
│   │   └── client.ts       # Database connection
│   ├── cache/              # Valkey setup
│   │   └── client.ts       # Valkey connection
│   └── logging/            # Structured logging
│       └── logger.ts       # Logger utility
└── app.ts                  # Hono app entry point

tests/
├── contract/               # tRPC contract tests
│   └── auth-router.test.ts
├── integration/            # Google OAuth integration
│   ├── google-oauth.test.ts
│   └── session-flow.test.ts
├── unit/                   # Business logic tests
│   ├── sign-in.test.ts
│   ├── sign-out.test.ts
│   └── get-profile.test.ts
└── e2e/                    # End-to-end user journeys
    └── oauth-flow.test.ts

infra/                      # Terraform IaC
├── main.tf                 # Cloud Run, Valkey, DB
├── oauth.tf                # Google OAuth credentials
└── variables.tf
```

**Structure Decision**: Single project structure with Clean Architecture layering. Auth domain follows dependency rule (domain → use-cases → infrastructure/presentation). Hono framework at application layer, tRPC for API contracts, Drizzle for data access, Valkey for session caching. All source under `src/`, all tests under `tests/` by type, infrastructure as code in `infra/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all complexity justified by requirements:
- Clean Architecture layers necessary for testability and OAuth provider decoupling
- Valkey caching required for session performance at scale (10k+ concurrent users)
- tRPC + Hono combination mandated by constitution, minimal additional complexity

---

## Post-Design Constitution Check

*GATE: Re-evaluation after Phase 1 design complete*

**Status**: ✅ All requirements satisfied

**Re-validation Results**:

1. **Core Principles**:
   - ✅ **Test-First Development**: Comprehensive test strategy defined in `research.md` with 4-layer pyramid (unit, contract, integration, E2E). Test examples provided in `quickstart.md`.
   - ✅ **Observability**: Structured logging strategy documented with specific events, anonymization, and Google Cloud Logging integration. Meets FR-017 requirements.
   - ✅ **Versioning & Breaking Changes**: Initial v0.1.0 defined. SemVer strategy documented for future OAuth scope changes and API contract evolution.
   - ✅ **Documentation**: tRPC contracts fully documented (`contracts/auth-router.trpc.md`), quickstart guide created, inline documentation examples provided, ADR planned for OAuth provider choice.
   - ✅ **Code Quality & Simplicity**: Design follows YAGNI - minimal OAuth implementation without unnecessary abstractions. Biome integration confirmed in quickstart.

2. **Technical Constraints**:
   - ✅ **Hono Framework**: Confirmed as application layer in architecture (`quickstart.md` line 189). Lightweight framework ideal for OAuth callbacks.
   - ✅ **TypeScript**: All code examples in TypeScript. Agent context updated with TypeScript language.
   - ✅ **Clean Architecture**: Domain → Use Cases → Infrastructure → Presentation layers clearly defined in project structure. Dependency rule enforced.
   - ✅ **Drizzle ORM**: Schema defined in `data-model.md` with migration strategy. User and Session entities designed for Drizzle.
   - ✅ **Valkey**: Session caching architecture documented in `data-model.md` and `research.md`. Key-value schema defined with TTL strategy.
   - ✅ **tRPC**: Complete router contract documented with 5 endpoints. Zod validation, type-safe procedures confirmed.
   - ✅ **Vitest**: Testing strategy documented with unit, integration, contract, E2E layers. Test examples in `quickstart.md`.
   - ✅ **Docker + Cloud Run**: Deployment considerations in `quickstart.md`. Stateless container design confirmed.
   - ✅ **Terraform**: IaC structure defined in project layout (`infra/` directory with main.tf, oauth.tf, variables.tf).
   - ✅ **Biome**: Code quality tool confirmed in quickstart deployment checklist.

3. **Schema-First Workflow**:
   - ✅ **Schema PR Approval**: tRPC router schema documented in `contracts/auth-router.trpc.md`. Workflow: schema PR → approval → implementation.
   - ✅ **Contract Tests**: Contract test examples provided in `quickstart.md` and `contracts/auth-router.trpc.md`. Validates tRPC schema compliance.

4. **Design Artifacts Created**:
   - ✅ `research.md`: 10 technical decisions documented with alternatives and rationale
   - ✅ `data-model.md`: User and Session entities with validation rules, state transitions, indexes
   - ✅ `contracts/auth-router.trpc.md`: 5 tRPC endpoints with input/output schemas, error codes, security considerations
   - ✅ `quickstart.md`: Developer guide with setup, implementation checklist, code examples, testing guide
   - ✅ `plan.md`: This file with technical context, constitution check, project structure

5. **No New Violations**:
   - Design maintains simplicity - no over-engineering introduced
   - All patterns follow industry best practices (OAuth 2.0 + PKCE, Clean Architecture, type-safe APIs)
   - Complexity justified by scale requirements (10k concurrent users) and security needs

**Conclusion**: Design phase complete. All Yomu constitution principles and technical constraints satisfied. Ready to proceed to `/speckit.tasks` for implementation task generation.
