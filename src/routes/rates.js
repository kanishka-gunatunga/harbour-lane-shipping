/**
 * Carrier Service Rates Endpoint
 * This is the main endpoint that Shopify calls during checkout
 * to get shipping rates based on the destination postcode
 */

const { findMatchingZone } = require('../services/zoneService');
const { createInquiry, findRecentInquiry, updateInquiry } = require('../services/inquiryService');
const { createDraftOrder } = require('../services/shopifyService');
const { extractPostcodeFromPayload } = require('../utils/postcode');

// Standard shipping rate in cents (AUD $59.00)
const STANDARD_RATE = 5900;

/**
 * Format line items for logging/storage
 */
function formatProductDetails(items) {
  if (!items || !Array.isArray(items)) return null;
  return items.map(item => ({
    title: item.title || 'Product',
    quantity: item.quantity || 1,
    price: item.price || 0,
    grams: item.grams || 0
  })).map(item =>
    `${item.quantity}x ${item.title} - $${(item.price / 100).toFixed(2)}`
  ).join(', ');
}

/**
 * Extract customer information from carrier request
 * Note: Shopify carrier service callback has limited customer data
 * - destination.name might contain full name
 * - email is often NOT provided at this checkout stage
 */
function extractCustomerInfo(payload) {
  const rate = payload?.rate || {};
  const destination = rate.destination || {};
  const customer = rate.customer || {};

  // Parse name - Shopify often sends full name in 'name' field
  let firstName = customer.first_name || destination.first_name || null;
  let lastName = customer.last_name || destination.last_name || null;

  // If no first/last name but we have 'name', split it
  if (!firstName && destination.name) {
    const nameParts = destination.name.trim().split(' ');
    firstName = nameParts[0] || null;
    lastName = nameParts.slice(1).join(' ') || null;
  }

  return {
    first_name: firstName,
    last_name: lastName,
    name: destination.name || null, // Keep original full name too
    email: customer.email || destination.email || null,
    phone: destination.phone || customer.phone || null,
    address: destination.address1 || null,
    address2: destination.address2 || null,
    city: destination.city || null,
    province: destination.province || destination.state || null,
    country: destination.country || 'AU',
    postal_code: destination.postal_code || null,
    company: destination.company_name || destination.company || null
  };
}

/**
 * POST /carrier/rates
 * Main carrier service callback endpoint
 */
