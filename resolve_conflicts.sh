#!/bin/bash

# Script to resolve common merge conflict patterns
# This script resolves formatting conflicts (single vs double quotes) and other common patterns

echo "Resolving merge conflicts..."

# Function to resolve conflicts in a file
resolve_file() {
    local file="$1"
    echo "Processing $file..."
    
    # Replace single quotes with double quotes in conflicts
    sed -i '' 's/<<<<<<< HEAD/<<<<<<< HEAD/g' "$file"
    sed -i '' 's/=======/=======/g' "$file"
    sed -i '' 's/>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33/>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33/g' "$file"
    
    # Common patterns to resolve
    # Pattern 1: Single quotes vs double quotes
    sed -i '' 's/<<<<<<< HEAD\([^>]*\)'\''\([^>]*\)=======\([^>]*\)"\([^>]*\)>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33/\3"\4/g' "$file"
    
    # Pattern 2: Simple string conflicts
    sed -i '' 's/<<<<<<< HEAD[[:space:]]*'\''\([^'\'']*\)'\''[[:space:]]*=======[[:space:]]*"\([^"]*\)"[[:space:]]*>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33/"\2"/g' "$file"
    
    # Pattern 3: Array formatting conflicts
    sed -i '' 's/<<<<<<< HEAD[[:space:]]*\[[[:space:]]*=======[[:space:]]*\[[[:space:]]*>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33/[/g' "$file"
    
    echo "Processed $file"
}

# Find all TypeScript files with conflicts
find packages/backend/src -name "*.ts" -exec grep -l "<<<<<<< HEAD" {} \; | while read file; do
    resolve_file "$file"
done

echo "Conflict resolution complete!"
