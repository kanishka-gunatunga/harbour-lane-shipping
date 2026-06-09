# Harbour Lane Shipping Module

A Shopify carrier service that provides shipping rates based on warehouse postcode coverage.

## What It Does

1. **Cart contains a product tagged `luxury`** → Returns $0.00 free shipping (entire order)
2. **In-zone postcodes** → Returns $59.00 shipping rate
3. **Out-of-zone postcodes** → Returns "Inquiry Required" option, creates draft order + inquiry

## Features

- ✅ Postcode-based shipping rates (AUD $59.00)
- ✅ Inquiry option for out-of-zone customers
- ✅ Automatic draft order creation
- ✅ Inquiry tracking in database
- ✅ Warehouse & zone management API
- ✅ Fast in-memory cache (<500ms responses)
- ✅ Production-ready with security features

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL 5.7+
- **Hosting**: Vercel (or any Node.js host)
- **Shopify**: Carrier Service API

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Database

```bash
mysql -u root -p < src/db/schema.sql
npm run seed
```

### 3. Configure `.env`

```env
# Database
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=harbour_lane_shipping

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
APP_BASE_URL=https://your-production-domain.com

# Security
API_KEY=your-secure-api-key
NODE_ENV=production

# Optional: product tag that triggers free shipping (default: luxury)
LUXURY_FREE_SHIPPING_TAG=luxury
```

## Luxury Free Shipping Setup

This project checks cart items at checkout via the carrier service callback. Shopify sends each line item's `product_id`, but **not** product tags. The app looks up tags using the Admin API.

### 1. Add the `read_products` scope (legacy custom app)

This project uses a **legacy custom app** (created in Shopify Admin, not the Dev Dashboard). There is no **Reinstall** button — you must **Uninstall** then **Install** to get a new token with updated scopes.

**Recommended order:** deploy code first, then refresh the token (see steps below).

### 2. Tag luxury products in Shopify

1. Shopify Admin → **Products**
2. Open a luxury product
3. In the **Tags** field, add `luxury` (or your custom tag from `LUXURY_FREE_SHIPPING_TAG`)
4. Save the product

Repeat for every product that should qualify for free shipping.

### 3. Deploy code (do this before refreshing the token)

1. Commit and push the updated code to GitHub
2. Let Vercel deploy (or trigger a manual deploy)
3. Confirm `/health` responds on your `APP_BASE_URL`

You do **not** need a new token for deploy. Deploy first so the luxury logic is live when you paste the new token.

### 4. Refresh the access token (legacy app — no Reinstall button)

After saving `read_products` under **Configuration**, the old token does **not** gain the new scope. Do this:

1. Shopify Admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. Click your app (e.g. **Harbour Lane Shipping Module**)
3. Open the **API credentials** tab
4. Click **Uninstall app** (bottom of page or app header area) → confirm
5. Click **Install app** → confirm
6. Shopify shows the **Admin API access token once** — copy it immediately (you cannot view it again)
7. Update `SHOPIFY_ACCESS_TOKEN` in Vercel → **Settings** → **Environment Variables**
8. Redeploy Vercel (or wait for env-triggered redeploy)

**Downtime warning:** From uninstall until the new token is saved in Vercel, carrier rates and draft orders will fail. Keep this window under a few minutes.

You do **not** need to run `npm run register-carrier` again — the carrier service stays registered on the store.

### 5. Tag products and test checkout

1. Tag luxury products with `luxury` (see step 2 above)
2. Add a luxury product to cart and go to checkout
3. Enter a shipping address — you should see **Complimentary Delivery** at **$0.00**

Mixed carts (luxury + non-luxury) also get free shipping when at least one luxury product is present.

### 4. Start

```bash
npm start
```

## Get Shopify Access Token

1. Shopify Admin → Settings → Apps → Develop apps
2. Create app: `Harbour Lane Shipping Module`
3. Configure scopes: `read_shipping`, `write_shipping`, `read_orders`, `write_orders`, `read_products`
4. Install app → Get Admin API access token

> **Important:** `read_products` is required for luxury free-shipping (the carrier service receives `product_id` but not product tags, so this app looks them up via the Admin API).

## Production Deployment

### Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Register Carrier Service

```bash
npm run register-carrier
```

### Update Carrier Service URL

```bash
npm run update-carrier
```

## API Endpoints

| Endpoint                     | Auth | Description                  |
| ---------------------------- | ---- | ---------------------------- |
| `GET /`                      | No   | API info                     |
| `GET /health`                | No   | Health check                 |
| `POST /carrier/rates`        | No   | Shopify calls this for rates |
| `GET /warehouses`            | Yes  | List warehouses              |
| `POST /warehouses`           | Yes  | Create warehouse             |
| `GET /warehouses/:id/zones`  | Yes  | Get zones                    |
| `POST /warehouses/:id/zones` | Yes  | Add zone                     |
| `GET /inquiries`             | Yes  | List inquiries               |
| `PUT /inquiries/:id/status`  | Yes  | Update inquiry status        |

### Authentication

Admin endpoints require API key:

```bash
curl -H "X-API-Key: your-api-key" https://your-domain.com/warehouses
```

## Postcode Matching

- **Exact**: `3000` matches zone `3000`
- **Prefix**: `3001` matches zone `30*` (prefix=true)

## Checkout Extension (Separate Project)

To block checkout for out-of-zone customers, deploy the checkout extension:

📁 Located at: `D:\kodetech\harbour-lane-checkout-extension\`

See that project's README for setup instructions.

## Scripts

```bash
npm start              # Start server
npm run dev            # Development with auto-reload
npm run seed           # Seed sample data
npm run register-carrier  # Register with Shopify
npm run update-carrier    # Update carrier URL
npm run diagnose       # Run diagnostics
npm run health-check   # Health check
npm run test-db        # Test database connection
```

## Troubleshooting

### Carrier Service Shows "0 services"

1. Check `APP_BASE_URL` is HTTPS and accessible
2. Test endpoint: `curl -X POST https://your-domain.com/carrier/rates -H "Content-Type: application/json" -d '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'`
3. Update carrier URL: `npm run update-carrier`

### Database Connection Issues

1. Check credentials in `.env`
2. Run `npm run test-db`
3. Server handles failures gracefully with auto-retry

### Run Full Diagnostics

```bash
npm run diagnose
```

## License

ISC