async function handleCarrierRates(req, res) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Enhanced logging for debugging intermittent issues
    const requestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      hasRate: !!req.body?.rate,
      destination: {
        postal_code: req.body?.rate?.destination?.postal_code || 'N/A',
        country: req.body?.rate?.destination?.country || 'N/A',
        province: req.body?.rate?.destination?.province || 'N/A',
        city: req.body?.rate?.destination?.city || 'N/A'
      },
      itemCount: req.body?.rate?.items?.length || 0,
      userAgent: req.headers['user-agent']?.substring(0, 100) || 'N/A',
      origin: req.headers.origin || req.headers.referer || 'N/A',
      shopifyStore: req.headers['x-shopify-shop-domain'] || 'N/A'
    };
    console.log(`📦 [${requestId}] Carrier rates request received:`, JSON.stringify(requestLog, null, 2));

    // Extract postcode from payload
    const postcode = extractPostcodeFromPayload(req.body);

    if (!postcode) {
      console.warn(`⚠️ [${requestId}] No postcode found in carrier request payload`);
      const responseTime = Date.now() - startTime;
      console.log(`📤 [${requestId}] Carrier rates response: NO_POSTCODE (${responseTime}ms)`);
      // Return inquiry option if postcode is missing
      return res.json({
        rates: [{
          service_name: 'Inquiry Required — We will contact you',
          service_code: 'INQUIRY',
          total_price: '0',
          currency: req.body?.rate?.currency || 'AUD',
          description: 'Postcode information is missing. Please contact us for shipping.'
        }]
      });
    }

    // Find matching zone for postcode
    // This should be fast (< 100ms) due to in-memory cache
    const zoneLookupStart = Date.now();
    const matchingZone = await findMatchingZone(postcode);
    const zoneLookupTime = Date.now() - zoneLookupStart;

    // Warn if zone lookup is slow (might indicate cache issues)
    if (zoneLookupTime > 500) {
      console.warn(`⚠️ [${requestId}] Zone lookup took ${zoneLookupTime}ms (expected < 100ms) - cache may need refresh`);
    }

    if (matchingZone) {
      // Postcode matches a warehouse zone - return standard rate
      console.log(`✅ [${requestId}] Postcode ${postcode} matched zone: ${matchingZone.warehouseName} (ID: ${matchingZone.warehouseId})`);

      const responseTime = Date.now() - startTime;
      console.log(`📤 [${requestId}] Carrier rates response: MATCH (${responseTime}ms) - Rate: $${(STANDARD_RATE / 100).toFixed(2)}`);

      // Warn if total response time is approaching Shopify timeout (5-10 seconds)
      if (responseTime > 3000) {
        console.warn(`⚠️ [${requestId}] Response time is ${responseTime}ms - approaching Shopify timeout threshold`);
      }

      return res.json({
        rates: [{
          service_name: 'Standard Delivery',
          service_code: `ZONE_${matchingZone.warehouseId}`,
          total_price: String(STANDARD_RATE),
          currency: req.body?.rate?.currency || 'AUD',
          description: `Delivery from ${matchingZone.warehouseName}`
        }]
      });
    }

    // Postcode does NOT match any zone - show inquiry option
    // Create draft order and inquiry in background (non-blocking) to ensure fast response
    // Checkout extension will block checkout when customer clicks "Continue to Payment"
    console.log(`⚠️ [${requestId}] Postcode ${postcode} does not match any zone - showing inquiry option`);

    const customerInfo = extractCustomerInfo(req.body);
    const items = req.body?.rate?.items || [];
    const productDetails = formatProductDetails(items);
    const rate = req.body?.rate || {};
    const destination = rate.destination || {};

    // CRITICAL: Return response immediately to avoid Shopify timeout
    // Create draft order and inquiry in background (non-blocking)
    // This ensures we respond within Shopify's 5-10 second timeout window
    const responseTime = Date.now() - startTime;
    console.log(`📤 [${requestId}] Carrier rates response: INQUIRY_OPTION (${responseTime}ms) - returning immediately, creating draft order in background`);

    // Warn if response time is already high (should be < 500ms for inquiry option)
    if (responseTime > 1000) {
      console.warn(`⚠️ [${requestId}] Response time is ${responseTime}ms before returning inquiry option - may indicate slow zone lookup`);
    }

    // Return response immediately (non-blocking)
    res.json({
      rates: [{
        service_name: 'Inquiry Required — We will contact you',
        service_code: 'INQUIRY',
        total_price: '0',
        currency: req.body?.rate?.currency || 'AUD',
        description: 'No automated rate for this postcode; store will contact you to finalize shipping. If delivery is possible, you will receive your order. Please note: Your inquiry has been submitted and our team will review your delivery address. We will contact you via email or phone within 24-48 hours to confirm shipping availability and provide a custom shipping quote if delivery is possible.'
      }]
    });

    // Create draft order and inquiry in background (non-blocking)
    // This prevents blocking the response and avoids Shopify timeout
    setImmediate(async () => {
      try {
        // Check if we already have a recent inquiry for this email (within last 60 min)
        // This prevents duplicate draft orders when customer changes address
        console.log(`🔍 [${requestId}] [BACKGROUND] Checking for existing inquiry, Email: ${customerInfo.email || 'guest'}`);

        const existingInquiry = await findRecentInquiry(customerInfo.email, null, 60);

        if (existingInquiry) {
          // Update existing inquiry with new address/postcode instead of creating duplicate
          console.log(`♻️ [${requestId}] [BACKGROUND] Found existing inquiry #${existingInquiry.id} - updating instead of creating new`);

          try {
            const fullAddress = customerInfo.address
              ? `${customerInfo.address}, ${customerInfo.city || ''}, ${customerInfo.province || ''} ${postcode}`.trim()
              : null;

            await updateInquiry(existingInquiry.id, {
              address: fullAddress,
              postcode: postcode,
              product_details: productDetails
            });
            console.log(`✅ [${requestId}] [BACKGROUND] Inquiry #${existingInquiry.id} updated with new address`);
          } catch (updateError) {
            console.error(`❌ [${requestId}] [BACKGROUND] Failed to update inquiry:`, updateError.message);
          }

          // Skip creating new draft order - we already have one
          console.log(`⏭️ [${requestId}] [BACKGROUND] Skipping draft order creation - using existing draft: ${existingInquiry.draft_order_id}`);
        } else {
          // No existing inquiry - create new draft order and inquiry
          let draftOrderId = null;

          // Create draft order in Shopify (store can see it immediately)
          try {
            const draftOrder = await createDraftOrder({
              customer: {
                first_name: customerInfo.first_name,
                last_name: customerInfo.last_name,
                email: customerInfo.email,
                phone: customerInfo.phone
              },
              destination: {
                name: customerInfo.name, // Full name from Shopify
                first_name: customerInfo.first_name,
                last_name: customerInfo.last_name,
                address1: customerInfo.address,
                address2: customerInfo.address2,
                city: customerInfo.city,
                province: customerInfo.province,
                country: customerInfo.country,
                postal_code: postcode,
                phone: customerInfo.phone,
                company_name: customerInfo.company
              },
              items: items
            });
            draftOrderId = draftOrder.id;
            console.log(`✅ [${requestId}] [BACKGROUND] Draft order created: ${draftOrderId}`);
          } catch (draftError) {
            console.error(`❌ [${requestId}] [BACKGROUND] Failed to create draft order:`, draftError.message);
            // Continue to create inquiry even if draft order fails
          }

          // Create inquiry record in database
          try {
            // Use full name if available, otherwise construct from first/last
            const customerName = customerInfo.name
              || (customerInfo.first_name && customerInfo.last_name
                ? `${customerInfo.first_name} ${customerInfo.last_name}`.trim()
                : customerInfo.first_name || 'Customer');

            const inquiry = await createInquiry({
              shop_order_id: null, // No real order yet (checkout will be blocked)
              draft_order_id: draftOrderId,
              customer_name: customerName,
              email: customerInfo.email,
              phone: customerInfo.phone,
              address: customerInfo.address
                ? `${customerInfo.address}, ${customerInfo.city || ''}, ${customerInfo.province || ''} ${postcode}`.trim()
                : null,
              postcode: postcode,
              product_details: productDetails,
              status: 'new'
            });
            console.log(`✅ [${requestId}] [BACKGROUND] Inquiry created: ${inquiry.id}`);
          } catch (inquiryError) {
            console.error(`❌ [${requestId}] [BACKGROUND] Failed to create inquiry record:`, inquiryError.message);
          }
        }
      } catch (backgroundError) {
        // Log but don't throw - response already sent
        console.error(`❌ [${requestId}] [BACKGROUND] Error in background draft order/inquiry creation:`, backgroundError.message);
      }
    });

  } catch (error) {
    // Error handling - return inquiry option as fallback
    console.error(`❌ [${requestId}] Error in carrier rates endpoint:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    const responseTime = Date.now() - startTime;
    console.log(`📤 [${requestId}] Carrier rates response: ERROR FALLBACK (${responseTime}ms)`);

    // Fallback: return inquiry option so customer can see something
    // Store should investigate why carrier service is failing
    return res.status(200).json({
      rates: [{
        service_name: 'Inquiry Required — We will contact you',
        service_code: 'INQUIRY',
        total_price: '0',
        currency: req.body?.rate?.currency || 'AUD',
        description: 'Unable to calculate shipping rate. Please contact us for assistance.'
      }]
    });
  }
}

module.exports = {
  handleCarrierRates
};

