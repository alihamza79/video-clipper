#!/bin/bash
set -e

echo "🚀 Setting up VedioClipper on your GitHub..."

# Change remote to your account
NEW_REMOTE="https://github.com/alihamza79/vedioclipper.git"

echo "📡 Setting new remote: $NEW_REMOTE"
git remote remove origin 2>/dev/null || true
git remote add origin "$NEW_REMOTE"

# Add all changes including fly.toml
git add -A
git commit -m "Add Fly.io config and prepare for deployment" || echo "Nothing to commit"

echo ""
echo "✅ Local setup complete!"
echo ""
echo "📋 NEXT STEPS (run these manually):"
echo ""
echo "1. Create empty repo on GitHub:"
echo "   https://github.com/new"
echo "   Name: vedioclipper"
echo "   Make it Public or Private (your choice)"
echo "   ❌ DON'T add README or .gitignore (we have them already)"
echo ""
echo "2. Push your code:"
echo "   cd /Users/alihamza/Desktop/openshorts"
echo "   git push -u origin main"
echo ""
echo "3. Install Fly.io CLI:"
echo "   brew install flyctl"
echo ""
echo "4. Login to Fly.io:"
echo "   fly auth login"
echo ""
echo "5. Deploy:"
echo "   fly launch --name vedioclipper --region sin"
echo "   fly secrets set OPENAI_API_KEY=sk-..."
echo "   fly secrets set DEEPGRAM_API_KEY=..."
echo "   fly secrets set R2_ACCOUNT_ID=..."
echo "   fly secrets set AWS_ACCESS_KEY_ID=..."
echo "   fly secrets set AWS_SECRET_ACCESS_KEY=..."
echo "   fly secrets set AWS_S3_BUCKET=vedioclipper-prod"
echo "   fly secrets set R2_ENDPOINT=https://..."
echo "   fly deploy"
echo ""
echo "🌐 Your app will be at: https://vedioclipper.fly.dev"
