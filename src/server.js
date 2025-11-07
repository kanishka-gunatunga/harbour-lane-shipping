/**
 * Main Express server for Harbour Lane Shipping Module
 * Shopify Carrier Service backend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./db/config');
const { loadZonesCache, getCacheStatus } = require('./services/zoneService');

// Import routes
const { handleCarrierRates } = require('./routes/rates');
const warehousesRoutes = require('./routes/warehouses');
const inquiriesRoutes = require('./routes/inquiries');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const cacheStatus = getCacheStatus();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      zonesCache: {
        loaded: cacheStatus.loaded,
        count: cacheStatus.count,
        status: cacheStatus.loaded ? 'loaded' : 'not loaded'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Carrier Service endpoint (main endpoint called by Shopify)
app.post('/carrier/rates', handleCarrierRates);

// Admin endpoints
app.get('/warehouses', warehousesRoutes.getWarehouses);
app.get('/warehouses/:id', warehousesRoutes.getWarehouse);
app.post('/warehouses', warehousesRoutes.createWarehouse);
app.put('/warehouses/:id', warehousesRoutes.updateWarehouse);
app.delete('/warehouses/:id', warehousesRoutes.deleteWarehouse);
app.get('/warehouses/:id/zones', warehousesRoutes.getZones);
app.post('/warehouses/:id/zones', warehousesRoutes.addZone);
app.delete('/warehouses/:id/zones/:zoneId', warehousesRoutes.deleteZone);

// Inquiry endpoints
app.get('/inquiries', inquiriesRoutes.getInquiriesRoute);
app.put('/inquiries/:id/status', inquiriesRoutes.updateInquiryStatusRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Initialize server
async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const dbStatus = await testConnection();
    if (!dbStatus.success) {
      console.error('Database connection failed:', dbStatus.message);
      process.exit(1);
    }
    console.log('Database connection successful');
    
    // Load zones cache
    console.log('Loading zones cache...');
    await loadZonesCache();
    console.log('Zones cache loaded');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Harbour Lane Shipping Module server running`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Health: http://localhost:${PORT}/health`);
      console.log(`📦 Carrier Rates: http://localhost:${PORT}/carrier/rates`);
      console.log(`\n⚠️  For Shopify callbacks, expose this server via ngrok:`);
      console.log(`   ngrok http ${PORT}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;

