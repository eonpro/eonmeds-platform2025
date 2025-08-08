#!/bin/bash

# Script to migrate repositories from ZIP files to GitHub

echo "Repository Migration from ZIP Files"
echo "==================================="

# Function to process each repository
process_repo() {
    local repo_name=$1
    echo ""
    echo "Processing: $repo_name"
    echo "-------------------"
    
    if [ ! -d "$repo_name" ]; then
        echo "❌ Directory $repo_name not found. Make sure you extracted the ZIP file."
        return 1
    fi
    
    cd "$repo_name"
    
    # Initialize git if not already initialized
    if [ ! -d ".git" ]; then
        echo "Initializing git repository..."
        git init
        git add .
        git commit -m "Initial commit - migrated from Lights-On-Creative"
    else
        echo "Git repository already initialized"
    fi
    
    # Check if remote already exists
    if git remote | grep -q "origin"; then
        echo "Remote 'origin' already exists"
    else
        echo "Adding remote origin..."
        git remote add origin "https://github.com/eonpro/${repo_name}.git"
    fi
    
    echo ""
    echo "⚠️  IMPORTANT: Before pushing, make sure you've created the repository at:"
    echo "   https://github.com/eonpro/${repo_name}"
    echo ""
    echo "Ready to push? (y/n)"
    read -r response
    
    if [[ "$response" == "y" ]]; then
        echo "Pushing to GitHub..."
        git branch -M main
        git push -u origin main
        echo "✅ Successfully pushed $repo_name"
    else
        echo "⏸️  Skipped pushing $repo_name"
    fi
    
    cd ..
}

# Main execution
echo ""
echo "This script assumes you have extracted the following ZIP files:"
echo "  - ehr-portal"
echo "  - master-service"
echo "  - api-gateway"
echo "  - service-discovery"
echo ""
echo "Current directory contents:"
ls -la
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Process each repository
for repo in ehr-portal master-service api-gateway service-discovery; do
    process_repo "$repo"
done

echo ""
echo "==================================="
echo "Migration Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Verify all repositories at https://github.com/eonpro"
echo "2. Check that all files were uploaded correctly"
echo "3. Update any configuration files with new repository URLs"
echo "4. Start analyzing the code for reusable features!" 