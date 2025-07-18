# Repository Migration Guide: Lights-On-Creative → eonpro

## Overview
Migrating 4 private repositories to analyze and reuse features for the EONMeds platform.

## Repositories to Migrate
1. **ehr-portal** (TypeScript) - Electronic Health Records Portal
2. **master-service** (Java) - Main backend service
3. **api-gateway** (Java) - API Gateway for microservices
4. **service-discovery** (Java) - Service discovery mechanism

## Manual Migration Steps

### For Each Repository:

#### Step 1: Clone the Repository Locally
```bash
# Example for ehr-portal
git clone https://github.com/Lights-On-Creative/ehr-portal.git
cd ehr-portal
```

#### Step 2: Create New Repository on eonpro
1. Go to https://github.com/eonpro
2. Click "New repository"
3. Name it exactly the same (e.g., `ehr-portal`)
4. Choose Private or Public
5. DO NOT initialize with README, .gitignore, or license
6. Click "Create repository"

#### Step 3: Change Remote Origin
```bash
# Remove old origin
git remote remove origin

# Add new origin
git remote add origin https://github.com/eonpro/ehr-portal.git

# Verify the change
git remote -v
```

#### Step 4: Push to New Repository
```bash
# Push all branches
git push -u origin --all

# Push all tags
git push -u origin --tags
```

## Quick Commands for All Repositories

```bash
# Create a working directory
mkdir ~/Desktop/repo-migration
cd ~/Desktop/repo-migration

# 1. EHR Portal
git clone https://github.com/Lights-On-Creative/ehr-portal.git
cd ehr-portal
git remote remove origin
git remote add origin https://github.com/eonpro/ehr-portal.git
# Create repo on GitHub first!
git push -u origin --all
git push -u origin --tags
cd ..

# 2. Master Service
git clone https://github.com/Lights-On-Creative/master-service.git
cd master-service
git remote remove origin
git remote add origin https://github.com/eonpro/master-service.git
# Create repo on GitHub first!
git push -u origin --all
git push -u origin --tags
cd ..

# 3. API Gateway
git clone https://github.com/Lights-On-Creative/api-gateway.git
cd api-gateway
git remote remove origin
git remote add origin https://github.com/eonpro/api-gateway.git
# Create repo on GitHub first!
git push -u origin --all
git push -u origin --tags
cd ..

# 4. Service Discovery
git clone https://github.com/Lights-On-Creative/service-discovery.git
cd service-discovery
git remote remove origin
git remote add origin https://github.com/eonpro/service-discovery.git
# Create repo on GitHub first!
git push -u origin --all
git push -u origin --tags
cd ..
```

## Using GitHub CLI (Faster Method)

If you have GitHub CLI installed:

```bash
# Install GitHub CLI if needed
# Mac: brew install gh
# Then login: gh auth login

# Clone and create repos automatically
for repo in ehr-portal master-service api-gateway service-discovery; do
    echo "Processing $repo..."
    git clone https://github.com/Lights-On-Creative/$repo.git
    cd $repo
    gh repo create eonpro/$repo --private --source=. --remote=origin --push
    cd ..
done
```

## Post-Migration Analysis

Once migrated, we can analyze each repository for:

### 1. EHR Portal (TypeScript)
- UI components that match EONMeds requirements
- Patient management interfaces
- Authentication flows
- API integration patterns

### 2. Master Service (Java)
- Business logic for medical workflows
- Database schemas and models
- Service architecture patterns
- Security implementations

### 3. API Gateway (Java)
- Request routing logic
- Authentication/authorization middleware
- Rate limiting implementations
- API versioning strategies

### 4. Service Discovery (Java)
- Microservice registration patterns
- Health check implementations
- Load balancing configurations

## Next Steps After Migration

1. **Review Code Structure**: Analyze each repository's architecture
2. **Identify Reusable Components**: 
   - Frontend components from ehr-portal
   - Backend services from Java repositories
   - Security implementations
   - Database schemas
3. **Extract Useful Features**: Create a list of features to port to EONMeds
4. **Plan Integration**: Determine how to integrate useful code into the new platform

## Important Considerations

- **Licensing**: Ensure you have the rights to copy/modify the code
- **Dependencies**: Check for any proprietary dependencies
- **Secrets**: Don't copy any hardcoded secrets or credentials
- **Documentation**: Look for any existing documentation to understand the codebase 