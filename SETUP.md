# Quick Setup Guide

## Step-by-Step Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MySQL Database

**Option A: Using MySQL Command Line (Linux/Mac/Git Bash)**

```bash
mysql -u root -p < src/db/schema.sql
```

**Option B: Using MySQL Command Line (Windows PowerShell)**

PowerShell doesn't support `<` for input redirection. Use one of these methods:

**Method 1: Using Get-Content**

```powershell
Get-Content src/db/schema.sql | mysql -u root -p
```

**Method 2: Using cmd.exe**

```powershell
cmd /c "mysql -u root -p < src/db/schema.sql"
```

**Method 3: Interactive MySQL**

```powershell
mysql -u root -p
```

Then in MySQL prompt:

```sql
source src/db/schema.sql;
```

Or:

```sql
CREATE DATABASE IF NOT EXISTS harbour_lane_shipping;
USE harbour_lane_shipping;
```

Then copy and paste the contents of `src/db/schema.sql` into the MySQL prompt.

**Option C: Using MySQL Client (GUI)**

1. Open MySQL Workbench or phpMyAdmin
2. Create database: `harbour_lane_shipping`
3. Run the SQL from `src/db/schema.sql`

### 3. Configure Environment Variables

1. Copy `env.template` to `.env`:

   **Linux/Mac/Git Bash:**

   ```bash
   cp env.template .env
   ```

   **Windows PowerShell:**

   ```powershell
   Copy-Item env.template .env
   ```

2. Edit `.env` with your values:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=harbour_lane_shipping

   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
   APP_BASE_URL=https://your-ngrok-url.ngrok.io
   ```

### 4. Get Shopify Access Token

**Option A: Using Dev Dashboard (Recommended - Future-Proof Method)**

The Dev Dashboard is Shopify's new app development platform. Legacy custom apps will be deprecated on January 1, 2026.

1. **Access Dev Dashboard:**

   - Go to [Dev Dashboard](https://dev.shopify.com/dashboard/) OR
   - From your Shopify admin: **Settings** → **Apps and sales channels** → **Develop apps** → **Build apps in Dev Dashboard**

2. **Create a new app:**

   - Click **Create app** or **Add app**
   - Select **Custom app** (for private app) or **Public app** (if you want to publish later)
   - Enter app name: `Harbour Lane Shipping Module`
   - Click **Create app**

3. **Configure API scopes:**

   - Go to **API credentials** or **Configuration** tab
   - Click **Configure Admin API scopes**
   - Select the following scopes:
     - `read_shipping`
     - `write_shipping`
     - `read_orders`
     - `write_orders`
     - `read_draft_orders`
     - `write_draft_orders`
   - Click **Save**

4. **Install app to your store:**

   - Click **Install app** or go to **Store access** tab
   - Select your store
   - Click **Install**

5. **Get the access token:**
   - Go to **API credentials** tab
   - Under **Admin API access token**, click **Reveal token once**
   - **Copy the token immediately** (starts with `shpat_...`)
   - Paste it into `.env` as `SHOPIFY_ACCESS_TOKEN`

**Option B: Legacy Custom App (Deprecated - Use Only If Dev Dashboard Not Available)**

⚠️ **Note**: Legacy custom apps will be deprecated on January 1, 2026. Use Dev Dashboard (Option A) instead.

1. Log in to your Shopify store admin: `https://your-store.myshopify.com/admin`
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps** (at the bottom of the page)
4. Click **Allow custom app development** (if prompted)
5. Click **Create an app**
6. Enter app name: `Harbour Lane Shipping Module`
7. Click **Create app**
8. Click **Configure Admin API scopes**
9. Select the required scopes (same as above)
10. Click **Save**
11. Click **Install app** (if prompted)
12. Go to **API credentials** tab
13. Click **Reveal token once** under **Admin API access token**
14. Copy the token and paste into `.env`

### 5. Seed Initial Data

```bash
npm run seed
```

This creates 3 warehouses with sample postcode zones.

### 6. Start the Server

```bash
npm start
```

Verify it's running:

```bash
curl http://localhost:5000/health
```

### 7. Set Up HTTPS Tunnel (Local Development)

**Shopify carrier services require HTTPS.** For local development, use the built-in tunnel script:

1. **Start the tunnel** (in a new terminal):

   ```bash
   npm run tunnel
   ```

   This will:
   - Create a public HTTPS URL (e.g., `https://random-name.loca.lt`)
   - Automatically update your `.env` file with the new URL
   - Keep the tunnel active

2. **Keep the tunnel terminal open** while developing

3. **If the tunnel URL changes**, update the carrier service:

   ```bash
   npm run update-carrier
   ```

**Alternative: Using a specific subdomain**

If you want a consistent subdomain, add to `.env`:

```env
TUNNEL_SUBDOMAIN=your-custom-name
```

Then run `npm run tunnel` (subdomain must be available).

### 8. Register Carrier Service with Shopify

```bash
npm run register-carrier
```

This will:

- Register your app as a Carrier Service
- Set the callback URL to `{APP_BASE_URL}/carrier/rates`
- Enable Shopify to call your app during checkout

### 9. Test the Integration

1. **Test with curl** (covered postcode):

   ```bash
   curl -X POST http://localhost:5000/carrier/rates \
     -H "Content-Type: application/json" \
     -d @test-payload.json
   ```

   Expected: Returns `$59.00` rate

2. **Test with curl** (uncovered postcode):

   ```bash
   curl -X POST http://localhost:5000/carrier/rates \
     -H "Content-Type: application/json" \
     -d @test-payload-uncovered.json
   ```

   Expected: Returns inquiry option with `$0.00`

3. **Test in Shopify Store**:

   - Add a product to cart
   - Go to checkout
   - Enter shipping address:
     - Postcode `3000` → Should show "Standard Delivery - $59.00"
     - Postcode `9999` → Should show "Inquiry Required - $0.00"

4. **Verify Draft Order**:

   - Go to Shopify Admin → Orders → Draft Orders
   - Should see a draft order for the uncovered postcode test

5. **Verify Inquiry Record**:

   ```bash
   curl http://localhost:5000/inquiries
   ```

   Should list the inquiry created for uncovered postcode

## Troubleshooting

### "Database connection failed"

- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### "SHOPIFY_ACCESS_TOKEN is not set"

- Verify `.env` file exists
- Check token is copied correctly (no extra spaces)
- Regenerate token in Shopify Partners Dashboard if needed

### "Carrier service not being called"

- Verify carrier service is registered: Check Shopify Admin → Settings → Shipping
- Ensure `APP_BASE_URL` is correct and accessible
- Check ngrok is running (if local dev)
- Verify Shopify app has correct scopes

### "Draft order not created"

- Check `SHOPIFY_ACCESS_TOKEN` is valid
- Verify app scopes include `read_draft_orders` and `write_draft_orders`
- Check server logs for API errors

## Next Steps

- Add more warehouses and zones via API endpoints
- Set up production deployment (Render/Railway/AWS)
- Add authentication to admin endpoints
- Implement webhook handlers for order updates
- Add CSV import for bulk zone management

## Production Deployment Checklist

- [ ] Deploy to hosting provider (Render/Railway/AWS)
- [ ] Set up managed MySQL database
- [ ] Configure production environment variables
- [ ] Update `APP_BASE_URL` to production domain
- [ ] Run database migrations
- [ ] Run seed script
- [ ] Register carrier service with production URL
- [ ] Set up monitoring and logging
- [ ] Configure backups for database
- [ ] Add rate limiting
- [ ] Set up HTTPS (required by Shopify)
