#!/bin/bash
# Complete Hostinger KVM 2 Full Stack Setup Script
# RegInforce AI: Frontend + Backend + PostgreSQL + Redis

set -e

echo "==========================================="
echo "RegInforce AI Full Stack Setup"
echo "Hostinger KVM 2: 2 vCPU, 8GB RAM, 100GB SSD"
echo "==========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# System information
print_status "Checking system resources..."
echo "CPU Cores: $(nproc)"
echo "Total RAM: $(free -h | awk '/^Mem:/ { print $2 }')"
echo "Available Disk: $(df -h / | awk 'NR==2 { print $4 }')"
echo ""

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget git make htop iotop jq tree

# System optimizations
print_status "Applying system optimizations for Kubernetes..."

# Kernel parameters for k3s and databases
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Kubernetes optimizations
vm.max_map_count=262144
fs.inotify.max_user_instances=8192
net.core.somaxconn=65535
vm.swappiness=10

# Network optimizations
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 65536 134217728
net.ipv4.tcp_wmem=4096 65536 134217728
EOF

sudo sysctl -p

# Configure swap for database workloads
print_status "Configuring swap for database workloads..."
if [ ! -f /swapfile ]; then
    sudo swapoff -a 2>/dev/null || true
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_status "2GB swap file created"
else
    print_status "Swap file already exists"
fi

# Install Docker (required for building images)
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    print_status "Docker installed. You may need to log out and back in."
else
    print_status "Docker already installed"
fi

# Install k3s with full stack optimizations
print_status "Installing k3s with full stack optimizations..."
if ! command -v k3s &> /dev/null; then
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -s - server \
        --cluster-init \
        --kube-apiserver-arg=max-requests-inflight=800 \
        --kube-apiserver-arg=max-mutating-requests-inflight=400 \
        --kubelet-arg=max-pods=110 \
        --kubelet-arg=pods-per-core=20 \
        --kubelet-arg=image-gc-high-threshold=85 \
        --kubelet-arg=image-gc-low-threshold=80 \
        --disable=traefik  # We'll install Traefik separately with custom config
else
    print_status "k3s already installed"
fi

# Setup kubeconfig
print_status "Setting up kubeconfig..."
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

# Install Helm
print_status "Installing Helm..."
if ! command -v helm &> /dev/null; then
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
else
    print_status "Helm already installed"
fi

# Install Traefik with custom configuration for full stack
print_status "Installing Traefik ingress controller..."
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Create Traefik values for resource optimization
cat > /tmp/traefik-values.yaml <<EOF
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi

service:
  type: LoadBalancer

ports:
  web:
    port: 80
    expose: true
  websecure:
    port: 443
    expose: true
    tls:
      enabled: true

# Enable dashboard
ingressRoute:
  dashboard:
    enabled: true

# Additional config for compression and security
additionalArguments:
  - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
  - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
  - "--entrypoints.websecure.http.middlewares=default-headers@kubernetescrd"
EOF

helm upgrade --install traefik traefik/traefik \
    --namespace kube-system \
    --values /tmp/traefik-values.yaml \
    --wait --timeout=300s

# Add Bitnami repository for databases
print_status "Adding Bitnami Helm repository..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Wait for k3s to be ready
print_status "Waiting for k3s cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Create production namespace
print_status "Creating production namespace..."
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

# Create middleware for Traefik (compression, headers, rate limiting)
print_status "Creating Traefik middleware for optimization..."
cat <<EOF | kubectl apply -f -
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: default-headers
  namespace: default
spec:
  headers:
    customRequestHeaders:
      X-Forwarded-Proto: https
    customResponseHeaders:
      X-Frame-Options: SAMEORIGIN
      X-Content-Type-Options: nosniff
      X-XSS-Protection: "1; mode=block"
      Referrer-Policy: "strict-origin-when-cross-origin"
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: ws:;"
---
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: default-compress
  namespace: default
spec:
  compress:
    excludedContentTypes:
      - "image/*"
      - "video/*"
---
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: default-ratelimit
  namespace: default
spec:
  rateLimit:
    burst: 50
    average: 20
EOF

# Display cluster status
print_status "Checking cluster status..."
echo ""
echo "=== Cluster Nodes ==="
kubectl get nodes -o wide
echo ""
echo "=== System Pods ==="
kubectl get pods -A
echo ""
echo "=== Available Resources ==="
kubectl top nodes 2>/dev/null || echo "Metrics server not ready yet (this is normal)"
echo ""

# Install metrics server for resource monitoring
print_status "Installing metrics server for resource monitoring..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch metrics server for k3s compatibility
kubectl patch deployment metrics-server -n kube-system --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--kubelet-insecure-tls"
  }
]'

print_status "Waiting for metrics server to be ready..."
kubectl rollout status deployment/metrics-server -n kube-system --timeout=120s

# Setup firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 6443/tcp    # k3s API server

# Install fail2ban for security
print_status "Installing fail2ban for SSH protection..."
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create resource monitoring script
print_status "Creating resource monitoring script..."
cat > ~/monitor-resources.sh <<'EOF'
#!/bin/bash
# Quick resource monitoring for Hostinger full stack

echo "=== $(date) ==="
echo "Node Resources:"
kubectl top nodes 2>/dev/null || echo "Metrics not available"
echo ""
echo "Pod Resources (production):"
kubectl top pods -n production 2>/dev/null || echo "No production pods yet"
echo ""
echo "Disk Usage:"
df -h / | tail -1
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Load Average:"
uptime
EOF

chmod +x ~/monitor-resources.sh

# Setup log rotation
print_status "Configuring log rotation..."
sudo tee /etc/logrotate.d/k3s > /dev/null <<EOF
/var/lib/rancher/k3s/server/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

print_status "=== Setup Complete! ==="
echo ""
echo "Your Hostinger KVM 2 server is ready for full stack deployment!"
echo ""
echo "Next steps:"
echo "1. Build and push your Docker images"
echo "2. Update domain names in Helm values files"
echo "3. Run: make deploy-fullstack-hostinger"
echo ""
echo "Useful commands:"
echo "- Monitor resources: ~/monitor-resources.sh"
echo "- Check cluster: kubectl get nodes,pods -A"
echo "- View logs: kubectl logs -f <pod-name> -n production"
echo ""
print_warning "Remember to:"
echo "- Configure your DNS to point to this server's IP"
echo "- Set up SSL certificates (Let's Encrypt recommended)"
echo "- Update passwords in Helm values files"
echo "- Configure backup strategy"
echo ""
print_status "Happy deploying! 🚀"
