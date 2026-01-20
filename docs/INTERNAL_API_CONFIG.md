# Namespace and Internal API Configuration

## 🎯 **Changes Made**

### **1. Namespace Update: `production` → `reg-ai-app`**

All components now deploy to the unified `reg-ai-app` namespace:
- ✅ Frontend (React app)  
- ✅ Backend API (Python app)
- ✅ PostgreSQL database
- ✅ Redis cache

### **2. Internal API Communication**

**Before**: External API calls via ingress
```yaml
REACT_APP_API_BASE_URL: "https://api.reginforce.example.com"
```

**After**: Direct internal service communication
```yaml
REACT_APP_API_BASE_URL: "http://reginforce-api-service.reg-ai-app.svc.cluster.local:8000"
```

### **3. Removed Unnecessary Templates**

For a simple k3s deployment, these templates were removed:
- ❌ **hpa.yaml** - HorizontalPodAutoscaler (not needed for single-node)
- ❌ **poddisruptionbudget.yaml** - PodDisruptionBudget (not needed for single-node)

**Remaining templates** (all necessary):
- ✅ **deployment.yaml** - Main application deployment
- ✅ **service.yaml** - Internal service for load balancing
- ✅ **ingress.yaml** - External access via Traefik
- ✅ **configmap.yaml** - Configuration management
- ✅ **serviceaccount.yaml** - RBAC permissions
- ✅ **networkpolicy.yaml** - Security policies

## 🔧 **Internal Service Communication**

### **Service Discovery Format**
```
http://<service-name>.<namespace>.svc.cluster.local:<port>
```

### **Your API Service**
```yaml
Service Name: reginforce-api-service
Namespace: reg-ai-app  
Port: 8000
Full URL: http://reginforce-api-service.reg-ai-app.svc.cluster.local:8000
```

### **Benefits of Internal Communication**
- 🚀 **Faster**: No external network roundtrip
- 🔒 **Secure**: Traffic stays within cluster
- 📊 **Efficient**: No bandwidth usage through ingress
- 💰 **Cost-effective**: No external data transfer costs

## 📊 **Network Architecture**

```
Internet → Traefik Ingress → Frontend Pod
                              ↓ (internal)
                          Backend API Pod
                              ↓ (internal)
                          PostgreSQL Pod
                              ↓ (internal)
                          Redis Pod
```

All internal communication happens within the `reg-ai-app` namespace using Kubernetes DNS.

## 🛠️ **CI/CD Updates**

### **Namespace Changes**
```yaml
# Old
--namespace production

# New  
--namespace reg-ai-app
```

### **Environment Variables**
```yaml
# Set via Helm in CI/CD
--set env[1].name="REACT_APP_API_BASE_URL"
--set env[1].value="http://reginforce-api-service.reg-ai-app.svc.cluster.local:8000"
```

### **Verification Commands**
```bash
# Check all components in reg-ai-app namespace
kubectl get all -n reg-ai-app

# Test internal connectivity
kubectl exec -n reg-ai-app deployment/reginforce-frontend -- \
  curl http://reginforce-api-service.reg-ai-app.svc.cluster.local:8000/health
```

## 🚦 **Backend Service Requirements**

For this to work, your Python backend needs to be deployed as:

### **Service Configuration**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: reginforce-api-service  # Must match the URL
  namespace: reg-ai-app
spec:
  ports:
  - port: 8000                  # Must match the URL
    targetPort: 8000
  selector:
    app: reginforce-api         # Your backend app label
```

### **Deployment Configuration**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reginforce-api
  namespace: reg-ai-app         # Same namespace
spec:
  template:
    metadata:
      labels:
        app: reginforce-api     # Matches service selector
    spec:
      containers:
      - name: api
        image: your-api-image
        ports:
        - containerPort: 8000   # Backend listens on 8000
```

## 🔍 **Troubleshooting Internal Communication**

### **Test DNS Resolution**
```bash
# From frontend pod
kubectl exec -n reg-ai-app deployment/reginforce-frontend -- \
  nslookup reginforce-api-service.reg-ai-app.svc.cluster.local
```

### **Test API Connectivity**
```bash
# From frontend pod  
kubectl exec -n reg-ai-app deployment/reginforce-frontend -- \
  curl -v http://reginforce-api-service.reg-ai-app.svc.cluster.local:8000/health
```

### **Check Service Endpoints**
```bash
# See if backend pods are registered
kubectl get endpoints -n reg-ai-app reginforce-api-service
```

## 📋 **Next Steps**

1. **✅ Frontend Updated**: Uses internal API URL
2. **🔄 Deploy Backend**: Ensure service name matches `reginforce-api-service`
3. **🔍 Test Connection**: Verify internal communication works
4. **🚀 Deploy Stack**: Push changes to trigger deployment

The frontend will now communicate directly with your backend API within the cluster, providing better performance and security! 🎉
