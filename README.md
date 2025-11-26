# Harbour Lane Shipping Module

A Shopify carrier service that provides shipping rates based on warehouse postcode coverage.

## What It Does

1. **In-zone postcodes** → Returns $59.00 shipping rate
2. **Out-of-zone postcodes** → Returns "Inquiry Required" option, creates draft order + inquiry

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
```

### 4. Start

```bash
npm start
```

## Get Shopify Access Token

1. Shopify Admin → Settings → Apps → Develop apps
2. Create app: `Harbour Lane Shipping Module`
3. Configure scopes: `read_shipping`, `write_shipping`, `read_orders`, `write_orders`
4. Install app → Get Admin API access token

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
