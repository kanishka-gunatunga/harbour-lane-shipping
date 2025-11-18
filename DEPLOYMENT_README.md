# Deployment Guide

## Pre-Deployment Checklist

- [x] Code is ready
- [x] Environment variables documented
- [x] Database schema ready
- [x] Vercel configuration ready

## GitHub Push

1. **Initialize Git (if not done):**

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Harbour Lane Shipping Module"
   ```

2. **Create GitHub Repository:**

   - Go to GitHub → New repository
   - Name: `harbour-lane-shipping-module`
   - Don't initialize with README (we have one)

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/your-username/harbour-lane-shipping-module.git
   git branch -M main
   git push -u origin main
   ```

## Vercel Deployment

### Step 1: Connect GitHub

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository

### Step 2: Configure Environment Variables

Add these in Vercel dashboard → Settings → Environment Variables:

```
# Database
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=harbour_lane_shipping

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
SHOPIFY_API_SECRET=your-api-secret
APP_BASE_URL=https://your-app.vercel.app

# Security
API_KEY=your-secure-api-key
NODE_ENV=production

# Optional
PORT=5000
SHOPIFY_API_VERSION=2024-01
```

### Step 3: Deploy

1. Vercel will auto-detect Node.js
2. Build command: (leave empty, Vercel auto-detects)
3. Output directory: (leave empty)
4. Click "Deploy"

### Step 4: Verify Deployment

1. Check deployment logs
2. Visit your app URL
3. Test `/health` endpoint
4. Test `/carrier/rates` endpoint

## Post-Deployment

### 1. Register Carrier Service

```bash
npm run register-carrier
```

Or use the script with your Vercel URL:

- Update `APP_BASE_URL` in script
- Run: `node src/scripts/registerCarrierService.js`

### 2. Configure Shipping Zones

1. Go to Shopify Admin → Settings → Shipping and delivery
2. For each shipping zone:
   - Enable "Carrier-calculated shipping rates"
   - Check "Harbour Lane Delivery"

### 3. Install Blockit (Optional)

1. Install Blockit app from Shopify App Store
2. Configure rule: Block when shipping method code = `INQUIRY`
3. See `BLOCKIT_SETUP_GUIDE.md` for details

## Troubleshooting

### Database Connection Issues

- Check environment variables in Vercel
- Verify database allows connections from Vercel IPs
- Check Vercel logs for connection errors

### Carrier Service Not Called

- Verify carrier service is registered
- Check shipping zones have carrier service enabled
- Check server logs in Vercel

### Checkout Not Blocked

- If using Blockit: Check Blockit rule configuration
- If using custom app: Deploy checkout extension
- See `BLOCKIT_SETUP_GUIDE.md` or `shopify-checkout-extension/README.md`

## Files Included in Deployment

✅ **Core Application:**

- `src/` - All application code
- `package.json` - Dependencies
- `vercel.json` - Vercel configuration

✅ **Documentation:**

- `README.md` - Main documentation
- `BLOCKIT_SETUP_GUIDE.md` - Blockit setup
- `IMPLEMENTATION_PLAN.md` - Implementation details

✅ **Backup (Not Used in Deployment):**

- `shopify-checkout-extension/` - Custom app backup

❌ **Ignored (Not Deployed):**

- `node_modules/` - Installed on Vercel
- `.env` - Environment variables in Vercel
- `.history/` - Local history
- Other `.md` files - Documentation only

## Environment Variables Reference

See `README.md` for complete environment variable documentation.
