# Quick Start - Get Your App Running

## Step 1: Start Your Server (Terminal 1)

```powershell
npm start
```

Wait for: `🚀 Harbour Lane Shipping Module server running`

**Keep this terminal open!**

## Step 2: Start HTTPS Tunnel (Terminal 2)

Open a **NEW terminal** and run:

```powershell
npm run tunnel
```

This will:
- Create a public HTTPS URL (e.g., `https://random-name.loca.lt`)
- Automatically update your `.env` file
- Keep the tunnel active

**Keep this terminal open!**

## Step 3: Update Carrier Service (Terminal 3)

Open **another NEW terminal** and run:

```powershell
npm run update-carrier
```

This updates Shopify with your new tunnel URL.

## Step 4: Test in Checkout

1. Go to your Shopify store
2. Add a product to cart
3. Go to checkout
4. Enter address with postcode:
   - **NSW** + Postcode `2000` (Sydney) → Should show $59 from Sydney Warehouse
   - **VIC** + Postcode `3000` (Melbourne) → Should show $59 from Melbourne Warehouse
   - **VIC** + Postcode `3175` (Dandenong South) → Should show $59 from Melbourne Warehouse

5. **Watch Terminal 1** - you should see:
   ```
   Carrier rates request received: { timestamp: '...', destination: '2000' }
   Carrier rates response: MATCH (8ms)
   ```

## Troubleshooting

### "Tunnel connection refused"

- Make sure **server is running first** (`npm start`)
- Then start tunnel (`npm run tunnel`)

### "Carrier service not showing"

- Make sure **tunnel is running** (Terminal 2 is open)
- Make sure **server is running** (Terminal 1 is open)
- Run `npm run update-carrier` to update the URL
- Check server logs for carrier requests

### "Still seeing $30.27 rate"

- That's a separate issue (likely from theme or Shopify default)
- Your carrier service should show **$59.00** alongside it
- Focus on making sure your $59 rate appears

## Summary

1. ✅ **Terminal 1**: `npm start` (server)
2. ✅ **Terminal 2**: `npm run tunnel` (HTTPS tunnel)
3. ✅ **Terminal 3**: `npm run update-carrier` (update Shopify)
4. ✅ **Test in checkout** - should see $59.00 from your app

Your carrier service is working! The logs show Shopify is calling your app successfully.

