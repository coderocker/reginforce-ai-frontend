# RegInforce AI Frontend - Makefile
# Common operations for development and deployment

.PHONY: help build push deploy test lint clean

# Variables
IMAGE_NAME ?= ghcr.io/coderocker/reginforce-ai-frontend
IMAGE_TAG ?= latest
NAMESPACE ?= production
HELM_CHART ?= ./helm/reginforce-ai-frontend
KUBECONFIG ?= ~/.kube/config

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pnpm install --frozen-lockfile

dev: ## Start development server
	pnpm dev

build-local: ## Build the application locally
	pnpm build

test: ## Run tests and linting
	pnpm lint
	pnpm build

lint: ## Run linter
	pnpm lint

lint-fix: ## Fix linting issues
	pnpm lint --fix

docker-build: ## Build Docker image
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

docker-push: ## Push Docker image to registry
	docker push $(IMAGE_NAME):$(IMAGE_TAG)

docker-run: ## Run Docker container locally
	docker run -p 8080:8080 --rm $(IMAGE_NAME):$(IMAGE_TAG)

docker-test: ## Build and test Docker image locally
	docker build -t $(IMAGE_NAME):test .
	docker run --rm $(IMAGE_NAME):test nginx -t
	docker run -d --name frontend-test -p 8080:8080 $(IMAGE_NAME):test
	sleep 5
	curl -f http://localhost:8080/health || (docker logs frontend-test && exit 1)
	docker stop frontend-test
	docker rm frontend-test

helm-lint: ## Lint Helm chart
	helm lint $(HELM_CHART)

helm-template: ## Generate Kubernetes manifests from Helm chart
	helm template reginforce-ai-frontend $(HELM_CHART) --values $(HELM_CHART)/values.yaml

helm-dry-run: ## Dry run Helm deployment
	helm upgrade --install reginforce-ai-frontend $(HELM_CHART) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--dry-run \
		--debug

helm-deploy: ## Deploy using Helm
	helm upgrade --install reginforce-ai-frontend $(HELM_CHART) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=300s

helm-rollback: ## Rollback Helm deployment
	helm rollback reginforce-ai-frontend --namespace $(NAMESPACE)

helm-uninstall: ## Uninstall Helm deployment
	helm uninstall reginforce-ai-frontend --namespace $(NAMESPACE)

k8s-status: ## Check Kubernetes deployment status
	kubectl get pods,services,ingress -n $(NAMESPACE) -l app.kubernetes.io/instance=reginforce-ai-frontend

k8s-logs: ## Show Kubernetes pod logs
	kubectl logs -f deployment/reginforce-ai-frontend -n $(NAMESPACE)

k8s-describe: ## Describe Kubernetes resources
	kubectl describe deployment/reginforce-ai-frontend -n $(NAMESPACE)

k8s-port-forward: ## Port forward to local machine
	kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 -n $(NAMESPACE)

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/
	docker system prune -f

full-build: ## Full build and push pipeline
	make test
	make docker-build
	make docker-test
	make docker-push

deploy-staging: ## Deploy to staging environment
	make helm-deploy NAMESPACE=staging IMAGE_TAG=develop

deploy-production: ## Deploy to production environment
	make helm-deploy NAMESPACE=production IMAGE_TAG=main

deploy-k3s: ## Deploy to k3s with Traefik ingress
	helm upgrade --install reginforce-ai-frontend $(HELM_CHART) \
		--values $(HELM_CHART)/values-k3s.yaml \
		--namespace default \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=300s

deploy-k0s: ## Deploy to k0s with Nginx ingress
	helm upgrade --install reginforce-ai-frontend $(HELM_CHART) \
		--values $(HELM_CHART)/values-k0s.yaml \
		--namespace default \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=300s

test-k3s-local: ## Test k3s deployment locally
	@echo "Testing k3s deployment..."
	kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 &
	sleep 5
	curl -f http://localhost:8080/health && echo " - Health check passed" || echo " - Health check failed"
	curl -f http://localhost:8080/ && echo " - App check passed" || echo " - App check failed"
	pkill -f "kubectl port-forward" || true

test-k0s-local: ## Test k0s deployment locally
	@echo "Testing k0s deployment..."
	kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 &
	sleep 5
	curl -f http://localhost:8080/health && echo " - Health check passed" || echo " - Health check failed"
	curl -f http://localhost:8080/ && echo " - App check passed" || echo " - App check failed"
	pkill -f "kubectl port-forward" || true

