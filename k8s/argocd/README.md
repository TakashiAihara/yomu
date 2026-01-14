# ArgoCD Application Definition

This directory contains the ArgoCD Application definition for Yomu.

## Deployment

### Prerequisites

- ArgoCD installed in the cluster
- kubectl configured to access the cluster

### Deploy Yomu Application

```bash
# Apply the Application definition
kubectl apply -f k8s/argocd/application.yaml

# Verify
kubectl get application yomu -n argocd

# Check sync status
kubectl get application yomu -n argocd -o jsonpath='{.status.sync.status}'
```

### Manual Sync (if needed)

```bash
# Trigger manual sync
kubectl patch application yomu -n argocd \
  --type merge \
  -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{}}}'
```

## What This Does

This Application definition tells ArgoCD to:

1. Watch the `k8s/yomu/` directory in this repository
2. Automatically deploy changes to the `yomu` namespace
3. Keep the cluster in sync with Git (GitOps)
4. Auto-create the namespace if it doesn't exist

## Automatic Sync

With `automated: true`, ArgoCD will:

- Sync every 3 minutes (default)
- Automatically apply changes from Git
- Prune resources removed from Git
- Self-heal if manual changes are made to the cluster
