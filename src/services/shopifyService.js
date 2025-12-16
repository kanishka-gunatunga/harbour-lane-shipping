/**
 * Shopify Admin API service
 * Handles draft order creation and carrier service registration
 */

const axios = require('axios');
const { getAdminApiUrl, getAdminHeaders } = require('../config/shopify');

/**
 * Create a draft order in Shopify
 * @param {Object} orderData - Order data from carrier request or webhook
 * @returns {Promise<Object>} - Created draft order
 */
async function createDraftOrder(orderData) {
  try {
    const apiUrl = getAdminApiUrl();
    const headers = getAdminHeaders();
    
    // Extract customer info from carrier request
    const customer = orderData.customer || {};
    const items = orderData.items || [];
    const destination = orderData.destination || {};

    // Parse name - Shopify sometimes sends full name in 'name' field
    let firstName = customer.first_name || destination.first_name || '';
    let lastName = customer.last_name || destination.last_name || '';
    
    // If we have a 'name' field but no first/last, try to split it
    if (!firstName && !lastName && destination.name) {
      const nameParts = destination.name.trim().split(' ');
      firstName = nameParts[0] || 'Customer';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Default if still empty
    if (!firstName) firstName = 'Customer';

    const email = customer.email || destination.email || '';
    const phone = customer.phone || destination.phone || '';
    const postcode = destination.postal_code || destination.postcode || 'Unknown';

    // Log what we received for debugging
    console.log('📝 Creating draft order with data:', {
      firstName,
      lastName,
      email: email || '(not provided)',
      phone: phone || '(not provided)',
      address: destination.address1 || destination.address || '(not provided)',
      city: destination.city || '(not provided)',
      postcode
    });
    
    // Build line items for draft order
    const lineItems = items.map(item => ({
      title: item.title || 'Product',
      quantity: item.quantity || 1,
      price: item.price ? String(item.price / 100) : '0.00', // Shopify expects decimal string
      grams: item.grams || 0
    }));

    // Build shipping address
    const shippingAddress = {
      first_name: firstName,
      last_name: lastName,
      address1: destination.address1 || destination.address || '',
      address2: destination.address2 || '',
      city: destination.city || '',
      province: destination.province || destination.state || '',
      country: destination.country || 'AU',
      zip: postcode,
      phone: phone,
      company: destination.company_name || destination.company || ''
    };
    
    // Build draft order payload
    // Note: We only include customer object if we have an email (required by Shopify)
    const draftOrderPayload = {
      draft_order: {
        line_items: lineItems,
        shipping_address: shippingAddress,
        note: `📍 SHIPPING INQUIRY - Out of Zone\n\nPostcode: ${postcode}\nCustomer: ${firstName} ${lastName}\nPhone: ${phone || 'Not provided'}\nAddress: ${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.province} ${postcode}\n\n⚠️ This order requires manual shipping quote. Checkout was blocked - customer is waiting for contact.`,
        tags: 'shipping-inquiry,manual-quote,checkout-blocked'
      }
    };

    // Only add customer if we have email (Shopify requires email to create/link customer)
    if (email) {
      draftOrderPayload.draft_order.customer = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone
      };
    }

    // Also set billing address same as shipping
    draftOrderPayload.draft_order.billing_address = shippingAddress;
    
    const response = await axios.post(
      `${apiUrl}/draft_orders.json`,
      draftOrderPayload,
      { headers }
    );
    
    console.log('✅ Draft order created:', response.data.draft_order?.id);
    return response.data.draft_order;
  } catch (error) {
    // Log detailed error for debugging
    if (error.response?.data) {
      console.error('Error creating draft order:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error creating draft order:', error.message);
    }
    throw error;
  }
}

/**
 * Register carrier service with Shopify
 * @param {string} callbackUrl - Public HTTPS URL for carrier rates endpoint
 * @returns {Promise<Object>} - Created carrier service
 */
async function registerCarrierService(callbackUrl) {
  try {
    const apiUrl = getAdminApiUrl();
    const headers = getAdminHeaders();
    
    const payload = {
      carrier_service: {
        name: 'Harbour Lane Delivery',
        callback_url: callbackUrl,
        service_discovery: true
      }
    };
    
    const response = await axios.post(
      `${apiUrl}/carrier_services.json`,
      payload,
      { headers }
    );
    
    return response.data.carrier_service;
  } catch (error) {
    if (error.response?.status === 422 && error.response?.data?.errors) {
      // Carrier service might already exist
      throw new Error(`Carrier service registration failed: ${JSON.stringify(error.response.data.errors)}`);
    }
    console.error('Error registering carrier service:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all carrier services
 */
async function getCarrierServices() {
  try {
    const apiUrl = getAdminApiUrl();
    const headers = getAdminHeaders();
    
    const response = await axios.get(
      `${apiUrl}/carrier_services.json`,
      { headers }
    );
    
    return response.data.carrier_services;
  } catch (error) {
    console.error('Error fetching carrier services:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update carrier service callback URL
 * @param {number} carrierServiceId - Carrier service ID
 * @param {string} callbackUrl - New public HTTPS URL for carrier rates endpoint
 * @returns {Promise<Object>} - Updated carrier service
 */
async function updateCarrierService(carrierServiceId, callbackUrl) {
  try {
    const apiUrl = getAdminApiUrl();
    const headers = getAdminHeaders();
    
    const payload = {
      carrier_service: {
        id: carrierServiceId,
        callback_url: callbackUrl,
        service_discovery: true
      }
    };
    
    const response = await axios.put(
      `${apiUrl}/carrier_services/${carrierServiceId}.json`,
      payload,
      { headers }
    );
    
    return response.data.carrier_service;
  } catch (error) {
    console.error('Error updating carrier service:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createDraftOrder,
  registerCarrierService,
  getCarrierServices,
  updateCarrierService
};

