# Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Tunnel Connection Error

**Error:**
```
Error: connection refused: localtunnel.me:32073 (check your firewall settings)
```

**Solution:**

1. **Make sure your server is running first:**
   ```bash
   npm start
   ```
   Wait for: `🚀 Harbour Lane Shipping Module server running`

2. **Then start the tunnel in a new terminal:**
   ```bash
   npm run tunnel
   ```

3. **If it still fails:**
   - Check Windows Firewall settings
   - Make sure port 5000 is not blocked
   - Try restarting your server and tunnel

### Issue 2: "0 services" in Shopify

**Problem:** Carrier service shows "0 services" in Shopify Admin.

**Solution:**

1. **Check if server is running:**
   ```bash
   # In Terminal 1
   npm start
   ```

2. **Check if tunnel is running:**
   ```bash
   # In Terminal 2
   npm run tunnel
   ```
   Keep this terminal open!

3. **Update carrier service:**
   ```bash
   # In Terminal 3
   npm run update-carrier
   ```

4. **Test endpoint directly:**
   ```powershell
   .\test-endpoint.ps1 -Url "https://your-tunnel-url"
   ```

5. **Check server logs:**
   - Watch Terminal 1 (where `npm start` is running)
   - When you go to checkout, you should see:
     ```
     Carrier rates request received: { timestamp: '...', destination: '2000' }
     ```

### Issue 3: Shipping Zone Shows Wrong Country

**Problem:** Shipping zone shows "Domestic • Sri Lanka" instead of "Australia".

**Solution:**

See `FIX_SHIPPING_ZONE.md` for detailed instructions.

**Quick fix:**
1. Go to **Shopify Admin** → **Settings** → **Shipping and delivery**
2. Click on the shipping zone name
3. Remove "Sri Lanka" and add "Australia"
4. Save changes

### Issue 4: $59 Charge Appears Then Disappears

**Problem:** You see "$59.00 Standard Delivery" briefly, then it disappears.

**Cause:** This happens when:
- The tunnel disconnects
- The server stops running
- The endpoint becomes unreachable

**Solution:**

1. **Keep tunnel running:**
   - Don't close the terminal where `npm run tunnel` is running
   - If it closes, restart it: `npm run tunnel`

2. **Keep server running:**
   - Don't close the terminal where `npm start` is running
   - If it stops, restart it: `npm start`

3. **Update carrier service if tunnel URL changed:**
   ```bash
   npm run update-carrier
   ```

### Issue 5: Multiple Shipping Rates Showing

**Problem:** You see both "$39.00 Standard" and "$59.00 Standard Delivery".

**Explanation:**
- **$39.00 Standard** = Your manual shipping rate in Shopify
- **$59.00 Standard Delivery** = Your carrier service rate

**Solution:**

1. **Disable manual rates** (if you only want carrier service):
   - Go to **Settings** → **Shipping and delivery**
   - Click on your shipping zone
   - Uncheck or remove the manual "Standard" rate
   - Keep only "Harbour Lane Delivery" enabled

2. **Or keep both** (if you want to offer both options):
   - Customers will see both rates
   - They can choose which one they want

### Issue 6: Tunnel Keeps Disconnecting

**Problem:** Tunnel closes unexpectedly.

**Solution:**

1. **Check your internet connection**
2. **Restart tunnel:**
   ```bash
   npm run tunnel
   ```
3. **Update carrier service with new URL:**
   ```bash
   npm run update-carrier
   ```

### Issue 7: Server Won't Start

**Error:**
```
Database connection failed
```

**Solution:**

1. **Check MySQL is running:**
   ```powershell
   # Check if MySQL service is running
   Get-Service MySQL*
   ```

2. **Check .env file:**
   - Make sure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` are correct

3. **Test database connection:**
   ```powershell
   mysql -u root -p
   ```

### Issue 8: PowerShell curl Command Fails

**Error:**
```
Invoke-WebRequest : A parameter cannot be found that matches parameter name 'X'.
```

**Solution:**

Use PowerShell commands instead of curl:

```powershell
# Use the test script
.\test-endpoint.ps1 -Url "https://your-tunnel-url"

# Or use Invoke-RestMethod directly
$body = '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'
Invoke-RestMethod -Uri "https://your-tunnel-url/carrier/rates" -Method POST -ContentType "application/json" -Body $body
```

## Quick Checklist

Before testing in Shopify checkout:

- [ ] Server is running (`npm start`)
- [ ] Tunnel is running (`npm run tunnel`)
- [ ] Carrier service is registered (`npm run register-carrier` or `npm run update-carrier`)
- [ ] Shipping zone includes Australia (not Sri Lanka)
- [ ] Carrier service is enabled in shipping zone
- [ ] "Carrier-calculated shipping" is enabled
- [ ] Test endpoint works: `.\test-endpoint.ps1 -Url "https://your-tunnel-url"`

## Still Having Issues?

1. **Check server logs** - Watch Terminal 1 for errors
2. **Check tunnel logs** - Watch Terminal 2 for connection issues
3. **Test endpoint directly** - Use `test-endpoint.ps1` script
4. **Verify .env file** - Make sure `APP_BASE_URL` is correct
5. **Check Shopify Admin** - Verify carrier service is registered and enabled

