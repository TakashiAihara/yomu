# K3s Deployment Guide

## Prerequisites

- K3s cluster running
  - k1 (192.168.0.41): Control Plane
  - k2 (192.168.0.42): Worker
  - k3 (192.168.0.43): Worker
- kubectl configured
- GitHub Actions self-hosted runner

## Setup

### 1. Create Secrets

```bash
# Copy example file
cp k8s/yomu/secret.yaml.example k8s/yomu/secret.yaml

# Edit with your actual values
vim k8s/yomu/secret.yaml

# Apply secrets
kubectl apply -f k8s/yomu/secret.yaml
```

### 2. Deploy Application

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy ConfigMap
kubectl apply -f k8s/yomu/configmap.yaml

# Deploy application
kubectl apply -f k8s/yomu/deployment.yaml
kubectl apply -f k8s/yomu/service.yaml

# Check status
kubectl get pods -n yomu
kubectl get svc -n yomu
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n yomu

# Check logs
kubectl logs -f deployment/yomu-api -n yomu

# Port forward for testing
kubectl port-forward svc/yomu-api 3000:80 -n yomu
```

## CI/CD

GitHub Actions automatically deploys to K3s when pushing to `main` branch.

### Self-hosted Runner Setup

See main README.md for runner setup instructions.

## Cluster Information

```
k1 (192.168.0.41): Control Plane
├── cores: 2
├── memory: 6GB
└── role: master

k2 (192.168.0.42): Worker
├── cores: 2
├── memory: 6GB
└── role: worker

k3 (192.168.0.43): Worker
├── cores: 2
├── memory: 6GB
└── role: worker
```

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name> -n yomu
kubectl logs <pod-name> -n yomu
```

### Check cluster health

```bash
kubectl get nodes
kubectl get pods -A
```

### Restart deployment

```bash
kubectl rollout restart deployment/yomu-api -n yomu
```
