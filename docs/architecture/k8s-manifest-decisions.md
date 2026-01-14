# Kubernetes Manifest Design Decisions

## Overview

This document outlines the key decisions for managing Kubernetes manifests and deployment configurations for the Yomu application.

## Design Principles

### 1. Self-Contained Repository

**Decision**: All Kubernetes manifests, including dependencies (PostgreSQL, Valkey), are stored in the yomu repository under `k8s/`.

**Rationale**:
- **Single source of truth**: Everything needed to deploy yomu is in one repository
- **Atomic changes**: Application code changes and infrastructure changes can be deployed together
- **Version coupling**: Dependency versions are tracked alongside application versions
- **Independence**: No need to modify infrastructure repository (homelab-k3s) for application changes

**Repository Structure**:
```
yomu/
├── apps/               # Application source code
├── k8s/               # All Kubernetes manifests
│   ├── namespace.yaml
│   ├── postgres/      # PostgreSQL dependency
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── valkey/        # Valkey (Redis) dependency
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── yomu/          # Application itself
│       ├── deployment.yaml
│       ├── service.yaml
│       └── configmap.yaml
└── docs/
```

### 2. Dependency Management Philosophy

**Decision**: Application repository owns and manages ALL its dependencies.

**What This Means**:
- PostgreSQL manifests are in yomu repository, not in a shared "database" repository
- Valkey manifests are in yomu repository, not in a shared "cache" repository
- If yomu needs RabbitMQ tomorrow, those manifests go in yomu repository

**Alternatives Considered**:

#### Shared Infrastructure Repository (Rejected)
Store PostgreSQL, Valkey, etc. in homelab-k3s or a separate "shared-services" repository.

**Reasons for Rejection**:
- ❌ Creates tight coupling between applications
- ❌ Requires infrastructure repository changes for application needs
- ❌ Version conflicts when multiple apps need different PostgreSQL versions
- ❌ Unclear ownership: who owns the "shared" PostgreSQL?
- ❌ Deployment orchestration complexity (which deploys first?)

#### Helm Charts with External Dependencies (Rejected)
Use Helm chart dependencies to pull in PostgreSQL, Valkey charts.

**Reasons for Rejection**:
- ❌ Adds Helm as a dependency
- ❌ Less transparency (chart contents not visible in git)
- ❌ More complex debugging
- ❌ Overkill for simple, stable dependencies

**Benefits of Current Approach**:
- ✅ **Clear ownership**: Yomu team owns all yomu infrastructure
- ✅ **Version control**: PostgreSQL version changes are explicit git commits
- ✅ **Isolation**: Different apps can use different PostgreSQL versions
- ✅ **Simplicity**: Plain YAML, no templating complexity
- ✅ **Atomic deployments**: App + dependencies deploy together via ArgoCD

### 3. Configuration Management

**Decision**: Use ConfigMaps for non-sensitive configuration, separate Secrets for sensitive data.

**ConfigMap** (`k8s/yomu/configmap.yaml`):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: yomu-config
  namespace: yomu
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  DATABASE_URL: "postgresql://yomu:yomu@postgres:5432/yomu"
  VALKEY_URL: "redis://valkey:6379"
```

**Secret** (created manually, not in git):
```bash
kubectl create secret generic yomu-secrets -n yomu \
  --from-literal=GOOGLE_CLIENT_ID=xxx \
  --from-literal=GOOGLE_CLIENT_SECRET=xxx \
  --from-literal=SESSION_SECRET=xxx
