/**
 * Security middleware for Harbour Lane Shipping Module
 * Includes authentication, rate limiting, and input validation
 */

/**
 * Simple API key authentication middleware
 * Protects admin endpoints with API key from environment variable
 */
function authenticateApiKey(req, res, next) {
  // Skip authentication for carrier rates endpoint (called by Shopify)
  if (req.path === '/carrier/rates' || req.path === '/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    console.warn('API_KEY not set in environment - admin endpoints are unprotected');
    return next();
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }

  next();
}

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */
const rateLimitStore = new Map();

function createRateLimiter(windowMs = 60000, maxRequests = 100) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }

    record.count++;
    next();
  };
}

/**
 * Clean up old rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Input validation middleware for common attacks
 */
function validateInput(req, res, next) {
  // Check for SQL injection patterns in query params and body
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(--)|(\/\*)|(\*\/)|(;)/gi;
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      if (sqlInjectionPattern.test(value)) {
        return false;
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (!checkValue(value[key])) {
          return false;
        }
      }
    }
    return true;
  };

  // Check query parameters
  if (req.query && !checkValue(req.query)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content'
    });
  }

  // Check body
  if (req.body && !checkValue(req.body)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content'
    });
  }

  // Check URL parameters
  if (req.params && !checkValue(req.params)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
}

/**
 * Sanitize string inputs
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate and sanitize postcode
 */
function validatePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') {
    return null;
  }
  // Remove non-numeric characters and limit to 4 digits
  const cleaned = postcode.replace(/\D/g, '').substring(0, 4);
  return cleaned.length === 4 ? cleaned : null;
}

module.exports = {
  authenticateApiKey,
  createRateLimiter,
  validateInput,
  sanitizeString,
  validatePostcode
};

