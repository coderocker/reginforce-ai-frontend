# RegInforce AI Frontend - Hostinger KVM 2 Deployment Guide

Optimized deployment configuration for **Hostinger KVM 2** (2 vCPUs, 8GB RAM, 100GB NVMe SSD).

## 🎯 **Perfect Fit for Your Server**

Your Hostinger KVM 2 specifications are ideal for running k3s with the RegInforce AI frontend:

- **✅ CPU**: 2 vCPUs sufficient for k3s + frontend + API workloads
- **✅ Memory**: 8GB provides comfortable headroom for containers and OS
- **✅ Storage**: 100GB NVMe SSD offers fast I/O for container images and data
- **✅ Network**: Hostinger's network infrastructure supports production workloads

## 📊 **Resource Allocation Strategy**

### **System Overhead**
- **OS (Ubuntu/Debian)**: ~1GB RAM, 0.2 CPU
- **k3s Control Plane**: ~512MB RAM, 0.3 CPU
- **Available for Apps**: ~6.5GB RAM, 1.5 CPU

### **Application Allocation**
- **Frontend**: 2-3 replicas, 256MB each = 512-768MB
- **Traefik Ingress**: ~128MB RAM, 0.1 CPU  
- **System Pods**: ~256MB RAM, 0.1 CPU
- **Buffer**: ~5GB RAM available for backend/database

## 🚀 **Optimized k3s Installation**

### **1. Server Preparation**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git make

# Configure system limits for k3s
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.inotify.max_user_instances=8192' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure swap (optional - k3s can run with swap)
sudo swapoff -a
sudo sed -i '/ swap / s/^\\(.*\\)$/#\\1/g' /etc/fstab
```

### **2. k3s Installation with Optimizations**

```bash
# Install k3s with optimized settings for your server
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC=\"--write-kubeconfig-mode 644 --cluster-init\" sh -s - server \\
  --kube-apiserver-arg=max-requests-inflight=400 \\
  --kube-apiserver-arg=max-mutating-requests-inflight=200 \\
  --kubelet-arg=max-pods=50 \\
  --kubelet-arg=pods-per-core=10

# Set up kubeconfig
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

# Verify installation
kubectl get nodes
kubectl get pods -A
```

## ⚙️ **Hostinger-Optimized Values**

Create a specific values file for your Hostinger setup:

```yaml
# values-hostinger.yaml
# Optimized for Hostinger KVM 2 (2 vCPU, 8GB RAM, 100GB NVMe)

# Multiple replicas to utilize both CPU cores
replicaCount: 2

image:
  repository: ghcr.io/coderocker/reginforce-ai-frontend
  pullPolicy: IfNotPresent
  tag: ""

# Hostinger-optimized resource allocation
resources:
  limits:
    cpu: 400m      # Max 40% of 1 CPU core per pod
    memory: 384Mi  # Conservative memory limit
  requests:
    cpu: 100m      # 10% CPU baseline
    memory: 128Mi  # Reasonable request

# Health checks optimized for SSD performance
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10  # Faster startup on SSD
  periodSeconds: 15
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 3   # Very fast ready check on SSD
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 2

# Enable autoscaling to utilize full server capacity
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 4           # Max 4 pods on 2 vCPU server
  targetCPUUtilizationPercentage: 60
  targetMemoryUtilizationPercentage: 70

# Anti-affinity disabled (single node)
affinity: {}

# Traefik ingress for Hostinger
ingress:
  enabled: true
  className: "traefik"
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    # Enable compression for better performance
    traefik.ingress.kubernetes.io/router.middlewares: default-compress@kubernetescrd
  hosts:
    - host: your-domain.com  # Replace with your actual domain
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: reginforce-frontend-tls
      hosts:
        - your-domain.com

# Enable network policy after initial setup
networkPolicy:
  enabled: false  # Enable after confirming basic functionality

# Pod disruption budget for rolling updates
podDisruptionBudget:
  enabled: true
  minAvailable: 1

# Environment optimized for production
env:
  - name: NODE_ENV
    value: "production"
  - name: REACT_APP_API_BASE_URL
    value: "https://api.your-domain.com"
```

## 🛠️ **Deployment Commands for Hostinger**

Add these commands to your workflow:

```bash
# Build optimized image
docker build --platform=linux/amd64 -t ghcr.io/coderocker/reginforce-ai-frontend:hostinger .

