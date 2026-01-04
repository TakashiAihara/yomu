# Tasks: CLI Application with Google OAuth Authentication

**Input**: Design documents from `/specs/002-cli-google-oauth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution requirement (Test-First Development SHOULD include corresponding tests)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Base path: `apps/cli/` (monorepo app following `apps/api/` pattern)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize CLI application in monorepo

- [ ] T001 Create apps/cli/ directory structure per plan.md
- [ ] T002 Create apps/cli/package.json with dependencies (commander, @trpc/client, keytar, conf, open, pino, ora, chalk)
- [ ] T003 [P] Create apps/cli/tsconfig.json extending @yomu/tsconfig/node.json
- [ ] T004 [P] Create apps/cli/vitest.config.ts for unit testing
- [ ] T005 [P] Configure Biome for apps/cli in root biome.json

**Checkpoint**: CLI project skeleton ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Create apps/cli/src/shared/config.ts with API URL, log level settings
- [ ] T007 [P] Create apps/cli/src/shared/logger.ts with pino structured logging (redact sessionToken)
- [ ] T008 [P] Create apps/cli/src/shared/errors.ts with AuthError, NetworkError, StorageError types
- [ ] T009 Create apps/cli/src/api/client.ts with tRPC client setup using AppRouter from @yomu/api
- [ ] T010 Create apps/cli/src/storage/credential-store.ts with ICredentialStore interface
- [ ] T011 [P] Create apps/cli/src/storage/keychain.ts with KeychainStore implementation using keytar
- [ ] T012 [P] Create apps/cli/src/storage/file-store.ts with FileStore implementation using conf (encrypted)
- [ ] T013 Implement storage factory in apps/cli/src/storage/credential-store.ts (keychain with file fallback)
- [ ] T014 Create apps/cli/src/auth/token-manager.ts with expiration check and refresh logic
- [ ] T015 [P] Create apps/cli/src/lib/port.ts with findAvailablePort utility (8085-8099 range)
- [ ] T016 [P] Create apps/cli/src/lib/browser.ts with openBrowser and isHeadlessEnvironment utilities

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Interactive Browser Login (Priority: P1) 🎯 MVP

**Goal**: Users can authenticate via browser-based OAuth flow with automatic callback handling

**Independent Test**: Run `yomu login` on desktop, browser opens, grant permission, CLI shows success

### Tests for User Story 1

- [ ] T017 [P] [US1] Create unit test for callback-server in apps/cli/src/auth/callback-server.spec.ts
- [ ] T018 [P] [US1] Create unit test for browser-flow in apps/cli/src/auth/browser-flow.spec.ts

### Implementation for User Story 1

- [ ] T019 [US1] Create apps/cli/src/auth/callback-server.ts with local HTTP server for OAuth callback
- [ ] T020 [US1] Create apps/cli/src/auth/browser-flow.ts with browserAuthFlow function (5-min timeout)
- [ ] T021 [US1] Create apps/cli/src/commands/login.ts with browser-based login (default mode)
- [ ] T022 [US1] Wire login command to CLI entry in apps/cli/src/index.ts
- [ ] T023 [US1] Add already-authenticated check and re-auth prompt to login command
- [ ] T024 [US1] Add success/error output with chalk colors and ora spinner

**Checkpoint**: `yomu login` works with browser flow - MVP functional

---

## Phase 4: User Story 2 - Manual Code Entry (Priority: P1)

**Goal**: Users on headless/SSH environments can authenticate by copying authorization code

**Independent Test**: Run `yomu login --manual`, copy URL to browser, paste code back, CLI shows success

### Tests for User Story 2

- [ ] T025 [P] [US2] Create unit test for manual-flow in apps/cli/src/auth/manual-flow.spec.ts

### Implementation for User Story 2

- [ ] T026 [US2] Create apps/cli/src/auth/manual-flow.ts with manualAuthFlow function (prompt for code)
- [ ] T027 [US2] Add --manual flag to apps/cli/src/commands/login.ts
- [ ] T028 [US2] Implement headless environment detection and auto-suggest manual mode
- [ ] T029 [US2] Add clear instructions for URL opening and code pasting

**Checkpoint**: `yomu login --manual` works for headless environments

---

## Phase 5: User Story 3 - Authentication Status Check (Priority: P2)

**Goal**: Users can check their current authentication status and session details

**Independent Test**: Run `yomu status` when logged in (shows email, expiry), when logged out (shows login hint)

### Tests for User Story 3

- [ ] T030 [P] [US3] Create unit test for status command in apps/cli/src/commands/status.spec.ts

### Implementation for User Story 3

- [ ] T031 [US3] Create apps/cli/src/commands/status.ts with status display logic
- [ ] T032 [US3] Add expiration warning when session expires within 1 hour
- [ ] T033 [US3] Wire status command to CLI entry in apps/cli/src/index.ts
- [ ] T034 [US3] Format output with chalk (authenticated: green checkmark, not authenticated: red X)

**Checkpoint**: `yomu status` shows authentication state correctly

---

## Phase 6: User Story 4 - Logout (Priority: P2)

**Goal**: Users can sign out and remove local credentials

**Independent Test**: Login, run `yomu logout`, verify credentials removed, run `yomu status` shows not authenticated

### Tests for User Story 4

- [ ] T035 [P] [US4] Create unit test for logout command in apps/cli/src/commands/logout.spec.ts

### Implementation for User Story 4

- [ ] T036 [US4] Create apps/cli/src/commands/logout.ts with logout logic
- [ ] T037 [US4] Add --all flag to logout all sessions (calls auth.signOut with allSessions: true)
- [ ] T038 [US4] Wire logout command to CLI entry in apps/cli/src/index.ts
- [ ] T039 [US4] Handle already logged out case gracefully

**Checkpoint**: `yomu logout` removes credentials from local store and API

---

## Phase 7: Account Switch (Priority: P2)

**Goal**: Users can manage and switch between multiple stored accounts

**Independent Test**: Login with two accounts, run `yomu switch` to list, switch between them

### Tests for Account Switch

- [ ] T040 [P] Create unit test for switch command in apps/cli/src/commands/switch.spec.ts

### Implementation for Account Switch

- [ ] T041 Create apps/cli/src/commands/switch.ts with account listing and switching
- [ ] T042 Add interactive account selection when email not specified
- [ ] T043 Wire switch command to CLI entry in apps/cli/src/index.ts
- [ ] T044 Show active account indicator in account list

**Checkpoint**: `yomu switch` allows managing multiple accounts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finalize CLI and prepare for distribution

- [ ] T045 [P] Create apps/cli/README.md with usage documentation
- [ ] T046 [P] Add --version flag to CLI entry point
- [ ] T047 [P] Add --help with usage examples for each command
- [ ] T048 Update apps/cli/package.json with bin entry for global installation
- [ ] T049 [P] Create integration test in apps/cli/tests/integration/auth-flow.test.ts
- [ ] T050 Export AppRouter type from apps/api for CLI type safety
- [ ] T051 Update root turbo.json to include cli in build pipeline
- [ ] T052 Run full test suite and fix any issues
- [ ] T053 Validate quickstart.md scenarios work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1, can proceed in parallel
  - US3 and US4 are P2, can proceed after US1/US2 or in parallel with them
  - Account Switch is P2, can proceed in parallel with US3/US4
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Core MVP
- **User Story 2 (P1)**: Can start after Foundational - Extends login command from US1
- **User Story 3 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational - No dependencies on other stories
- **Account Switch (P2)**: Can start after Foundational - Depends on credential store from Phase 2

### Within Each User Story

- Tests FIRST (verify they fail before implementation)
- Core functionality implementation
- Command wiring to CLI entry
- UX polish (colors, spinners, messages)

### Parallel Opportunities

- Setup: T003, T004, T005 can run in parallel
- Foundational: T006, T007, T008, T011, T012, T015, T016 can run in parallel
- Each user story's tests can run in parallel
- US1, US2, US3, US4, Account Switch can all run in parallel after Foundational

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch parallel tasks:
Task: "Create apps/cli/src/shared/config.ts with API URL, log level settings"
Task: "Create apps/cli/src/shared/logger.ts with pino structured logging"
Task: "Create apps/cli/src/shared/errors.ts with AuthError, NetworkError, StorageError types"
Task: "Create apps/cli/src/storage/keychain.ts with KeychainStore implementation"
Task: "Create apps/cli/src/storage/file-store.ts with FileStore implementation"
Task: "Create apps/cli/src/lib/port.ts with findAvailablePort utility"
Task: "Create apps/cli/src/lib/browser.ts with openBrowser and isHeadlessEnvironment"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Browser Login)
4. Complete Phase 4: User Story 2 (Manual Login)
5. **STOP and VALIDATE**: Test both login methods independently
6. Deploy/demo if ready - MVP achieved!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Browser Login) → Test → MVP! (most users covered)
3. Add US2 (Manual Login) → Test → SSH/headless users covered
4. Add US3 (Status) + US4 (Logout) → Test → Full auth lifecycle
5. Add Account Switch → Test → Multi-account support
6. Polish phase → Production ready

### Suggested MVP Scope

**Minimum**: User Story 1 only (browser login covers ~80% of use cases)
**Recommended MVP**: User Stories 1 + 2 (covers desktop + headless environments)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User Story 5 (Device Authorization Flow) is marked as future enhancement and excluded

---

## Task Summary

| Phase | Description | Task Count |
|-------|-------------|------------|
| 1 | Setup | 5 |
| 2 | Foundational | 11 |
| 3 | US1 - Browser Login | 8 |
| 4 | US2 - Manual Login | 5 |
| 5 | US3 - Status Check | 5 |
| 6 | US4 - Logout | 5 |
| 7 | Account Switch | 5 |
| 8 | Polish | 9 |
| **Total** | | **53** |
