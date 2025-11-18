/**
 * Inquiry service
 * Handles creation and management of shipping inquiries
 */

const { query } = require('../db/config');

/**
 * Create an inquiry record
 * @param {Object} inquiryData - Inquiry data
 * @returns {Promise<Object>} - Created inquiry
 */
async function createInquiry(inquiryData) {
  try {
    const {
      shop_order_id,
      draft_order_id,
      customer_name,
      email,
      phone,
      address,
      postcode,
      product_details,
      status = 'new'
    } = inquiryData;

    const result = await query(`
      INSERT INTO inquiries (
        shop_order_id,
        draft_order_id,
        customer_name,
        email,
        phone,
        address,
        postcode,
        product_details,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shop_order_id || null,
      draft_order_id || null,
      customer_name || null,
      email || null,
      phone || null,
      address || null,
      postcode || null,
      product_details || null,
      status
    ]);

    // Fetch the created inquiry
    const inquiry = await query(`
      SELECT * FROM inquiries WHERE id = ?
    `, [result.insertId]);

    return inquiry[0];
  } catch (error) {
    console.error('Error creating inquiry:', error);
    throw error;
  }
}

/**
 * Get all inquiries
 * @param {Object} filters - Filter options (status, postcode, etc.)
 * @returns {Promise<Array>} - List of inquiries
 */
async function getInquiries(filters = {}) {
  try {
    let sql = 'SELECT * FROM inquiries WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.postcode) {
      sql += ' AND postcode = ?';
      params.push(filters.postcode);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    return await query(sql, params);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    throw error;
  }
}

/**
 * Update inquiry status
 */
async function updateInquiryStatus(inquiryId, status) {
  try {
    await query(`
      UPDATE inquiries SET status = ? WHERE id = ?
    `, [status, inquiryId]);

    return await query('SELECT * FROM inquiries WHERE id = ?', [inquiryId]);
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    throw error;
  }
}

module.exports = {
  createInquiry,
  getInquiries,
  updateInquiryStatus
};

