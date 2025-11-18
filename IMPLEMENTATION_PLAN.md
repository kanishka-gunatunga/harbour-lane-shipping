# Implementation Plan - Blockit Integration

## Strategy

1. **Try Blockit first** (easier, no coding)
2. **Keep custom app files as backup** (if Blockit doesn't work)
3. **Test thoroughly** before deciding

---

## Step 1: Verify Our Code is Ready ✅

### What Our Carrier Service Does:

Our code in `src/routes/rates.js` already returns:
```javascript
{
  rates: [{
    service_name: 'Inquiry Required — We will contact you',
    service_code: 'INQUIRY',  // ← Blockit will check this
    total_price: '0',
    currency: 'AUD',
    description: 'No automated rate for this postcode; store will contact you to finalize shipping. If delivery is possible, you will receive your order.'
  }]
}
```

**Key for Blockit:**
- ✅ `service_code: 'INQUIRY'` - Blockit will match this
- ✅ `service_name: 'Inquiry Required — We will contact you'` - Blockit can also match this
- ✅ Draft order + inquiry created automatically

**Status:** ✅ Our code is ready!

---

## Step 2: Install Blockit App

1. **Go to Shopify Admin:**
   - Apps → Visit Shopify App Store
   - Search: "Blockit Checkout Validation"
   - Or direct link: https://apps.shopify.com/blockit-checkout-validation

2. **Install:**
   - Click "Add app"
   - Click "Install app"
   - Grant permissions

3. **Verify:**
   - Should appear in Apps list
   - Open Blockit dashboard

---

## Step 3: Configure Blockit Rule

### Rule Configuration:

**Rule Name:**
```
Block Inquiry Shipping Method
```

**Rule Type:**
- Select: **"Shipping Method"** or **"Cart/Order Details"**

**Condition (Option 1 - Recommended):**
- **Field:** Shipping Method Code
- **Operator:** Equals
- **Value:** `INQUIRY`

**Condition (Option 2 - Backup):**
- **Field:** Shipping Method Title
- **Operator:** Contains
- **Value:** `Inquiry Required`

**Action:**
- ✅ **Block Checkout:** Yes
- ✅ **Show Error Message:** Yes

**Error Message:**
```
Your inquiry has been placed. Our store will contact you to finalize shipping. If delivery is possible, you will receive your order.
```

**Save and Activate Rule**

---

## Step 4: Test the Integration

### Test Flow:

1. **Go to your store:**
   - Add product to cart
   - Go to checkout

2. **Enter out-of-zone postcode:**
   - Use a postcode NOT in your zones
   - Example: `9999` (if not in your database)

3. **Verify carrier service response:**
   - Should see: "Inquiry Required — We will contact you"
   - Price: $0.00
   - Description visible

4. **Select inquiry option:**
   - Click on "Inquiry Required" shipping method

5. **Try to proceed:**
   - Click "Continue to Payment"
   - **Expected:** Checkout blocked ✅
   - **Expected:** Message shown ✅

6. **Verify backend:**
   - Check Shopify Admin → Draft Orders
   - Should see draft order created
   - Check database → `inquiries` table
   - Should see inquiry record

---

## Step 5: Troubleshooting

### If Blockit Doesn't Block Checkout:

**Check 1: Rule Configuration**
- Is rule active?
- Does condition match exactly?
  - Try: Shipping Method Code = `INQUIRY`
  - Try: Shipping Method Title Contains `Inquiry Required`

**Check 2: Carrier Service Response**
- Check server logs (Vercel)
- Verify `service_code: 'INQUIRY'` is returned
- Verify `service_name` contains "Inquiry Required"

**Check 3: Blockit Settings**
- Is Blockit enabled?
- Are there any conflicting rules?
- Check Blockit logs/dashboard

### If Still Not Working:

**Option A: Try Different Condition**
- Shipping Method Code: `INQUIRY`
- Shipping Method Title: `Inquiry Required — We will contact you`
- Shipping Method Handle: Check what Shopify uses

**Option B: Contact Blockit Support**
- They can help configure the rule
- May need to check their documentation

**Option C: Use Custom App (Backup)**
- We have `shopify-checkout-extension/` ready
- Follow `shopify-checkout-extension/README.md`
- Deploy if Blockit doesn't work

---

## Step 6: Verify Everything Works

### Checklist:

- [ ] Blockit app installed
- [ ] Rule created and activated
- [ ] Rule condition matches our `service_code: 'INQUIRY'`
- [ ] Error message configured
- [ ] Tested with out-of-zone postcode
- [ ] Checkout blocked when inquiry selected ✅
- [ ] Message shown to customer ✅
- [ ] Draft order created in Shopify ✅
- [ ] Inquiry created in database ✅

---

## Backup Plan: Custom App

**If Blockit doesn't work:**

1. **Keep custom app files:**
   - `shopify-checkout-extension/` folder
   - All files are ready to use

2. **Deploy custom app:**
   - Follow `shopify-checkout-extension/README.md`
   - Takes ~5 minutes
   - Will definitely work (we control the code)

3. **Why keep as backup:**
   - Blockit might not support shipping method validation
   - Blockit might have limitations
   - Custom app gives full control

---

## Current Status

### ✅ Ready:
- Carrier service code (returns INQUIRY rate)
- Draft order creation
- Inquiry creation
- Custom app files (backup)

### ⏳ To Do:
- Install Blockit app
- Configure Blockit rule
- Test integration
- Verify checkout blocking

---

## Next Steps

1. **Install Blockit** (5 minutes)
2. **Configure rule** (5 minutes)
3. **Test** (10 minutes)
4. **If works:** ✅ Done!
5. **If doesn't work:** Use custom app backup

---

## Support Resources

- **Blockit Setup:** See `BLOCKIT_SETUP_GUIDE.md`
- **Custom App Backup:** See `shopify-checkout-extension/README.md`
- **Our Code:** All in `src/` folder
- **Troubleshooting:** Check server logs in Vercel

