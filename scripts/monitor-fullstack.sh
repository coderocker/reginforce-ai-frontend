#!/bin/bash
# Full Stack Resource Monitoring Dashboard for Hostinger KVM 2
# RegInforce AI Frontend + Backend + PostgreSQL + Redis

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored headers
print_header() {
    echo -e "\n${CYAN}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Clear screen and show header
clear
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}  RegInforce AI Full Stack Monitor${NC}"
echo -e "${PURPLE}  Hostinger KVM 2: 2 vCPU, 8GB RAM${NC}"
echo -e "${PURPLE}========================================${NC}"
echo -e "${CYAN}$(date)${NC}\n"

# System Overview
print_header "System Overview"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "Kernel: $(uname -r)"

# CPU and Memory
print_header "CPU & Memory Usage"
echo "CPU Cores: $(nproc)"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage:"
free -h | grep -E "Mem:|Swap:"

# Disk Usage
print_header "Disk Usage"
df -h | grep -E "Filesystem|/dev/" | grep -v tmpfs

# Kubernetes Cluster Status
print_header "Kubernetes Cluster Status"
if kubectl cluster-info &>/dev/null; then
    print_success "Cluster is accessible"
    
    # Node status
    echo "\nNodes:"
    kubectl get nodes --no-headers | while read line; do
        name=$(echo $line | awk '{print $1}')
        status=$(echo $line | awk '{print $2}')
        if [[ "$status" == "Ready" ]]; then
            print_success "Node $name: $status"
        else
            print_error "Node $name: $status"
        fi
    done
    
    # Namespace status
    echo "\nNamespaces:"
    kubectl get namespaces --no-headers | wc -l | xargs -I {} echo "Total namespaces: {}"
    
else
    print_error "Cannot connect to Kubernetes cluster"
fi

# Kubernetes Resources (if metrics server is available)
print_header "Kubernetes Resource Usage"
if kubectl top nodes &>/dev/null; then
    echo "Node Resources:"
    kubectl top nodes
    
    echo "\nPod Resources (Production):"
    if kubectl get pods -n production &>/dev/null && [ $(kubectl get pods -n production --no-headers 2>/dev/null | wc -l) -gt 0 ]; then
        kubectl top pods -n production 2>/dev/null || echo "Metrics not available for production pods"
    else
        print_warning "No pods in production namespace"
    fi
else
    print_warning "Metrics server not available or not ready"
fi

# Application Status
print_header "Application Stack Status"

# Check if production namespace exists
if kubectl get namespace production &>/dev/null; then
    print_success "Production namespace exists"
    
    # Frontend status
    echo "\n${BLUE}Frontend (React):${NC}"
    if kubectl get deployment reginforce-frontend -n production &>/dev/null; then
        FRONTEND_READY=$(kubectl get deployment reginforce-frontend -n production -o jsonpath='{.status.readyReplicas}')
        FRONTEND_DESIRED=$(kubectl get deployment reginforce-frontend -n production -o jsonpath='{.spec.replicas}')
        if [[ "$FRONTEND_READY" == "$FRONTEND_DESIRED" ]]; then
            print_success "Frontend: $FRONTEND_READY/$FRONTEND_DESIRED replicas ready"
        else
            print_warning "Frontend: $FRONTEND_READY/$FRONTEND_DESIRED replicas ready"
        fi
    else
        print_warning "Frontend not deployed"
    fi
    
    # Backend status (if exists)
    echo "\n${BLUE}Backend (Python):${NC}"
    if kubectl get deployment reginforce-backend -n production &>/dev/null; then
        BACKEND_READY=$(kubectl get deployment reginforce-backend -n production -o jsonpath='{.status.readyReplicas}')
        BACKEND_DESIRED=$(kubectl get deployment reginforce-backend -n production -o jsonpath='{.spec.replicas}')
        if [[ "$BACKEND_READY" == "$BACKEND_DESIRED" ]]; then
            print_success "Backend: $BACKEND_READY/$BACKEND_DESIRED replicas ready"
        else
            print_warning "Backend: $BACKEND_READY/$BACKEND_DESIRED replicas ready"
        fi
    else
        print_warning "Backend not deployed yet"
    fi
    
    # PostgreSQL status
    echo "\n${BLUE}PostgreSQL Database:${NC}"
    if kubectl get statefulset postgresql -n production &>/dev/null; then
        PG_READY=$(kubectl get statefulset postgresql -n production -o jsonpath='{.status.readyReplicas}')
        PG_DESIRED=$(kubectl get statefulset postgresql -n production -o jsonpath='{.spec.replicas}')
        if [[ "$PG_READY" == "$PG_DESIRED" ]]; then
            print_success "PostgreSQL: $PG_READY/$PG_DESIRED replicas ready"
            # Check if we can connect
            if kubectl exec statefulset/postgresql -n production -- pg_isready -U reginforce &>/dev/null; then
                print_success "PostgreSQL: Database accepting connections"
            else
                print_warning "PostgreSQL: Database not accepting connections"
            fi
        else
            print_warning "PostgreSQL: $PG_READY/$PG_DESIRED replicas ready"
        fi
    else
        print_warning "PostgreSQL not deployed"
    fi
    
    # Redis status
    echo "\n${BLUE}Redis Cache:${NC}"
    if kubectl get statefulset redis-master -n production &>/dev/null; then
        REDIS_READY=$(kubectl get statefulset redis-master -n production -o jsonpath='{.status.readyReplicas}')
        REDIS_DESIRED=$(kubectl get statefulset redis-master -n production -o jsonpath='{.spec.replicas}')
        if [[ "$REDIS_READY" == "$REDIS_DESIRED" ]]; then
            print_success "Redis: $REDIS_READY/$REDIS_DESIRED replicas ready"
            # Check if Redis is responding
            if kubectl exec statefulset/redis-master -n production -- redis-cli ping 2>/dev/null | grep -q PONG; then
                print_success "Redis: Cache responding to ping"
            else
                print_warning "Redis: Cache not responding to ping"
            fi
        else
            print_warning "Redis: $REDIS_READY/$REDIS_DESIRED replicas ready"
        fi
    else
        print_warning "Redis not deployed"
    fi
    
