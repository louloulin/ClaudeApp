-- Initialize authentication database for multi-tenant system
PRAGMA foreign_keys = ON;

-- Users table (multi-tenant system)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    quota_cpu INTEGER DEFAULT 2,
    quota_memory INTEGER DEFAULT 4096, -- MB
    quota_storage INTEGER DEFAULT 10240, -- MB
    quota_claude_instances INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- User resource usage tracking
CREATE TABLE IF NOT EXISTS user_resource_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    cpu_usage REAL DEFAULT 0.0, -- percentage
    memory_usage INTEGER DEFAULT 0, -- MB
    storage_usage INTEGER DEFAULT 0, -- MB
    active_claude_instances INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions tracking for Claude instances
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    claude_instance_id TEXT,
    project_path TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_resource_usage_user_id ON user_resource_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON user_sessions(status);