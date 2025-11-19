# RegInforce AI Frontend - Kubernetes & Helm Setup

This repository includes a complete Kubernetes deployment setup using Helm charts and GitHub Actions CI/CD pipeline.

## 🚀 Quick Start

### Prerequisites
- Kubernetes cluster (v1.20+)
- Helm 3.8+
- Docker
- GitHub Container Registry access

### 1-Minute Deployment

```bash
# Clone and deploy
git clone <your-repo>
cd reginforce-ai-frontend

# Build and deploy (requires Docker and kubectl configured)
make full-build
make deploy-production
```

## 📁 Project Structure

```
├── Dockerfile                 # Multi-stage Docker build
├── nginx.conf                # Nginx configuration for SPA
├── helm/                     # Helm chart
│   └── reginforce-ai-frontend/
│       ├── Chart.yaml        # Helm chart metadata
│       ├── values.yaml       # Default configuration
│       └── templates/        # Kubernetes manifests
├── .github/workflows/        # GitHub Actions CI/CD
├── Makefile                  # Common operations
└── DEPLOYMENT.md            # Detailed deployment guide
```

## 🛠️ Available Commands

```bash
# Development
make dev              # Start development server
make test             # Run tests and linting

# Docker
make docker-build     # Build container image
make docker-test      # Test container locally
make docker-push      # Push to registry

# Kubernetes
make helm-deploy      # Deploy with Helm
make k8s-status       # Check deployment status
make k8s-logs         # View application logs

# CI/CD Setup
make ci-setup         # Show setup instructions
```

## 🔧 Configuration

### GitHub Secrets

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `KUBECONFIG_STAGING` | Base64 encoded kubeconfig for staging |
| `KUBECONFIG_PRODUCTION` | Base64 encoded kubeconfig for production |
| `SLACK_WEBHOOK` | Optional: Slack webhook for notifications |

### Environment Configuration

Update `helm/reginforce-ai-frontend/values.yaml`:

```yaml
ingress:
  hosts:
    - host: your-domain.com    # ← Change this
env:
  - name: REACT_APP_API_BASE_URL
    value: "https://your-api.com"  # ← Change this
```

## 🚀 CI/CD Pipeline

The GitHub Actions pipeline automatically:

1. **Tests** - Runs linting and type checking
2. **Builds** - Creates multi-arch Docker image
3. **Scans** - Security vulnerability scanning
4. **Deploys** - Deploys to staging/production based on branch

### Deployment Triggers

- `develop` branch → Staging environment
- `main` branch → Production environment  
- Release tags → Production with version tag
- Pull requests → Tests only

## 🏗️ Architecture

### Container Image
- **Base**: nginx:alpine (production-ready)
- **Size**: ~50MB (optimized multi-stage build)
- **Security**: Non-root user, read-only filesystem
- **Health**: Built-in health checks

### Kubernetes Resources
- **Deployment**: Rolling updates, health checks
- **Service**: Internal load balancing
- **Ingress**: SSL termination, routing
- **HPA**: Auto-scaling 2-10 replicas
- **PDB**: High availability guarantees
- **NetworkPolicy**: Security isolation

### Security Features
- Container security contexts
- Network policies
- Resource limits
- Vulnerability scanning
- TLS encryption
- Non-root execution

## 📊 Monitoring

### Health Checks
```bash
# Application health
curl https://your-domain.com/health

# Kubernetes status
make k8s-status
make k8s-logs
```

### Auto-scaling
- **CPU**: Scales at 70% utilization
- **Memory**: Scales at 80% utilization
- **Range**: 2-10 replicas

## 🔍 Troubleshooting

### Common Issues

1. **Build failures**:
   ```bash
   make test              # Check for code issues
   make docker-build      # Test local build
   ```

2. **Deployment failures**:
   ```bash
   make k8s-status        # Check pod status
   make k8s-logs          # View error logs
   make helm-rollback     # Rollback if needed
   ```

3. **Ingress issues**:
   ```bash
   kubectl get ingress -n production
   kubectl describe ingress reginforce-ai-frontend -n production
   ```

### Debug Commands
```bash
# Port forward for local access
make k8s-port-forward

# Describe resources
make k8s-describe

# Check events
kubectl get events -n production --sort-by=.metadata.creationTimestamp
```

## 🔄 Development Workflow

### Local Development
```bash
make dev-install       # Setup development environment
make dev               # Start dev server
make test              # Run tests before committing
```

### Testing Changes
```bash
make docker-build      # Build image locally
make docker-test       # Test container
make helm-lint         # Validate Helm chart
make helm-dry-run      # Test deployment
```

### Creating Releases
```bash
# Create and push a new release
make release VERSION=1.0.0

# This triggers production deployment via GitHub Actions
```

## 🌍 Multi-Environment Setup

### Staging Environment
```bash
make deploy-staging    # Deploy to staging
```
- Namespace: `staging`
- URL: `staging.reginforce.example.com`
- Auto-deploys from `develop` branch

### Production Environment
```bash
make deploy-production # Deploy to production
```
- Namespace: `production`  
- URL: `reginforce.example.com`
- Auto-deploys from `main` branch

## 📈 Performance & Scaling

### Resource Allocation
- **Requests**: 100m CPU, 128Mi memory
- **Limits**: 500m CPU, 512Mi memory
- **Production**: Higher limits for production workloads

### Scaling Strategy
- **HPA**: Automatic horizontal scaling
- **Resource-based**: CPU and memory targets
- **Pod Anti-Affinity**: Spread across nodes

## 🛡️ Security

### Container Security
- Non-root user (UID 1001)
- Read-only root filesystem
- Dropped capabilities
- Security scanning in CI/CD

### Network Security
- Network policies restrict traffic
- TLS encryption for all external traffic
- Internal service mesh ready

### Image Security
- Regular base image updates
- Vulnerability scanning with Trivy
- Minimal attack surface

## 📚 Additional Resources

- [Detailed Deployment Guide](./DEPLOYMENT.md)
- [Helm Chart Documentation](./helm/reginforce-ai-frontend/)
- [GitHub Actions Workflow](./.github/workflows/ci-cd.yaml)

## 🤝 Contributing

1. Create feature branch from `develop`
2. Make changes and test locally
3. Create pull request to `develop`
4. After review, merge triggers staging deployment
5. Promote to `main` for production deployment

## 📞 Support

- Check logs: `make k8s-logs`
- Health status: `make health-check`  
- Rollback: `make helm-rollback`
- Reset: `make clean && make dev-install`

---

**Ready to deploy?** Run `make ci-setup` for detailed setup instructions.
