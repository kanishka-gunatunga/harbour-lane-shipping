/**
 * Security middleware for Harbour Lane Shipping Module
 * Includes authentication, rate limiting, and input validation
 */

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Simple API key authentication middleware
 * Protects admin endpoints with API key from environment variable
 * Uses timing-safe comparison to prevent timing attacks
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

  // Use timing-safe comparison to prevent timing attacks
  if (!apiKey || !timingSafeEqual(apiKey, expectedApiKey)) {
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
 * Improved with better cleanup and memory management
 */
const rateLimitStore = new Map();
const MAX_STORE_SIZE = 10000; // Prevent memory bloat

function createRateLimiter(windowMs = 60000, maxRequests = 100) {
  return (req, res, next) => {
    // Use IP + user agent for better identification (prevents simple IP rotation)
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent']?.substring(0, 50) || 'unknown';
    const key = `${ip}:${userAgent}`;
    const now = Date.now();
    
    // Prevent memory bloat - clear store if too large
    if (rateLimitStore.size > MAX_STORE_SIZE) {
      const entries = Array.from(rateLimitStore.entries());
      // Remove oldest 50% of entries
      entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
      for (let i = 0; i < Math.floor(entries.length / 2); i++) {
        rateLimitStore.delete(entries[i][0]);
      }
    }
    
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
      // Add Retry-After header
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfter
      });
    }

    record.count++;
    next();
  };
}

/**
 * Clean up old rate limit records periodically (improved)
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit records`);
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
 * Enhanced with better validation
 */
function validatePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') {
    return null;
  }
  // Remove non-numeric characters and limit to 4 digits
  const cleaned = postcode.replace(/\D/g, '').substring(0, 4);
  // Australian postcodes are 4 digits, must start with 0-9
  if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Validate and sanitize email
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  // Basic email validation (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  if (emailRegex.test(trimmed) && trimmed.length <= 254) {
    return trimmed;
  }
  return null;
}

/**
 * Validate and sanitize phone number
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  // Remove all non-digit characters except + at start
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Australian phone numbers: 10 digits or +61 followed by 9 digits
  if (/^(\+61|0)?[2-9]\d{8}$/.test(cleaned) || cleaned.length >= 10) {
    return cleaned.substring(0, 20); // Limit length
  }
  return null;
}

/**
 * Add security headers to responses
 */
function addSecurityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Remove server header (security through obscurity)
  res.removeHeader('X-Powered-By');
  
  next();
}

module.exports = {
  authenticateApiKey,
  createRateLimiter,
  validateInput,
  sanitizeString,
  validatePostcode,
  validateEmail,
  validatePhone,
  addSecurityHeaders
};

