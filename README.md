# Harbour Lane Shipping Module

A Shopify custom app that provides shipping logic at checkout based on warehouse postcode coverage. The app automatically handles out-of-zone orders via inquiry records (Shopify creates real orders on checkout completion).

## Features

- ✅ **Postcode-based shipping rates**: Returns AUD $59.00 for covered postcodes
- ✅ **Automatic inquiry handling**: Creates inquiry records for uncovered postcodes (orders are created by Shopify on checkout)
- ✅ **Warehouse & zone management**: Admin API for managing warehouses and postcode zones
- ✅ **Fast lookups**: In-memory cache for postcode matching (<500ms response time)
- ✅ **Shopify Carrier Service**: Integrates seamlessly with Shopify checkout
- ✅ **Production-ready**: Security features, rate limiting, and authentication

## Architecture

- **Backend**: Node.js with Express.js
- **Database**: MySQL 5.7+ or MySQL 8.0+
- **Shopify Integration**: Admin API (REST) for carrier service registration

## Prerequisites

- Node.js 16+ and npm
- MySQL 5.7+ or MySQL 8.0+
- Shopify store with custom app access
- Production server with HTTPS support (required by Shopify)

## Installation

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create the database and run the schema:

**Linux/Mac/Git Bash:**

```bash
mysql -u root -p < src/db/schema.sql
```

**Windows PowerShell:**

```powershell
Get-Content src/db/schema.sql | mysql -u root -p
```

**Interactive MySQL (all platforms):**

```bash
mysql -u root -p
```

Then in MySQL prompt:

```sql
source src/db/schema.sql;
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=harbour_lane_shipping

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
APP_BASE_URL=https://your-production-domain.com

# Security (Required for Production)
API_KEY=your-secure-api-key-here
NODE_ENV=production

# Optional
PORT=5000
SHOPIFY_API_VERSION=2024-01
```

### 4. Get Shopify Access Token

**Legacy Custom App (Recommended for Private Apps)**

1. Log in to your Shopify store admin: `https://your-store.myshopify.com/admin`
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps** (at the bottom) → **Allow custom app development** (if prompted)
4. Click **Create an app**
5. Enter app name: `Harbour Lane Shipping Module`
6. Click **Configure Admin API scopes**
7. Select: `read_shipping`, `write_shipping`, `read_orders`, `write_orders`
8. Click **Save** → **Install app** (if prompted)
9. Go to **API credentials** tab
10. Click **Reveal token once** under **Admin API access token**
11. Copy the token (starts with `shpat_...`) and paste into `.env` as `SHOPIFY_ACCESS_TOKEN`

### 5. Seed Initial Data

Populate the database with sample warehouses and zones:

```bash
npm run seed
```

This creates 3 sample warehouses (Melbourne, Sydney, Brisbane) with example postcode zones.

### 6. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or your configured PORT).

## Production Deployment

### Environment Setup

1. **Set NODE_ENV to production**:

   ```env
   NODE_ENV=production
   ```

2. **Set a secure API_KEY** for admin endpoint protection:

   ```env
   API_KEY=your-very-secure-random-api-key
   ```

3. **Ensure APP_BASE_URL uses HTTPS**:
   ```env
   APP_BASE_URL=https://your-production-domain.com
   ```

### Register Carrier Service

After deploying to production, register the carrier service with Shopify:

```bash
npm run register-carrier
```

This will register your app as a Carrier Service with Shopify, pointing to your production URL.

### Update Carrier Service URL

If you need to update the carrier service URL:

```bash
npm run update-carrier
```

## Security Features

The app includes the following security features:

- ✅ **API Key Authentication**: Admin endpoints require API key authentication
- ✅ **Rate Limiting**: Prevents abuse with configurable rate limits
- ✅ **Input Validation**: Protects against SQL injection and XSS attacks
- ✅ **CORS Protection**: Restricts origins in production mode
- ✅ **Error Handling**: Prevents information leakage in production
- ✅ **Environment Validation**: Validates required environment variables on startup

### Using Admin Endpoints

All admin endpoints (warehouses, inquiries) require authentication. Include your API key in requests:

```bash
curl -H "X-API-Key: your-api-key" https://your-domain.com/warehouses
```

Or using Authorization header:

```bash
curl -H "Authorization: Bearer your-api-key" https://your-domain.com/warehouses
```

## API Endpoints

### Root

- `GET /` - API information and available endpoints (no authentication required)

### Carrier Service

- `POST /carrier/rates` - Main endpoint called by Shopify during checkout (no authentication required)

### Health & Monitoring

- `GET /health` - Server and database status (no authentication required)

### Warehouses (Requires API Key)

- `GET /warehouses` - List all warehouses
- `GET /warehouses/:id` - Get warehouse with zones
- `POST /warehouses` - Create warehouse
- `PUT /warehouses/:id` - Update warehouse
- `DELETE /warehouses/:id` - Delete warehouse

### Zones (Requires API Key)

- `GET /warehouses/:id/zones` - Get zones for a warehouse
- `POST /warehouses/:id/zones` - Add zone to warehouse
- `DELETE /warehouses/:id/zones/:zoneId` - Delete a zone

