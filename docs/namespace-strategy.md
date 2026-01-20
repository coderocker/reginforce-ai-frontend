# Namespace Configuration Strategy

## Environment-Based Namespaces

This project uses environment-prefixed, short namespaces for better organization:

### Namespace Naming Convention
- **Production**: `prod-regai`
- **Development**: `dev-regai` 
- **Staging**: `stage-regai` (if needed)

### Dynamic Configuration

The namespace is determined by the deployment context:

#### CI/CD Pipeline (ci-cd.yaml)
```yaml
env:
  ENVIRONMENT: ${{ github.ref_name == 'main' && 'prod' || 'dev' }}
  NAMESPACE: ${{ github.ref_name == 'main' && 'prod-regai' || 'dev-regai' }}
```

**Branch Mapping**:
- `main` branch → `prod-regai` namespace (production)
- All other branches → `dev-regai` namespace (development)

#### Manual Deploy (manual-deploy.yaml)
```yaml
env:
  ENVIRONMENT: 'prod'
  NAMESPACE: 'prod-regai'
```

Fixed to production environment only.

#### Feature CI (feature-ci.yaml)
```yaml
env:
  ENVIRONMENT: 'dev'
  NAMESPACE: 'dev-regai'
```

Fixed to development environment for feature branch testing.

### Service Communication

Services now use external API URL from GitHub environment variables:
```yaml
API_BASE_URL: "${{ vars.API_BASE_URL }}"  # http://reginforceai-api.mahahrishi.com
```

**Legacy Internal Communication** (deprecated):
```yaml
# Old internal cluster DNS (no longer used)
API_BASE_URL: "http://reginforce-api-service.${{ env.NAMESPACE }}.svc.cluster.local:8000"
```

### Resource Configuration

Resources are allocated based on environment:
- **Production** (`prod-regai`): 2 replicas, higher resource limits
- **Development** (`dev-regai`): 1 replica, lower resource limits

### Ingress Configuration

Hostnames are environment-specific:
- **Production**: `reginforce.example.com` 
- **Development**: `dev.reginforce.example.com`

## Benefits

1. **Clear Separation**: Different environments are isolated
2. **Short Names**: Easy to type and remember (`prod-regai` vs `reg-ai-app`)
3. **Scalable**: Easy to add new environments (e.g., `stage-regai`)
4. **Dynamic**: Automatically determined by branch/context
5. **Consistent**: Same pattern across all workflows

## Usage Examples

### Check Deployments
```bash
# Production
kubectl get pods -n prod-regai

# Development  
kubectl get pods -n dev-regai
```

### Port Forward for Testing
```bash
# Production API
kubectl port-forward -n prod-regai svc/reginforce-api-service 8000:8000

# Development API
kubectl port-forward -n dev-regai svc/reginforce-api-service 8000:8000
```

### Logs
```bash
# Production frontend logs
kubectl logs -n prod-regai deployment/reginforce-frontend

# Development frontend logs
kubectl logs -n dev-regai deployment/reginforce-frontend
```
