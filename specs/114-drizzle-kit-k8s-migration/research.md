# Research: Drizzle Kit Migrations for K8s Deployments

**Date**: 2026-01-19  
**Feature**: GitHub Issue #114 - Migrate to Drizzle Kit migrations for k8s deployments

This document consolidates research findings for implementing Drizzle Kit migrations in Kubernetes environments, following the Phase 0 research tasks outlined in [`plan.md`](file:///C:/Users/takas/.gemini/antigravity/brain/409ab6e3-1bea-4f87-9d2e-1a0562fddd1b/plan.md).

---

## 1. Drizzle Kit Migration Best Practices

### Decision: Use Drizzle Kit `generate` → `migrate` workflow with existing schema

**Rationale**:

- Yomu already has a defined schema in `apps/api/src/shared/db/schema.ts`
- Drizzle Kit's `generate` command creates SQL migrations from TypeScript schema
- The `migrate` command applies migrations to the database
- This approach makes the TypeScript schema the source of truth (codebase-first)

### Alternatives Considered

1. **Database-first with `drizzle-kit pull`**
   - **Rejected**: We already have a TypeScript schema as source of truth
   - Use case: When integrating Drizzle into existing projects with pre-defined databases
   - Would scaffold Drizzle schema from existing database

2. **Direct schema push with `drizzle-kit push`**
   - **Rejected**: No migration history, not suitable for production
   - Use case: Development/prototyping only
   - Pushes schema directly without generating migration files

### Implementation Details

#### Generating Initial Migration

For the existing schema, we'll use:

```bash
pnpm --filter @yomu/api db:generate
```

This will:

- Compare current schema with previous snapshot
- Generate SQL migration files in `./drizzle` directory
- Create timestamped migration files (e.g., `0000_initial_schema.sql`)
- Store metadata in `meta/` directory

#### Migration File Naming

Drizzle Kit supports two prefix options (configured in `drizzle.config.ts`):

- `timestamp`: Uses Unix timestamp (default, recommended for production)
- `index`: Sequential numbering (0000, 0001, etc.)

**Decision**: Use `timestamp` prefix for production deployments

- Better for distributed teams
- Avoids merge conflicts
- Clear chronological ordering

#### Applying Migrations

For production databases that already have the schema:

```bash
pnpm --filter @yomu/api db:migrate --no-init
```

The `--no-init` flag:

- Skips initial migration step
- Prevents errors when tables already exist
- Drizzle Kit auto-detects this scenario

For fresh databases:

```bash
pnpm --filter @yomu/api db:migrate
```

#### Migration History Tracking

Drizzle Kit automatically creates a migrations table (default: `__drizzle_migrations__`) to track:

- Applied migrations
- Execution timestamps
- Migration hashes for integrity

This can be configured in `drizzle.config.ts`:

```typescript
migrations: {
  table: "__drizzle_migrations__",
  schema: "public",
}
```

### Best Practices Summary

1. **Atomic Changes**: Each migration focuses on a single logical schema change
2. **Descriptive Naming**: Timestamp-based naming for production
3. **Version Control**: All migration files committed to Git
4. **No Modification**: Never modify applied migrations
5. **Testing**: Test migrations in staging before production
6. **Rollback Strategy**: Maintain down migrations or schema snapshots

---

## 2. Kubernetes Job Patterns for Database Migrations

### Decision: Use Kubernetes Job (not InitContainer)

**Rationale**:

- Decouples migration from application deployment
- Runs once per deployment, not per replica
- Better control over retry logic and failure handling
- Cleaner separation of concerns
- Easier to monitor and debug

### Alternatives Considered

1. **InitContainer in Deployment**
   - **Rejected for production**: Each replica would attempt migration
   - **Concern**: Race conditions with multiple replicas
   - **Use case**: Simple, stable migrations in single-replica deployments
   - **Benefit**: Ensures app doesn't start if migration fails

2. **Helm Pre-Install/Pre-Upgrade Hooks**
   - **Considered**: Good for Helm-managed deployments
   - **Decision**: Not using Helm currently, but keep as future option
   - **Benefit**: Automatic cleanup with `hook-delete-policy`

### Implementation Pattern

#### Kubernetes Job Specification

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: yomu-migration-{{ timestamp }}
  namespace: yomu
spec:
  ttlSecondsAfterFinished: 300  # Auto-cleanup after 5 minutes
  backoffLimit: 3                # Retry up to 3 times
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: migration
        image: ghcr.io/takashiaihara/yomu-api:{{ tag }}
        command: ["pnpm", "db:migrate"]
        envFrom:
        - configMapRef:
            name: yomu-config
        - secretRef:
            name: yomu-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

#### Zero-Downtime Strategy: Expand-Contract Pattern

For breaking schema changes, use multi-phase deployment:

**Phase 1: Expand**

- Add new columns/tables alongside old ones
- Deploy app version that writes to both old and new structures
- Reads still from old structures

**Phase 2: Backfill** (if needed)

- Use Kubernetes Job to migrate data from old to new structures
- Can run in background

**Phase 3: Switch Reads**

- Deploy app version that reads from new structures
- Still writes to both

**Phase 4: Contract**

- Deploy app version that only uses new structures
- Run migration Job to drop old columns/tables

**For Yomu's current schema**: All changes are additive (initial migration), so simple single-phase deployment is sufficient.

#### Job Execution Timing

**Decision**: Run migration Job before Deployment update

**Options**:

1. **Pre-deployment Job** (chosen)
   - CI/CD creates and waits for Job completion
   - Then updates Deployment
   - Ensures schema ready before new app version

2. **InitContainer** (rejected)
   - Each pod runs migration
   - Race conditions possible

3. **Post-deployment** (rejected)
   - App might start before schema ready
   - Potential errors

### Failure Handling

- **Job fails**: Deployment doesn't proceed (CI/CD blocks)
- **Retry logic**: `backoffLimit: 3` for transient failures
- **Timeout**: Set `activeDeadlineSeconds` for long-running migrations
- **Rollback**: Keep previous Deployment version, revert migration if needed

---

## 3. CI/CD Integration for Migrations

### Decision: GitHub Actions workflow with pre-deployment migration Job

**Rationale**:

- Automated, repeatable process
- Ensures migrations run before app deployment
- Secure credential management via GitHub Secrets
- Clear audit trail

### Workflow Pattern

```yaml
name: Deploy to K8s

on:
  push:
    branches: [main]

jobs:
  build:
    # ... build Docker image ...

  migrate:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Run migration Job
        run: |
          # Generate unique Job name with timestamp
          JOB_NAME="yomu-migration-$(date +%s)"
          
          # Create Job from template
          kubectl create -f k8s/yomu/migration-job.yaml \
            --dry-run=client -o yaml | \
            sed "s/yomu-migration/$JOB_NAME/" | \
            kubectl apply -f -
          
          # Wait for Job completion (timeout 5 minutes)
          kubectl wait --for=condition=complete \
            --timeout=300s job/$JOB_NAME -n yomu
          
          # Check Job status
          if kubectl get job $JOB_NAME -n yomu -o jsonpath='{.status.succeeded}' | grep -q 1; then
            echo "Migration successful"
          else
            echo "Migration failed"
            kubectl logs job/$JOB_NAME -n yomu
            exit 1
          fi

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - name: Update Deployment
        run: |
          kubectl set image deployment/yomu-api \
            api=ghcr.io/takashiaihara/yomu-api:${{ github.sha }} \
            -n yomu
```

### Security Best Practices

1. **GitHub Secrets**: Store sensitive data
   - `KUBECONFIG`: Kubernetes cluster credentials
   - Database credentials in Kubernetes Secrets (not GitHub)

2. **Least Privilege**: Migration Job uses service account with minimal permissions
   - Read/write to specific database schema
   - No cluster-admin rights

3. **Temporary Access**: Consider using short-lived credentials
   - OIDC federation for GitHub Actions
   - Workload Identity for GKE

### Environment-Specific Strategies

**Development**:

- Auto-run migrations on every push
- Use `drizzle-kit push` for rapid iteration (no migration files)

**Staging**:

- Run migrations via GitHub Actions
- Test migration + deployment workflow
- Validate rollback procedures

**Production**:

- Require manual approval for migrations
- Use GitHub Environments with protection rules
- Run migrations during maintenance windows (if needed)
- Monitor migration execution closely

### Rollback Procedures

1. **Application Rollback**:

   ```bash
   kubectl rollout undo deployment/yomu-api -n yomu
   ```

2. **Database Rollback**:
   - Drizzle Kit doesn't auto-generate down migrations
   - Options:
     - Manual SQL scripts for critical migrations
     - Database snapshots before migration
     - Restore from backup

**Decision**: For initial migration, no rollback needed (additive changes only)

---

## 4. Docker Compose Migration Strategy

### Decision: Replace `init.sql` with Drizzle migrations

**Rationale**:

- Consistency across all environments
- Single source of truth (TypeScript schema)
- Easier to maintain and version

### Implementation

#### Current State

- `docker/postgres/init.sql` runs once on first container creation
- Manual SQL file maintenance
- No migration history

#### New Approach

**Option 1: Migration on API startup** (chosen for Docker Compose)

Update `docker-compose.yml`:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    command: sh -c "pnpm db:migrate && pnpm start"
    depends_on:
      postgres:
        condition: service_healthy
```

**Pros**:

- Simple for local development
- Automatic migration on startup
- No separate migration service needed

**Cons**:

- Slight startup delay
- Not suitable for production (use K8s Job instead)

**Option 2: Separate migration service**

```yaml
services:
  migration:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    command: pnpm db:migrate
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  api:
    depends_on:
      migration:
        condition: service_completed_successfully
```

**Pros**:

- Closer to production pattern
- Runs once per `docker-compose up`

**Cons**:

- More complex setup
- Overkill for local development

**Decision**: Use Option 1 for Docker Compose (local dev), Option 2 pattern for K8s (production)

#### Deprecating `init.sql`

1. Keep file for reference: `docker/postgres/init.sql.deprecated`
2. Add comment explaining migration to Drizzle Kit
3. Remove from Docker Compose volume mounts
4. Document in README

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Migration Tool** | Drizzle Kit `generate` → `migrate` | TypeScript schema as source of truth, version-controlled migrations |
| **K8s Pattern** | Kubernetes Job (not InitContainer) | Decoupled, runs once, better control |
| **Zero-Downtime** | Expand-Contract pattern (when needed) | Current migration is additive, simple deployment OK |
| **CI/CD** | GitHub Actions pre-deployment Job | Automated, secure, auditable |
| **Docker Compose** | Migration on API startup | Simple for local dev |
| **Migration Naming** | Timestamp prefix | Avoids conflicts, chronological order |
| **Rollback** | Manual SQL + backups | Drizzle Kit no auto-rollback, initial migration is low-risk |

---

## Next Steps (Phase 1: Design & Contracts)

Based on research findings, Phase 1 will create:

1. **data-model.md**: Migration job configuration, environment variables
2. **contracts/**: K8s Job YAML, migration script interface, schema validation
3. **quickstart.md**: Developer guide for running migrations locally and in K8s

All design decisions will align with research findings documented here.
