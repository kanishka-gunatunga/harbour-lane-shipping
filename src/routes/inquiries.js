/**
 * Inquiry management endpoints
 */

const { getInquiries, updateInquiryStatus } = require('../services/inquiryService');

/**
 * GET /inquiries
 * Get all inquiries with optional filters
 */
async function getInquiriesRoute(req, res) {
  try {
    const filters = {
      status: req.query.status,
      postcode: req.query.postcode,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
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
    
    if (!status || !['new', 'reviewed', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: new, reviewed, or closed' });
    }
    
    const inquiry = await updateInquiryStatus(id, status);
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

