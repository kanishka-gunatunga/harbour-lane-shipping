# Blockit: Checkout Validation Setup Guide

## Overview

Blockit will block checkout when customers select the "Inquiry Required" shipping method and show a custom message that their inquiry has been placed.

---

## Step 1: Install Blockit App

1. **Go to Shopify Admin:**

   - Apps → Visit Shopify App Store
   - Or go directly to: https://apps.shopify.com/blockit-checkout-validation

2. **Install Blockit:**

   - Click "Add app"
   - Click "Install app"
   - Grant necessary permissions

3. **Verify Installation:**
   - You should see "Blockit" in your Apps list
   - Click on it to open the dashboard

---

## Step 2: Configure Blockit Rule

### Create Validation Rule

1. **Open Blockit Dashboard:**

   - Go to Apps → Blockit
   - Click "Create Rule" or "Add Rule"

2. **Rule Configuration:**

   **Rule Name:**

   - `Block Inquiry Shipping Method`

   **Rule Type:**

   - Select: **"Shipping Method"** or **"Cart/Order Details"**

   **Condition:**

   - **Field:** Shipping Method Title (or Shipping Method Code)
   - **Operator:** Contains (or Equals)
   - **Value:** `Inquiry Required` (or `INQUIRY`)

   **Action:**

   - **Block Checkout:** ✅ Yes
   - **Show Error Message:** ✅ Yes

   **Error Message:**

   ```
   Your inquiry has been placed. Our store will contact you to finalize shipping. If delivery is possible, you will receive your order.
   ```

3. **Save Rule:**
   - Click "Save" or "Activate"
   - Rule should now be active

---

## Step 3: Test the Setup

### Test Flow:

1. **Go to your store checkout:**

   - Add a product to cart
   - Go to checkout

2. **Enter out-of-zone postcode:**

   - Enter a postcode that doesn't match any zone
   - Example: `9999` (if not in your zones)

3. **Verify carrier service:**

   - Should see "Inquiry Required — We will contact you" option
   - Price: $0.00
   - Description should be visible

4. **Select inquiry option:**

   - Click on "Inquiry Required" shipping method

5. **Try to proceed:**

   - Click "Continue to Payment"
   - **Should be blocked** ✅
   - **Should show message** ✅

6. **Verify draft order:**
   - Go to Shopify Admin → Orders → Draft Orders
   - Should see draft order created
   - Check inquiry in database

---

## Step 4: Verify Our App Integration

### What Our App Does:

1. ✅ **Returns inquiry rate** when postcode is out-of-zone

   - Service name: "Inquiry Required — We will contact you"
   - Service code: `INQUIRY`
   - Price: $0.00

2. ✅ **Creates draft order** automatically

   - Appears in Shopify Admin → Draft Orders
   - Tagged: `shipping-inquiry,manual-quote,checkout-blocked`

3. ✅ **Creates inquiry record** in database
   - Stored in `inquiries` table
   - Status: `new`
   - Linked to draft order

### What Blockit Does:

1. ✅ **Detects** when "Inquiry Required" is selected
2. ✅ **Blocks checkout** when customer tries to proceed
3. ✅ **Shows message** to customer

---

## Troubleshooting

### Issue: Checkout Not Blocked

**Check:**

1. Is Blockit rule active?

   - Go to Blockit dashboard → Check rule status

2. Is rule condition correct?

   - Verify shipping method title/code matches
   - Our app returns: `service_name: 'Inquiry Required — We will contact you'`
   - Our app returns: `service_code: 'INQUIRY'`
   - Try both in Blockit rule

3. Is Blockit enabled?
   - Check Blockit dashboard → Settings
   - Ensure app is enabled

**Solution:**

- Update Blockit rule to match exactly:
  - Shipping Method Title **Contains** `Inquiry Required`
  - OR Shipping Method Code **Equals** `INQUIRY`

---

### Issue: Message Not Showing

**Check:**

1. Is error message configured in Blockit?

   - Go to rule → Edit → Error Message section

2. Is message field filled?
   - Should have: "Your inquiry has been placed..."

**Solution:**

- Update error message in Blockit rule settings

---

### Issue: Draft Order Not Created

**Check:**

1. Is carrier service working?

   - Check server logs for carrier service calls
   - Verify `/carrier/rates` endpoint is responding

2. Is database connection working?
   - Check server logs for database errors
   - Verify inquiry creation in logs

**Solution:**

- Check server logs in Vercel
- Verify database connection
- Check carrier service registration

---

## Rule Configuration Examples

### Option 1: Match by Service Name

```
Field: Shipping Method Title
Operator: Contains
Value: Inquiry Required
```

### Option 2: Match by Service Code (More Reliable)

```
Field: Shipping Method Code
Operator: Equals
Value: INQUIRY
```

**Recommendation:** Use Option 2 (Service Code) as it's more reliable and won't break if we change the service name.

---

## Advanced Configuration

### Multiple Error Messages

If Blockit supports it, you can add:

- Primary message: "Your inquiry has been placed..."
- Secondary message: "Our store will contact you within 24 hours."

### Custom Styling

Some Blockit plans allow custom error message styling. Check Blockit settings for:

- Message color
- Message position
- Message styling

---

## Integration Checklist

- [ ] Blockit app installed
- [ ] Rule created: Block when shipping method = "INQUIRY"
- [ ] Error message configured
- [ ] Rule activated
- [ ] Tested with out-of-zone postcode
- [ ] Checkout blocked ✅
- [ ] Message shown ✅
- [ ] Draft order created ✅
- [ ] Inquiry created ✅

---

## Support

**Blockit Support:**

- Check Blockit app dashboard for support
- Contact Blockit support if rule not working

**Our App Support:**

- Check server logs for carrier service calls
- Verify `/carrier/rates` endpoint responses
- Check database for inquiry records

---

## Summary

**Flow:**

1. Customer enters out-of-zone postcode
2. Our carrier service returns "Inquiry Required" rate
3. Draft order + inquiry created automatically
4. Customer selects inquiry option
5. Customer clicks "Continue to Payment"
6. **Blockit blocks checkout** ✅
7. **Blockit shows message** ✅
8. Customer cannot proceed
9. Store contacts customer

**No custom app needed!** Blockit handles the blocking and messaging.
