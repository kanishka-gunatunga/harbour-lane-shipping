/**
 * Database configuration module
 * Uses mysql2/promise for connection pooling
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'harbour_lane_shipping',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000, // 10 seconds timeout
  acquireTimeout: 10000, // 10 seconds to get connection from pool
  timeout: 10000 // 10 seconds query timeout
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
 */
async function query(sql, params, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      // If it's a connection error and we have retries left, retry
      if (i < retries - 1 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST')) {
        console.warn(`Database query failed (attempt ${i + 1}/${retries}), retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      console.error('Database query error:', error);
      throw error;
    }
  }
}

module.exports = {
  pool,
  query,
  testConnection
};

