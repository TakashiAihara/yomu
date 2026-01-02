# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

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
**Observability**: [Feature-specific: specify free/low-cost tools from GCP or open-source]
**Performance Goals**: [Feature-specific, e.g., <200ms API response, 1000 req/s or NEEDS CLARIFICATION]
**Constraints**: [Feature-specific, e.g., <100MB memory, stateless functions or NEEDS CLARIFICATION]
**Scale/Scope**: [Feature-specific, e.g., 10k users, 50 endpoints or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

**Core Principles**:
- [ ] I. Test-First Development: Tests recommended for features (unit, integration, E2E, scenario)
- [ ] II. Observability: Structured logging, error context, metrics planned
- [ ] III. Versioning & Breaking Changes: SemVer strategy defined, breaking changes documented
- [ ] IV. Documentation: API docs (Docusaurus), inline docs, ADRs planned
- [ ] V. Code Quality & Simplicity: Biome configured, YAGNI principles followed

**Technical Constraints**:
- [ ] Using Hono (primary) or NestJS (when justified)
- [ ] TypeScript as primary language
- [ ] Clean Architecture + stateless function design
- [ ] Drizzle ORM (not Prisma)
- [ ] Valkey (not Redis)
- [ ] gRPC + tRPC for APIs (NO OpenAPI/Swagger)
- [ ] Vitest for testing
- [ ] Docker + Cloud Run deployment
- [ ] Terraform for IaC
- [ ] Biome for code quality

**Schema-First Workflow**:
- [ ] Schema changes require PR approval before implementation
- [ ] Contract tests validate schema compliance

**Complexity Justification**: (Fill only if violating simplicity principles)

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
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
