# Harbour Lane Shipping Module

A Shopify custom app that provides shipping logic at checkout based on warehouse postcode coverage. The app automatically handles out-of-zone orders via draft orders and inquiries.

## Features

- ✅ **Postcode-based shipping rates**: Returns AUD $59.00 for covered postcodes
- ✅ **Automatic inquiry handling**: Creates draft orders and inquiry records for uncovered postcodes
- ✅ **Warehouse & zone management**: Admin API for managing warehouses and postcode zones
- ✅ **Fast lookups**: In-memory cache for postcode matching (<500ms response time)
- ✅ **Shopify Carrier Service**: Integrates seamlessly with Shopify checkout

## Architecture

- **Backend**: Node.js with Express.js
- **Database**: MySQL 5.7+
- **Shopify Integration**: Admin API (REST) for draft orders and carrier service registration

## Prerequisites

- Node.js 16+ and npm
- MySQL 5.7+ or MySQL 8.0+
- Shopify dev store with custom app access
- ngrok (for local development/testing)

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

Or using cmd:
```powershell
cmd /c "mysql -u root -p < src/db/schema.sql"
```

**Interactive MySQL (all platforms):**
```bash
mysql -u root -p
```
Then in MySQL prompt:
```sql
source src/db/schema.sql;
```

Or manually:
```sql
CREATE DATABASE harbour_lane_shipping;
USE harbour_lane_shipping;
```
Then copy and paste the contents of `src/db/schema.sql` into the MySQL prompt.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and Shopify store details:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=harbour_lane_shipping

SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
APP_BASE_URL=https://your-ngrok-id.ngrok.io  # For local dev
```

### 4. Get Shopify Access Token

**Option A: Legacy Custom App (Recommended for Private Apps)**

⚠️ **Important**: For a **private app** (like this shipping module), use the **Legacy Custom App** method from your store admin. Dev Dashboard Public apps use OAuth which requires additional setup.

**Note**: Legacy custom apps will be deprecated on January 1, 2026, but they still work and are the easiest method for private apps until then.

1. Log in to your Shopify store admin: `https://your-store.myshopify.com/admin`
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps** (at the bottom) → **Allow custom app development** (if prompted)
4. Click **Create an app**
5. Enter app name: `Harbour Lane Shipping Module`
6. Click **Configure Admin API scopes**
7. Select: `read_shipping`, `write_shipping`, `read_orders`, `write_orders`, `read_draft_orders`, `write_draft_orders`
8. Click **Save** → **Install app** (if prompted)
9. Go to **API credentials** tab
10. Click **Reveal token once** under **Admin API access token**
11. Copy the token (starts with `shpat_...`) and paste into `.env` as `SHOPIFY_ACCESS_TOKEN`

**Option B: Dev Dashboard Public App (Advanced - OAuth Required)**

⚠️ **Note**: Dev Dashboard Public apps use OAuth (Client ID/Secret), which requires OAuth flow implementation. For a simple private app, use Option A instead.

See [SHOPIFY_SETUP.md](SHOPIFY_SETUP.md) for detailed step-by-step instructions.

### 5. Seed Initial Data

Populate the database with sample warehouses and zones:

```bash
npm run seed
```

This creates 3 sample warehouses (Melbourne, Sydney, Brisbane) with example postcode zones.

### 5. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or your configured PORT).

## Local Development with HTTPS Tunnel

**Shopify carrier services require HTTPS.** For local development, use the built-in tunnel script:

### 1. Start the Tunnel

In a new terminal, run:

```bash
npm run tunnel
```

This will:
- Create a public HTTPS URL (e.g., `https://random-name.loca.lt`)
- Automatically update your `.env` file with the new URL
- Keep the tunnel active

**Keep this terminal open** while developing.

### 2. Register Carrier Service

In another terminal, run:

```bash
npm run register-carrier
```

This registers your app as a Carrier Service with Shopify, pointing to your tunnel URL.

### 3. If Tunnel URL Changes

If the tunnel restarts and you get a new URL, update the carrier service:

```bash
npm run update-carrier
```

### Optional: Use a Custom Subdomain

Add to `.env` for a consistent subdomain:

```env
TUNNEL_SUBDOMAIN=your-custom-name
```

Then run `npm run tunnel` (subdomain must be available).

## Testing

### 1. Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": { "success": true, "message": "Database connection successful" },
  "zonesCache": "loaded",
  "environment": "development"
}
```

### 2. Test Carrier Rates Endpoint

Use the example payload below to test the `/carrier/rates` endpoint:

```bash
curl -X POST http://localhost:5000/carrier/rates \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

**test-payload.json** (covered postcode - should return $59 rate):

```json
{
  "rate": {
    "origin": {
      "postal_code": "3000",
      "country": "AU"
    },
    "destination": {
      "postal_code": "3000",
      "country": "AU",
      "address1": "123 Test Street",
      "city": "Melbourne",
      "province": "VIC"
    },
    "items": [
      {
        "title": "Test Product",
        "quantity": 1,
        "grams": 1000,
        "price": 10000
      }
    ],
    "currency": "AUD"
  }
}
```

