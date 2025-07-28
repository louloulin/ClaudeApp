import jwt from 'jsonwebtoken';
import { userDb, resourceDb } from '../database/db.js';

// Get JWT secret from environment or use default (for development)
const JWT_SECRET = process.env.JWT_SECRET || 'claude-ui-dev-secret-change-in-production';

// Optional API key middleware
const validateApiKey = (req, res, next) => {
  // Skip API key validation if not configured
  if (!process.env.API_KEY) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// JWT authentication middleware with resource quota checking
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists and is active
    const user = userDb.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Get user resource usage and quota information
    const resourceUsage = resourceDb.getUserResourceUsage(user.id);
    const quotaCheck = resourceDb.checkUserQuotas(user.id);

    // Attach user info with resource data to request
    req.user = {
      ...user,
      resourceUsage,
      quotaCheck
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user can create new Claude instances
const checkClaudeInstanceQuota = (req, res, next) => {
  const { quotaCheck } = req.user;

  if (quotaCheck && quotaCheck.instances_exceeded) {
    return res.status(429).json({
      error: 'Claude instance quota exceeded',
      quota: quotaCheck.quotas.instances,
      current: quotaCheck.usage.instances
    });
  }

  next();
};

// Middleware to check resource quotas for specific operations
const checkResourceQuotas = (resourceType) => {
  return (req, res, next) => {
    const { quotaCheck } = req.user;

    if (!quotaCheck) {
      return next();
    }

    switch (resourceType) {
      case 'cpu':
        if (quotaCheck.cpu_exceeded) {
          return res.status(429).json({
            error: 'CPU quota exceeded',
            quota: quotaCheck.quotas.cpu,
            current: quotaCheck.usage.cpu
          });
        }
        break;
      case 'memory':
        if (quotaCheck.memory_exceeded) {
          return res.status(429).json({
            error: 'Memory quota exceeded',
            quota: quotaCheck.quotas.memory,
            current: quotaCheck.usage.memory
          });
        }
        break;
      case 'storage':
        if (quotaCheck.storage_exceeded) {
          return res.status(429).json({
            error: 'Storage quota exceeded',
            quota: quotaCheck.quotas.storage,
            current: quotaCheck.usage.storage
          });
        }
        break;
    }

    next();
  };
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Generate JWT token (never expires)
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username 
    },
    JWT_SECRET
    // No expiration - token lasts forever
  );
};

// WebSocket authentication function
const authenticateWebSocket = (token) => {
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('WebSocket token verification error:', error);
    return null;
  }
};

export {
  validateApiKey,
  authenticateToken,
  generateToken,
  authenticateWebSocket,
  checkClaudeInstanceQuota,
  checkResourceQuotas,
  requireAdmin,
  JWT_SECRET
};