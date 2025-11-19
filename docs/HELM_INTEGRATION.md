# Helm Chart Integration for CI/CD

## 🎯 **Why Use Helm Instead of Inline Manifests?**

Your CI/CD was using inline YAML manifests, but you already have a complete Helm chart! Here's why Helm is superior:

### **Problems with Inline Manifests**
- ❌ **Duplication**: Repeating YAML across environments
- ❌ **Hard to maintain**: Changes require workflow updates
- ❌ **No templating**: Static configurations
- ❌ **No rollbacks**: Manual rollback procedures
- ❌ **Configuration drift**: Different configs in different places

### **Benefits of Helm Charts**
- ✅ **DRY Principle**: Single source of truth
- ✅ **Templating**: Dynamic configuration with values
- ✅ **Environment-specific**: Different values files per environment
- ✅ **Built-in rollbacks**: `helm rollback` command
- ✅ **Release management**: Track deployments over time
- ✅ **Easy upgrades**: `helm upgrade` with diff preview

## 📊 **Before vs After Comparison**

### **Before: Inline Manifests (❌ Bad)**
```yaml
# In ci-cd.yaml - 100+ lines of hardcoded YAML
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reginforce-frontend  # Hardcoded
  namespace: production       # Hardcoded
spec:
  replicas: 2                # Hardcoded
  # ... 80 more lines of static config
EOF
```

### **After: Helm Chart (✅ Good)**
```yaml
# In ci-cd.yaml - Simple, flexible deployment
helm upgrade --install reginforce-frontend ./helm/reginforce-ai-frontend \
  --namespace production \
  --values ./helm/reginforce-ai-frontend/values-k3s.yaml \
  --set image.tag="${IMAGE_TAG}" \
  --set replicaCount=2
```

## 🛠️ **Updated CI/CD Workflow**

### **New Steps Added**
1. **Install Helm**: Added `azure/setup-helm@v4` action
2. **Helm Deploy**: Replaced 100+ lines of manifests with single `helm upgrade` command
3. **Helm Verification**: Use `helm status` for deployment verification

### **Helm Command Breakdown**
```bash
helm upgrade --install reginforce-frontend ./helm/reginforce-ai-frontend \
  --namespace production \              # Target namespace
  --create-namespace \                  # Create if doesn't exist
  --values ./helm/reginforce-ai-frontend/values-k3s.yaml \  # k3s-specific config
  --set image.tag="${IMAGE_TAG}" \      # Dynamic image from CI
  --set image.repository="ghcr.io/coderocker/reginforce-ai-frontend" \
  --set replicaCount=2 \                # Production replica count
  --set ingress.hosts[0].host="reginforce.example.com" \   # Your domain
  --set env.REACT_APP_API_BASE_URL="https://api.reginforce.example.com" \
  --set resources.requests.memory="64Mi" \    # Optimized for no-nginx
  --set resources.limits.memory="128Mi" \     # 50% less than before
  --wait \                              # Wait for deployment
  --timeout=300s                        # 5-minute timeout
```

## 📁 **Your Helm Chart Structure**

```
helm/reginforce-ai-frontend/
├── Chart.yaml                    # Chart metadata
├── values.yaml                  # Default values
├── values-k3s.yaml             # k3s-specific values (USED)
├── values-hostinger.yaml       # Hostinger-specific values
├── templates/
│   ├── deployment.yaml         # Main app deployment
│   ├── service.yaml           # Service definition
│   ├── ingress.yaml           # Traefik ingress
│   ├── configmap.yaml         # Configuration
│   ├── serviceaccount.yaml    # RBAC
│   ├── networkpolicy.yaml     # Security
│   └── _helpers.tpl           # Template helpers
```

## 🎛️ **Environment-Specific Values**

### **values-k3s.yaml (Production)**
```yaml
replicaCount: 1                    # Will override to 2 in CI/CD

image:
  repository: ghcr.io/coderocker/reginforce-ai-frontend
  pullPolicy: IfNotPresent
  tag: ""                          # Set dynamically in CI/CD

resources:
  limits:
    cpu: 200m
    memory: 256Mi                  # Will override to 128Mi (no-nginx)
  requests:
    cpu: 50m
    memory: 64Mi                   # Optimized for serve package

ingress:
  enabled: true
  className: "traefik"             # k3s default
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    cert-manager.io/cluster-issuer: "letsencrypt-prod"

env:
  - name: NODE_ENV
    value: "production"
  - name: REACT_APP_API_BASE_URL
    value: "http://api.reginforce.local"  # Overridden in CI/CD
```

## 🚀 **Deployment Benefits**

### **🔧 Operational Improvements**
- **Rollback capability**: `helm rollback reginforce-frontend 1`
- **Release history**: `helm history reginforce-frontend`
- **Diff preview**: `helm diff upgrade reginforce-frontend ./helm/reginforce-ai-frontend`
- **Status monitoring**: `helm status reginforce-frontend`

### **📈 Maintenance Benefits**
- **Single config source**: All k8s configs in Helm templates
- **Environment parity**: Same chart, different values files
- **Easy updates**: Change values file, not CI/CD workflow
- **Version control**: Helm chart versions track changes

### **🛡️ Security Benefits**
- **Immutable deployments**: Helm tracks what's deployed
- **Audit trail**: Release history shows who deployed what
- **Configuration validation**: Helm validates templates before apply
- **Rollback safety**: Can always rollback to previous version

## 📋 **Manual Helm Operations**

### **Local Development**
```bash
# Test Helm template rendering
helm template reginforce-frontend ./helm/reginforce-ai-frontend \
  --values ./helm/reginforce-ai-frontend/values-k3s.yaml

# Install to development namespace
helm install reginforce-frontend-dev ./helm/reginforce-ai-frontend \
  --namespace development \
  --create-namespace \
  --values ./helm/reginforce-ai-frontend/values-k3s.yaml \
  --set image.tag="latest"
```

### **Production Management**
```bash
# Check current deployment
helm status reginforce-frontend -n production

# View release history
helm history reginforce-frontend -n production

# Rollback to previous version
helm rollback reginforce-frontend 1 -n production

# Upgrade with new values
helm upgrade reginforce-frontend ./helm/reginforce-ai-frontend \
  --namespace production \
  --reuse-values \
  --set image.tag="new-version"
```

## 🎯 **Best Practices Applied**

1. **✅ Environment-specific values**: `values-k3s.yaml` for your server
2. **✅ Dynamic image tags**: Set via `--set image.tag` in CI/CD
3. **✅ Resource optimization**: 64Mi/128Mi for no-nginx container
4. **✅ Security contexts**: Non-root user, proper permissions
5. **✅ Health checks**: Liveness and readiness probes
6. **✅ SSL automation**: cert-manager + Let's Encrypt
7. **✅ Network policies**: Secure pod-to-pod communication

## 🚦 **Next Steps**

1. **✅ CI/CD Updated**: Now uses Helm instead of inline manifests
2. **📝 Update domain**: Change `reginforce.example.com` to your domain
3. **🚀 Deploy**: Push to trigger Helm-based deployment
4. **🔍 Monitor**: Use `helm status` to track deployment
5. **📊 Optimize**: Adjust values files as needed

Your CI/CD now leverages the full power of your existing Helm charts! 🎉
