#!/bin/bash

# K3s Kubeconfig Extraction Script
# Run this on your k3s server

set -e

echo "🔧 K3s Kubeconfig Setup Script"
echo "================================"

# Check if k3s is running
if ! systemctl is-active --quiet k3s; then
    echo "❌ k3s service is not running!"
    echo "Start it with: sudo systemctl start k3s"
    exit 1
fi

# Get server IP (you may need to adjust this)
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📡 Detected server IP: $SERVER_IP"

# Prompt for server IP confirmation
read -p "Is this the correct IP for external access? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter the correct server IP: " SERVER_IP
fi

# Extract and modify kubeconfig
echo "📄 Extracting kubeconfig..."
sudo cp /etc/rancher/k3s/k3s.yaml ./k3s-config.yaml
sudo chown $USER:$USER ./k3s-config.yaml

# Replace localhost with actual server IP
sed -i "s/127.0.0.1/$SERVER_IP/g" ./k3s-config.yaml

echo "✅ Kubeconfig extracted to: ./k3s-config.yaml"

# Test the configuration
echo "🧪 Testing configuration..."
if KUBECONFIG=./k3s-config.yaml kubectl get nodes > /dev/null 2>&1; then
    echo "✅ Configuration test successful!"
else
    echo "❌ Configuration test failed!"
    echo "Check your firewall settings and ensure port 6443 is open"
fi

# Generate base64 for GitHub secrets
echo ""
echo "🔐 Base64 encoded config for GitHub Environment secret KUBECONFIG:"
echo "================================================================="
cat ./k3s-config.yaml | base64 -w 0
echo ""
echo "================================================================="
echo ""
echo "📋 Next steps:"
echo "1. Copy the base64 string above"
echo "2. Go to GitHub → Settings → Environments → prod"
echo "3. Add Environment Secret named: KUBECONFIG"
echo "4. Paste the base64 string as the value"
echo "5. Add Environment Variable named: APP_URL"
echo "6. Set value to: http://reginforceai.mahahrishi.com"
echo ""
echo "🗑️  Clean up:"
echo "rm ./k3s-config.yaml  # Remove local copy when done"
