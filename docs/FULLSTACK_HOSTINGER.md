# RegInforce AI Full Stack - Hostinger KVM 2 Deployment

Complete deployment guide for running **Frontend + Backend + PostgreSQL + Redis** on Hostinger KVM 2 (2 vCPUs, 8GB RAM, 100GB NVMe).

## 🎯 **Full Stack Resource Allocation**

### **Optimized Resource Distribution for 8GB RAM / 2 vCPU:**

| Component | Replicas | CPU Request | CPU Limit | RAM Request | RAM Limit | Total RAM |
|-----------|----------|-------------|-----------|-------------|-----------|-----------|
| **k3s System** | - | 300m | - | 1.0GB | - | 1.0GB |
| **Frontend** | 2 | 50m | 200m | 64Mi | 256Mi | 512Mi |
| **Backend Python** | 2 | 100m | 400m | 128Mi | 512Mi | 1.0GB |
| **PostgreSQL** | 1 | 100m | 500m | 256Mi | 1.5GB | 1.5GB |
| **Redis** | 1 | 50m | 200m | 64Mi | 256Mi | 256Mi |
| **Traefik/System** | - | 100m | - | 256Mi | - | 256Mi |
| **Available Buffer** | - | - | - | - | - | **3.5GB** |

### **Total Allocation:**
- **CPU**: ~700m requests, 1.3 CPU limits (sustainable load)
- **RAM**: ~4.5GB used, **3.5GB buffer** for traffic spikes
- **Storage**: Apps use ~20-30GB, **70GB+ available** for data

## 🚀 **Complete k3s Setup Script**

Create a setup script for your Hostinger server:

```bash
#!/bin/bash
# setup-hostinger-k3s.sh - Complete k3s setup for full stack

echo "=== Hostinger KVM 2 - Full Stack k3s Setup ==="

# System preparation
echo "Step 1: System preparation..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git make htop iotop

# System optimizations for full stack
echo "Step 2: System optimizations..."
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.inotify.max_user_instances=8192' | sudo tee -a /etc/sysctl.conf
echo 'net.core.somaxconn=65535' | sudo tee -a /etc/sysctl.conf
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure swap for database workloads
echo "Step 3: Swap configuration..."
sudo swapoff -a
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Install k3s with full stack optimizations
echo "Step 4: Installing k3s..."
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -s - server \\
  --cluster-init \\
  --kube-apiserver-arg=max-requests-inflight=800 \\
  --kube-apiserver-arg=max-mutating-requests-inflight=400 \\
  --kubelet-arg=max-pods=110 \\
  --kubelet-arg=pods-per-core=20 \\
  --kubelet-arg=image-gc-high-threshold=85 \\
  --kubelet-arg=image-gc-low-threshold=80

# Setup kubeconfig
echo "Step 5: Kubeconfig setup..."
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Install Helm
echo "Step 6: Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add Bitnami repo for databases
echo "Step 7: Adding Helm repositories..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

echo "=== k3s Full Stack Setup Complete ==="
kubectl get nodes
kubectl get pods -A
```

## 📊 **Database Configurations**

### **PostgreSQL Optimized for 8GB RAM**

```yaml
# postgresql-values.yaml
global:
  postgresql:
    auth:
      enablePostgresUser: true
      postgresPassword: "reginforce-secure-password-123"
      username: "reginforce"
      password: "reginforce-user-password-123"
      database: "reginforce_db"

primary:
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "1536Mi"  # 1.5GB for PostgreSQL
      cpu: "500m"
  
  persistence:
    enabled: true
    size: "20Gi"  # 20GB for database storage
    storageClass: "local-path"
  
  # PostgreSQL tuning for 8GB host
  initdb:
    scripts:
      tune-postgresql.sql: |
        -- Optimize PostgreSQL for 8GB RAM host
        ALTER SYSTEM SET shared_buffers = '256MB';
        ALTER SYSTEM SET effective_cache_size = '1GB';
        ALTER SYSTEM SET maintenance_work_mem = '64MB';
        ALTER SYSTEM SET checkpoint_completion_target = 0.9;
        ALTER SYSTEM SET wal_buffers = '16MB';
        ALTER SYSTEM SET default_statistics_target = 100;
        ALTER SYSTEM SET random_page_cost = 1.1;
        ALTER SYSTEM SET effective_io_concurrency = 200;
        SELECT pg_reload_conf();

readReplicas:
  replicaCount: 0  # No read replicas on single server
```

