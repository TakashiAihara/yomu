<!--
Sync Impact Report:
Version: 1.3.0 → 1.4.0
Changes:
  - MINOR bump: Added Project Structure section mandating Turborepo monorepo
  - Specified: Turborepo with pnpm workspaces for monorepo management
  - Specified: apps/ directory for applications, packages/ for shared libraries
  - Updated last amended date: 2026-01-03
Previous version (1.3.0):
  - Added Package Manager section mandating pnpm
Templates reviewed:
  ✅ .specify/templates/plan-template.md - No changes needed
  ✅ .specify/templates/spec-template.md - No changes needed
  ✅ .specify/templates/tasks-template.md - No changes needed
Follow-up: None
-->

# Yomu Constitution

## Core Principles

### I. Test-First Development

Tests are strongly recommended for all features and should be written before or alongside
implementation when feasible. While not strictly mandatory, the project prioritizes test
coverage to ensure reliability and maintainability.

**Requirements**:
- New features SHOULD include corresponding tests
- Critical paths and core functionality MUST have test coverage
- Tests SHOULD be written before implementation when following TDD
- Existing tests MUST pass before merging

**Rationale**: Testing ensures code quality, prevents regressions, and provides living
documentation of expected behavior. Flexibility allows rapid prototyping while maintaining
quality for production code.

### II. Observability

All components MUST provide adequate logging, monitoring, and debugging capabilities.
The system must be debuggable and its behavior observable in production.

**Requirements**:
- MUST implement structured logging for critical operations
- MUST log errors with sufficient context for debugging
- SHOULD provide metrics for performance monitoring
- MUST avoid silent failures

**Rationale**: Observable systems are maintainable systems. Without proper logging and
monitoring, debugging production issues becomes impossible, leading to poor user experience
and increased maintenance burden.

### III. Versioning & Breaking Changes

The project MUST follow semantic versioning (MAJOR.MINOR.PATCH) and clearly communicate
breaking changes to users.

**Requirements**:
- Version numbers MUST follow semantic versioning (SemVer 2.0.0)
- MAJOR version increments for breaking changes
- MINOR version increments for backward-compatible features
- PATCH version increments for backward-compatible fixes
- Breaking changes MUST be documented in changelog with migration guide
- Deprecations MUST be announced at least one MINOR version before removal

**Rationale**: Clear versioning allows users to manage upgrades confidently and understand
the impact of updates. Proper deprecation cycles respect user investments in the platform.

### IV. Documentation

All public APIs, features, and architectural decisions MUST be documented clearly.
Documentation is a first-class deliverable, not an afterthought.

**Requirements**:
- Public APIs MUST have inline documentation
- New features MUST include user-facing documentation
- Architectural decisions MUST be recorded (ADRs or similar)
- README and quickstart guides MUST be kept up-to-date
- Code comments SHOULD explain "why" not "what"

**Rationale**: Documentation serves as the primary interface between the system and its users
(developers, operators, end-users). Poor documentation multiplies support burden and hinders
adoption.

### V. Code Quality & Simplicity

