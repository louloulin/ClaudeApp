import express from 'express';
import bcrypt from 'bcrypt';
import { userDb, resourceDb } from '../database/db.js';
import { generateToken, authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Check auth status and setup requirements
router.get('/status', async (req, res) => {
  try {
    const hasUsers = await userDb.hasUsers();
    res.json({
      needsSetup: !hasUsers,
      isAuthenticated: false, // Will be overridden by frontend if token exists
      multiTenant: true // Indicate this is now a multi-tenant system
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User registration - now supports multi-tenant
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, role = 'user' } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username must be at least 3 characters, password at least 6 characters' });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if username already exists
    const existingUser = userDb.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = userDb.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // For the first user, make them admin automatically
    const hasUsers = userDb.hasUsers();
    const finalRole = !hasUsers ? 'admin' : role;

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = userDb.createUser(username, passwordHash, email, finalRole);

    // Generate token
    const token = generateToken(user);

    // Update last login
    userDb.updateLastLogin(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token,
      message: !hasUsers ? 'First user created as admin' : 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// User login - supports username or email
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if ((!username && !email) || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Get user from database (try username first, then email)
    let user = null;
    if (username) {
      user = userDb.getUserByUsername(username);
    } else if (email) {
      user = userDb.getUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Update last login
    userDb.updateLastLogin(user.id);

    // Get user resource usage for dashboard
    const resourceUsage = resourceDb.getUserResourceUsage(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        quotas: {
          cpu: user.quota_cpu,
          memory: user.quota_memory,
          storage: user.quota_storage,
          instances: user.quota_claude_instances
        },
        resourceUsage
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected route)
router.get('/user', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Logout (client-side token removal, but this endpoint can be used for logging)
router.post('/logout', authenticateToken, (req, res) => {
  // In a simple JWT system, logout is mainly client-side
  // This endpoint exists for consistency and potential future logging
  console.log(`User ${req.user.username} logged out`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, (_req, res) => {
  try {
    const users = userDb.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user quotas (admin only)
router.put('/users/:userId/quotas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { quota_cpu, quota_memory, quota_storage, quota_claude_instances } = req.body;

    // Validate quotas
    if (quota_cpu < 1 || quota_memory < 512 || quota_storage < 1024 || quota_claude_instances < 1) {
      return res.status(400).json({ error: 'Invalid quota values' });
    }

    const success = userDb.updateUserQuotas(userId, {
      quota_cpu,
      quota_memory,
      quota_storage,
      quota_claude_instances
    });

    if (success) {
      res.json({ success: true, message: 'User quotas updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update quotas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent admin from demoting themselves
    if (req.user.id == userId && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own admin role' });
    }

    const success = userDb.updateUserRole(userId, role);

    if (success) {
      res.json({ success: true, message: 'User role updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const resourceUsage = resourceDb.getUserResourceUsage(userId);
    const quotaCheck = resourceDb.checkUserQuotas(userId);

    res.json({
      user: req.user,
      resourceUsage,
      quotaCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;