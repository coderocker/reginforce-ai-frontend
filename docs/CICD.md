# CI/CD Documentation

## Overview

The RegInforce AI Frontend uses GitHub Actions for continuous integration and deployment with Docker images stored in GitHub Container Registry (GHCR).

## Workflows

### 1. Main CI/CD Pipeline (`.github/workflows/ci-cd.yaml`)

**Triggers:**
- Push to `main`, `develop`, or `mvp/*` branches
- Pull requests to `main` or `develop`
- Release publications

**Jobs:**
1. **Test** - Runs linting, type checking, and builds
2. **Build & Push** - Creates Docker images and pushes to GHCR
3. **Security Scan** - Trivy vulnerability scanning
4. **Deploy Staging** - Auto-deploy to staging on `develop` branch
5. **Deploy Production** - Auto-deploy to production on `main` branch
6. **Cleanup** - Removes old container images
7. **Notify** - Sends deployment notifications

### 2. Feature Branch CI (`.github/workflows/feature-ci.yaml`)

**Triggers:**
- Push to any branch except `main`/`develop`
- Pull requests

**Jobs:**
1. **Test** - Basic testing and validation
2. **Docker Test** - Test Docker build without pushing
3. **Security Check** - Quick security scan
4. **PR Comment** - Updates PR with CI status

### 3. Manual Deploy (`.github/workflows/manual-deploy.yaml`)

**Triggers:**
- Manual workflow dispatch

**Features:**
- Deploy any image tag to any environment
- Skip tests option for emergency deployments
- Image validation before deployment

## Container Registry

Images are stored in GitHub Container Registry:
- **Registry**: `ghcr.io`
- **Repository**: `ghcr.io/{owner}/reginforce-ai-frontend`

### Image Tags

- `latest` - Latest from main branch
- `develop` - Latest from develop branch
- `sha-{commit}` - Specific commit
- `v{version}` - Semantic version tags

## Docker Image

Built using multi-stage Dockerfile:
1. **Build Stage** - Node.js with pnpm for building
2. **Production Stage** - Nginx Alpine for serving

### Image Features

- Multi-architecture support (amd64, arm64)
- Non-root user execution
- Health checks included
- Optimized for production

## Environment Setup

### Required Secrets

```bash
# Kubernetes Configurations
KUBECONFIG_STAGING        # Base64 encoded kubeconfig for staging
KUBECONFIG_PRODUCTION     # Base64 encoded kubeconfig for production

# Optional Notifications
SLACK_WEBHOOK             # Slack webhook for deployment notifications
```

### Required Permissions

The GitHub token needs these permissions:
- `contents: read` - Read repository code
- `packages: write` - Push to container registry
- `security-events: write` - Upload security scan results
- `id-token: write` - OIDC token generation

## Local Development

### Build Docker Image

```bash
# Using npm script
pnpm docker:build

# Or directly
docker build -t reginforce-ai-frontend .
```

### Run Container Locally

```bash
# Using npm script
pnpm docker:run

# Or directly
docker run -p 8080:8080 reginforce-ai-frontend
```

### Test CI Pipeline Locally

```bash
# Install act (GitHub Actions runner)
# https://github.com/nektos/act

# Run tests
act -j test

# Run full pipeline (requires secrets)
act -s GITHUB_TOKEN={your_token}
```

## Deployment Environments

### Staging
- **URL**: https://staging.reginforce.example.com
- **Namespace**: `staging`
- **Auto-deploy**: On push to `develop` branch
- **Resources**: Standard allocation

### Production
- **URL**: https://reginforce.example.com
- **Namespace**: `production`  
- **Auto-deploy**: On push to `main` branch
- **Resources**: 3 replicas, 1GB memory limit

## Monitoring

### Container Registry Cleanup

- Keeps last 10 versions
- Removes untagged images automatically
- Runs after successful deployments

### Security Scanning

- **Tool**: Trivy
- **Frequency**: Every build
- **Coverage**: Critical and high vulnerabilities
- **Results**: Uploaded to GitHub Security tab

### Deployment Verification

- Rolling deployment status checks
- Pod health verification
- Ingress configuration validation

## Troubleshooting

### Failed Deployment

1. Check workflow logs in GitHub Actions
2. Verify Kubernetes cluster connectivity:
   ```bash
   kubectl get pods -n {namespace}
   kubectl describe deployment reginforce-ai-frontend -n {namespace}
   ```

### Image Not Found

1. Verify image exists:
   ```bash
   docker manifest inspect ghcr.io/{owner}/reginforce-ai-frontend:{tag}
   ```
2. Check container registry permissions
3. Ensure GITHUB_TOKEN has package read permissions

### Security Scan Failures

1. Review Trivy results in Security tab
2. Update base image if vulnerabilities found
3. Security issues don't block deployment (exit-code: 0)

## Best Practices

### Branch Strategy

- `main` - Production deployments
- `develop` - Staging deployments  
- `feature/*` or `mvp/*` - Feature development
- `hotfix/*` - Emergency fixes

### Container Security

- Non-root user (nginx:nginx)
- Read-only root filesystem
- Security context configured
- Regular base image updates

### Resource Management

- CPU and memory limits set
- Horizontal pod autoscaling enabled
- Pod disruption budgets configured
- Health checks implemented

## Manual Operations

### Emergency Deployment

Use the manual deploy workflow:
1. Go to Actions → Manual Deploy
2. Select environment and image tag
3. Choose whether to skip tests
4. Monitor deployment progress

### Rollback Deployment

```bash
# Via Helm
helm rollback reginforce-ai-frontend -n production

# Via kubectl
kubectl rollout undo deployment/reginforce-ai-frontend -n production
```

### Scale Application

```bash
# Scale replicas
kubectl scale deployment reginforce-ai-frontend --replicas=5 -n production

# Or use Makefile
make fullstack-scale-up
```

## Contact

For CI/CD issues or questions:
- Check GitHub Actions logs first
- Review this documentation
- Create issue in repository
