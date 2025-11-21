# Branch Protection and Deployment Strategy

## 🔒 **Production Deployment Restrictions**

This project implements strict branch protection to ensure only the `main` branch can deploy to production.

### **Branch-Based Deployment Rules**

#### **Main Branch (`main`)**
- ✅ **Allowed**: Production deployments
- ✅ **Environment**: `prod` 
- ✅ **Namespace**: `prod-regai`
- ✅ **Host**: `reginforceai.mahahrishi.com`
- ✅ **Replicas**: 2 (high availability)
- ✅ **Resources**: Production-level CPU/memory

#### **All Other Branches**
- ❌ **Blocked**: Production deployments
- ✅ **Allowed**: Testing, building, linting
- ⚠️ **Note**: No actual deployment occurs

## 🛡️ **Security Implementations**

### **1. CI/CD Pipeline (ci-cd.yaml)**
```yaml
# Only main branch can deploy
if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'release')

# Double-check in deployment step
if [ "${{ github.ref_name }}" != "main" ]; then
  echo "❌ Production deployment blocked - only main branch allowed!"
  exit 1
fi
```

### **2. Manual Deploy (manual-deploy.yaml)**
```yaml
# Branch validation at job level
if: github.ref == 'refs/heads/main' && needs.validate-inputs.result == 'success'

# Early validation step
- name: Validate branch is main
  run: |
    if [ "${{ github.ref_name }}" != "main" ]; then
      echo "❌ Manual deployment is only allowed from the main branch!"
      exit 1
    fi
```

### **3. Feature CI (feature-ci.yaml)**
- **No deployment capability** - testing only
- Validates Docker builds and runs tests
- Cannot access production environment or secrets

## 🎯 **GitHub Environment Protection**

### **Environment: `prod`**
```
Protection Rules:
├── Required reviewers: Enabled
├── Deployment branches: main only  
├── Environment secrets: KUBECONFIG
└── Environment variables: APP_URL
```

### **Benefits**
- 🔒 **Secret isolation**: Production secrets only accessible from main
- 👥 **Review requirements**: Deployments need approval
- 🔄 **Audit trail**: Complete deployment history
- 🚫 **Accident prevention**: Impossible to deploy from feature branches

## 🚀 **Deployment Workflow**

### **Automatic Deployment (Recommended)**
```bash
# 1. Merge to main branch
git checkout main
git pull origin main
git merge feature-branch
git push origin main

# 2. CI/CD automatically:
#    - Builds and tests
#    - Creates Docker image  
#    - Deploys to production
#    - Updates reginforceai.mahahrishi.com
```

### **Manual Deployment (Emergency)**
```bash
# 1. Ensure you're on main
git checkout main
git pull origin main

# 2. Go to GitHub Actions
#    - Select "Manual Deploy" workflow
#    - Click "Run workflow" 
#    - Confirm deployment
```

## ⚠️ **What Happens on Other Branches**

### **Feature Branches (feature/*, develop, etc.)**
```
✅ Runs: Tests, linting, type checking
✅ Builds: Docker image (not pushed)
✅ Validates: Code quality and security
❌ Blocks: Any deployment to production
```

### **Error Messages You'll See**
```bash
❌ Production deployment blocked - only main branch allowed!
❌ Manual deployment is only allowed from the main branch!
❌ Current branch: feature/new-feature
```

## 🔧 **Emergency Procedures**

### **If You Need to Deploy from Another Branch (NOT RECOMMENDED)**
1. **Create hotfix branch from main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/urgent-fix
   # Make your changes
   git commit -m "Hotfix: urgent production fix"
   ```

2. **Merge back to main**:
   ```bash
   git checkout main
   git merge hotfix/urgent-fix
   git push origin main  # This triggers deployment
   ```

3. **Never override branch protection** - it exists for security!

## 📋 **Compliance & Auditing**

### **Deployment Logs Include**
- ✅ Branch validation checks
- ✅ Environment confirmation  
- ✅ Image tags and versions
- ✅ Namespace and host information
- ✅ Resource allocation details

### **GitHub Environment Tracking**
- 📊 Deployment history per environment
- 🕒 Timestamps and duration
- 👤 Who triggered each deployment
- 🔄 Success/failure status

This strategy ensures **secure, auditable, and reliable** production deployments! 🛡️
