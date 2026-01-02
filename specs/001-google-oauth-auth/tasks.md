# Tasks: Google OAuth Authentication

**Input**: Design documents from `/specs/001-google-oauth-auth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as this feature requires comprehensive testing per constitution (test-first development recommended).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Project follows Clean Architecture with layers: domain, use-cases, infrastructure, presentation

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize TypeScript project with package.json (Node.js 18+, TypeScript 5+)
- [ ] T002 [P] Install dependencies: hono, @trpc/server, drizzle-orm, postgres, ioredis, zod
- [ ] T003 [P] Install dev dependencies: vitest, drizzle-kit, biome, @types/node
- [ ] T004 Configure Biome in biome.json with linting and formatting rules
- [ ] T005 Create directory structure: src/auth/{domain,use-cases,infrastructure,presentation}, src/shared/{db,cache,logging}, tests/{unit,integration,contract,e2e}, infra/
- [ ] T006 [P] Setup TypeScript configuration in tsconfig.json (strict mode, ES2022)
- [ ] T007 [P] Create .env.example with required variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATABASE_URL, VALKEY_URL, SESSION_SECRET)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Setup PostgreSQL connection in src/shared/db/client.ts with connection pooling
- [ ] T009 [P] Setup Valkey (Redis-compatible) connection in src/shared/cache/client.ts with retry logic
- [ ] T010 [P] Setup structured logger in src/shared/logging/logger.ts (JSON format, log levels, anonymization helper)
- [ ] T011 Define Drizzle schema in src/shared/db/schema.ts (users table: id, google_id, email, display_name, profile_picture, created_at, last_sign_in_at)
- [ ] T012 Define Drizzle schema in src/shared/db/schema.ts (sessions table: id, user_id, token, created_at, expires_at, last_activity_at, user_agent, ip_address_hash)
- [ ] T013 Generate and apply database migrations using drizzle-kit
- [ ] T014 [P] Create environment config loader in src/shared/config/env.ts (validates required env vars)
- [ ] T015 [P] Setup Hono app in src/app.ts with tRPC middleware integration
- [ ] T016 Create tRPC context and router setup in src/trpc.ts (publicProcedure, protectedProcedure)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Sign In with Google (Priority: P1) 🎯 MVP

**Goal**: Implement complete Google OAuth sign-in flow with automatic account creation, supporting new and returning users

**Independent Test**: Click "Sign in with Google" button → complete Google authentication → verify redirect to dashboard with active session and user profile loaded

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US1] Contract test for auth.initiateSignIn endpoint in tests/contract/auth-initiate-signin.test.ts
- [ ] T018 [P] [US1] Contract test for auth.handleCallback endpoint in tests/contract/auth-handle-callback.test.ts
- [ ] T019 [P] [US1] Integration test for Google OAuth token exchange in tests/integration/google-oauth.test.ts
- [ ] T020 [P] [US1] Integration test for user creation flow in tests/integration/user-creation.test.ts
- [ ] T021 [P] [US1] Integration test for session creation in tests/integration/session-flow.test.ts
- [ ] T022 [US1] E2E test for complete sign-in journey in tests/e2e/oauth-signin.test.ts

### Implementation for User Story 1

#### Domain Layer

- [ ] T023 [P] [US1] Create User entity type in src/auth/domain/user.ts with validation functions
- [ ] T024 [P] [US1] Create Session entity type in src/auth/domain/session.ts with token generation and expiration logic

#### Infrastructure Layer

- [ ] T025 [P] [US1] Implement Google OAuth client in src/auth/infrastructure/google-oauth.ts (generateAuthUrl, exchangeCodeForTokens, decodeIdToken functions)
- [ ] T026 [P] [US1] Implement User repository in src/auth/infrastructure/user-repo.ts (findUserByGoogleId, createUser, updateLastSignIn using Drizzle)
- [ ] T027 [P] [US1] Implement Session store in src/auth/infrastructure/session-store.ts (createSession, getSession, deleteSession with Valkey + DB sync)

#### Use Cases Layer

- [ ] T028 [US1] Implement initiateSignIn use case in src/auth/use-cases/initiate-signin.ts (generate OAuth URL, store state in Valkey with 10min TTL, create HMAC)
- [ ] T029 [US1] Implement handleCallback use case in src/auth/use-cases/handle-callback.ts (validate state, exchange code, decode ID token, find/create user, create session, log event)

#### Presentation Layer

- [ ] T030 [US1] Implement auth.initiateSignIn tRPC endpoint in src/auth/presentation/auth-router.ts with Zod input validation
- [ ] T031 [US1] Implement auth.handleCallback tRPC endpoint in src/auth/presentation/auth-router.ts (handle user denial, Google unavailable, CSRF validation)
- [ ] T032 [US1] Add session middleware to Hono app in src/app.ts (extract session token from cookie, validate, attach user to context)

#### Error Handling & Logging

- [ ] T033 [US1] Add error handling for OAuth service unavailable (return user-friendly message per FR-013)
- [ ] T034 [US1] Add error handling for user denies permissions (return message per FR-014)
- [ ] T035 [US1] Add logging for authentication attempts in handleCallback use case (anonymized user IDs per FR-017)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can sign in with Google, accounts are created/matched, sessions are established

---

## Phase 4: User Story 2 - Sign Out (Priority: P2)

**Goal**: Implement sign-out functionality with option to terminate current session or all sessions across devices

**Independent Test**: Authenticated user clicks "Sign Out" → session terminated → attempting to access protected resource redirects to login

### Tests for User Story 2

- [ ] T036 [P] [US2] Contract test for auth.signOut endpoint in tests/contract/auth-signout.test.ts
- [ ] T037 [P] [US2] Integration test for single session termination in tests/integration/session-termination.test.ts
- [ ] T038 [US2] Integration test for multi-session termination in tests/integration/multi-session-termination.test.ts

### Implementation for User Story 2

- [ ] T039 [P] [US2] Implement signOut use case in src/auth/use-cases/sign-out.ts (delete single session or all user sessions, clear from Valkey and DB, log event)
- [ ] T040 [US2] Implement auth.signOut tRPC endpoint in src/auth/presentation/auth-router.ts (protected procedure, support allSessions parameter per FR-016)
- [ ] T041 [US2] Add session cookie clearing on sign-out (set expired date, clear HttpOnly/Secure flags)
- [ ] T042 [US2] Add logging for session termination events (anonymized user ID, session ID hash per FR-017)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently - users can sign in and sign out (single or all sessions)

---

## Phase 5: User Story 3 - View Profile Information (Priority: P3)

**Goal**: Display user profile information retrieved from Google account, including list of active sessions

**Independent Test**: After signing in, user navigates to profile page → sees Google name, email, profile picture, and list of active sessions with current session indicated

### Tests for User Story 3

- [ ] T043 [P] [US3] Contract test for auth.getProfile endpoint in tests/contract/auth-get-profile.test.ts
- [ ] T044 [US3] Integration test for profile retrieval with session list in tests/integration/profile-retrieval.test.ts

### Implementation for User Story 3

- [ ] T045 [P] [US3] Implement getProfile use case in src/auth/use-cases/get-profile.ts (fetch user, fetch all active sessions for user, mark current session)
- [ ] T046 [US3] Implement auth.getProfile tRPC endpoint in src/auth/presentation/auth-router.ts (protected procedure, returns user + sessions array per contract)

**Checkpoint**: All three user stories now independently functional - complete authentication system with profile view

---

## Phase 6: Advanced Features (Token Refresh & Error Recovery)

**Goal**: Implement silent re-authentication for expired tokens and handle edge cases

**Purpose**: Addresses FR-015 for session refresh and improves user experience during token expiration

- [ ] T047 [P] Implement refreshSession use case in src/auth/use-cases/refresh-session.ts (attempt silent re-auth with prompt=none, update session expiration on success)
- [ ] T048 Implement auth.refreshSession tRPC endpoint in src/auth/presentation/auth-router.ts (protected procedure, returns success/error per contract)
- [ ] T049 [P] Add session extension logic to session middleware (if expires_at - now < 1 hour, extend by 24 hours on activity)
- [ ] T050 Add error handling for revoked/expired tokens (attempt silent re-auth per FR-015, fall back to login redirect)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T051 [P] Add database indexes: users.google_id (unique), users.email, sessions.token (unique), sessions.user_id, sessions.expires_at
- [ ] T052 [P] Create database cleanup cron job in src/shared/db/cleanup.ts (delete expired sessions hourly)
- [ ] T053 [P] Add JSDoc inline documentation to all public functions in use-cases layer
- [ ] T054 [P] Create ADR document in docs/adr/001-google-oauth-provider-choice.md (document why Google OAuth over alternatives)
- [ ] T055 Setup Dockerfile for stateless container deployment in Dockerfile
- [ ] T056 [P] Create Terraform configuration in infra/main.tf (Cloud Run service, PostgreSQL, Valkey instances)
- [ ] T057 [P] Create Terraform OAuth credentials config in infra/oauth.tf (Google OAuth client setup)
- [ ] T058 [P] Setup Docusaurus for tRPC API documentation in docs/ (generate from tRPC schema)
- [ ] T059 Run Biome linting and formatting across all source files
- [ ] T060 [P] Add pre-commit hooks for Biome checks in .husky/pre-commit
- [ ] T061 Verify all tests pass (unit, integration, contract, E2E) with coverage >90% on use-cases
- [ ] T062 Run quickstart.md validation (verify setup instructions work end-to-end)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1) - MVP: Can start after Foundational (Phase 2) - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational (Phase 2) - Logically depends on US1 but can be developed in parallel
  - User Story 3 (P3): Can start after Foundational (Phase 2) - Logically depends on US1 but can be developed in parallel
- **Advanced Features (Phase 6)**: Depends on User Story 1 completion (needs session infrastructure)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Sign In**: Independent - Can start after Foundational phase
- **User Story 2 (P2) - Sign Out**: Technically independent after Foundational, but requires sign-in to test (use US1 for testing)
- **User Story 3 (P3) - View Profile**: Technically independent after Foundational, but requires sign-in to test (use US1 for testing)

**Note**: While US2 and US3 logically depend on US1 for testing, they can be implemented in parallel as they touch different files and use-cases.

### Within Each User Story

**Tests First (TDD Approach)**:
1. Write contract tests (T017-T018 for US1) - FAIL initially
2. Write integration tests (T019-T021 for US1) - FAIL initially
3. Write E2E test (T022 for US1) - FAIL initially

**Implementation Order**:
4. Domain entities (T023-T024) - Pure types, no dependencies
5. Infrastructure adapters (T025-T027) - Can be parallel, external interfaces
6. Use cases (T028-T029) - Sequential within story, orchestrate infrastructure
7. Presentation (T030-T032) - tRPC endpoints, middleware
8. Error handling & logging (T033-T035) - Final touches

**Verify**:
9. All tests now PASS
10. Story independently testable

### Parallel Opportunities

**Within Setup Phase (Phase 1)**:
- T002, T003, T006, T007 can all run in parallel

**Within Foundational Phase (Phase 2)**:
- T009, T010, T014, T015, T016 can all run in parallel (different subsystems)
- T011-T012 must be sequential (define schema together)

**Within User Story 1 Tests**:
- T017, T018, T019, T020, T021 can all run in parallel (different test files)

**Within User Story 1 Implementation**:
- Domain: T023, T024 can run in parallel
- Infrastructure: T025, T026, T027 can run in parallel
- Use cases: T028 must complete before T029 (handleCallback depends on initiateSignIn patterns)
- Presentation: T030, T031 can run in parallel, T032 sequential after

**Across User Stories** (once Foundational complete):
- User Story 1 tests (T017-T022) in parallel
- User Story 2 tests (T036-T038) in parallel
- User Story 3 tests (T043-T044) in parallel
- Different user stories can be worked on by different developers simultaneously

**Within Polish Phase (Phase 7)**:
- T051, T052, T053, T054, T056, T057, T058, T060 can all run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# Launch domain entities in parallel:
Task T023: "Create User entity type in src/auth/domain/user.ts"
Task T024: "Create Session entity type in src/auth/domain/session.ts"

# After entities complete, launch infrastructure adapters in parallel:
Task T025: "Implement Google OAuth client in src/auth/infrastructure/google-oauth.ts"
Task T026: "Implement User repository in src/auth/infrastructure/user-repo.ts"
Task T027: "Implement Session store in src/auth/infrastructure/session-store.ts"

# After infrastructure complete, implement use cases sequentially:
Task T028: "Implement initiateSignIn use case" (first)
Task T029: "Implement handleCallback use case" (after T028 completes)

# After use cases complete, launch presentation layer in parallel:
Task T030: "Implement auth.initiateSignIn tRPC endpoint"
Task T031: "Implement auth.handleCallback tRPC endpoint"
# Then sequentially:
Task T032: "Add session middleware to Hono app"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Goal**: Get sign-in working end-to-end as fast as possible

1. Complete Phase 1: Setup (T001-T007) - ~2 hours
2. Complete Phase 2: Foundational (T008-T016) - ~4 hours
3. Complete Phase 3: User Story 1
   - Write tests (T017-T022) - FAIL initially - ~2 hours
   - Implement domain (T023-T024) - ~1 hour
   - Implement infrastructure (T025-T027) - ~3 hours
   - Implement use cases (T028-T029) - ~2 hours
   - Implement presentation (T030-T032) - ~2 hours
   - Error handling & logging (T033-T035) - ~1 hour
4. **STOP and VALIDATE**: All US1 tests PASS, manual testing complete
5. Deploy/demo if ready

**Total for MVP**: ~17 hours (2-3 days)

### Incremental Delivery

1. **Foundation** (Phase 1-2) → Database, Valkey, Logging ready - ~6 hours
2. **User Story 1** (Phase 3) → Test independently → Deploy/Demo - **MVP!** - ~11 hours
3. **User Story 2** (Phase 4) → Test independently → Deploy/Demo - +4 hours
4. **User Story 3** (Phase 5) → Test independently → Deploy/Demo - +2 hours
5. **Advanced Features** (Phase 6) → Token refresh - +3 hours
6. **Polish** (Phase 7) → Production-ready - +6 hours

**Total for Complete Feature**: ~32 hours (4-5 days)

### Parallel Team Strategy

With 3 developers after Foundational phase complete:

1. **Team completes Setup + Foundational together** (Phase 1-2) - ~6 hours
2. **Once Foundational is done, split work**:
   - **Developer A**: User Story 1 (T017-T035) - Sign-in flow - ~11 hours
   - **Developer B**: User Story 2 (T036-T042) - Sign-out flow - ~4 hours
   - **Developer C**: User Story 3 (T043-T046) - Profile view - ~2 hours
3. **Stories complete and integrate independently**
4. **Team reconvenes for Phase 6-7**: Advanced features + Polish - ~9 hours

**Total Parallel Time**: ~20 hours (2.5 days with 3 developers)

---

## Notes

- **[P] tasks** = Different files, no dependencies - can run in parallel
- **[Story] label** = Maps task to specific user story for traceability (US1, US2, US3)
- **Each user story** is independently completable and testable per specification requirements
- **TDD approach**: Write tests FIRST for each story, watch them FAIL, then implement until they PASS
- **Commit frequency**: Commit after each task or logical group (e.g., after all domain entities, after all infrastructure adapters)
- **Checkpoints**: Stop at user story checkpoints to validate story independently before proceeding
- **File paths**: All paths relative to repository root, following Clean Architecture structure from plan.md
- **Constitution compliance**: Tasks align with Yomu technical constraints (Hono, tRPC, Drizzle, Valkey, Vitest, Biome)

---

## Task Count Summary

- **Total Tasks**: 62
- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 9 tasks (BLOCKING)
- **Phase 3 (User Story 1)**: 19 tasks (6 tests + 13 implementation)
- **Phase 4 (User Story 2)**: 7 tasks (3 tests + 4 implementation)
- **Phase 5 (User Story 3)**: 4 tasks (2 tests + 2 implementation)
- **Phase 6 (Advanced Features)**: 4 tasks
- **Phase 7 (Polish)**: 12 tasks

**Parallel Opportunities**: 29 tasks marked [P] can run in parallel (47% of total)

**MVP Scope (Recommended)**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 35 tasks
