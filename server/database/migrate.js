import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, 'auth.db');

// Migration functions
const migrations = [
  {
    version: 1,
    description: 'Add multi-tenant support fields to users table',
    up: (db) => {
      console.log('Running migration 1: Adding multi-tenant fields...');
      
      // Check if columns already exist
      const tableInfo = db.prepare("PRAGMA table_info(users)").all();
      const existingColumns = tableInfo.map(col => col.name);
      
      // SQLite doesn't support adding UNIQUE constraint directly in ALTER TABLE
      // We need to recreate the table with the new schema

      // First, check if we need to migrate
      const needsMigration = !existingColumns.includes('email') ||
                            !existingColumns.includes('role') ||
                            !existingColumns.includes('quota_cpu') ||
                            !existingColumns.includes('quota_memory') ||
                            !existingColumns.includes('quota_storage') ||
                            !existingColumns.includes('quota_claude_instances');

      if (needsMigration) {
        console.log('Recreating users table with new schema...');

        // Create new table with all columns
        db.exec(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
            quota_cpu INTEGER DEFAULT 2,
            quota_memory INTEGER DEFAULT 4096,
            quota_storage INTEGER DEFAULT 10240,
            quota_claude_instances INTEGER DEFAULT 3,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active BOOLEAN DEFAULT 1
          )
        `);

        // Copy data from old table to new table
        db.exec(`
          INSERT INTO users_new (id, username, password_hash, created_at, last_login, is_active)
          SELECT id, username, password_hash, created_at, last_login, is_active FROM users
        `);

        // Drop old table
        db.exec('DROP TABLE users');

        // Rename new table to users
        db.exec('ALTER TABLE users_new RENAME TO users');

        console.log('Users table recreated successfully');
      } else {
        console.log('Users table already has all required columns');
      }
      
      // Update existing users to have admin role (first user becomes admin)
      const users = db.prepare('SELECT id FROM users ORDER BY created_at ASC').all();
      if (users.length > 0) {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', users[0].id);
        console.log(`Set user ${users[0].id} as admin`);
      }
      
      console.log('✅ Migration 1 completed');
    }
  },
  {
    version: 2,
    description: 'Create resource usage and session tracking tables',
    up: (db) => {
      console.log('Running migration 2: Creating resource tracking tables...');
      
      // Create user_resource_usage table
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_resource_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          cpu_usage REAL DEFAULT 0.0,
          memory_usage INTEGER DEFAULT 0,
          storage_usage INTEGER DEFAULT 0,
          active_claude_instances INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create user_sessions table
      db.exec(`
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
        )
      `);
      
      // Create indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_resource_usage_user_id ON user_resource_usage(user_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_status ON user_sessions(status)');
      
      // Initialize resource usage for existing users
      const users = db.prepare('SELECT id FROM users').all();
      const insertUsage = db.prepare('INSERT OR IGNORE INTO user_resource_usage (user_id) VALUES (?)');
      
      for (const user of users) {
        insertUsage.run(user.id);
      }
      
      console.log(`✅ Migration 2 completed, initialized resource tracking for ${users.length} users`);
    }
  },
  {
    version: 3,
    description: 'Create CC Agents system tables',
    up: (db) => {
      console.log('Running migration 3: Creating CC Agents tables...');
      
      // Create agents table
      db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT NOT NULL DEFAULT '🤖',
          version TEXT DEFAULT '1.0.0',
          author TEXT,
          model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
          system_prompt TEXT NOT NULL,
          default_task TEXT,
          tools TEXT, -- JSON array of tool names
          permissions TEXT, -- JSON object with permissions
          metadata TEXT, -- JSON object with additional metadata
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create agent_executions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS agent_executions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          project_path TEXT,
          task TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
          result TEXT, -- JSON object with execution result
          error_message TEXT,
          tokens_used INTEGER DEFAULT 0,
          cost REAL DEFAULT 0.0,
          duration INTEGER, -- milliseconds
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create usage_records table for detailed tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS usage_records (
          id TEXT PRIMARY KEY, -- UUID
          user_id INTEGER NOT NULL,
          project_id TEXT,
          session_id TEXT,
          agent_id INTEGER,
          model TEXT NOT NULL,
          tokens_input INTEGER DEFAULT 0,
          tokens_output INTEGER DEFAULT 0,
          tokens_total INTEGER DEFAULT 0,
          cost REAL DEFAULT 0.0,
          duration INTEGER, -- milliseconds
          operation_type TEXT NOT NULL, -- 'chat', 'agent_execution', 'mcp_tool'
          metadata TEXT, -- JSON object with additional data
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        )
      `);
      
      // Create mcp_servers table
      db.exec(`
        CREATE TABLE IF NOT EXISTS mcp_servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          transport TEXT NOT NULL CHECK (transport IN ('stdio', 'sse')),
          command TEXT,
          args TEXT, -- JSON array of command arguments
          env TEXT, -- JSON object with environment variables
          url TEXT, -- For SSE transport
          scope TEXT DEFAULT 'user' CHECK (scope IN ('local', 'project', 'user', 'global')),
          is_active BOOLEAN DEFAULT 1,
          status TEXT DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'error')),
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create mcp_tool_usage table
      db.exec(`
        CREATE TABLE IF NOT EXISTS mcp_tool_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          tool_name TEXT NOT NULL,
          session_id TEXT,
          input_data TEXT, -- JSON object
          output_data TEXT, -- JSON object
          execution_time INTEGER, -- milliseconds
          tokens_used INTEGER DEFAULT 0,
          status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error')),
          error_message TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create indexes for performance
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_usage_records_session_id ON usage_records(session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_usage_records_agent_id ON usage_records(agent_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_usage_records_timestamp ON usage_records(timestamp)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_tool_usage_server_id ON mcp_tool_usage(server_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_tool_usage_user_id ON mcp_tool_usage(user_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_tool_usage_timestamp ON mcp_tool_usage(timestamp)');
      
      console.log('✅ Migration 3 completed');
    }
  },
  {
    version: 4,
    description: 'Extend user_resource_usage table with new fields',
    up: (db) => {
      console.log('Running migration 4: Extending user_resource_usage table...');
      
      // Check if columns already exist
      const tableInfo = db.prepare("PRAGMA table_info(user_resource_usage)").all();
      const existingColumns = tableInfo.map(col => col.name);
      
      // Add new columns if they don't exist
      if (!existingColumns.includes('tokens_used_total')) {
        db.exec('ALTER TABLE user_resource_usage ADD COLUMN tokens_used_total INTEGER DEFAULT 0');
      }
      if (!existingColumns.includes('cost_total')) {
        db.exec('ALTER TABLE user_resource_usage ADD COLUMN cost_total REAL DEFAULT 0.0');
      }
      if (!existingColumns.includes('sessions_count')) {
        db.exec('ALTER TABLE user_resource_usage ADD COLUMN sessions_count INTEGER DEFAULT 0');
      }
      if (!existingColumns.includes('agents_executions_count')) {
        db.exec('ALTER TABLE user_resource_usage ADD COLUMN agents_executions_count INTEGER DEFAULT 0');
      }
      
      console.log('✅ Migration 4 completed');
    }
  },
  {
    version: 5,
    description: 'Create system_config table',
    up: (db) => {
      console.log('Running migration 5: Creating system_config table...');
      
      // Create system_config table
      db.exec(`
        CREATE TABLE IF NOT EXISTS system_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL, -- JSON value
          description TEXT,
          category TEXT DEFAULT 'general',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default configuration
      const defaultConfigs = [
        {
          key: 'model_pricing',
          value: JSON.stringify({
            'claude-3-5-sonnet-20241022': {
              input: 3.0,
              output: 15.0,
              cache_write: 3.75,
              cache_read: 0.30
            },
            'claude-3-opus-20240229': {
              input: 15.0,
              output: 75.0,
              cache_write: 18.75,
              cache_read: 1.50
            }
          }),
          description: 'Model pricing per million tokens',
          category: 'pricing'
        },
        {
          key: 'feature_flags',
          value: JSON.stringify({
            agents_enabled: true,
            mcp_enabled: true,
            analytics_enabled: true,
            multi_tenant: true
          }),
          description: 'Feature toggle flags',
          category: 'features'
        },
        {
          key: 'system_limits',
          value: JSON.stringify({
            max_agents_per_user: 50,
            max_mcp_servers_per_user: 20,
            max_concurrent_executions: 5,
            max_session_duration: 3600000
          }),
          description: 'System resource limits',
          category: 'limits'
        }
      ];
      
      const insertConfig = db.prepare('INSERT OR IGNORE INTO system_config (key, value, description, category) VALUES (?, ?, ?, ?)');
      for (const config of defaultConfigs) {
        insertConfig.run(config.key, config.value, config.description, config.category);
      }
      
      // Create index
      db.exec('CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category)');
      
      console.log('✅ Migration 5 completed');
    }
  }
];

// Migration tracking table
const createMigrationsTable = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER UNIQUE NOT NULL,
      description TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Get applied migrations
const getAppliedMigrations = (db) => {
  try {
    return db.prepare('SELECT version FROM migrations ORDER BY version').all().map(row => row.version);
  } catch (error) {
    return [];
  }
};

// Record migration
const recordMigration = (db, migration) => {
  db.prepare('INSERT INTO migrations (version, description) VALUES (?, ?)').run(
    migration.version,
    migration.description
  );
};

// Run migrations
export const runMigrations = () => {
  const db = new Database(DB_PATH);
  
  console.log('🔄 Starting database migrations...');
  
  try {
    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');
    
    // Create migrations table
    createMigrationsTable(db);
    
    // Get applied migrations
    const appliedMigrations = getAppliedMigrations(db);
    console.log('Applied migrations:', appliedMigrations);
    
    // Run pending migrations
    let migrationsRun = 0;
    
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        
        // Run migration in transaction
        const transaction = db.transaction(() => {
          migration.up(db);
          recordMigration(db, migration);
        });
        
        transaction();
        migrationsRun++;
      } else {
        console.log(`Migration ${migration.version} already applied, skipping`);
      }
    }
    
    if (migrationsRun === 0) {
      console.log('✅ No migrations to run, database is up to date');
    } else {
      console.log(`✅ Successfully ran ${migrationsRun} migrations`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
};

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
