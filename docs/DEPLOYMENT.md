# RegInforce AI Frontend - Kubernetes Deployment Guide

This guide covers deploying the RegInforce AI Frontend to Kubernetes using Helm charts and GitHub Actions CI/CD.

## Prerequisites

- Kubernetes cluster (1.20+)
- Helm 3.8+
- kubectl configured
- GitHub Container Registry access
- Nginx Ingress Controller
- cert-manager (for TLS certificates)

## Quick Start

### 1. Setup GitHub Secrets

Add the following secrets to your GitHub repository:

```bash
# Kubernetes configs (base64 encoded kubeconfig files)
KUBECONFIG_STAGING
KUBECONFIG_PRODUCTION

# Optional: Slack notifications
SLACK_WEBHOOK
```

### 2. Configure Values

Update `helm/reginforce-ai-frontend/values.yaml`:

```yaml
# Update these values for your environment
ingress:
  hosts:
    - host: your-domain.com  # Replace with your domain
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: reginforce-frontend-tls
      hosts:
        - your-domain.com  # Replace with your domain

env:
  - name: REACT_APP_API_BASE_URL
    value: "https://your-api-domain.com"  # Replace with your API URL
```

### 3. Deploy via GitHub Actions

The CI/CD pipeline automatically triggers on:

- **Push to `develop`**: Deploys to staging
- **Push to `main`**: Deploys to production
- **Pull Requests**: Runs tests only
- **Releases**: Deploys to production with release tag

### 4. Manual Deployment

```bash
# Build and push image
docker build -t ghcr.io/coderocker/reginforce-ai-frontend:latest .
docker push ghcr.io/coderocker/reginforce-ai-frontend:latest

# Deploy with Helm
helm upgrade --install reginforce-ai-frontend ./helm/reginforce-ai-frontend \
  --namespace production \
  --create-namespace \
  --set image.tag=latest \
  --set ingress.hosts[0].host=your-domain.com
```

## Architecture

### Container Image

- **Base Image**: nginx:alpine
- **Build Process**: Multi-stage build with Node.js 20
- **Security**: Non-root user (nginx:nginx, UID 1001)
- **Port**: 8080 (non-privileged)
- **Health Check**: `/health` endpoint

### Kubernetes Resources

- **Deployment**: Manages pod replicas with rolling updates
- **Service**: ClusterIP service for internal communication
- **Ingress**: Nginx ingress for external access with TLS
- **HPA**: Horizontal Pod Autoscaler (2-10 replicas)
- **PDB**: Pod Disruption Budget for high availability
- **NetworkPolicy**: Network security policies
- **ServiceAccount**: Dedicated service account with minimal permissions

### Security Features

- **Container Security Context**: Non-root user, read-only filesystem
- **Pod Security Context**: fsGroup 1001, non-root enforcement
- **Network Policies**: Ingress/egress traffic control
- **Resource Limits**: CPU and memory constraints
- **Security Scanning**: Trivy vulnerability scanning in CI/CD

## Monitoring & Observability

### Health Checks

```bash
# Readiness probe
curl http://pod-ip:8080/health

# Liveness probe
curl http://pod-ip:8080/health
```

### Logs

```bash
# Application logs
kubectl logs -f deployment/reginforce-ai-frontend -n production

# Nginx access logs
kubectl logs -f deployment/reginforce-ai-frontend -n production | grep access
```

### Metrics

The HPA monitors:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `REACT_APP_API_BASE_URL` | Backend API URL | Required |

### Helm Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Container image repository | `ghcr.io/coderocker/reginforce-ai-frontend` |
| `image.tag` | Container image tag | `""` (uses appVersion) |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `ingress.enabled` | Enable ingress | `true` |
| `autoscaling.enabled` | Enable HPA | `true` |

## Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**
   ```bash
   kubectl describe pod -l app.kubernetes.io/name=reginforce-ai-frontend
   kubectl logs -f deployment/reginforce-ai-frontend
   ```

2. **Ingress not working**
   ```bash
   kubectl get ingress
   kubectl describe ingress reginforce-ai-frontend
   ```

3. **Health check failures**
   ```bash
   kubectl port-forward deployment/reginforce-ai-frontend 8080:8080
   curl http://localhost:8080/health
   ```

### Rollback

```bash
# Rollback to previous version
helm rollback reginforce-ai-frontend

# Rollback to specific revision
helm rollback reginforce-ai-frontend 1
```

## Development

### Local Testing

```bash
# Build and test image locally
docker build -t reginforce-frontend:local .
docker run -p 8080:8080 reginforce-frontend:local

# Test with Helm
helm template reginforce-ai-frontend ./helm/reginforce-ai-frontend
helm lint ./helm/reginforce-ai-frontend
```

### Helm Testing

```bash
# Dry run
helm install --dry-run --debug reginforce-ai-frontend ./helm/reginforce-ai-frontend

# Template rendering
helm template reginforce-ai-frontend ./helm/reginforce-ai-frontend --values ./helm/reginforce-ai-frontend/values.yaml
```

## Production Considerations

### Scaling

- **HPA**: Automatically scales 2-10 replicas based on CPU/memory
- **Resource Requests**: Set appropriate requests for accurate scheduling
- **Anti-Affinity**: Spreads pods across nodes for high availability

### Security

- **Network Policies**: Restrict traffic to necessary communications only
- **Security Context**: Run as non-root user with minimal privileges
- **TLS**: Use cert-manager for automatic certificate management
- **Vulnerability Scanning**: Continuous security scanning in CI/CD

### Monitoring

- **Health Checks**: Configure appropriate timeouts and thresholds
- **Logging**: Centralized log collection with structured logging
- **Metrics**: Monitor application and infrastructure metrics
- **Alerting**: Set up alerts for critical failures and performance issues

## Support

For issues and questions:
- Check the [troubleshooting section](#troubleshooting)
- Review Kubernetes events: `kubectl get events --sort-by=.metadata.creationTimestamp`
- Check pod logs: `kubectl logs -f deployment/reginforce-ai-frontend`
