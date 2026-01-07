# Tasks: ブックマーク追加機能

**Input**: Design documents from `/specs/003-add-bookmark/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature specification does NOT explicitly request tests, so test tasks are NOT included. Tests can be added later if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Paths are based on plan.md structure (Turborepo monorepo):
- **API**: `apps/api/src/`
- **CLI**: `apps/cli/src/`
- **Docker**: `docker/`
- **Tests**: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema setup and type generation

- [x] T001 Add bookmarks table to docker/postgres/init.sql with columns (id, user_id, url, title, created_at) and unique constraint on (user_id, url)
- [x] T002 Add bookmarks table indexes to docker/postgres/init.sql for (user_id, created_at DESC)
- [x] T003 Recreate PostgreSQL database to apply schema changes (docker compose down -v && docker compose up -d)
- [x] T004 Add bookmarks table to Drizzle schema in apps/api/src/shared/db/schema.ts with proper types and constraints
- [x] T005 Add bookmarksRelations to apps/api/src/shared/db/schema.ts defining relationship to users table
- [x] T006 Update usersRelations in apps/api/src/shared/db/schema.ts to include bookmarks relation
- [x] T007 [P] Add Bookmark and NewBookmark type exports to apps/api/src/shared/db/schema.ts

**Checkpoint**: Database schema ready - bookmark feature implementation can now begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain types and error handling infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 [P] Create apps/api/src/bookmarks/domain/ directory for domain layer
- [x] T009 [P] Create bookmark domain types in apps/api/src/bookmarks/domain/bookmark.ts (Bookmark, CreateBookmarkInput, ListBookmarksInput, DeleteBookmarkInput, BookmarkRepository interface)
- [x] T010 [P] Create BookmarkError class in apps/api/src/bookmarks/domain/errors.ts with duplicate/notFound/invalidUrl error factory methods
- [x] T011 [P] Create apps/api/src/bookmarks/use-cases/ directory for use-cases layer
- [x] T012 [P] Create apps/api/src/bookmarks/infrastructure/ directory for infrastructure layer
- [x] T013 [P] Create apps/api/src/bookmarks/presentation/ directory for presentation layer

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - CLIでブックマークを追加 (Priority: P1) 🎯 MVP

**Goal**: 認証済みユーザーがCLIコマンドでURLをブックマークに追加できる。タイトル指定、重複防止、バリデーション機能を含む。

**Independent Test**: ユーザーが `yomu bookmark add <URL>` を実行し、ブックマークが保存されていることを確認できればテスト完了。

### Implementation for User Story 1

- [x] T014 [US1] Implement createBookmarkRepository function in apps/api/src/bookmarks/infrastructure/bookmark-repository.ts with create() method (duplicate check + insert logic using Drizzle)
- [x] T015 [US1] Implement findByUserAndUrl() method in apps/api/src/bookmarks/infrastructure/bookmark-repository.ts for duplicate detection
- [x] T016 [US1] Implement createBookmark use-case in apps/api/src/bookmarks/use-cases/create-bookmark.ts with logging and repository integration
- [x] T017 [US1] Create URL validation schema with http/https-only refinement in apps/api/src/bookmarks/presentation/bookmark-router.ts
- [x] T018 [US1] Create title validation schema (max 500 chars, nullable) in apps/api/src/bookmarks/presentation/bookmark-router.ts
- [x] T019 [US1] Create createBookmarkInputSchema in apps/api/src/bookmarks/presentation/bookmark-router.ts combining url and title schemas
- [x] T020 [US1] Implement bookmarks.create mutation in apps/api/src/bookmarks/presentation/bookmark-router.ts using protectedProcedure with error mapping (BookmarkError → TRPCError)
- [x] T021 [US1] Export bookmarkRouter from apps/api/src/bookmarks/presentation/bookmark-router.ts
- [x] T022 [US1] Import and mount bookmarkRouter in apps/api/src/trpc.ts under router({ auth, bookmarks })
- [x] T023 [US1] Create apps/cli/src/commands/bookmark.ts file for bookmark CLI commands
- [x] T024 [US1] Implement bookmark add subcommand in apps/cli/src/commands/bookmark.ts with URL argument and --title option
- [x] T025 [US1] Add authentication check in apps/cli/src/commands/bookmark.ts add handler (redirect to login if not authenticated)
- [x] T026 [US1] Implement tRPC client call to bookmarks.create.mutate in apps/cli/src/commands/bookmark.ts add handler
- [x] T027 [US1] Add error handling for duplicate (CONFLICT), invalid URL (BAD_REQUEST), and title validation errors in apps/cli/src/commands/bookmark.ts add handler
- [x] T028 [US1] Add success message with bookmark details (title/URL, ID) in apps/cli/src/commands/bookmark.ts add handler using chalk
- [x] T029 [US1] Export bookmarkCommand from apps/cli/src/commands/bookmark.ts
- [x] T030 [US1] Import and register bookmarkCommand in apps/cli/src/index.ts using program.addCommand()

**Checkpoint**: At this point, users can add bookmarks via CLI with full validation and error handling

---

## Phase 4: User Story 2 - CLIでブックマーク一覧を表示 (Priority: P1)

**Goal**: 認証済みユーザーがCLIコマンドで保存したブックマークの一覧を新しい順に表示できる。ページネーション対応。

**Independent Test**: ブックマークを追加後、`yomu bookmark list` を実行し、追加したブックマークが表示されることを確認できればテスト完了。

### Implementation for User Story 2

- [x] T031 [P] [US2] Implement listByUser() method in apps/api/src/bookmarks/infrastructure/bookmark-repository.ts with limit/offset pagination and descending created_at ordering
- [x] T032 [P] [US2] Implement listByUser() total count query in apps/api/src/bookmarks/infrastructure/bookmark-repository.ts using sql count(*)
- [x] T033 [US2] Implement listBookmarks use-case in apps/api/src/bookmarks/use-cases/list-bookmarks.ts with logging and repository integration
- [x] T034 [US2] Create listBookmarksInputSchema in apps/api/src/bookmarks/presentation/bookmark-router.ts with limit (default 20, max 100) and offset (default 0) validation
- [x] T035 [US2] Implement bookmarks.list query in apps/api/src/bookmarks/presentation/bookmark-router.ts using protectedProcedure returning { bookmarks, total, limit, offset }
- [x] T036 [US2] Implement bookmark list subcommand in apps/cli/src/commands/bookmark.ts with --limit and --offset options
- [x] T037 [US2] Add authentication check in apps/cli/src/commands/bookmark.ts list handler
- [x] T038 [US2] Implement tRPC client call to bookmarks.list.query in apps/cli/src/commands/bookmark.ts list handler
- [x] T039 [US2] Add empty state handling ("No bookmarks found") in apps/cli/src/commands/bookmark.ts list handler
- [x] T040 [US2] Format bookmark list output in apps/cli/src/commands/bookmark.ts list handler showing numbered list with title (or URL if null), ID, URL (if title exists), and formatted date using chalk

**Checkpoint**: At this point, users can list bookmarks with pagination and see formatted output

---

## Phase 5: User Story 3 - CLIでブックマークを削除 (Priority: P2)

**Goal**: 認証済みユーザーがCLIコマンドで不要になったブックマークを削除できる。確認プロンプト付き、--forceでスキップ可能。

**Independent Test**: ブックマークを削除し、`yomu bookmark list` で一覧から消えていることを確認できればテスト完了。

### Implementation for User Story 3

- [x] T041 [P] [US3] Implement delete() method in apps/api/src/bookmarks/infrastructure/bookmark-repository.ts with user authorization check (bookmarkId + userId filter) and notFound error
- [x] T042 [US3] Implement deleteBookmark use-case in apps/api/src/bookmarks/use-cases/delete-bookmark.ts with logging and repository integration
- [x] T043 [US3] Create deleteBookmarkInputSchema in apps/api/src/bookmarks/presentation/bookmark-router.ts with UUID validation
- [x] T044 [US3] Implement bookmarks.delete mutation in apps/api/src/bookmarks/presentation/bookmark-router.ts using protectedProcedure with error mapping (BookmarkError → TRPCError)
- [x] T045 [US3] Implement bookmark remove subcommand in apps/cli/src/commands/bookmark.ts with ID argument and --force option
- [x] T046 [US3] Add authentication check in apps/cli/src/commands/bookmark.ts remove handler
- [x] T047 [US3] Fetch bookmark details before deletion in apps/cli/src/commands/bookmark.ts remove handler using bookmarks.list.query filtered by ID
- [x] T048 [US3] Implement interactive y/n confirmation prompt in apps/cli/src/commands/bookmark.ts remove handler showing bookmark details (title, URL) unless --force
- [x] T049 [US3] Handle confirmation cancellation (n input) in apps/cli/src/commands/bookmark.ts remove handler
- [x] T050 [US3] Implement tRPC client call to bookmarks.delete.mutate in apps/cli/src/commands/bookmark.ts remove handler
- [x] T051 [US3] Add error handling for notFound errors in apps/cli/src/commands/bookmark.ts remove handler
- [x] T052 [US3] Add success message after deletion in apps/cli/src/commands/bookmark.ts remove handler

**Checkpoint**: All user stories are now independently functional - full bookmark CRUD operations available

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final touches and validation

- [x] T053 [P] Run type checking across all modified files (pnpm typecheck)
- [x] T054 [P] Run linting across all modified files (pnpm lint)
- [x] T055 [P] Verify all CLI help text is clear for bookmark commands (yomu bookmark --help)
- [ ] T056 Manual testing following spec.md acceptance scenarios for all three user stories
- [ ] T057 Verify database constraints work (test duplicate URL rejection at DB level)
- [ ] T058 Verify URL scheme validation (test file://, javascript:// rejection)
- [ ] T059 Verify title length validation (test 500+ character titles)
- [ ] T060 Verify pagination behavior (test --limit and --offset with multiple bookmarks)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 P1 → US2 P1 → US3 P2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Shares repository with US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Shares repository with US1/US2 but independently testable

### Within Each User Story

- Repository implementation before use-cases
- Use-cases before presentation layer (tRPC router)
- tRPC router before CLI commands
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: T001-T002 (SQL files) can run parallel with T004-T007 (TypeScript schema)
- **Phase 2 (Foundational)**: T008-T013 (all directory creation) can run in parallel
- **User Story 1**: T017-T019 (validation schemas) can run in parallel
- **User Story 2**: T031-T032 (repository methods) can run in parallel
- **User Story 3**: T041 (repository method) independent
- **Different User Stories**: US1, US2, US3 can be worked on in parallel by different team members after Phase 2
- **Phase 6 (Polish)**: T053-T055 (type check, lint, help text) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all directory creation tasks together:
Task: "Create apps/api/src/bookmarks/domain/ directory"
Task: "Create apps/api/src/bookmarks/use-cases/ directory"
Task: "Create apps/api/src/bookmarks/infrastructure/ directory"
Task: "Create apps/api/src/bookmarks/presentation/ directory"
```