### **Redis Optimized Configuration**

```yaml
# redis-values.yaml
global:
  redis:
    password: "redis-secure-password-123"

master:
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "256Mi"
      cpu: "200m"
  
  persistence:
    enabled: true
    size: "2Gi"
    storageClass: "local-path"

replica:
  replicaCount: 0  # No Redis replicas on single server

# Redis configuration optimizations
configmap: |
  # Redis config for 256MB limit
  maxmemory 200mb
  maxmemory-policy allkeys-lru
  save 900 1
  save 300 10
  save 60 10000
  tcp-keepalive 60
  timeout 300
```

## 🐍 **Backend Python App Configuration**

Create Helm values for your Python backend:

```yaml
# backend-values.yaml - For your Python backend
replicaCount: 2

image:
  repository: ghcr.io/coderocker/reginforce-ai-backend
  tag: latest
  pullPolicy: IfNotPresent

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "400m"

env:
  - name: DATABASE_URL
    value: "postgresql://reginforce:reginforce-user-password-123@postgresql:5432/reginforce_db"
  - name: REDIS_URL
    value: "redis://:redis-secure-password-123@redis-master:6379/0"
  - name: ENVIRONMENT
    value: "production"
  - name: WORKERS
    value: "2"  # Match CPU cores

service:
  type: ClusterIP
  port: 8000

ingress:
  enabled: true
  className: "traefik"
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
  hosts:
    - host: api.your-domain.com
      paths:
        - path: /
          pathType: Prefix

livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /ready
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10
```

## 🔧 **Updated Frontend Configuration**

Update the frontend values to work with the full stack:

```yaml
# Updated values-hostinger-fullstack.yaml
replicaCount: 2  # Reduced for full stack

resources:
  requests:
    memory: "64Mi"   # Reduced for full stack
    cpu: "50m"       # Reduced for full stack
  limits:
    memory: "256Mi"  # Reduced for full stack
    cpu: "200m"      # Reduced for full stack

env:
  - name: REACT_APP_API_BASE_URL
    value: "https://api.your-domain.com"  # Point to backend
  - name: NODE_ENV
    value: "production"

autoscaling:
  enabled: true
  minReplicas: 1      # Reduced minimum
  maxReplicas: 3      # Reduced maximum for full stack
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

## 🚀 **Complete Deployment Commands**

Add these to your Makefile:

```bash
# Full stack deployment targets
deploy-fullstack-hostinger: ## Deploy complete stack to Hostinger KVM 2
	@echo "Deploying full RegInforce AI stack to Hostinger..."
	
	@echo "Step 1: Deploying PostgreSQL..."
	helm upgrade --install postgresql bitnami/postgresql \\
		--values postgresql-values.yaml \\
		--namespace production \\
		--create-namespace \\
		--wait --timeout=600s
	
	@echo "Step 2: Deploying Redis..."
	helm upgrade --install redis bitnami/redis \\
		--values redis-values.yaml \\
		--namespace production \\
		--wait --timeout=300s
	
	@echo "Step 3: Waiting for databases to be ready..."
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n production --timeout=300s
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n production --timeout=300s
	
	@echo "Step 4: Deploying Backend..."
	helm upgrade --install reginforce-backend ./helm/reginforce-backend \\
		--values backend-values.yaml \\
		--namespace production \\
		--wait --timeout=600s
	
	@echo "Step 5: Deploying Frontend..."
	helm upgrade --install reginforce-frontend ./helm/reginforce-ai-frontend \\
		--values values-hostinger-fullstack.yaml \\
		--namespace production \\
		--wait --timeout=300s
	
	@echo "Full stack deployment complete!"
	make fullstack-status

