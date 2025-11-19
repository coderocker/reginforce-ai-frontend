# RegInforce AI Frontend - k0s/k3s Deployment Guide

This guide covers deploying the RegInforce AI Frontend specifically on k0s or k3s lightweight Kubernetes distributions.

## ✅ Compatibility Confirmation

Your Helm setup is **fully compatible** with both k0s and k3s! All resources used are standard Kubernetes APIs that both distributions support:

- ✅ **Deployments** - Standard apps/v1 API
- ✅ **Services** - Standard v1 API  
- ✅ **Ingress** - networking.k8s.io/v1 API
- ✅ **HPA** - autoscaling/v2 API
- ✅ **ConfigMaps** - Standard v1 API
- ✅ **ServiceAccounts** - Standard v1 API
- ✅ **NetworkPolicies** - networking.k8s.io/v1 API
- ✅ **PodDisruptionBudgets** - policy/v1 API

## 🚀 k3s Deployment (Recommended)

### 1. Install k3s with Traefik (Default)

```bash
# Install k3s (includes Traefik ingress controller)
curl -sfL https://get.k3s.io | sh -

# Get kubeconfig
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

### 2. Deploy with Traefik Ingress

Create a k3s-specific values file:

```bash
# Create k3s values override
cat > values-k3s.yaml << 'EOF'
# k3s-specific configuration
ingress:
  enabled: true
  className: "traefik"  # k3s default ingress controller
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    # Remove cert-manager annotation if not installed
    # cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: reginforce.local  # Use .local for testing
      paths:
        - path: /
          pathType: Prefix
  # Comment out TLS section if no cert-manager
  # tls:
  #   - secretName: reginforce-frontend-tls
  #     hosts:
  #       - reginforce.local

# Reduce resource requirements for lightweight setup
resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 64Mi

# Start with single replica for testing
replicaCount: 1

# Disable HPA for single-node setups
autoscaling:
  enabled: false

# Simplified network policy for k3s
networkPolicy:
  enabled: false  # Enable after testing basic functionality
EOF
```

### 3. Deploy the Application

```bash
# Deploy with k3s-specific values
helm upgrade --install reginforce-ai-frontend ./helm/reginforce-ai-frontend \
  --values values-k3s.yaml \
  --namespace default \
  --set image.repository=ghcr.io/coderocker/reginforce-ai-frontend \
  --set image.tag=latest \
  --wait --timeout=300s
```

## 🔧 k0s Deployment

### 1. Install k0s

```bash
# Download and install k0s
curl -sSLf https://get.k0s.sh | sudo sh

# Start k0s
sudo k0s install controller --single
sudo k0s start

# Get kubeconfig
sudo k0s kubeconfig admin > ~/.kube/config
```

### 2. Install Nginx Ingress Controller

```bash
# Install nginx ingress controller for k0s
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/baremetal/deploy.yaml

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

### 3. Deploy with Nginx Ingress

```bash
# Create k0s values override
cat > values-k0s.yaml << 'EOF'
# k0s-specific configuration
ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    # Remove SSL redirect for testing
    # nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: reginforce.local
      paths:
        - path: /
          pathType: Prefix

# Reduce resources for single-node setup
resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 64Mi

replicaCount: 1
autoscaling:
  enabled: false

networkPolicy:
  enabled: false
EOF

# Deploy
helm upgrade --install reginforce-ai-frontend ./helm/reginforce-ai-frontend \
  --values values-k0s.yaml \
  --namespace default \
  --set image.repository=ghcr.io/coderocker/reginforce-ai-frontend \
  --set image.tag=latest \
  --wait --timeout=300s
```

## 🔍 Quick Testing

### 1. Check Deployment Status

```bash
# Check pods
kubectl get pods -l app.kubernetes.io/name=reginforce-ai-frontend

# Check services
kubectl get svc -l app.kubernetes.io/name=reginforce-ai-frontend

# Check ingress
kubectl get ingress
```

### 2. Test Application

```bash
# Port forward for testing (if ingress not ready)
kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 &

# Test health endpoint
curl http://localhost:8080/health

# Test main application
curl http://localhost:8080/

# Stop port forward
pkill -f "kubectl port-forward"
```

