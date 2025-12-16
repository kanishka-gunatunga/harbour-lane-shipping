/**
 * Database configuration module
 * Uses mysql2/promise for connection pooling
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Optimized for serverless environments (Vercel)
// Longer timeouts for cold starts and network latency
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'harbour_lane_shipping',
  waitForConnections: true,
  connectionLimit: process.env.VERCEL ? 2 : 10, // Lower limit for serverless
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 20000, // 20 seconds (increased for serverless)
  acquireTimeout: 20000, // 20 seconds to get connection from pool
  timeout: 15000, // 15 seconds query timeout
  // Additional options for better reliability
  reconnect: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test database connection with retry logic
 */
async function testConnection(retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      if (i === retries - 1) {
        // Last retry failed
        return { success: false, message: error.message, error };
      }
      // Wait before retrying
      console.log(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Execute a query with error handling and retry logic
 * Enhanced for serverless environments with exponential backoff
 */
async function query(sql, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      const isConnectionError = 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout') ||
        error.message?.includes('disconnected');
      
      // If it's a connection error and we have retries left, retry with exponential backoff
      if (i < retries - 1 && isConnectionError) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff, max 5s
        console.warn(`Database query failed (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's the last retry or not a connection error, log and throw
      if (i === retries - 1) {
        console.error(`Database query failed after ${retries} attempts:`, {
          code: error.code,
          message: error.message,
          sql: sql.substring(0, 100) // Log first 100 chars of SQL
        });
      }
      throw error;
    }
  }
}

module.exports = {
  pool,
  query,
  testConnection
};

