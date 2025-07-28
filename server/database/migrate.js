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
