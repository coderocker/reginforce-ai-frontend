# Environment Variables Examples for reginforce-ai-frontend

## Adding Custom Environment Variables

### Example 1: Add Database Configuration
```yaml
env:
  # Existing vars...
  ENVIRONMENT: ${{ github.ref_name == 'main' && 'prod' || 'dev' }}
  NAMESPACE: ${{ github.ref_name == 'main' && 'prod-regai' || 'dev-regai' }}
  
  # New database vars
  DB_HOST: ${{ github.ref_name == 'main' && 'prod-db.example.com' || 'dev-db.example.com' }}
  DB_PORT: '5432'
  DB_NAME: ${{ github.ref_name == 'main' && 'reginforce_prod' || 'reginforce_dev' }}
```

### Example 2: Add Feature Flags
```yaml
env:
  # Feature flags based on branch
  ENABLE_ANALYTICS: ${{ github.ref_name == 'main' && 'true' || 'false' }}
  ENABLE_DEBUG: ${{ github.ref_name == 'main' && 'false' || 'true' }}
  LOG_LEVEL: ${{ github.ref_name == 'main' && 'info' || 'debug' }}
```

### Example 3: Add Build Configuration
```yaml
env:
  # Build optimization
  BUILD_MODE: ${{ github.ref_name == 'main' && 'production' || 'development' }}
  MINIFY_ASSETS: ${{ github.ref_name == 'main' && 'true' || 'false' }}
  SOURCE_MAPS: ${{ github.ref_name == 'main' && 'false' || 'true' }}
```

### Example 4: Set During Runtime
```yaml
steps:
  - name: Set build info
    run: |
      echo "BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_ENV
      echo "GIT_SHA=${GITHUB_SHA:0:8}" >> $GITHUB_ENV
      echo "BUILD_NUMBER=${{ github.run_number }}" >> $GITHUB_ENV
      
  - name: Use build info in deployment
    run: |
      helm upgrade --install reginforce-frontend ./helm/reginforce-ai-frontend \
        --set annotations."build\.time"="${{ env.BUILD_TIME }}" \
        --set annotations."git\.sha"="${{ env.GIT_SHA }}" \
        --set annotations."build\.number"="${{ env.BUILD_NUMBER }}"
```

### Example 5: Environment-Specific Secrets
```yaml
steps:
  - name: Set environment secrets
    env:
      # Use different secrets based on environment
      API_KEY: ${{ github.ref_name == 'main' && secrets.PROD_API_KEY || secrets.DEV_API_KEY }}
      DB_PASSWORD: ${{ github.ref_name == 'main' && secrets.PROD_DB_PASSWORD || secrets.DEV_DB_PASSWORD }}
    run: |
      echo "Configuring with API key for ${{ env.ENVIRONMENT }}"
      # Use $API_KEY and $DB_PASSWORD here
```

## Common Patterns

### Pattern 1: Branch-Based Configuration
```yaml
env:
  VAR_NAME: ${{ github.ref_name == 'main' && 'prod_value' || 'dev_value' }}
```

### Pattern 2: Multi-Branch Configuration
```yaml
env:
  VAR_NAME: ${{ 
    github.ref_name == 'main' && 'prod_value' || 
    github.ref_name == 'develop' && 'staging_value' || 
    'dev_value' 
  }}
```

### Pattern 3: Using Secrets Conditionally
```yaml
env:
  SECRET_VAR: ${{ 
    github.ref_name == 'main' && secrets.PROD_SECRET || 
    secrets.DEV_SECRET 
  }}
```
