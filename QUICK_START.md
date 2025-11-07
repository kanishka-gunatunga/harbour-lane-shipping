# Quick Start Guide - Fix "0 services" Issue

## The Problem

Your carrier service "Harbour Lane Delivery" shows **"0 services"** in Shopify Admin. This means:

- ✅ Carrier service is registered
- ❌ Shopify isn't getting valid responses from your endpoint
- ❌ Or your endpoint isn't accessible via HTTPS

**Shopify carrier services API requires HTTPS.** Your local server must be exposed via HTTPS.

## Solution: Use Built-in Tunnel

### Step 1: Start Your Server

In **Terminal 1**, start your server:

```bash
npm start
```

Wait for: `🚀 Harbour Lane Shipping Module server running`

### Step 2: Start HTTPS Tunnel

In **Terminal 2**, start the tunnel:

```bash
npm run tunnel
```

You'll see:

```
✅ Tunnel is active!
   Public URL: https://random-name.loca.lt
   Carrier Rates: https://random-name.loca.lt/carrier/rates
✅ Updated .env file with new APP_BASE_URL
```

**Keep this terminal open!** The tunnel must stay active.

### Step 3: Register/Update Carrier Service

In **Terminal 3**, register the carrier service:

```bash
npm run register-carrier
```

If the carrier service already exists, update it:

```bash
npm run update-carrier
```

### Step 4: Test the Endpoint

**Windows PowerShell:**

```powershell
# Option 1: Use the test script
.\test-endpoint.ps1 -Url "https://your-tunnel-url"

# Option 2: Use Invoke-RestMethod directly
$body = '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'
Invoke-RestMethod -Uri "https://your-tunnel-url/carrier/rates" -Method POST -ContentType "application/json" -Body $body
```

**Linux/Mac/Git Bash:**

```bash
curl -X POST https://your-tunnel-url/carrier/rates \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'
```

**Expected response:**

```json
{
  "rates": [
    {
      "service_name": "Standard Delivery",
      "service_code": "ZONE_1",
      "total_price": "5900",
      "currency": "AUD",
      "description": "Delivery from Melbourne Warehouse"
    }
  ]
}
```

### Step 5: Test in Shopify Checkout

1. Go to your Shopify store
2. Add a product to cart
3. Go to checkout
4. Enter an address with postcode `2000` (or any covered postcode)
5. **Watch Terminal 1** - you should see:
   ```
   Carrier rates request received: { timestamp: '...', destination: '2000' }
   Carrier rates response: MATCH (45ms)
   ```
6. Checkout should show "Standard Delivery - $59.00"

## Verify Carrier Service is Working

### Check Server Logs

When you go to checkout, **Terminal 1** should show:

```
Carrier rates request received: { timestamp: '...', destination: '2000' }
```

If you **don't see this**, Shopify isn't calling your endpoint. Check:

- [ ] Tunnel is running (Terminal 2 is open)
- [ ] Carrier service is registered (`npm run register-carrier`)
- [ ] Carrier service is enabled in shipping zone
- [ ] "Carrier-calculated shipping" is enabled

### Check Shopify Admin

1. Go to **Settings** → **Shipping and delivery**
2. Click on your shipping zone
3. Make sure **"Harbour Lane Delivery"** is **checked/enabled**
4. Make sure **"Carrier-calculated shipping rates"** is enabled

## Common Issues

### Issue: "0 services" still showing

**Solution:**

1. Make sure tunnel is running (`npm run tunnel`)
2. Test endpoint directly (Step 4 above)
3. Check server logs for errors
4. Update carrier service: `npm run update-carrier`

### Issue: Tunnel URL changed

**Solution:**

1. Tunnel restarted and got a new URL
2. Run: `npm run update-carrier`
3. This updates the carrier service with the new URL

### Issue: "Carrier service not being called"

**Solution:**

1. Check tunnel is running
2. Verify carrier service is enabled in shipping zone
3. Make sure "Carrier-calculated shipping" is enabled
4. Check server is running and accessible

### Issue: Response format error

**Solution:**
Your endpoint must return:

```json
{
  "rates": [
    {
      "service_name": "Standard Delivery",
      "service_code": "ZONE_1",
      "total_price": "5900",
      "currency": "AUD",
      "description": "Delivery from Melbourne Warehouse"
    }
  ]
}
```

- `rates` must be an array
- `total_price` must be a string (in cents)
- All required fields must be present

## Next Steps

Once it's working:

- [ ] Test with different postcodes
- [ ] Verify inquiry creation for uncovered postcodes
- [ ] Check draft orders are created in Shopify
- [ ] Monitor server logs for any errors

## Production Deployment

For production, deploy to a hosting provider (Render, Railway, AWS) with:

- HTTPS enabled (required by Shopify)
- Stable domain name
- Update `APP_BASE_URL` in production `.env`
- Run `npm run register-carrier` with production URL
