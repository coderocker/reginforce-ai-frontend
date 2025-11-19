#!/bin/bash
# Setup script for k3s server to work with GitHub Actions deployment
# Run this on your production server

set -e

echo "=========================================="
echo "k3s Server Setup for GitHub Actions Deploy"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
   print_error "This script should not be run as root for security"
   exit 1
fi

print_status "Checking if k3s is installed..."
if ! command -v k3s &> /dev/null; then
    print_status "Installing k3s..."
    curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
    
    # Wait for k3s to be ready
    print_status "Waiting for k3s to be ready..."
    sudo systemctl enable k3s
    sleep 30
else
    print_status "k3s is already installed"
fi

# Setup kubectl access for current user
print_status "Setting up kubectl access..."
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

# Verify cluster is running
print_status "Verifying cluster status..."
kubectl cluster-info
kubectl get nodes

# Install Traefik if not present (k3s includes it by default)
print_status "Checking Traefik installation..."
if kubectl get pods -n kube-system | grep -q traefik; then
    print_status "Traefik is already running"
else
    print_warning "Traefik not found, it should be included with k3s by default"
fi

# Install cert-manager for SSL certificates
print_status "Installing cert-manager for SSL..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

print_status "Waiting for cert-manager to be ready..."
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=60s
kubectl wait --for=condition=ready pod -l app=cainjector -n cert-manager --timeout=60s  
kubectl wait --for=condition=ready pod -l app=webhook -n cert-manager --timeout=60s

# Create Let's Encrypt ClusterIssuer
print_status "Creating Let's Encrypt ClusterIssuer..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@reginforce.example.com  # Change this to your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: traefik
EOF

print_status "Creating Let's Encrypt staging ClusterIssuer for testing..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@reginforce.example.com  # Change this to your email
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: traefik
EOF

# Create production namespace
print_status "Creating production namespace..."
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

# Get kubeconfig for GitHub Actions
print_status "Preparing kubeconfig for GitHub Actions..."
KUBECONFIG_CONTENT=$(cat ~/.kube/config | base64 -w 0)

echo ""
echo "=========================================="
echo "✅ k3s Setup Complete!"
echo "=========================================="
echo ""
echo "🔐 Add this to your GitHub repository secrets:"
echo ""
echo "Secret Name: K3S_KUBECONFIG"
echo "Secret Value:"
echo "$KUBECONFIG_CONTENT"
echo ""
echo "🌐 Next steps:"
echo "1. Add the above secret to your GitHub repository"
echo "2. Update your domain name in the workflow file"
echo "3. Point your domain DNS to this server's IP address"
echo "4. Push to main/develop branch to trigger deployment"
echo ""
echo "🔧 Server Information:"
echo "External IP: $(curl -s ifconfig.me)"
echo "Cluster Status: $(kubectl get nodes --no-headers | awk '{print $2}')"
echo ""
print_warning "Important: Make sure to:"
echo "- Point your domain 'reginforce.example.com' to $(curl -s ifconfig.me)"
echo "- Update the email in ClusterIssuer to your actual email"
echo "- Configure your firewall to allow ports 80, 443, and 6443"

# Setup firewall rules
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 6443/tcp
    sudo ufw --force enable
    print_status "Firewall configured"
else
    print_warning "ufw not found, please configure your firewall manually to allow ports 22, 80, 443, 6443"
fi

echo ""
print_status "Setup completed successfully! 🚀"