## Parallel Example: User Story 1 Validation Schemas

```bash
# Launch all validation schema tasks together:
Task: "Create URL validation schema in bookmark-router.ts"
Task: "Create title validation schema in bookmark-router.ts"
```

## Parallel Example: User Story 2 Repository Methods

```bash
# Launch repository method tasks together:
Task: "Implement listByUser() method in bookmark-repository.ts"
Task: "Implement listByUser() total count query in bookmark-repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database schema)
2. Complete Phase 2: Foundational (domain types, directories)
3. Complete Phase 3: User Story 1 (bookmark add functionality)
4. **STOP and VALIDATE**: Test `yomu bookmark add` independently with all acceptance scenarios
5. Deploy/demo if ready

This gives you a working bookmark add feature as the MVP.

### Incremental Delivery

1. **Foundation**: Complete Setup + Foundational → Database and types ready
2. **MVP (US1)**: Add User Story 1 → Test independently → Deploy/Demo (users can add bookmarks!)
3. **v2 (US2)**: Add User Story 2 → Test independently → Deploy/Demo (users can list bookmarks!)
4. **v3 (US3)**: Add User Story 3 → Test independently → Deploy/Demo (full CRUD complete!)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (Phases 1-2)
2. **Once Foundational is done, split work**:
   - Developer A: User Story 1 (bookmark add)
   - Developer B: User Story 2 (bookmark list)
   - Developer C: User Story 3 (bookmark delete)
3. Stories complete and integrate independently
4. Each developer can test their story without waiting for others

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All three user stories share the same repository (bookmark-repository.ts) but implement different methods
- URL validation (http/https only) is critical for security (FR-009)
- Title is nullable in database but CLI displays URL as fallback when rendering
- Default pagination limit is 20 bookmarks (FR-010)
- Delete confirmation shows bookmark details and requires y/n unless --force (FR-006)
- No tests included per project spec (tests not explicitly requested)