# Deploy to Hostinger k3s
helm upgrade --install reginforce-ai-frontend ./helm/reginforce-ai-frontend \\
  --values ./helm/reginforce-ai-frontend/values-hostinger.yaml \\
  --namespace production \\
  --create-namespace \\
  --set image.tag=hostinger \\
  --wait --timeout=600s

# Monitor deployment
kubectl get pods -n production -w
kubectl top pods -n production
kubectl top nodes
```

## 📈 **Performance Optimizations**

### **1. Container Image Optimization**
```dockerfile
# In your Dockerfile, add these optimizations for Hostinger
FROM node:20-alpine AS builder

# Enable build cache for faster rebuilds
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --no-audit

# Production stage with multi-layer caching
FROM nginx:alpine
RUN apk add --no-cache curl
# ... rest of Dockerfile
```

### **2. nginx Configuration for SSD**
```nginx
# Add to nginx.conf for NVMe SSD optimization
worker_processes 2;  # Match your 2 vCPUs
worker_connections 1024;

# Enable sendfile for SSD performance
sendfile on;
tcp_nopush on;
tcp_nodelay on;

# Optimize for your server
client_body_buffer_size 128k;
client_max_body_size 10m;
keepalive_timeout 65;
```

### **3. k3s Tuning**
```bash
# Optimize k3s for your server resources
sudo systemctl edit k3s
# Add these overrides:
[Service]
Environment="K3S_EXEC=--kubelet-arg=max-pods=50 --kubelet-arg=pods-per-core=10"
Environment="K3S_CLUSTER_INIT=true"

sudo systemctl daemon-reload
sudo systemctl restart k3s
```

## 🔧 **Monitoring & Resource Management**

### **Resource Monitoring**
```bash
# Monitor resource usage
watch -n 2 'kubectl top nodes && echo "---" && kubectl top pods -A'

# Check detailed resource allocation
kubectl describe node $(hostname)

# Monitor application logs
kubectl logs -f deployment/reginforce-ai-frontend -n production
```

### **Scaling Based on Load**
```bash
# Scale up during high traffic
kubectl scale deployment reginforce-ai-frontend --replicas=4 -n production

# Scale down during low traffic
kubectl scale deployment reginforce-ai-frontend --replicas=2 -n production
```

## 🚨 **Resource Alerts & Limits**

### **Set up Resource Quotas**
```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: hostinger-quota
  namespace: production
spec:
  hard:
    requests.cpu: "1500m"     # Reserve 1.5 CPU for apps
    requests.memory: "6Gi"    # Reserve 6GB for apps
    limits.cpu: "2000m"       # Max 2 CPU total
    limits.memory: "7Gi"      # Max 7GB total
    persistentvolumeclaims: "10"
    count/deployments.apps: "5"
```

## 💾 **Storage Configuration**

### **Optimize for NVMe SSD**
```yaml
# storageclass.yaml for better SSD performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hostinger-ssd
provisioner: rancher.io/local-path
parameters:
  hostPath: /var/lib/rancher/k3s/storage
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - noatime      # Optimize for SSD
  - nodiratime
```

## 🔐 **Security Hardening for Production**

```bash
# Firewall setup for Hostinger
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 6443/tcp    # k3s API server

# Fail2ban for SSH protection
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

## 📊 **Expected Performance**

With your Hostinger KVM 2 setup, you can expect:

- **Concurrent Users**: 500-1000 users comfortably
- **Response Time**: <200ms for static content
- **Throughput**: 100-200 requests/second
- **Uptime**: 99.9%+ with proper health checks
- **Resource Utilization**: 60-70% CPU, 70-80% RAM optimal

## 🎯 **Production Readiness Checklist**

- [ ] Domain DNS pointed to Hostinger server IP
- [ ] SSL certificates configured (Let's Encrypt recommended)
- [ ] Monitoring setup (Prometheus + Grafana optional)
- [ ] Backup strategy for persistent data
- [ ] Log rotation configured
- [ ] Security updates automated
- [ ] Resource quotas applied
- [ ] Network policies enabled

Your Hostinger KVM 2 server is perfectly sized for this deployment. The setup will be responsive, cost-effective, and easily scalable within the server's resources!
