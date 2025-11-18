# Quick Start: Blockit Integration

## What We're Doing

1. ✅ **Our code is ready** - Returns `INQUIRY` rate for out-of-zone
2. ⏳ **Install Blockit** - From Shopify App Store
3. ⏳ **Configure Blockit** - Block when shipping = `INQUIRY`
4. ⏳ **Test** - Verify checkout is blocked

---

## Step-by-Step (15 Minutes)

### Step 1: Install Blockit (5 min)

1. Go to: https://apps.shopify.com/blockit-checkout-validation
2. Click "Add app" → "Install app"
3. Grant permissions
4. Done!

### Step 2: Configure Rule (5 min)

1. Open Blockit dashboard (Apps → Blockit)
2. Click "Create Rule"
3. Configure:
   - **Name:** `Block Inquiry Shipping`
   - **Field:** Shipping Method Code
   - **Operator:** Equals
   - **Value:** `INQUIRY`
   - **Action:** Block Checkout ✅
   - **Message:** "Your inquiry has been placed. Our store will contact you to finalize shipping. If delivery is possible, you will receive your order."
4. Save and Activate

### Step 3: Test (5 min)

1. Go to checkout with out-of-zone postcode
2. Select "Inquiry Required" shipping
3. Click "Continue to Payment"
4. **Should be blocked** ✅
5. **Should show message** ✅

---

## If Blockit Doesn't Work

**Backup Plan:**
- We have custom app files in `shopify-checkout-extension/`
- Follow `shopify-checkout-extension/README.md`
- Takes ~5 minutes to deploy

---

## What Our Code Does

✅ Returns inquiry rate with `service_code: 'INQUIRY'`  
✅ Creates draft order automatically  
✅ Creates inquiry in database  
✅ Blockit detects `INQUIRY` and blocks checkout  

**Everything is ready!** Just install and configure Blockit.

