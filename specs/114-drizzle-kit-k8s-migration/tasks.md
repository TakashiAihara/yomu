# Tasks: Drizzle Kit Migrations for K8s Deployments

**Input**: Design documents from `specs/114-drizzle-kit-k8s-migration/`
**Prerequisites**: [plan.md](file:///C:/Users/takas/.gemini/antigravity/brain/409ab6e3-1bea-4f87-9d2e-1a0562fddd1b/plan.md), [research.md](file:///C:/Users/takas/.gemini/antigravity/brain/409ab6e3-1bea-4f87-9d2e-1a0562fddd1b/research.md)

**Organization**: Tasks are grouped by implementation phase for infrastructure migration work.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo structure: `apps/api/`, `k8s/`, `.github/workflows/`
- Migration files: `drizzle/migrations/`

---

## Phase 1: Setup & Configuration

**Purpose**: Configure Drizzle Kit for migration generation and update drizzle.config.ts

- [ ] T001 Update `drizzle.config.ts` to use timestamp prefix for migrations
- [ ] T002 [P] Verify Drizzle Kit is installed in `apps/api/package.json` devDependencies
- [ ] T003 [P] Test migration generation with `pnpm --filter @yomu/api db:generate` to create initial migration

---

## Phase 2: Migration Script Implementation

**Purpose**: Create migration execution script with database advisory locks for concurrency control

- [ ] T004 Create `apps/api/src/shared/db/migrate.ts` with Drizzle migrate function
- [ ] T005 Add PostgreSQL advisory lock implementation to `apps/api/src/shared/db/migrate.ts` (pg_advisory_lock)
- [ ] T006 Add migration observability metrics (duration, success/fail count, schema version) to `apps/api/src/shared/db/migrate.ts`
- [ ] T007 Add error handling and structured logging to `apps/api/src/shared/db/migrate.ts`
- [ ] T008 Update `apps/api/package.json` to add `db:migrate` script that runs `apps/api/src/shared/db/migrate.ts`

---

## Phase 3: Kubernetes Migration Job

**Purpose**: Create K8s Job manifest for running migrations with proper resource limits and failure handling

- [ ] T009 Create `k8s/yomu/migration-job.yaml` with Job specification
- [ ] T010 Configure Job to use `ghcr.io/takashiaihara/yomu-api` image with `pnpm db:migrate` command in `k8s/yomu/migration-job.yaml`
- [ ] T011 Add environment variables from ConfigMap and Secrets to `k8s/yomu/migration-job.yaml`
- [ ] T012 Set resource limits (128Mi/100m requests, 256Mi/200m limits) in `k8s/yomu/migration-job.yaml`
- [ ] T013 Configure `ttlSecondsAfterFinished: 300` and `backoffLimit: 3` in `k8s/yomu/migration-job.yaml`

---

## Phase 4: GitHub Actions CI/CD Integration

**Purpose**: Update deployment workflow to run migrations before app deployment with manual approval for production

- [ ] T014 Create or update `.github/workflows/deploy-k8s.yaml` to add migration job step
- [ ] T015 Add kubectl setup and kubeconfig configuration to `.github/workflows/deploy-k8s.yaml`
- [ ] T016 Add migration Job creation with unique timestamp-based name to `.github/workflows/deploy-k8s.yaml`
- [ ] T017 Add Job completion wait (timeout 300s) and status check to `.github/workflows/deploy-k8s.yaml`
- [ ] T018 Add failure handling (block deployment, log migration errors) to `.github/workflows/deploy-k8s.yaml`
- [ ] T019 Add manual approval requirement for production environment using GitHub Environments in `.github/workflows/deploy-k8s.yaml`
- [ ] T020 Add auto-rollback logic (revert to previous deployment on migration failure) to `.github/workflows/deploy-k8s.yaml`

---

## Phase 5: Docker Compose Migration

**Purpose**: Update Docker Compose to use Drizzle migrations instead of init.sql

- [ ] T021 Update `docker-compose.yml` API service command to run `pnpm db:migrate && pnpm start`
- [ ] T022 Ensure API service depends on postgres with `service_healthy` condition in `docker-compose.yml`
- [ ] T023 Rename `docker/postgres/init.sql` to `docker/postgres/init.sql.deprecated`
- [ ] T024 Add deprecation comment to `docker/postgres/init.sql.deprecated` explaining migration to Drizzle Kit

---

## Phase 6: Initial Migration Generation

**Purpose**: Generate initial migration from existing schema with IF NOT EXISTS for data preservation

- [ ] T025 Run `pnpm --filter @yomu/api db:generate` to create initial migration in `drizzle/migrations/`
- [ ] T026 Review generated SQL migration file to verify IF NOT EXISTS clauses for tables
- [ ] T027 Manually edit migration SQL if needed to ensure data preservation (CREATE TABLE IF NOT EXISTS)
- [ ] T028 Commit generated migration files in `drizzle/migrations/` and `drizzle/meta/` to Git

---

## Phase 7: Integration Testing

**Purpose**: Validate migration execution in local and staging environments

- [ ] T029 [P] Test migration execution locally with Docker Compose (`docker-compose up`)
- [ ] T030 [P] Verify migration creates tables without data loss in local PostgreSQL
- [ ] T031 Test migration Job in staging k8s environment (`kubectl apply -f k8s/yomu/migration-job.yaml`)
- [ ] T032 Verify migration Job completes successfully and logs are accessible (`kubectl logs job/yomu-migration-<timestamp>`)
- [ ] T033 Test concurrent migration scenario (trigger two Jobs simultaneously, verify advisory lock prevents conflicts)
- [ ] T034 Test migration failure scenario (invalid SQL) and verify deployment blocks
- [ ] T035 Verify observability metrics are logged (duration, success/fail, schema version)

---

## Phase 8: Documentation & Cleanup

**Purpose**: Update documentation and remove deprecated files

- [ ] T036 [P] Create `specs/114-drizzle-kit-k8s-migration/quickstart.md` with local and k8s migration instructions
- [ ] T037 [P] Update project README.md to document new migration workflow
- [ ] T038 [P] Document rollback procedures in `specs/114-drizzle-kit-k8s-migration/quickstart.md`
- [ ] T039 [P] Document troubleshooting common migration issues in `specs/114-drizzle-kit-k8s-migration/quickstart.md`
- [ ] T040 Update deployment documentation in `docs/` (if exists) to reference new migration process

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Migration Script (Phase 2)**: Depends on Phase 1 completion
- **K8s Job (Phase 3)**: Depends on Phase 2 (needs migrate script)
- **CI/CD (Phase 4)**: Depends on Phase 3 (needs Job manifest)
- **Docker Compose (Phase 5)**: Depends on Phase 2 (needs migrate script) - can run in parallel with Phase 3/4
- **Initial Migration (Phase 6)**: Depends on Phase 1 - can run early
- **Testing (Phase 7)**: Depends on Phases 2, 3, 4, 5, 6 completion
- **Documentation (Phase 8)**: Can start after Phase 7, some tasks can run in parallel

### Critical Path

1. Phase 1 (Setup) → Phase 2 (Migration Script) → Phase 3 (K8s Job) → Phase 4 (CI/CD) → Phase 7 (Testing) → Phase 8 (Documentation)
2. Phase 6 (Initial Migration) can run after Phase 1

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 5: Can run in parallel with Phases 3-4 after Phase 2 completes
- Phase 7: T029-T030 can run in parallel
- Phase 8: All documentation tasks (T036-T040) can run in parallel

---

## Parallel Example: Testing Phase

```bash
# Launch local and staging tests together:
Task: "Test migration execution locally with Docker Compose"
Task: "Verify migration creates tables without data loss in local PostgreSQL"
```

---

## Implementation Strategy

### MVP Approach (Phases 1-6)

1. Complete Phase 1: Setup & Configuration
2. Complete Phase 2: Migration Script Implementation
3. Complete Phase 3: Kubernetes Migration Job
4. Complete Phase 4: GitHub Actions CI/CD Integration
5. Complete Phase 5: Docker Compose Migration
6. Complete Phase 6: Initial Migration Generation
7. **STOP and VALIDATE**: Test in staging environment

### Full Deployment (Add Phases 7-8)

1. Complete MVP (Phases 1-6)
2. Complete Phase 7: Integration Testing
3. Complete Phase 8: Documentation & Cleanup
4. **FINAL VALIDATION**: Production deployment with manual approval

---

## Verification Plan

### Automated Tests

1. **Local Migration Test**:

   ```bash
   # From repository root
   docker-compose down -v  # Clean slate
   docker-compose up -d postgres
   docker-compose up api  # Should run migrations automatically
   docker-compose exec postgres psql -U yomu -d yomu -c "\dt"  # Verify tables exist
   ```

2. **K8s Migration Job Test** (staging):

   ```bash
   # Apply migration Job
   kubectl apply -f k8s/yomu/migration-job.yaml -n yomu
   
   # Wait for completion
   kubectl wait --for=condition=complete --timeout=300s job/yomu-migration -n yomu
   
   # Check logs
   kubectl logs job/yomu-migration -n yomu
   
   # Verify tables
   kubectl exec -it deployment/yomu-api -n yomu -- pnpm db:studio
   ```

3. **Concurrent Migration Test**:

   ```bash
   # Trigger two Jobs simultaneously
   kubectl create job yomu-migration-test1 --from=job/yomu-migration -n yomu
   kubectl create job yomu-migration-test2 --from=job/yomu-migration -n yomu
   
   # Verify only one completes, other waits or fails gracefully
   kubectl get jobs -n yomu
   kubectl logs job/yomu-migration-test1 -n yomu
   kubectl logs job/yomu-migration-test2 -n yomu
   ```

### Manual Verification

1. **Production Migration** (with manual approval):
   - Trigger GitHub Actions workflow for production
   - Approve migration in GitHub Environments
   - Monitor migration Job logs in real-time
   - Verify deployment proceeds only after migration success
   - Check observability metrics (duration <30s, success count)

2. **Rollback Test**:
   - Trigger migration failure (invalid SQL)
   - Verify deployment blocks
   - Verify auto-rollback to previous app version
   - Verify alert sent to on-call engineer

---

## Notes

- [P] tasks = different files, no dependencies
- All migration SQL must use IF NOT EXISTS for data preservation
- Database advisory locks prevent concurrent migration conflicts
- Manual approval required for production migrations
- Migration duration must be <30s (alert if exceeded)
- Commit after each phase or logical group
- Stop at checkpoints to validate in staging before production
