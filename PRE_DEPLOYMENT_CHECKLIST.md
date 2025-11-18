# Pre-Deployment Checklist

## ✅ Code Status

- [x] All code is ready
- [x] No linter errors
- [x] Environment variables documented
- [x] Database schema ready
- [x] Vercel config ready

## 📁 What Will Be Pushed to GitHub

### ✅ Core Application (Will be pushed)
- `src/` - All application code
- `package.json` - Dependencies
- `package-lock.json` - Lock file
- `vercel.json` - Vercel configuration
- `README.md` - Main documentation
- `BLOCKIT_SETUP_GUIDE.md` - Blockit setup guide
- `IMPLEMENTATION_PLAN.md` - Implementation plan
- `QUICK_START_BLOCKIT.md` - Quick start guide
- `DEPLOYMENT_README.md` - Deployment guide

### ✅ Backup Files (Will be pushed - kept as backup)
- `shopify-checkout-extension/` - Custom app files (backup if Blockit doesn't work)
  - `README.md`
  - `src/checkout-validation-function.ts`
  - `shopify.app.toml`
  - `package.json`

### ❌ What Won't Be Pushed (Ignored by .gitignore)
- `node_modules/` - Will be installed on Vercel
- `.env` - Environment variables (set in Vercel)
- `.history/` - Local history
- `*.log` - Log files
- Other `.md` files (old documentation)
- `.DS_Store`, `.idea/`, `.vscode/` - IDE files

## 🚀 Deployment Steps

### 1. Push to GitHub

```bash
# Initialize (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Harbour Lane Shipping Module with Blockit integration"

# Create repo on GitHub, then:
git remote add origin https://github.com/your-username/harbour-lane-shipping-module.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Add environment variables (see `DEPLOYMENT_README.md`)
6. Deploy

### 3. Post-Deployment

1. Register carrier service
2. Configure shipping zones in Shopify
3. Install Blockit app (optional)
4. Test with out-of-zone postcode

## 📝 Environment Variables Needed in Vercel

See `README.md` or `DEPLOYMENT_README.md` for complete list.

Required:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_SECRET`
- `APP_BASE_URL`
- `API_KEY`
- `NODE_ENV=production`

## ✅ Ready to Deploy!

Everything is cleaned up and ready. The extension files are kept as backup but won't interfere with deployment.

