# K3s Kubernetes Configuration Setup

## Getting Your K3s Kubeconfig

### 1. **On Your K3s Server**

The kubeconfig file is automatically created when k3s starts:

```bash
# Default location (as root)
sudo cat /etc/rancher/k3s/k3s.yaml

# Or copy to your home directory
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
```

### 2. **For Remote Access**

If you need to access k3s from a different machine:

```bash
# On the k3s server - copy the config file
sudo cat /etc/rancher/k3s/k3s.yaml > k3s-config.yaml

# Edit the server URL to use your actual server IP
sed -i 's/127.0.0.1/YOUR_SERVER_IP/g' k3s-config.yaml
```

### 3. **Setting Up GitHub Secret**

To use this config in GitHub Actions, you need to base64 encode it:

```bash
# Encode the config file
cat k3s-config.yaml | base64 -w 0

# Or on macOS
cat k3s-config.yaml | base64
```

### 4. **Add to GitHub Secrets**

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `K3S_KUBECONFIG`
5. Value: The base64 encoded content from step 3

### 5. **Test the Configuration**

Test locally first:

```bash
# Set the kubeconfig
export KUBECONFIG=./k3s-config.yaml

# Test connection
kubectl get nodes
kubectl get namespaces

# Check if your namespace exists
kubectl get namespace reg-ai-app
```

### 6. **Common Issues and Solutions**

**Issue**: Connection refused
```bash
# Check if k3s is running
sudo systemctl status k3s

# Check firewall (if using ufw)
sudo ufw allow 6443/tcp
```

**Issue**: Certificate issues
```bash
# Make sure server URL is correct in config
# Should be https://YOUR_SERVER_IP:6443, not 127.0.0.1
```

**Issue**: Permission denied
```bash
# Make sure user has proper permissions
sudo usermod -aG docker $USER
# Logout and login again
```

### 7. **Security Best Practices**

- Never commit the actual kubeconfig file to git
- Use GitHub repository secrets, not environment variables in code
- Regularly rotate your kubeconfig if needed
- Limit access to only necessary repositories

### 8. **Verify GitHub Actions Integration**

Your workflow now uses:
```yaml
echo "${{ secrets.K3S_KUBECONFIG }}" | base64 -d > ~/.kube/config
```

This matches the working `ci-cd.yaml` pattern and ensures consistent deployments.
