/**
 * Inquiry service
 * Handles creation and management of shipping inquiries
 */

const { query } = require('../db/config');

/**
 * Find recent inquiry by email within time window
 * @param {string} email - Customer email
 * @param {number} minutesAgo - Time window in minutes (default 60)
 * @returns {Promise<Object|null>} - Existing inquiry or null
 */
async function findRecentInquiry(email, sessionHash, minutesAgo = 60) {
  if (!email) return null; // Need at least email to find duplicates

  try {
    // Use email-based lookup (works without session_hash column)
    const results = await query(`
      SELECT * FROM inquiries 
      WHERE email = ?
      AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
      AND status = 'new'
      ORDER BY created_at DESC
      LIMIT 1
    `, [email, minutesAgo]);

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error finding recent inquiry:', error);
    return null;
  }
}

/**
 * Update existing inquiry with new address/postcode
 * @param {number} inquiryId - Inquiry ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} - Updated inquiry
 */
async function updateInquiry(inquiryId, updateData) {
  try {
    const { address, postcode, draft_order_id, product_details } = updateData;

    // Use basic UPDATE without updated_at (backward compatible)
    await query(`
      UPDATE inquiries 
      SET address = COALESCE(?, address),
          postcode = COALESCE(?, postcode),
          draft_order_id = COALESCE(?, draft_order_id),
          product_details = COALESCE(?, product_details)
      WHERE id = ?
    `, [address, postcode, draft_order_id, product_details, inquiryId]);

    const results = await query('SELECT * FROM inquiries WHERE id = ?', [inquiryId]);
    return results[0];
  } catch (error) {
    console.error('Error updating inquiry:', error);
    throw error;
  }
}

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

    // Note: session_hash column is optional - works without it for backward compatibility
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
  updateInquiryStatus,
  findRecentInquiry,
  updateInquiry
};

