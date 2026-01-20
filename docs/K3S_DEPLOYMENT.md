# k3s Server Deployment Guide

## Overview

This guide shows how to deploy RegInforce AI Frontend to your k3s server using GitHub Actions with direct Kubernetes manifests (no Helm required).

## Server Setup

### 1. Prepare Your k3s Server

Run this on your production server:

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/coderocker/reginforce-ai-frontend/main/scripts/setup-k3s-server.sh
chmod +x setup-k3s-server.sh
./setup-k3s-server.sh
```

### 2. GitHub Repository Configuration

Add these secrets to your GitHub repository (`Settings` → `Secrets and variables` → `Actions`):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `K3S_KUBECONFIG` | Base64 encoded kubeconfig | Provided by setup script |

### 3. Domain Configuration

Update these values in `.github/workflows/ci-cd.yaml`:

```yaml
# Change this line (around line 160)
- host: reginforce.example.com
# To your actual domain:
- host: your-domain.com

# And this line (around line 145)  
value: "https://api.reginforce.example.com"
# To your actual API URL:
value: "https://api.your-domain.com"
```

## DNS Configuration

Point your domain to your server:

```bash
# A Record
your-domain.com → YOUR_SERVER_IP

# Optional: WWW redirect
www.your-domain.com → your-domain.com (CNAME)
```

## Deployment Architecture

### Minimalistic Setup
- **No Helm** - Uses plain Kubernetes manifests
- **Minimal resources** - 128Mi RAM, 100m CPU requests
- **Security hardened** - Non-root user, security contexts
- **Auto SSL** - Let's Encrypt certificates via cert-manager
- **Direct deployment** - GitHub Actions → k3s cluster

### Resource Usage
```yaml
Resources per pod:
  Requests: 128Mi RAM, 100m CPU
  Limits:   256Mi RAM, 200m CPU
  
Total for 2 replicas: ~512Mi RAM, ~400m CPU
```

## Deployment Flow

1. **Push to main/develop** → Triggers CI/CD
2. **Build & Push** → Creates Docker image in GHCR
3. **Security Scan** → Scans image for vulnerabilities  
4. **Deploy to k3s** → Applies Kubernetes manifests
5. **SSL Setup** → cert-manager provisions Let's Encrypt certificates
6. **Verification** → Checks deployment health

## Manual Operations

### Check Deployment Status

```bash
# On your k3s server
kubectl get all -n production

# Check pods
kubectl get pods -n production -l app=reginforce-frontend

# Check ingress and SSL
kubectl get ingress -n production
kubectl get certificates -n production
```

### View Logs

```bash
# Application logs
kubectl logs -f deployment/reginforce-frontend -n production

# Traefik logs (ingress)
kubectl logs -f deployment/traefik -n kube-system
```

### Scale Application

```bash
# Scale up
kubectl scale deployment reginforce-frontend --replicas=3 -n production

# Scale down  
kubectl scale deployment reginforce-frontend --replicas=1 -n production
```

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/reginforce-frontend -n production

# Rollback to previous version
kubectl rollout undo deployment/reginforce-frontend -n production

# Rollback to specific revision
kubectl rollout undo deployment/reginforce-frontend --to-revision=2 -n production
```

## Troubleshooting

### SSL Certificate Issues

```bash
# Check certificate status
kubectl describe certificate reginforce-frontend-tls -n production

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager

# Delete certificate to recreate
kubectl delete certificate reginforce-frontend-tls -n production
```

### Deployment Issues

```bash
# Check deployment events
kubectl describe deployment reginforce-frontend -n production

# Check pod events
kubectl describe pod <pod-name> -n production

# Check if image can be pulled
kubectl run test --image=ghcr.io/coderocker/reginforce-ai-frontend:latest --rm -it -- /bin/sh
```

### Ingress Issues

```bash
# Check Traefik configuration
kubectl get ingressroute -A

# Check Traefik service
kubectl get svc -n kube-system | grep traefik

# Test internal connectivity
kubectl run curl --image=curlimages/curl --rm -it -- curl reginforce-frontend-service.production.svc.cluster.local
```

## Security Features

- **Non-root containers** - Runs as UID 1001
- **Read-only filesystem** - Container filesystem is read-only
- **Network policies** - Restricted pod-to-pod communication
- **Resource limits** - CPU and memory constraints
- **Image scanning** - Trivy vulnerability scanning
- **Auto SSL** - Let's Encrypt certificates
- **Secrets management** - Kubernetes secrets for credentials

## Monitoring

### Resource Usage

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage  
kubectl top pods -n production
```

### Health Checks

```bash
# Check if pods are ready
kubectl get pods -n production -l app=reginforce-frontend

# Test application health
curl -I https://your-domain.com/
```

## Cost Optimization

This setup is optimized for minimal resource usage:

- **Single server** deployment
- **No managed services** required
- **Minimal resource requests** (128Mi/100m per pod)
- **Efficient image** (nginx:alpine base)
- **Built-in ingress** (Traefik included with k3s)
- **Free SSL** (Let's Encrypt)

Perfect for cost-effective production deployments! 🚀
