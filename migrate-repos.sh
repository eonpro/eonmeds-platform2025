#!/bin/bash

# Repository Migration Script
# Copies repositories from Lights-On-Creative to eonpro organization

echo "Starting repository migration from Lights-On-Creative to eonpro..."

# Array of repositories to migrate
repositories=(
    "ehr-portal"
    "master-service"
    "api-gateway"
    "service-discovery"
)

# Create a temporary migration directory
mkdir -p ~/Desktop/repo-migration
cd ~/Desktop/repo-migration

# Function to migrate a repository
migrate_repo() {
    local repo_name=$1
    echo "----------------------------------------"
    echo "Migrating: $repo_name"
    echo "----------------------------------------"
    
    # Clone from Lights-On-Creative
    echo "1. Cloning from Lights-On-Creative..."
    git clone https://github.com/Lights-On-Creative/${repo_name}.git
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to clone ${repo_name} from Lights-On-Creative"
        echo "Make sure you're authenticated and have access to the private repository"
        return 1
    fi
    
    cd ${repo_name}
    
    # Remove the old origin
    echo "2. Removing old origin..."
    git remote remove origin
    
    # Add new origin pointing to eonpro
    echo "3. Adding new origin for eonpro..."
    git remote add origin https://github.com/eonpro/${repo_name}.git
    
    # Create repository on eonpro (this requires GitHub CLI or manual creation)
    echo "4. Please create repository '${repo_name}' on https://github.com/eonpro"
    echo "   You can make it private or public as needed"
    echo "   Press Enter when ready to continue..."
    read
    
    # Push all branches and tags
    echo "5. Pushing to eonpro..."
    git push -u origin --all
    git push -u origin --tags
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully migrated ${repo_name}"
    else
        echo "❌ Failed to push ${repo_name} to eonpro"
        echo "   Please check if the repository was created on eonpro"
    fi
    
    cd ..
    echo ""
}

# Main migration process
echo "This script will migrate the following repositories:"
for repo in "${repositories[@]}"; do
    echo "  - $repo"
done

echo ""
echo "Prerequisites:"
echo "1. You must be authenticated with GitHub (git config)"
echo "2. You must have access to both organizations"
echo "3. You need to manually create repositories on eonpro"
echo ""
echo "Press Enter to start migration or Ctrl+C to cancel..."
read

# Migrate each repository
for repo in "${repositories[@]}"; do
    migrate_repo $repo
done

echo "----------------------------------------"
echo "Migration Summary:"
echo "----------------------------------------"
echo "✅ Process completed!"
echo ""
echo "Next steps:"
echo "1. Verify all repositories are correctly migrated"
echo "2. Update any CI/CD configurations"
echo "3. Update any webhook URLs"
echo "4. Inform team members of the new repository locations"
echo ""
echo "New repository URLs:"
for repo in "${repositories[@]}"; do
    echo "  https://github.com/eonpro/${repo}"
done 