k3s-setup: ## Setup k3s cluster (requires sudo)
	@echo "Installing k3s..."
	curl -sfL https://get.k3s.io | sh -
	sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
	sudo chown $(shell id -u):$(shell id -g) ~/.kube/config
	kubectl get nodes

k0s-setup: ## Setup k0s cluster (requires sudo)
	@echo "Installing k0s..."
	curl -sSLf https://get.k0s.sh | sudo sh
	sudo k0s install controller --single
	sudo k0s start
	sudo k0s kubeconfig admin > ~/.kube/config
	kubectl get nodes

k0s-ingress-setup: ## Install nginx ingress for k0s
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/baremetal/deploy.yaml
	kubectl wait --namespace ingress-nginx \
		--for=condition=ready pod \
		--selector=app.kubernetes.io/component=controller \
		--timeout=120s

lightweight-deploy: ## Full deployment for k3s (recommended)
	@echo "Deploying to k3s (lightweight setup)..."
	make docker-build
	make deploy-k3s
	make test-k3s-local

deploy-hostinger: ## Deploy optimized for Hostinger KVM 2 (2 vCPU, 8GB RAM)
	helm upgrade --install reginforce-ai-frontend $(HELM_CHART) \
		--values $(HELM_CHART)/values-hostinger.yaml \
		--namespace production \
		--create-namespace \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=600s

hostinger-setup: ## Complete Hostinger server setup and deployment
	@echo "Setting up Hostinger KVM 2 server for production deployment..."
	@echo "Step 1: Installing k3s with optimizations..."
	curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --cluster-init" sh -s - server \
		--kube-apiserver-arg=max-requests-inflight=400 \
		--kube-apiserver-arg=max-mutating-requests-inflight=200 \
		--kubelet-arg=max-pods=50 \
		--kubelet-arg=pods-per-core=10
	@echo "Step 2: Setting up kubeconfig..."
	mkdir -p ~/.kube
	sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
	sudo chown $(shell id -u):$(shell id -g) ~/.kube/config
	@echo "Step 3: Verifying k3s installation..."
	kubectl get nodes
	@echo "Hostinger k3s setup complete!"

hostinger-deploy-full: ## Complete build and deployment to Hostinger
	@echo "Full deployment pipeline for Hostinger KVM 2..."
	make test
	make docker-build IMAGE_TAG=hostinger
	make docker-push IMAGE_TAG=hostinger
	make deploy-hostinger IMAGE_TAG=hostinger
	make hostinger-monitor

hostinger-monitor: ## Monitor Hostinger deployment performance
	@echo "Monitoring Hostinger deployment..."
	kubectl get nodes
	kubectl top nodes
	kubectl get pods -n production
	kubectl top pods -n production
	@echo "Checking application health..."
	kubectl get ingress -n production

hostinger-scale-up: ## Scale up for higher traffic on Hostinger
	kubectl scale deployment reginforce-ai-frontend --replicas=4 -n production
	kubectl get pods -n production -w

hostinger-scale-down: ## Scale down for normal traffic on Hostinger
	kubectl scale deployment reginforce-ai-frontend --replicas=2 -n production
	kubectl get pods -n production

hostinger-logs: ## View logs optimized for Hostinger troubleshooting
	@echo "Application logs:"
	kubectl logs -f deployment/reginforce-ai-frontend -n production --tail=100
	@echo "Ingress controller logs:"
	kubectl logs -f -n kube-system -l app.kubernetes.io/name=traefik --tail=50

hostinger-backup: ## Create backup of Hostinger k3s cluster
	@echo "Creating k3s backup..."
	sudo k3s etcd-snapshot save --name hostinger-backup-$(shell date +%Y%m%d-%H%M%S)
	sudo ls -la /var/lib/rancher/k3s/server/db/snapshots/

hostinger-restore: ## Restore from backup (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Usage: make hostinger-restore BACKUP_FILE=backup-filename"; exit 1; fi
	sudo k3s server --cluster-reset --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/$(BACKUP_FILE)

