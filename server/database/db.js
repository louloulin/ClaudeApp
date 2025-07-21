import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use test database path in test environment
const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, 'auth.db');
const INIT_SQL_PATH = path.join(__dirname, 'init.sql');

// Create database connection
const db = new Database(DB_PATH);
if (process.env.NODE_ENV !== 'test') {
  console.log('Connected to SQLite database');
}

// Initialize database with schema
const initializeDatabase = async () => {
  try {
    // First run migrations to update existing database
    runMigrations();

    // Then run the init SQL for any new tables
    const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    db.exec(initSQL);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
};

// User database operations
const userDb = {
  // Check if any users exist
  hasUsers: () => {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
      return row.count > 0;
    } catch (err) {
      throw err;
    }
  },

  // Create a new user (multi-tenant version)
  createUser: (username, passwordHash, email = null, role = 'user') => {
    try {
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(username, email, passwordHash, role);

      // Initialize resource usage tracking for the new user
      const usageStmt = db.prepare(`
        INSERT INTO user_resource_usage (user_id) VALUES (?)
      `);
      usageStmt.run(result.lastInsertRowid);

      return { id: result.lastInsertRowid, username, email, role };
    } catch (err) {
      throw err;
    }
  },

  // Get user by username
  getUserByUsername: (username) => {
    try {
      const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
      return row;
    } catch (err) {
      throw err;
    }
  },

  // Get user by email
  getUserByEmail: (email) => {
    try {
      const row = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
      return row;
    } catch (err) {
      throw err;
    }
  },

  // Update last login time
  updateLastLogin: (userId) => {
    try {
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    } catch (err) {
      throw err;
    }
  },

  // Get user by ID (with resource info)
  getUserById: (userId) => {
    try {
      const row = db.prepare(`
        SELECT u.id, u.username, u.email, u.role,
               u.quota_cpu, u.quota_memory, u.quota_storage, u.quota_claude_instances,
               u.created_at, u.last_login, u.is_active
        FROM users u
        WHERE u.id = ? AND u.is_active = 1
      `).get(userId);
      return row;
    } catch (err) {
      throw err;
    }
  },

  // Get all users (admin function)
  getAllUsers: () => {
    try {
      const rows = db.prepare(`
        SELECT u.id, u.username, u.email, u.role,
               u.quota_cpu, u.quota_memory, u.quota_storage, u.quota_claude_instances,
               u.created_at, u.last_login, u.is_active,
               r.cpu_usage, r.memory_usage, r.storage_usage, r.active_claude_instances
        FROM users u
        LEFT JOIN user_resource_usage r ON u.id = r.user_id
        ORDER BY u.created_at DESC
      `).all();
      return rows;
    } catch (err) {
      throw err;
    }
  },

  // Update user quotas
  updateUserQuotas: (userId, quotas) => {
    try {
      const { quota_cpu, quota_memory, quota_storage, quota_claude_instances } = quotas;
      const stmt = db.prepare(`
        UPDATE users
        SET quota_cpu = ?, quota_memory = ?, quota_storage = ?, quota_claude_instances = ?
        WHERE id = ?
      `);
      stmt.run(quota_cpu, quota_memory, quota_storage, quota_claude_instances, userId);
      return true;
    } catch (err) {
      throw err;
    }
  },

  // Update user role
  updateUserRole: (userId, role) => {
    try {
      const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
      stmt.run(role, userId);
      return true;
    } catch (err) {
      throw err;
    }
  }
};

// Resource usage database operations
const resourceDb = {
  // Get user resource usage
  getUserResourceUsage: (userId) => {
    try {
      const row = db.prepare(`
        SELECT * FROM user_resource_usage WHERE user_id = ?
      `).get(userId);
      return row;
    } catch (err) {
      throw err;
    }
  },

  // Update user resource usage
  updateResourceUsage: (userId, usage) => {
    try {
      const { cpu_usage, memory_usage, storage_usage, active_claude_instances } = usage;
      const stmt = db.prepare(`
        UPDATE user_resource_usage
        SET cpu_usage = ?, memory_usage = ?, storage_usage = ?,
            active_claude_instances = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      stmt.run(cpu_usage, memory_usage, storage_usage, active_claude_instances, userId);
      return true;
    } catch (err) {
      throw err;
    }
  },

  // Check if user exceeds quotas
  checkUserQuotas: (userId) => {
    try {
      const row = db.prepare(`
        SELECT u.quota_cpu, u.quota_memory, u.quota_storage, u.quota_claude_instances,
               r.cpu_usage, r.memory_usage, r.storage_usage, r.active_claude_instances
        FROM users u
        LEFT JOIN user_resource_usage r ON u.id = r.user_id
        WHERE u.id = ?
      `).get(userId);

      if (!row) return null;

      return {
        cpu_exceeded: row.cpu_usage > row.quota_cpu,
        memory_exceeded: row.memory_usage > row.quota_memory,
        storage_exceeded: row.storage_usage > row.quota_storage,
        instances_exceeded: row.active_claude_instances >= row.quota_claude_instances,
        quotas: {
          cpu: row.quota_cpu,
          memory: row.quota_memory,
          storage: row.quota_storage,
          instances: row.quota_claude_instances
        },
        usage: {
          cpu: row.cpu_usage,
          memory: row.memory_usage,
          storage: row.storage_usage,
          instances: row.active_claude_instances
        }
      };
    } catch (err) {
      throw err;
    }
  }
};

// Session database operations
const sessionDb = {
  // Create a new session
  createSession: (userId, sessionId, claudeInstanceId, projectPath) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO user_sessions (user_id, session_id, claude_instance_id, project_path)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(userId, sessionId, claudeInstanceId, projectPath);
      return { id: result.lastInsertRowid, sessionId };
    } catch (err) {
      throw err;
    }
  },

  // Get user sessions
  getUserSessions: (userId) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM user_sessions
        WHERE user_id = ?
        ORDER BY last_activity DESC
      `).all(userId);
      return rows;
    } catch (err) {
      throw err;
    }
  },

  // Update session activity
  updateSessionActivity: (sessionId) => {
    try {
      const stmt = db.prepare(`
        UPDATE user_sessions
        SET last_activity = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `);
      stmt.run(sessionId);
      return true;
    } catch (err) {
      throw err;
    }
  },

  // Terminate session
  terminateSession: (sessionId) => {
    try {
      const stmt = db.prepare(`
        UPDATE user_sessions
        SET status = 'terminated'
        WHERE session_id = ?
      `);
      stmt.run(sessionId);
      return true;
    } catch (err) {
      throw err;
    }
  },

  // Get active sessions count for user
  getActiveSessionsCount: (userId) => {
    try {
      const row = db.prepare(`
        SELECT COUNT(*) as count
        FROM user_sessions
        WHERE user_id = ? AND status = 'active'
      `).get(userId);
      return row.count;
    } catch (err) {
      throw err;
    }
  }
};

export {
  db,
  initializeDatabase,
  userDb,
  resourceDb,
  sessionDb
};