**test-payload-uncovered.json** (uncovered postcode - should return inquiry option):

```json
{
  "rate": {
    "origin": {
      "postal_code": "3000",
      "country": "AU"
    },
    "destination": {
      "postal_code": "9999",
      "country": "AU",
      "address1": "123 Test Street",
      "city": "Test City",
      "province": "VIC",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "0412345678"
    },
    "items": [
      {
        "title": "Test Product",
        "quantity": 1,
        "grams": 1000,
        "price": 10000
      }
    ],
    "currency": "AUD"
  }
}
```

### 3. Test in Shopify Store

1. Add a product to cart
2. Go to checkout
3. Enter shipping address with postcode:
   - **Covered postcode** (e.g., `3000`, `2000`, `4000`): Should show "Standard Delivery - AUD $59.00"
   - **Uncovered postcode** (e.g., `9999`): Should show "Inquiry Required — We will contact you - $0.00"

## API Endpoints

### Carrier Service

- `POST /carrier/rates` - Main endpoint called by Shopify during checkout

### Health & Monitoring

- `GET /health` - Server and database status

### Warehouses

- `GET /warehouses` - List all warehouses
- `GET /warehouses/:id` - Get warehouse with zones
- `POST /warehouses` - Create warehouse
- `PUT /warehouses/:id` - Update warehouse
- `DELETE /warehouses/:id` - Delete warehouse

### Zones

- `GET /warehouses/:id/zones` - Get zones for a warehouse
- `POST /warehouses/:id/zones` - Add zone to warehouse
- `DELETE /warehouses/:id/zones/:zoneId` - Delete a zone

### Inquiries

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
- Links to Shopify draft orders (if created)
- Tracks customer contact info and order details

## Production Deployment

### 1. Deploy to Hosting (Render/Railway/AWS)

1. Set up MySQL database (managed service or self-hosted)
2. Deploy Node.js app with environment variables
3. Update `APP_BASE_URL` to your production domain
4. Run seed script: `npm run seed`
5. Register carrier service: `npm run register-carrier`

### 2. Security Considerations

- ✅ Use HTTPS only (required by Shopify)
- ✅ Secure `SHOPIFY_ACCESS_TOKEN` (never commit to git)
- ✅ Protect admin endpoints (add authentication middleware)
- ✅ Implement rate limiting for `/carrier/rates`
- ✅ Add request validation and sanitization
- ✅ Monitor logs for errors

### 3. Performance Optimization

- Zones are cached in memory (5-minute TTL)
- Cache refreshes automatically after admin updates
- Consider Redis for distributed caching in production

## Troubleshooting

### Carrier Service Shows "0 services"

This means Shopify isn't getting valid responses from your endpoint. Check:

1. **Verify tunnel is running**: Keep `npm run tunnel` terminal open
2. **Check carrier service URL**: Go to Shopify Admin → Settings → Shipping → Carrier services
3. **Test endpoint directly**:
   
   **PowerShell:**
   ```powershell
   .\test-endpoint.ps1 -Url "https://your-tunnel-url"
   ```
   
   **Linux/Mac:**
   ```bash
   curl -X POST https://your-tunnel-url/carrier/rates \
     -H "Content-Type: application/json" \
     -d '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'
   ```
4. **Check server logs**: Watch your server terminal for carrier requests
5. **Verify response format**: Must return `{"rates": [...]}` with valid JSON
6. **Update carrier service URL**: If tunnel URL changed, run `npm run update-carrier`

### Carrier Service Not Being Called

1. Verify carrier service is registered: Check Shopify Admin → Settings → Shipping
2. Verify `APP_BASE_URL` is correct and accessible (must be HTTPS)
3. Check Shopify app permissions (requires `read_shipping`, `write_shipping`)
4. Ensure "Carrier-calculated shipping" is enabled in shipping zones
5. Make sure carrier service is enabled in the shipping zone

### Draft Orders Not Created

1. Verify `SHOPIFY_ACCESS_TOKEN` is valid
2. Check Shopify app scopes: `read_draft_orders`, `write_draft_orders`
3. Review error logs in server console

### Database Connection Issues

1. Verify MySQL is running
2. Check database credentials in `.env`
3. Ensure database exists: `SHOW DATABASES;`
4. Test connection: `mysql -u root -p -h localhost`

## Example Admin API Usage

### Create Warehouse

```bash
curl -X POST http://localhost:5000/warehouses \
  -H "Content-Type: application/json" \
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
curl -X POST http://localhost:5000/warehouses/1/zones \
  -H "Content-Type: application/json" \
  -d '{
    "postcode": "6001",
    "prefix": false,
    "note": "Perth CBD"
  }'
```

### Get All Inquiries

```bash
curl http://localhost:5000/inquiries
```

## License

ISC

## Support

For issues or questions, please check the logs and ensure all environment variables are correctly set.

