/**
 * Inquiry management endpoints
 */

const { getInquiries, updateInquiryStatus } = require('../services/inquiryService');
const { validatePostcode } = require('../middleware/security');

/**
 * GET /inquiries
 * Get all inquiries with optional filters
 */
async function getInquiriesRoute(req, res) {
  try {
    // Validate and sanitize inputs
    const status = req.query.status;
    const validStatuses = ['new', 'reviewed', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const postcode = req.query.postcode ? validatePostcode(req.query.postcode) : undefined;
    const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100) : undefined; // Max 100, min 1

    const filters = {
      status: status,
      postcode: postcode,
      limit: limit
    };

    const inquiries = await getInquiries(filters);
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries', message: error.message });
  }
}

/**
 * PUT /inquiries/:id/status
 * Update inquiry status
 */
async function updateInquiryStatusRoute(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ID
    const inquiryId = parseInt(id);
    if (!inquiryId || inquiryId <= 0 || isNaN(inquiryId)) {
      return res.status(400).json({ error: 'Invalid inquiry ID' });
    }

    // Validate status
    if (!status || !['new', 'reviewed', 'closed'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be: new, reviewed, or closed'
      });
    }

    const inquiry = await updateInquiryStatus(inquiryId, status);
    if (!inquiry || inquiry.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    res.json(inquiry[0]);
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({ error: 'Failed to update inquiry status', message: error.message });
  }
}

module.exports = {
  getInquiriesRoute,
  updateInquiryStatusRoute
};