# Full Stack Deployment Commands
deploy-fullstack-hostinger: ## Deploy complete RegInforce AI stack to Hostinger KVM 2
	@echo "=== Deploying Full RegInforce AI Stack to Hostinger KVM 2 ==="
	@echo "Resources: 2 vCPU, 8GB RAM, 100GB NVMe SSD"
	
	@echo "Step 1: Adding Bitnami Helm repository..."
	helm repo add bitnami https://charts.bitnami.com/bitnami
	helm repo update
	
	@echo "Step 2: Deploying PostgreSQL database..."
	helm upgrade --install postgresql bitnami/postgresql \
		--values ./helm/postgresql-values.yaml \
		--namespace production \
		--create-namespace \
		--wait --timeout=600s
	
	@echo "Step 3: Deploying Redis cache..."
	helm upgrade --install redis bitnami/redis \
		--values ./helm/redis-values.yaml \
		--namespace production \
		--wait --timeout=300s
	
	@echo "Step 4: Waiting for databases to be ready..."
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n production --timeout=300s
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n production --timeout=300s
	
	@echo "Step 5: Deploying Backend API (add your backend deployment here)..."
	@echo "TODO: Add backend deployment command when backend Helm chart is ready"
	# helm upgrade --install reginforce-backend ./helm/reginforce-backend \
	#   --values backend-values.yaml \
	#   --namespace production \
	#   --wait --timeout=600s
	
	@echo "Step 6: Deploying Frontend application..."
	helm upgrade --install reginforce-frontend ./helm/reginforce-ai-frontend \
		--values ./helm/reginforce-ai-frontend/values-hostinger-fullstack.yaml \
		--namespace production \
		--set image.repository=$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--wait --timeout=300s
	
	@echo "=== Full Stack Deployment Complete! ==="
	make fullstack-status

fullstack-status: ## Check complete stack status and resource usage
	@echo "=== RegInforce AI Full Stack Status ==="
	@echo "Pods:"
	kubectl get pods -n production -o wide
	@echo ""
	@echo "Services:"
	kubectl get svc -n production
	@echo ""
	@echo "Ingress:"
	kubectl get ingress -n production
	@echo ""
	@echo "=== Resource Usage ==="
	@echo "Node Resources:"
	kubectl top nodes
	@echo ""
	@echo "Pod Resources:"
	kubectl top pods -n production
	@echo ""
	@echo "Storage:"
	kubectl get pv,pvc -n production

fullstack-logs: ## View logs from all stack components
	@echo "=== Available Log Commands ==="
	@echo "Frontend logs:    make frontend-logs"
	@echo "PostgreSQL logs:  make postgres-logs"
	@echo "Redis logs:       make redis-logs"
	@echo "All logs:         make all-logs"

frontend-logs: ## View frontend application logs
	kubectl logs -f deployment/reginforce-frontend -n production

postgres-logs: ## View PostgreSQL database logs
	kubectl logs -f statefulset/postgresql -n production

redis-logs: ## View Redis cache logs
	kubectl logs -f statefulset/redis-master -n production

all-logs: ## View all component logs (in separate terminals)
	@echo "Opening logs in separate terminal windows..."
	kubectl logs -f deployment/reginforce-frontend -n production &
	kubectl logs -f statefulset/postgresql -n production &
	kubectl logs -f statefulset/redis-master -n production &
	@echo "Log monitoring started in background. Use 'jobs' to see running processes."

fullstack-scale-down: ## Scale down stack for maintenance (minimal resources)
	kubectl scale deployment reginforce-frontend --replicas=1 -n production
	@echo "Frontend scaled down to 1 replica"

fullstack-scale-up: ## Scale up stack for production traffic
	kubectl scale deployment reginforce-frontend --replicas=2 -n production
	@echo "Frontend scaled up to 2 replicas"

fullstack-backup: ## Backup all databases and configuration
	@echo "=== Creating Full Stack Backup ==="
	@echo "Creating PostgreSQL backup..."
	kubectl exec -it statefulset/postgresql -n production -- pg_dump -U reginforce reginforce_db > backup-postgres-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "Creating Redis backup..."
	kubectl exec -it statefulset/redis-master -n production -- redis-cli --rdb /tmp/backup.rdb
	kubectl cp production/redis-master-0:/tmp/backup.rdb backup-redis-$(shell date +%Y%m%d-%H%M%S).rdb
	@echo "Creating k3s cluster snapshot..."
	make hostinger-backup
	@echo "Backup complete!"