```

**Why DATABASE_URL is in ConfigMap**:
- Contains internal service names (postgres, valkey) - not sensitive
- No external access to cluster network
- Password is placeholder for development (yomu:yomu)
- Production would use managed database with Secret-based credentials

**Sensitive Data (in Secret)**:
- Google OAuth credentials
- Session secrets
- Production database credentials (if using external database)
- API keys for external services

### 4. Service Discovery

**Decision**: Use Kubernetes DNS for service discovery with short names.

**Examples**:
- `postgres:5432` (not `postgres.yomu.svc.cluster.local:5432`)
- `valkey:6379` (not `valkey.yomu.svc.cluster.local:6379`)

**Rationale**:
- Shorter, more readable
- Works within same namespace
- Less coupling to Kubernetes internals
- Easier to run locally (docker-compose uses same names)

### 5. Namespace Strategy

**Decision**: Single namespace (`yomu`) for application and all its dependencies.

**Benefits**:
- Simplified DNS (short service names work)
- Easier RBAC management
- Logical grouping of related resources
- Simplified ArgoCD Application definition

**When to Use Multiple Namespaces**:
- Multi-tenancy requirements
- Different access control needs
- Resource quota separation
- Extremely large applications with sub-systems

### 6. Deployment Workflow

**Development Flow**:
1. Make code changes locally
2. Test with docker-compose (uses same service names)
3. Push to main branch
4. GitHub Actions builds and pushes Docker image to GHCR
5. Update k8s manifest with new image tag (or use `:latest` for rolling updates)
6. ArgoCD automatically syncs within 3 minutes (or manual sync)

**Infrastructure Flow**:
1. Need to add new dependency (e.g., RabbitMQ)
2. Create `k8s/rabbitmq/` directory with manifests
3. Update `k8s/yomu/configmap.yaml` with `RABBITMQ_URL`
4. Push to main
5. ArgoCD syncs all changes together

**No homelab-k3s involvement** for either flow.

### 7. Why No Kustomize or Helm

**Decision**: Use plain Kubernetes YAML manifests.

**Rationale**:
- Application is simple enough that templating adds complexity without benefit
- All deployments go to same cluster (no multi-environment templating needed)
- Plain YAML is easier to understand and debug
- GitOps with ArgoCD handles most of what Kustomize would provide

**When to Reconsider**:
- Multi-environment deployments (dev/staging/prod with different values)
- Need for sophisticated overlays
- Complex configuration reuse across many similar apps
- Team already familiar with Helm/Kustomize

### 8. Dependency Version Strategy

**PostgreSQL**:
- **Current**: `postgres:16-alpine`
- **Update strategy**: Explicit version bumps with testing
- **Pin to minor version** when stability is critical (e.g., `postgres:16.1-alpine`)

**Valkey**:
- **Current**: `valkey/valkey:8-alpine`
- **Update strategy**: Compatible with Redis 7.x clients
- **Pin to minor version** in production

**Yomu API**:
- **Current**: `ghcr.io/takashiaihara/yomu-api:latest`
- **Development**: Use `:latest` for automatic rolling updates
- **Production**: Use git SHA tags (e.g., `:sha-abc123`) for reproducibility

### 9. Resource Management

**Resource Limits** (defined in deployment manifests):

**PostgreSQL**:
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Valkey**:
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Yomu API** (per replica):
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Rationale**:
- Requests guarantee minimum resources
- Limits prevent resource hogging
- Values based on observed usage patterns
- Tune as application grows

### 10. Storage Strategy

**PostgreSQL Storage**:
- **Type**: PersistentVolumeClaim
- **Size**: 10Gi
- **Access Mode**: ReadWriteOnce
- **Rationale**: Stateful data requires persistent storage

**Valkey Storage**:
- **Type**: None (ephemeral)
- **Rationale**: Cache data, can be rebuilt, no persistence needed

**When Data Grows**:
- Increase PVC size (requires storage class supporting volume expansion)
- Or migrate to managed database service (RDS, CloudSQL, etc.)

## Trade-offs

### Current Approach Benefits:
1. ✅ Complete autonomy - no dependency on infrastructure team
2. ✅ Clear ownership - yomu team owns everything
3. ✅ Atomic changes - app + infra changes deploy together
4. ✅ Version transparency - all versions visible in git
5. ✅ Simple deployment - one ArgoCD Application

### Current Approach Limitations:
1. ❌ Dependency duplication if multiple apps need PostgreSQL
2. ❌ No shared resource pooling
3. ❌ Each app manages its own database backup strategy

**Mitigation**: For homelab with 1-5 apps, benefits far outweigh limitations.

## Migration Path

**If Shared Dependencies Become Necessary** (e.g., 10+ apps all need PostgreSQL):

1. Create separate `database-platform` repository
2. Deploy shared PostgreSQL cluster
3. Update yomu to use external DATABASE_URL
4. Remove `k8s/postgres/` from yomu repository
5. Keep yomu-specific tables in shared instance

**Threshold**: Consider this only when:
- 5+ applications need same dependency
- Resource utilization is wasteful (5 separate PostgreSQL instances)
- DBA team wants centralized management

For now, self-contained approach is optimal.

## Related Documentation

- [ArgoCD Integration](../../k8s/README.md)
- [Local Development with Docker Compose](../../README.md)
- [Environment Variables](.env.example)

## Revision History

- 2026-01-14: Initial documentation of k8s manifest design decisions