else
    print_warning "Production namespace does not exist"
fi

# Ingress Status
print_header "Ingress & Networking"
if kubectl get ingress -A &>/dev/null; then
    INGRESS_COUNT=$(kubectl get ingress -A --no-headers | wc -l)
    if [[ $INGRESS_COUNT -gt 0 ]]; then
        print_success "Found $INGRESS_COUNT ingress resource(s)"
        kubectl get ingress -A
    else
        print_warning "No ingress resources found"
    fi
else
    print_warning "Cannot check ingress status"
fi

# Traefik Status
echo "\n${BLUE}Traefik Ingress Controller:${NC}"
if kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik &>/dev/null; then
    TRAEFIK_STATUS=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik --no-headers | awk '{print $3}' | head -1)
    if [[ "$TRAEFIK_STATUS" == "Running" ]]; then
        print_success "Traefik: Running"
    else
        print_warning "Traefik: $TRAEFIK_STATUS"
    fi
else
    print_warning "Traefik not found in kube-system namespace"
fi

# Storage Status
print_header "Storage Status"
echo "Persistent Volumes:"
PV_COUNT=$(kubectl get pv --no-headers 2>/dev/null | wc -l)
echo "Total PVs: $PV_COUNT"
if [[ $PV_COUNT -gt 0 ]]; then
    kubectl get pv --no-headers | while read line; do
        name=$(echo $line | awk '{print $1}')
        status=$(echo $line | awk '{print $5}')
        size=$(echo $line | awk '{print $2}')
        if [[ "$status" == "Bound" ]]; then
            print_success "PV $name: $size ($status)"
        else
            print_warning "PV $name: $size ($status)"
        fi
    done
fi

echo "\nPersistent Volume Claims (Production):"
PVC_COUNT=$(kubectl get pvc -n production --no-headers 2>/dev/null | wc -l)
if [[ $PVC_COUNT -gt 0 ]]; then
    kubectl get pvc -n production --no-headers | while read line; do
        name=$(echo $line | awk '{print $1}')
        status=$(echo $line | awk '{print $2}')
        size=$(echo $line | awk '{print $4}')
        if [[ "$status" == "Bound" ]]; then
            print_success "PVC $name: $size ($status)"
        else
            print_warning "PVC $name: $size ($status)"
        fi
    done
else
    echo "No PVCs in production namespace"
fi

# Recent Events
print_header "Recent Kubernetes Events"
echo "Last 10 events:"
kubectl get events --sort-by=.metadata.creationTimestamp -A | tail -10

# Resource Recommendations
print_header "Resource Recommendations"

# Check CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    print_warning "High CPU usage ($CPU_USAGE%). Consider scaling down or optimizing applications."
elif (( $(echo "$CPU_USAGE < 30" | bc -l) )); then
    print_info "Low CPU usage ($CPU_USAGE%). You can potentially run more workloads."
else
    print_success "CPU usage is optimal ($CPU_USAGE%)."
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    print_warning "High memory usage ($MEM_USAGE%). Consider adding swap or reducing replicas."
elif (( $(echo "$MEM_USAGE < 40" | bc -l) )); then
    print_info "Low memory usage ($MEM_USAGE%). You can potentially scale up applications."
else
    print_success "Memory usage is optimal ($MEM_USAGE%)."
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 80 ]]; then
    print_warning "High disk usage ($DISK_USAGE%). Consider cleanup or expansion."
else
    print_success "Disk usage is healthy ($DISK_USAGE%)."
fi

print_header "Quick Commands"
echo "View logs:           kubectl logs -f <pod-name> -n production"
echo "Scale frontend:      kubectl scale deployment reginforce-frontend --replicas=N -n production"
echo "Port forward:        kubectl port-forward svc/reginforce-frontend 8080:80 -n production"
echo "Database access:     kubectl exec -it statefulset/postgresql -n production -- psql -U reginforce reginforce_db"
echo "Redis access:        kubectl exec -it statefulset/redis-master -n production -- redis-cli"
echo "Resource usage:      kubectl top nodes && kubectl top pods -n production"
echo "Full stack status:   make fullstack-status"
echo "\n${PURPLE}Monitor refresh: watch -n 30 ./monitor-fullstack.sh${NC}"
echo "${PURPLE}Press Ctrl+C to exit monitoring${NC}\n"