fullstack-monitor: ## Real-time monitoring of full stack resources
	watch -n 3 'echo "=== $(shell date) ===" && echo "Node Status:" && kubectl top nodes && echo "" && echo "Pod Status:" && kubectl top pods -n production && echo "" && echo "Services:" && kubectl get svc -n production && echo "" && echo "Disk Usage:" && df -h | grep -E "(Filesystem|/dev/|tmpfs)"'

fullstack-health: ## Health check all stack components
	@echo "=== Full Stack Health Check ==="
	@echo "Checking frontend health..."
	kubectl exec deployment/reginforce-frontend -n production -- curl -f http://localhost:8080/health || echo "Frontend health check failed"
	@echo "Checking PostgreSQL connection..."
	kubectl exec statefulset/postgresql -n production -- pg_isready -U reginforce || echo "PostgreSQL not ready"
	@echo "Checking Redis connection..."
	kubectl exec statefulset/redis-master -n production -- redis-cli ping || echo "Redis not responding"
	@echo "Health check complete!"

fullstack-clean: ## Clean up full stack deployment
	@echo "WARNING: This will delete all data! Press Ctrl+C to cancel..."
	sleep 10
	helm uninstall reginforce-frontend -n production
	helm uninstall redis -n production  
	helm uninstall postgresql -n production
	kubectl delete namespace production
	@echo "Full stack cleanup complete!"

ci-setup: ## Setup CI/CD prerequisites
	@echo "Setting up CI/CD prerequisites..."
	@echo "1. Ensure you have the following GitHub secrets configured:"
	@echo "   - KUBECONFIG_STAGING (base64 encoded kubeconfig)"
	@echo "   - KUBECONFIG_PRODUCTION (base64 encoded kubeconfig)"
	@echo "   - SLACK_WEBHOOK (optional, for notifications)"
	@echo ""
	@echo "2. Update values.yaml with your domain names"
	@echo "3. Ensure your Kubernetes cluster has:"
	@echo "   - Nginx Ingress Controller"
	@echo "   - cert-manager"
	@echo "   - Metrics server (for HPA)"

security-scan: ## Run security scanning
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		-v $(PWD):/tmp/.cache/ aquasec/trivy:latest image \
		--exit-code 0 --no-progress --format table $(IMAGE_NAME):$(IMAGE_TAG)

benchmark: ## Run performance benchmarks
	docker run --rm $(IMAGE_NAME):$(IMAGE_TAG) &
	sleep 5
	@echo "Running basic performance test..."
	curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/
	docker stop $(shell docker ps -q --filter ancestor=$(IMAGE_NAME):$(IMAGE_TAG))

release: ## Create a new release (requires VERSION variable)
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required. Usage: make release VERSION=1.0.0"; exit 1; fi
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	git push origin v$(VERSION)
	@echo "Release v$(VERSION) created and pushed. GitHub Actions will handle the deployment."

# Development helpers
dev-install: ## Install development dependencies and setup
	pnpm install
	@echo "Development environment ready!"

dev-reset: ## Reset development environment
	make clean
	make dev-install

# Helm helpers
helm-values-staging: ## Show Helm values for staging
	helm get values reginforce-ai-frontend-staging -n staging

helm-values-production: ## Show Helm values for production
	helm get values reginforce-ai-frontend -n production

helm-history: ## Show Helm deployment history
	helm history reginforce-ai-frontend -n $(NAMESPACE)

# Monitoring helpers
health-check: ## Check application health
	@kubectl get pods -n $(NAMESPACE) -l app.kubernetes.io/instance=reginforce-ai-frontend
	@echo "Checking health endpoint..."
	@kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 -n $(NAMESPACE) &
	@sleep 3
	@curl -f http://localhost:8080/health && echo " - Health check passed" || echo " - Health check failed"
	@pkill -f "kubectl port-forward"

stress-test: ## Run basic stress test
	@echo "Running stress test (requires 'ab' - Apache Bench)..."
	kubectl port-forward deployment/reginforce-ai-frontend 8080:8080 -n $(NAMESPACE) &
	sleep 3
	ab -n 1000 -c 10 http://localhost:8080/
	pkill -f "kubectl port-forward"