### 3. Access via Ingress

```bash
# Get ingress IP (k3s)
kubectl get svc -n kube-system traefik

# Get ingress IP (k0s with nginx)
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Add to /etc/hosts for local testing
echo "INGRESS_IP reginforce.local" | sudo tee -a /etc/hosts

# Test via browser or curl
curl http://reginforce.local/
```

## ⚡ Performance Optimizations for k0s/k3s

### 1. Single-Node Configuration

```yaml
# values-single-node.yaml
replicaCount: 1

resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 64Mi

autoscaling:
  enabled: false

# Disable anti-affinity for single node
affinity: {}

# Disable PDB for single replica
podDisruptionBudget:
  enabled: false
```

### 2. Multi-Node Configuration

```yaml
# values-multi-node.yaml
replicaCount: 2

resources:
  limits:
    cpu: 300m
    memory: 384Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 4  # Reduced for smaller clusters

# Keep anti-affinity for better distribution
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - reginforce-ai-frontend
        topologyKey: kubernetes.io/hostname
```

## 🛠️ Makefile Commands for k0s/k3s

Add these to your Makefile or run directly:

```bash
# Deploy to k3s with Traefik
deploy-k3s: 
	helm upgrade --install reginforce-ai-frontend ./helm/reginforce-ai-frontend \
		--values values-k3s.yaml \
		--namespace default \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=300s

# Deploy to k0s with Nginx
deploy-k0s:
	helm upgrade --install reginforce-ai-frontend ./helm/reginforce-ai-frontend \
		--values values-k0s.yaml \
		--namespace default \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=300s

# Quick test deployment
test-local:
	kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 &
	sleep 3
	curl -f http://localhost:8080/health
	curl -f http://localhost:8080/
	pkill -f "kubectl port-forward"
```

## 🔧 Troubleshooting k0s/k3s

### Common Issues

1. **Ingress Controller Not Ready**
   ```bash
   # k3s - check Traefik
   kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik
   
   # k0s - check Nginx ingress
   kubectl get pods -n ingress-nginx
   ```

2. **Resource Constraints**
   ```bash
   # Check node resources
   kubectl top nodes
   kubectl describe nodes
   
   # Reduce resource requirements
   helm upgrade reginforce-ai-frontend ./helm/reginforce-ai-frontend \
     --reuse-values \
     --set resources.requests.cpu=25m \
     --set resources.requests.memory=32Mi
   ```

3. **Storage Issues**
   ```bash
   # k3s uses local-path by default
   kubectl get storageclass
   
   # If needed, install local-path provisioner
   kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
   ```

## 📊 Monitoring on k0s/k3s

### Lightweight Monitoring Stack

```bash
# Install metrics-server (if not present)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# For k3s, metrics-server might need --kubelet-insecure-tls
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

# Check metrics
kubectl top nodes
kubectl top pods
```

## 🎯 Production Considerations for k0s/k3s

### Security Hardening

```bash
# Enable network policies after basic testing
helm upgrade reginforce-ai-frontend ./helm/reginforce-ai-frontend \
  --reuse-values \
  --set networkPolicy.enabled=true

# Use cert-manager for TLS (optional)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Backup Strategy

```bash
# k3s backup
sudo k3s etcd-snapshot save

# k0s backup  
sudo k0s backup --save-path /tmp/k0s-backup.tar.gz
```

## ✅ Deployment Checklist

- [ ] Choose k0s or k3s based on your needs
- [ ] Install chosen distribution
- [ ] Install ingress controller (nginx for k0s, traefik included in k3s)
- [ ] Create appropriate values file (values-k3s.yaml or values-k0s.yaml)
- [ ] Build and push Docker image
- [ ] Deploy with Helm using distribution-specific values
- [ ] Test application via port-forward
- [ ] Configure ingress/DNS for external access
- [ ] Enable monitoring and logging
- [ ] Set up backup strategy

Your Helm charts are already well-structured for lightweight Kubernetes distributions. The main considerations are ingress controller choice and resource sizing for your specific hardware constraints.
