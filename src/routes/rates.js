/**
 * Carrier Service Rates Endpoint
 * This is the main endpoint that Shopify calls during checkout
 * to get shipping rates based on the destination postcode
 */

const { findMatchingZone } = require('../services/zoneService');
const { createDraftOrder } = require('../services/shopifyService');
const { createInquiry } = require('../services/inquiryService');
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
 */
function extractCustomerInfo(payload) {
  const rate = payload?.rate || {};
  const destination = rate.destination || {};
  const customer = rate.customer || {};
  
  return {
    first_name: customer.first_name || destination.first_name || null,
    last_name: customer.last_name || destination.last_name || null,
    email: customer.email || destination.email || null,
    phone: customer.phone || destination.phone || null,
    address: destination.address1 || destination.address || null,
    city: destination.city || null,
    province: destination.province || destination.state || null,
    country: destination.country || 'AU',
    postal_code: destination.postal_code || null
  };
}

/**
 * POST /carrier/rates
 * Main carrier service callback endpoint
 */
async function handleCarrierRates(req, res) {
  const startTime = Date.now();
  
  try {
    // Log incoming request
    console.log('Carrier rates request received:', {
      timestamp: new Date().toISOString(),
      hasRate: !!req.body?.rate,
      destination: req.body?.rate?.destination?.postal_code || 'N/A'
    });
    
    // Extract postcode from payload
    const postcode = extractPostcodeFromPayload(req.body);
    
    if (!postcode) {
      console.warn('No postcode found in carrier request payload');
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
    const matchingZone = await findMatchingZone(postcode);
    
    if (matchingZone) {
      // Postcode matches a warehouse zone - return standard rate
      console.log(`Postcode ${postcode} matched zone: ${matchingZone.warehouseName}`);
      
      const responseTime = Date.now() - startTime;
      console.log(`Carrier rates response: MATCH (${responseTime}ms)`);
      
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
    
    // Postcode does NOT match any zone - create inquiry and draft order
    console.log(`Postcode ${postcode} does not match any zone - creating inquiry`);
    
    const customerInfo = extractCustomerInfo(req.body);
    const items = req.body?.rate?.items || [];
    const productDetails = formatProductDetails(items);
    
    let draftOrderId = null;
    
    // Try to create draft order in Shopify
    try {
      const draftOrder = await createDraftOrder({
        customer: customerInfo,
        destination: customerInfo,
        items: items
      });
      draftOrderId = draftOrder.id;
      console.log(`Draft order created: ${draftOrderId}`);
    } catch (draftError) {
      console.error('Failed to create draft order (continuing with inquiry):', draftError.message);
      // Continue with inquiry creation even if draft order fails
    }
    
    // Create inquiry record in database
    try {
      const inquiry = await createInquiry({
        draft_order_id: draftOrderId,
        customer_name: customerInfo.first_name && customerInfo.last_name 
          ? `${customerInfo.first_name} ${customerInfo.last_name}`.trim()
          : customerInfo.first_name || 'Customer',
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address 
          ? `${customerInfo.address}, ${customerInfo.city || ''}, ${customerInfo.province || ''} ${customerInfo.postal_code || ''}`.trim()
          : null,
        postcode: postcode,
        product_details: productDetails,
        status: 'new'
      });
      console.log(`Inquiry created: ${inquiry.id}`);
    } catch (inquiryError) {
      console.error('Failed to create inquiry record:', inquiryError.message);
      // Continue to return response even if inquiry creation fails
    }
    
    // Return inquiry-required shipping option
    const responseTime = Date.now() - startTime;
    console.log(`Carrier rates response: INQUIRY (${responseTime}ms)`);
    
    return res.json({
      rates: [{
        service_name: 'Inquiry Required — We will contact you',
        service_code: 'INQUIRY',
        total_price: '0',
        currency: req.body?.rate?.currency || 'AUD',
        description: 'No automated rate for this postcode; store will contact you to finalize shipping.'
      }]
    });
    
  } catch (error) {
    // Error handling - return inquiry option as fallback
    console.error('Error in carrier rates endpoint:', error);
    
    const responseTime = Date.now() - startTime;
    console.log(`Carrier rates response: ERROR FALLBACK (${responseTime}ms)`);
    
    // Fallback: return inquiry option so checkout can proceed
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

