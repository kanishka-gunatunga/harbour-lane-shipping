# Shopify Checkout Extension - Block Inquiry Checkout

This Shopify Checkout Extension blocks checkout when customers select the "INQUIRY" shipping method and shows a message that their inquiry has been placed.

## Why This Is Needed

- **Carrier Service API limitation**: Can return rates but cannot block checkout or show custom messages
- **Checkout Extension**: Can validate checkout, show messages, and block payment
- **Combined solution**: Carrier service shows inquiry option → Extension blocks checkout

## Setup Instructions

### Prerequisites

1. **Shopify CLI** installed:
   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. **Shopify Partner Account** (free)
   - Sign up at https://partners.shopify.com

3. **Shopify App** (we'll create one)

### Step 1: Create Shopify App

1. **Login to Shopify Partners:**
   - Go to https://partners.shopify.com
   - Click "Apps" → "Create app"

2. **Create App:**
   - Name: "Harbour Lane Checkout Extension"
   - App type: "Custom app"
   - Click "Create app"

3. **Get App Credentials:**
   - Note your **API Key** and **API Secret**
   - You'll need these for deployment

### Step 2: Install Extension

1. **Navigate to extension directory:**
   ```bash
   cd shopify-checkout-extension
   ```

2. **Login to Shopify:**
   ```bash
   shopify auth login
   ```

3. **Link to your app:**
   ```bash
   shopify app link
   ```
   - Select your app from the list

4. **Deploy extension:**
   ```bash
   shopify app deploy
   ```

5. **Install app to your store:**
   - Follow the prompts to install the app to your Shopify store

### Step 3: Configure in Shopify Admin

1. **Go to Shopify Admin:**
   - Settings → Checkout → Checkout extensions

2. **Enable Extension:**
   - Find "Harbour Lane Checkout Extension"
   - Click "Enable"

3. **Test:**
   - Go to checkout with out-of-zone postcode
   - Select "Inquiry Required" shipping
   - Try to proceed → Should be blocked with message

## How It Works

1. **Customer enters out-of-zone postcode**
2. **Carrier service returns** "Inquiry Required" rate (service_code: 'INQUIRY')
3. **Customer selects** the inquiry option
4. **Checkout Extension detects** INQUIRY service code
5. **Extension blocks checkout** and shows message:
   - "Your inquiry has been placed. Our store will contact you to finalize shipping. If delivery is possible, you will receive your order."
6. **Draft order + inquiry** already created by carrier service

## Files

- `src/checkout-validation-function.ts` - Main validation logic
- `shopify.app.toml` - App configuration
- `package.json` - Dependencies

## Customization

### Change Message

Edit `src/checkout-validation-function.ts`:
```typescript
return {
  errors: [{
    message: "Your custom message here"
  }]
};
```

### Change Button Text

This requires additional checkout UI extension (separate from validation). See Shopify documentation for checkout UI extensions.

## Troubleshooting

### Extension Not Blocking Checkout

1. **Check extension is enabled:**
   - Shopify Admin → Settings → Checkout → Checkout extensions
   - Ensure extension is "Active"

2. **Check service code:**
   - Verify carrier service returns `service_code: 'INQUIRY'`
   - Check server logs for carrier service responses

3. **Check extension logs:**
   - Shopify Admin → Apps → Your app → Logs
   - Look for validation errors

### Extension Not Showing Message

1. **Check validation function:**
   - Ensure it's returning errors array
   - Message should be in `errors[0].message`

2. **Test with different postcode:**
   - Try an out-of-zone postcode
   - Verify carrier service returns INQUIRY rate

## Alternative: Shopify Checkout Blocks (No Code)

If you prefer a no-code solution, you can use Shopify's built-in Checkout Blocks:

1. **Go to Shopify Admin:**
   - Settings → Checkout → Customize

2. **Add Dynamic Content Block:**
   - Click "Add block" → "Dynamic content"
   - Name: "Inquiry Message"

3. **Configure Display Rules:**
   - Condition: Shipping method title
   - Operator: Contains
   - Value: "Inquiry Required"

4. **Add Message:**
   - "Your inquiry has been placed. Our store will contact you to finalize shipping."

5. **Position:**
   - Add to "Shipping rate" section
   - Save

**Note:** This shows a message but doesn't block checkout. You'll still need the extension to block checkout.