fullstack-status: ## Check full stack status
	@echo "=== Full Stack Status ==="
	kubectl get pods -n production
	kubectl get svc -n production
	kubectl get ingress -n production
	@echo "=== Resource Usage ==="
	kubectl top nodes
	kubectl top pods -n production

fullstack-logs: ## View logs from all components
	@echo "Choose component logs:"
	@echo "1. Frontend: make frontend-logs"
	@echo "2. Backend: make backend-logs"
	@echo "3. PostgreSQL: make postgres-logs"
	@echo "4. Redis: make redis-logs"

frontend-logs: ## Frontend logs
	kubectl logs -f deployment/reginforce-frontend -n production

backend-logs: ## Backend logs
	kubectl logs -f deployment/reginforce-backend -n production

postgres-logs: ## PostgreSQL logs
	kubectl logs -f statefulset/postgresql -n production

redis-logs: ## Redis logs
	kubectl logs -f statefulset/redis-master -n production

fullstack-scale-down: ## Scale down for maintenance
	kubectl scale deployment reginforce-frontend --replicas=1 -n production
	kubectl scale deployment reginforce-backend --replicas=1 -n production

fullstack-scale-up: ## Scale up for traffic
	kubectl scale deployment reginforce-frontend --replicas=2 -n production
	kubectl scale deployment reginforce-backend --replicas=2 -n production

fullstack-backup: ## Backup databases
	@echo "Creating PostgreSQL backup..."
	kubectl exec -it statefulset/postgresql -n production -- pg_dump -U reginforce reginforce_db > backup-$(shell date +%Y%m%d).sql
	@echo "Creating Redis backup..."
	kubectl exec -it statefulset/redis-master -n production -- redis-cli --rdb /tmp/backup.rdb
	kubectl cp production/redis-master-0:/tmp/backup.rdb redis-backup-$(shell date +%Y%m%d).rdb

fullstack-monitor: ## Monitor resource usage
	watch -n 5 'echo "=== Nodes ===" && kubectl top nodes && echo "=== Pods ===" && kubectl top pods -n production && echo "=== Services ===" && kubectl get svc -n production'
```

## 📈 **Performance Expectations**

With the full stack on Hostinger KVM 2:

### **Concurrent Capacity:**
- **Light Load**: 200-300 concurrent users
- **Normal Load**: 100-200 concurrent users  
- **Peak Load**: 50-100 concurrent users (with caching)

### **Response Times:**
- **Frontend**: <100ms (cached static assets)
- **Backend API**: 100-300ms (depending on query complexity)
- **Database**: 10-50ms (with proper indexing)

### **Resource Monitoring:**
```bash
# Check if resources are sufficient
kubectl top nodes        # Should show <80% CPU, <85% memory
kubectl top pods -A      # Individual pod resource usage
df -h                    # Storage usage
free -h                  # Memory usage including swap
```

## 🔧 **Optimization Tips**

### **Database Connection Pooling:**
```python
# In your Python backend
DATABASE_POOL_SIZE = 5      # Limit connections for 8GB server
DATABASE_MAX_OVERFLOW = 10
REDIS_CONNECTION_POOL_SIZE = 10
```

### **Caching Strategy:**
```yaml
# Redis caching layers
- Session cache: 30 minutes TTL
- API response cache: 5 minutes TTL  
- Static data cache: 1 hour TTL
- Database query cache: 15 minutes TTL
```

### **Background Jobs:**
```yaml
# Use Redis for background tasks
- File processing: Queue with 2 workers
- Email notifications: Queue with 1 worker
- Report generation: Queue with 1 worker
```

## 🚨 **Monitoring & Alerts**

```bash
# Resource usage alerts (add to crontab)
# Check every 5 minutes
*/5 * * * * kubectl top nodes | awk 'NR>1{if($3>80 || $5>85) print "High resource usage: " $1 " CPU:" $3 " Memory:" $5}' | mail -s "K8s Alert" admin@your-domain.com
```

Your Hostinger KVM 2 can absolutely handle the full stack! The key is careful resource allocation and monitoring to ensure smooth operation under load.
