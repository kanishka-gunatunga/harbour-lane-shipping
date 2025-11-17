/**
 * Main Express server for Harbour Lane Shipping Module
 * Shopify Carrier Service backend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./db/config');
const { loadZonesCache, getCacheStatus } = require('./services/zoneService');
const { validateEnvironment } = require('./utils/envValidator');
const { authenticateApiKey, createRateLimiter, validateInput } = require('./middleware/security');

// Import routes
const { handleCarrierRates } = require('./routes/rates');
const warehousesRoutes = require('./routes/warehouses');
const inquiriesRoutes = require('./routes/inquiries');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration - restrict to Shopify domains in production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, only allow Shopify domains
    const allowedOrigins = [
      /\.myshopify\.com$/,
      /\.shopify\.com$/,
      process.env.APP_BASE_URL
    ].filter(Boolean);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(validateInput);

// Rate limiting - stricter for carrier rates endpoint
app.use('/carrier/rates', createRateLimiter(60000, 200)); // 200 requests per minute
app.use(createRateLimiter(60000, 100)); // 100 requests per minute for other endpoints

// Authentication middleware for admin endpoints
app.use(authenticateApiKey);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (minimal info for security)
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const cacheStatus = getCacheStatus();
    
    // Don't expose detailed error messages in production
    const isProduction = NODE_ENV === 'production';
    
    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: isProduction 
        ? { success: dbStatus.success }
        : dbStatus,
      zonesCache: {
        loaded: cacheStatus.loaded,
        count: isProduction ? undefined : cacheStatus.count,
        status: cacheStatus.loaded ? 'loaded' : 'not loaded'
      },
      environment: isProduction ? 'production' : NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: NODE_ENV === 'production' ? 'Internal server error' : error.message
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
  
  // Don't expose error details in production
  const isProduction = NODE_ENV === 'production';
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    error: 'Internal server error',
    message: isProduction ? 'An error occurred' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Initialize server (non-blocking for database)
async function startServer() {
  try {
    // Validate environment variables
    console.log('Validating environment variables...');
    if (!validateEnvironment()) {
      process.exit(1);
    }
    console.log('Environment variables validated');
    
    // Start server immediately (don't wait for database)
    // This is critical for serverless environments where cold starts need to be fast
    app.listen(PORT, () => {
      console.log(`\n🚀 Harbour Lane Shipping Module server running`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Health: http://localhost:${PORT}/health`);
      console.log(`📦 Carrier Rates: http://localhost:${PORT}/carrier/rates`);
      if (NODE_ENV === 'production') {
        console.log(`🔒 Production mode: Security features enabled`);
      }
      console.log('');
    });
    
    // Initialize database connection in background (non-blocking)
    initializeDatabase();
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize database connection in background
async function initializeDatabase() {
  console.log('Initializing database connection (non-blocking)...');
  
  // Test database connection with timeout
  const dbTimeout = setTimeout(() => {
    console.warn('⚠️  Database connection is taking longer than expected...');
    console.warn('   Server will continue, but database operations may fail initially.');
    console.warn('   Connection will be retried automatically on first use.');
  }, 5000);
  
  try {
    const dbStatus = await testConnection(3, 2000);
    clearTimeout(dbTimeout);
    
    if (dbStatus.success) {
      console.log('✅ Database connection successful');
      
      // Load zones cache in background
      loadZonesCache().then(() => {
        console.log('✅ Zones cache loaded');
      }).catch(error => {
        console.error('⚠️  Failed to load zones cache initially:', error.message);
        console.error('   Cache will be loaded on first request');
      });
    } else {
      console.warn('⚠️  Database connection failed:', dbStatus.message);
      console.warn('   Server will continue, but database operations may fail.');
      console.warn('   Connection will be retried automatically on first use.');
    }
  } catch (error) {
    clearTimeout(dbTimeout);
    console.warn('⚠️  Database initialization error:', error.message);
    console.warn('   Server will continue, but database operations may fail.');
    console.warn('   Connection will be retried automatically on first use.');
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

