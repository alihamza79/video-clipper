#!/bin/bash
set -e

cd /Users/alihamza/Desktop/openshorts

echo "🔧 Setting up remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/alihamza79/video-clipper.git

echo "📥 Fetching your README..."
git fetch origin main || true

echo "🔗 Merging histories..."
git pull origin main --allow-unrelated-histories --no-edit 2>/dev/null || true

echo "⬆️ Pushing all code..."
git push -u origin main --force

echo ""
echo "✅ Code pushed to https://github.com/alihamza79/video-clipper"