Code MUST be simple, readable, and maintainable. Avoid over-engineering and premature
optimization. Follow the YAGNI principle (You Aren't Gonna Need It).

**Requirements**:
- Code MUST pass linting and formatting checks
- Solutions MUST be as simple as possible for the requirements
- Abstractions MUST be justified by actual need, not hypothetical future use
- Code reviews MUST verify simplicity and readability
- Complex logic MUST be explained via comments or documentation

**Rationale**: Simple code is easier to understand, modify, and debug. Over-engineering
creates maintenance burden without delivering value. Complexity must be earned through
actual requirements, not speculation.

## Technical Constraints

These technical decisions are mandated for the Yomu project to ensure consistency,
cost-effectiveness, and maintainability.

### Architecture & Design Patterns

- **Architecture**: MUST follow Clean Architecture principles
- **Function Design**: MUST use function-based, stateless design patterns
- **Schema-First**: MUST follow schema-first development (see Schema-First Development section)

**Rationale**: Clean Architecture ensures separation of concerns and testability. Stateless
functions enable horizontal scaling and simplify deployment on serverless platforms. Schema-first
development prevents API drift and enables contract testing.

### Backend Framework & Runtime

- **Primary Framework**: Hono (MUST be the primary framework)
- **Secondary Framework**: NestJS (MAY be used when appropriate)
- **Language**: TypeScript

**Rationale**: Hono provides lightweight, high-performance API development with excellent
TypeScript support. NestJS can be used for complex enterprise patterns when justified.

### Data & Caching

- **ORM**: Drizzle ORM (MUST use over Prisma)
- **Cache**: Valkey (MUST use instead of Redis)

**Rationale**: Drizzle provides better type safety and schema migration control. Valkey is
a Redis fork with improved licensing and cost model.

### API & Communication

- **Primary Protocols**: gRPC + tRPC (MUST use for APIs)
- **API Documentation**: Docusaurus (MUST use for proto/tRPC documentation)
- **Forbidden**: OpenAPI/Swagger (MUST NOT be used)

**Rationale**: gRPC provides efficient binary protocol for service-to-service communication.
tRPC enables type-safe APIs with minimal boilerplate. Docusaurus centralizes proto and tRPC
documentation without OpenAPI overhead.

### Testing Strategy

- **Test Framework**: Vitest (MUST be the primary test runner)
- **Test Types Required**:
  - Unit tests (MUST for critical paths)
  - Integration tests (MUST for service contracts)
  - E2E tests (MUST for user journeys)
  - Scenario tests (SHOULD for complex workflows)
- **Advanced Testing**:
  - LLM-based monkey testing (SHOULD implement)
  - LLM-based usability testing (SHOULD implement)

**Rationale**: Vitest provides fast, modern testing with excellent TypeScript support.
Comprehensive test coverage at multiple levels ensures reliability. LLM-based testing
helps discover edge cases and usability issues.

### Test File Organization

- **Co-location**: Unit and integration tests MUST be placed alongside their source files
- **Naming Conventions**:
  - `*.spec.ts`: Unit tests (with mocks)
  - `*.test.ts`: Integration tests (without mocks, container-based)
  - `tests/contract/*.test.ts`: Contract tests (API contract validation)
  - `tests/e2e/*.test.ts`: E2E tests (full system tests)
- **Container-Based Testing**:
  - Integration tests SHOULD use real dependencies via containers (PostgreSQL, Valkey, etc.)
  - Test execution SHOULD run in containers as principle
  - Consider using Testcontainers for container-based testing

**Rationale**: Co-locating tests with source files improves discoverability and
maintainability. Clear naming conventions distinguish between test types and their
execution requirements. Container-based testing ensures tests reflect real-world behavior.

### Infrastructure & Deployment

- **Containerization**: Docker (MUST use)
- **Primary Deployment**: Google Cloud Run (MUST start here for cost optimization)
- **IaC**: Terraform (MUST use for infrastructure as code)
- **Observability**: Free/low-cost tools prioritized; Google Cloud native services when cost-effective

**Rationale**: Cloud Run provides serverless container deployment with pay-per-use pricing,
ideal for cost optimization. Terraform ensures reproducible infrastructure. Focus on free
observability tools minimizes operational costs while maintaining visibility.

### Code Quality Tools

- **Linter & Formatter**: Biome (MUST use instead of ESLint/Prettier)

**Rationale**: Biome provides faster linting and formatting with a single tool,
reducing configuration complexity and build times.

### Package Manager

- **Package Manager**: pnpm (MUST use instead of npm/yarn)

**Rationale**: pnpm provides faster installation times, efficient disk space usage
through content-addressable storage, and strict dependency isolation that prevents
phantom dependencies.

### Project Structure

- **Monorepo**: MUST use Turborepo with pnpm workspaces
- **Apps**: Application code MUST be in `apps/` directory
- **Packages**: Shared libraries MUST be in `packages/` directory
- **Build Tool**: Turborepo (MUST use for build orchestration and caching)

**Rationale**: Monorepo structure enables code sharing, consistent tooling,
and optimized builds through Turborepo's caching and parallel execution. pnpm
workspaces provide strict dependency isolation between packages.

### CLI & Admin Interface

- **CLI**: MUST be developed with tRPC integration
- **Admin Panel**: MUST be developed with tRPC integration
- **Communication**: Both MUST use tRPC for backend communication

**Rationale**: Consistent use of tRPC across CLI and admin panel ensures type safety
and reduces API surface maintenance.

## Schema-First Development

All API changes MUST follow the schema-first workflow to ensure contract stability
and enable parallel development.

### Workflow Requirements

1. **Schema Definition**: Changes MUST start with schema updates (proto files or tRPC definitions)
2. **PR & Review**: Schema changes MUST be submitted as a PR for review
3. **Approval Gate**: Schema PR MUST be approved before implementation begins
4. **Implementation**: Code implementation happens only after schema approval
5. **Contract Tests**: Contract tests MUST validate implementation against approved schema

### Rationale

Schema-first development prevents API drift, enables contract testing, allows parallel
frontend/backend development, and provides clear API documentation before implementation
begins. PR approval ensures architectural review before coding effort is invested.

## Development Workflow

### Code Review Process

- All changes MUST go through code review before merging
- Reviewers MUST verify compliance with constitution principles
- Reviews MUST check for test coverage (when applicable)
- Reviews MUST verify documentation updates

### Quality Gates

- Automated tests MUST pass before merge
- Linting and formatting checks MUST pass
- Breaking changes MUST be explicitly approved and documented
- New features SHOULD include tests

### Feature Development

- Features SHOULD follow the spec workflow (spec → plan → tasks → implement)
- User stories MUST be prioritized and independently testable
- Implementation SHOULD proceed incrementally (MVP first)

## Governance

### Amendment Procedure

This constitution can be amended through the following process:

1. Proposed changes MUST be documented with rationale
2. Changes MUST be reviewed for impact on existing code and templates
3. Version MUST be incremented according to semantic versioning:
   - MAJOR: Backward incompatible principle removals or redefinitions
   - MINOR: New principles or materially expanded guidance
   - PATCH: Clarifications, wording improvements, typo fixes
4. All dependent templates and documentation MUST be updated to reflect changes
5. A sync impact report MUST be generated and prepended to the constitution

### Versioning Policy

- Constitution version follows semantic versioning
- Each amendment updates the Last Amended date
- Ratification date remains constant (original adoption date)

### Compliance Review

- Pull requests SHOULD reference constitution principles when applicable
- Deviations from principles MUST be explicitly justified
- Constitution violations discovered in code reviews MUST be addressed before merge

### Guidance Files

For runtime development guidance and agent-specific instructions, refer to:
- `.specify/templates/` for specification workflow templates
- `.claude/commands/` for AI assistant command definitions
- Project README for general development guidelines

**Version**: 1.4.0 | **Ratified**: 2026-01-02 | **Last Amended**: 2026-01-03
