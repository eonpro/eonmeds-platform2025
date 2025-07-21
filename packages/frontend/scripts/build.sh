#!/bin/bash

# Set environment variables
export CI=false
export DISABLE_ESLINT_PLUGIN=true
export TSC_COMPILE_ON_ERROR=true
export ESLINT_NO_DEV_ERRORS=true
export REACT_APP_API_URL=https://eonmeds-platform2025-production.up.railway.app
export REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_51RPS5NGzKhM7cZeGlOITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100Ksh6ziwy

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the React app
echo "Building React app..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "Build successful!"
    ls -la build/
else
    echo "Build failed!"
    exit 1
fi 