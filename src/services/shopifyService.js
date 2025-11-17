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
    
    // Build line items for draft order
    const lineItems = items.map(item => ({
      title: item.title || 'Product',
      quantity: item.quantity || 1,
      price: item.price ? String(item.price / 100) : '0.00', // Shopify expects decimal string
      grams: item.grams || 0
    }));
    
    // Build draft order payload
    const draftOrderPayload = {
      draft_order: {
        line_items: lineItems,
        customer: {
          first_name: customer.first_name || destination.first_name || 'Customer',
          last_name: customer.last_name || destination.last_name || '',
          email: customer.email || destination.email || '',
          phone: customer.phone || destination.phone || ''
        },
        shipping_address: {
          first_name: destination.first_name || customer.first_name || 'Customer',
          last_name: destination.last_name || customer.last_name || '',
          address1: destination.address1 || destination.address || '',
          city: destination.city || '',
          province: destination.province || destination.state || '',
          country: destination.country || 'AU',
          zip: destination.postal_code || destination.postcode || '',
          phone: destination.phone || customer.phone || ''
        },
        note: `Shipping inquiry required for postcode: ${destination.postal_code || destination.postcode || 'Unknown'}. This order requires manual shipping quote.`,
        tags: 'shipping-inquiry, manual-quote'
      }
    };
    
    const response = await axios.post(
      `${apiUrl}/draft_orders.json`,
      draftOrderPayload,
      { headers }
    );
    
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