### Inquiries (Requires API Key)

- `GET /inquiries` - List inquiries (with optional filters: `?status=new&postcode=9999`)
- `PUT /inquiries/:id/status` - Update inquiry status

## Postcode Matching Logic

- **Exact match**: Postcode `3000` matches zone `3000` (exact)
- **Prefix match**: Postcode `3001` matches zone `30*` (prefix = true)
- **Normalization**: All postcodes are normalized (trimmed, uppercase, digits only, 4 digits)

## Database Schema

### warehouses

- Stores warehouse information
- Links to Shopify location (optional)

### zones

- Stores postcode zones per warehouse
- Supports exact matches and prefix patterns (e.g., `30*` matches all postcodes starting with `30`)

### inquiries

- Stores inquiry records for uncovered postcodes
- Links to Shopify orders via `shop_order_id` (when order is created on checkout)
- Tracks customer contact info and order details
- Note: When customer selects "Inquiry Required" ($0 shipping), Shopify creates a REAL order on checkout completion

## Performance Optimization

- Zones are cached in memory (5-minute TTL)
- Cache refreshes automatically after admin updates
- Consider Redis for distributed caching in production

## Documentation

- **README.md** (this file) - Setup and usage guide
- **PERMANENT_SOLUTION.md** - Comprehensive troubleshooting guide for carrier service issues

## Troubleshooting

### Carrier Service Shows "0 services"

This means Shopify isn't getting valid responses from your endpoint. Check:

1. **Verify APP_BASE_URL is correct**: Must be HTTPS and accessible
2. **Test endpoint directly**:
   ```bash
   curl -X POST https://your-domain.com/carrier/rates \
     -H "Content-Type: application/json" \
     -d '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'
   ```
3. **Check server logs**: Watch your server logs for carrier requests
4. **Verify response format**: Must return `{"rates": [...]}` with valid JSON
5. **Update carrier service URL**: Run `npm run update-carrier` if needed

### Carrier Service Not Being Called

1. Verify carrier service is registered: Check Shopify Admin → Settings → Shipping
2. Verify `APP_BASE_URL` is correct and accessible (must be HTTPS)
3. Check Shopify app permissions (requires `read_shipping`, `write_shipping`)
4. Ensure "Carrier-calculated shipping" is enabled in shipping zones
5. Make sure carrier service is enabled in the shipping zone

### Database Connection Issues

1. Verify MySQL is running
2. Check database credentials in `.env`
3. Ensure database exists: `SHOW DATABASES;`
4. Test connection: `mysql -u root -p -h your-host`
5. **Note**: Server handles database connection failures gracefully:
   - Non-blocking startup (server starts immediately)
   - Automatic retry logic (3 attempts with 2s delays)
   - Graceful fallback (returns inquiry option if DB unavailable)
6. Run diagnostic: `npm run diagnose`

### Authentication Errors

1. Verify `API_KEY` is set in environment variables
2. Check that API key is included in request headers (`X-API-Key` or `Authorization: Bearer`)
3. Ensure API key matches the value in your `.env` file

## Example Admin API Usage

### Create Warehouse

```bash
curl -X POST https://your-domain.com/warehouses \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Perth Warehouse",
    "address": "123 Test St",
    "suburb": "Perth",
    "state": "WA",
    "postcode": "6000",
    "status": "active"
  }'
```

### Add Zone to Warehouse

```bash
curl -X POST https://your-domain.com/warehouses/1/zones \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "postcode": "6001",
    "prefix": false,
    "note": "Perth CBD"
  }'
```

### Get All Inquiries

```bash
curl -H "X-API-Key: your-api-key" https://your-domain.com/inquiries
```

## License

ISC

## Diagnostic Tools

### Run Comprehensive Diagnostic

```bash
npm run diagnose
```

Checks environment variables, carrier service registration, shipping zones, endpoint accessibility, database, and zone cache.

### Run Health Check (with auto-recovery)

```bash
npm run health-check
```

Monitors carrier service status and attempts automatic recovery of common issues.

### Test Database Connection

```bash
npm run test-db
```

Tests database connection and verifies schema.

## Deployment

### Pre-Deployment Checklist

- [ ] Set all environment variables in Vercel
- [ ] Run `npm run diagnose` - all checks pass
- [ ] Run `npm run health-check` - all systems operational
- [ ] Test database connection: `npm run test-db`
- [ ] Register carrier service: `npm run register-carrier`
- [ ] Verify carrier service in Shopify admin
- [ ] Test checkout with real postcodes

### Environment Variables (Vercel)

Required variables:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ACCESS_TOKEN`
- `APP_BASE_URL` (must be HTTPS)
- `API_KEY`
- `NODE_ENV=production`

### After Deployment

1. Run diagnostic: `npm run diagnose`
2. Register carrier service: `npm run register-carrier`
3. Monitor Vercel logs for carrier service requests
4. Test checkout in Shopify

## Support

For issues or questions:

1. Check `PERMANENT_SOLUTION.md` for carrier service troubleshooting
2. Run `npm run diagnose` for automated checks
3. Check server logs for detailed error messages
4. Database connection issues: Server now handles failures gracefully (non-blocking startup with retry logic)
