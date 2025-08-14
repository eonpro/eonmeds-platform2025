#!/bin/bash

# Fix merge conflicts in TypeScript files by choosing the more complete version
# and preferring double quotes for consistency

echo "🔧 Fixing merge conflicts in backend TypeScript files..."

# Find all files with merge conflicts
FILES=$(grep -r "<<<<<<< HEAD" packages/backend/src --include="*.ts" --include="*.js" -l | sort | uniq)

if [ -z "$FILES" ]; then
    echo "✅ No merge conflicts found!"
    exit 0
fi

echo "Found merge conflicts in $(echo "$FILES" | wc -l) files"

for file in $FILES; do
    echo "Fixing: $file"
    
    # Create a temporary file
    temp_file="${file}.tmp"
    
    # Process the file
    awk '
    BEGIN { in_conflict = 0; buffer1 = ""; buffer2 = "" }
    /^<<<<<<< HEAD/ { in_conflict = 1; next }
    /^=======/ { 
        if (in_conflict == 1) { 
            in_conflict = 2; 
            next 
        }
    }
    /^>>>>>>> / { 
        if (in_conflict == 2) {
            # Choose the version with double quotes, or the longer one
            if (buffer2 ~ /"/ && buffer1 !~ /"/) {
                print buffer2
            } else if (buffer1 ~ /"/ && buffer2 !~ /"/) {
                print buffer1
            } else if (length(buffer2) > length(buffer1)) {
                print buffer2
            } else {
                print buffer1
            }
            in_conflict = 0
            buffer1 = ""
            buffer2 = ""
            next
        }
    }
    {
        if (in_conflict == 0) {
            print $0
        } else if (in_conflict == 1) {
            buffer1 = buffer1 (buffer1 ? "\n" : "") $0
        } else if (in_conflict == 2) {
            buffer2 = buffer2 (buffer2 ? "\n" : "") $0
        }
    }
    END {
        # Handle unclosed conflicts
        if (in_conflict > 0 && buffer1) {
            print buffer1
        }
    }
    ' "$file" > "$temp_file"
    
    # Replace the original file
    mv "$temp_file" "$file"
done

echo "✅ Fixed merge conflicts in all files!"
echo "📝 Summary: Processed $(echo "$FILES" | wc -l) files"
