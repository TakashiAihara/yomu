# Quickstart: Database Migrations with Drizzle Kit

This guide covers how to generate and run database migrations for the Yomu project using Drizzle Kit in both local development and Kubernetes environments.

## Prerequisites

- Node.js 18+ and pnpm installed
- Docker and Docker Compose (for local development)
- kubectl configured (for K8s deployments)
- Database credentials configured in environment variables

## Local Development

### 1. Generate Migration from Schema Changes

When you modify the database schema in `apps/api/src/shared/db/schema.ts`, generate a new migration:

```bash
# From repository root
pnpm --filter @yomu/api db:generate
```

This creates a timestamped SQL migration file in `drizzle/migrations/`.

**Review the generated migration** before applying it to ensure it matches your intended changes.

### 2. Run Migrations Locally

#### Option A: Using Docker Compose (Recommended for local dev)

```bash
# Start all services - migrations run automatically on API startup
docker-compose up

# Or rebuild and start
docker-compose up --build
```

The API service runs `pnpm db:migrate && pnpm start`, so migrations execute before the application starts.

#### Option B: Manual Migration Execution

```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Run migrations manually
cd apps/api
pnpm db:migrate
```

### 3. Verify Migration Success

```bash
# Check migration logs in Docker Compose output
docker-compose logs api

# Or connect to database and verify tables
docker-compose exec postgres psql -U yomu -d yomu -c "\dt"

# Check migration history
docker-compose exec postgres psql -U yomu -d yomu -c "SELECT * FROM __drizzle_migrations__;"
```

## Kubernetes Deployment

### 1. Manual Migration Job Execution

To run migrations manually in K8s:

```bash
# Create a unique migration job
TIMESTAMP=$(date +%s)
JOB_NAME="yomu-migration-${TIMESTAMP}"

# Apply migration job
kubectl create -f k8s/yomu/migration-job.yaml \
  --dry-run=client -o yaml | \
  sed "s/name: yomu-migration/name: ${JOB_NAME}/" | \
  kubectl apply -f -

# Wait for completion
kubectl wait --for=condition=complete --timeout=300s job/${JOB_NAME} -n yomu

# Check logs
kubectl logs job/${JOB_NAME} -n yomu

# Verify success
kubectl get job/${JOB_NAME} -n yomu
```

### 2. Automated Migration via GitHub Actions

Migrations run automatically during deployment via `.github/workflows/deploy-k3s.yml`:

1. **Push to main branch** triggers the workflow
2. **Manual approval required** for production environment
3. **Migration job executes** before application deployment
4. **Deployment proceeds** only if migration succeeds
5. **Auto-rollback** if migration fails

**Monitor deployment:**

```bash
# Watch GitHub Actions workflow
# Navigate to: https://github.com/TakashiAihara/yomu/actions

# Or check migration job status in K8s
kubectl get jobs -n yomu | grep migration

# View recent migration logs
kubectl logs -l app=yomu-migration -n yomu --tail=100
```

### 3. Check Migration Status

```bash
# View all migration jobs
kubectl get jobs -n yomu -l app=yomu-migration

# Check migration table in database
kubectl exec -it deployment/yomu-api -n yomu -- \
  sh -c 'psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations__ ORDER BY created_at DESC LIMIT 5;"'
```

## Rollback Procedures

### Local Development Rollback

Drizzle Kit doesn't auto-generate down migrations. For local development:

```bash
# Option 1: Restore from database backup
docker-compose down -v  # WARNING: Deletes all data
docker-compose up

# Option 2: Manual SQL rollback
docker-compose exec postgres psql -U yomu -d yomu
# Execute manual DROP/ALTER statements to revert changes
```

### Production Rollback

**Application Rollback** (if migration succeeded but app has issues):

```bash
# Rollback to previous deployment revision
kubectl rollout undo deployment/yomu-api -n yomu

# Or rollback to specific revision
kubectl rollout history deployment/yomu-api -n yomu
kubectl rollout undo deployment/yomu-api -n yomu --to-revision=<number>
```

**Database Rollback** (if migration failed or caused issues):

1. **Immediate action**: The GitHub Actions workflow automatically rolls back the application deployment if migration fails

2. **Manual database rollback** (if needed):

   ```bash
   # Connect to database
   kubectl exec -it deployment/yomu-api -n yomu -- sh
   
   # Inside pod, connect to PostgreSQL
   psql $DATABASE_URL
   
   # Manually revert schema changes
   # Example: DROP TABLE IF EXISTS new_table;
   ```

3. **Restore from backup** (for critical failures):

   ```bash
   # Restore database from latest backup
   # (Backup/restore procedures depend on your backup strategy)
   ```

## Troubleshooting

### Migration Fails with "Failed to acquire advisory lock"

**Cause**: Another migration is already running.

**Solution**:

```bash
# Check for running migration jobs
kubectl get jobs -n yomu -l app=yomu-migration

# If stuck, delete the old job
kubectl delete job/<job-name> -n yomu

# Check database for held locks
kubectl exec -it deployment/yomu-api -n yomu -- \
  sh -c 'psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE locktype = '\''advisory'\'';"'
```

### Migration Times Out (>30s)

**Cause**: Large data migration or slow database.

**Solution**:

1. Review migration SQL for optimization opportunities
2. Consider breaking into smaller migrations
3. Increase timeout in GitHub Actions workflow (currently 300s)

### Migration Succeeds but Application Fails

**Cause**: Schema-application mismatch.

**Solution**:

```bash
# Rollback application deployment
kubectl rollout undo deployment/yomu-api -n yomu

# Review migration and application code for compatibility
# Fix issues and redeploy
```

### "Cannot find migration files" Error

**Cause**: Migration files not included in Docker image.

**Solution**:

1. Ensure `drizzle/` directory is not in `.dockerignore`
2. Verify Dockerfile copies migration files
3. Rebuild Docker image

### Concurrent Migrations Conflict

**Cause**: Multiple migration jobs triggered simultaneously.

**Solution**:

- Advisory locks prevent this automatically
- If it occurs, check GitHub Actions for duplicate workflow runs
- Cancel duplicate workflows before they reach migration step

## Best Practices

1. **Always review generated migrations** before applying to production
2. **Test migrations in staging** before production deployment
3. **Keep migrations small and focused** - one logical change per migration
4. **Never modify applied migrations** - create new migrations instead
5. **Monitor migration duration** - alert if exceeding 30s threshold
6. **Maintain database backups** before major schema changes
7. **Use manual approval** for production migrations (already configured)

## Migration Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Modify schema.ts                                         │
│ 2. Run: pnpm --filter @yomu/api db:generate                │
│ 3. Review generated SQL in drizzle/migrations/             │
│ 4. Test locally: docker-compose up                         │
│ 5. Commit migration files to Git                           │
│ 6. Push to main branch                                     │
│ 7. GitHub Actions: Manual approval required                │
│ 8. Migration job executes in K8s                           │
│ 9. Application deploys if migration succeeds               │
│ 10. Monitor: kubectl logs job/<migration-job> -n yomu      │
└─────────────────────────────────────────────────────────────┘
```

## Additional Resources

- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle ORM Migrations Guide](https://orm.drizzle.team/docs/migrations)
- Project schema: `apps/api/src/shared/db/schema.ts`
- Migration script: `apps/api/src/shared/db/migrate.ts`
- K8s Job manifest: `k8s/yomu/migration-job.yaml`
- GitHub Actions workflow: `.github/workflows/deploy-k3s.yml`
