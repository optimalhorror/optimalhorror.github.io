#!/bin/bash
set -e

# Build
bun run build

# Save source index.html
cp index.html index.html.src

# Copy built files
cp -r dist/assets .
cp dist/index.html .

# Commit and push
git add -A
git commit -m "Deploy" || echo "Nothing to commit"
git push

# Restore source index.html for local dev
mv index.html.src index.html

echo "Deployed!"
