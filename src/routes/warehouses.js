/**
 * Warehouse management endpoints
 * CRUD operations for warehouses
 */

const { query } = require('../db/config');
const { refreshCache } = require('../services/zoneService');

/**
 * GET /warehouses
 * Get all warehouses
 */
async function getWarehouses(req, res) {
  try {
    const warehouses = await query(`
      SELECT 
        w.*,
        COUNT(z.id) as zone_count
      FROM warehouses w
      LEFT JOIN zones z ON w.id = z.warehouse_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);
    
    res.json(warehouses);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses', message: error.message });
  }
}

/**
 * GET /warehouses/:id
 * Get a single warehouse with its zones
 */
async function getWarehouse(req, res) {
  try {
    const { id } = req.params;
    
    const warehouses = await query('SELECT * FROM warehouses WHERE id = ?', [id]);
    if (warehouses.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    const warehouse = warehouses[0];
    const zones = await query('SELECT * FROM zones WHERE warehouse_id = ? ORDER BY postcode', [id]);
    
    res.json({
      ...warehouse,
      zones
    });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse', message: error.message });
  }
}

/**
 * POST /warehouses
 * Create a new warehouse
 */
async function createWarehouse(req, res) {
  try {
    const {
      name,
      address,
      suburb,
      state,
      postcode,
      status = 'active',
      shopify_location_id
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Warehouse name is required' });
    }
    
    const result = await query(`
      INSERT INTO warehouses (name, address, suburb, state, postcode, status, shopify_location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, address || null, suburb || null, state || null, postcode || null, status, shopify_location_id || null]);
    
    const warehouse = await query('SELECT * FROM warehouses WHERE id = ?', [result.insertId]);
    
    res.status(201).json(warehouse[0]);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({ error: 'Failed to create warehouse', message: error.message });
  }
}

/**
 * PUT /warehouses/:id
 * Update a warehouse
 */
async function updateWarehouse(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      suburb,
      state,
      postcode,
      status,
      shopify_location_id
    } = req.body;
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (suburb !== undefined) {
      updates.push('suburb = ?');
      params.push(suburb);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      params.push(state);
    }
    if (postcode !== undefined) {
      updates.push('postcode = ?');
      params.push(postcode);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (shopify_location_id !== undefined) {
      updates.push('shopify_location_id = ?');
      params.push(shopify_location_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    
    await query(`
      UPDATE warehouses SET ${updates.join(', ')} WHERE id = ?
    `, params);
    
    const warehouse = await query('SELECT * FROM warehouses WHERE id = ?', [id]);
    
    if (warehouse.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    // Refresh zones cache if warehouse status changed
    if (status !== undefined) {
      await refreshCache();
    }
    
    res.json(warehouse[0]);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Failed to update warehouse', message: error.message });
  }
}

/**
 * DELETE /warehouses/:id
 * Delete a warehouse (cascades to zones)
 */
async function deleteWarehouse(req, res) {
  try {
    const { id } = req.params;
    
    const warehouses = await query('SELECT * FROM warehouses WHERE id = ?', [id]);
    if (warehouses.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    await query('DELETE FROM warehouses WHERE id = ?', [id]);
    
    // Refresh zones cache
    await refreshCache();
    
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Failed to delete warehouse', message: error.message });
  }
}

/**
 * POST /warehouses/:id/zones
 * Add zones to a warehouse
 */
async function addZone(req, res) {
  try {
    const { id } = req.params;
    const { postcode, prefix = false, note } = req.body;
    
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }
    
    // Verify warehouse exists
    const warehouses = await query('SELECT * FROM warehouses WHERE id = ?', [id]);
    if (warehouses.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    // Check if zone already exists
    const existing = await query(
      'SELECT * FROM zones WHERE warehouse_id = ? AND postcode = ?',
      [id, postcode]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Zone already exists for this warehouse and postcode' });
    }
    
    const result = await query(`
      INSERT INTO zones (warehouse_id, postcode, prefix, note)
      VALUES (?, ?, ?, ?)
    `, [id, postcode, prefix ? 1 : 0, note || null]);
    
    const zone = await query('SELECT * FROM zones WHERE id = ?', [result.insertId]);
    
    // Refresh zones cache
    await refreshCache();
    
    res.status(201).json(zone[0]);
  } catch (error) {
    console.error('Error adding zone:', error);
    res.status(500).json({ error: 'Failed to add zone', message: error.message });
  }
}

/**
 * GET /warehouses/:id/zones
 * Get all zones for a warehouse
 */
async function getZones(req, res) {
  try {
    const { id } = req.params;
    
    const zones = await query(
      'SELECT * FROM zones WHERE warehouse_id = ? ORDER BY postcode',
      [id]
    );
    
    res.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones', message: error.message });
  }
}

/**
 * DELETE /warehouses/:id/zones/:zoneId
 * Delete a zone
 */
async function deleteZone(req, res) {
  try {
    const { id, zoneId } = req.params;
    
    const zones = await query('SELECT * FROM zones WHERE id = ? AND warehouse_id = ?', [zoneId, id]);
    if (zones.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    await query('DELETE FROM zones WHERE id = ?', [zoneId]);
    
    // Refresh zones cache
    await refreshCache();
    
    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Failed to delete zone', message: error.message });
  }
}

module.exports = {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addZone,
  getZones,
  deleteZone
};

