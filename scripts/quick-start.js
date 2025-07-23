#!/usr/bin/env node

/**
 * Quick Start Script for Claude Code UI
 * Helps users get started quickly with the right environment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class QuickStart {
  constructor() {
    this.mode = process.argv[2] || 'development';
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    const checks = [
      { name: 'Node.js', command: 'node --version', required: true },
      { name: 'npm', command: 'npm --version', required: true },
      { name: 'Claude CLI', command: 'claude --version', required: false },
      { name: 'Docker', command: 'docker --version', required: false },
      { name: 'Docker Compose', command: 'docker-compose --version', required: false }
    ];

    for (const check of checks) {
      try {
        const version = execSync(check.command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${check.name}: ${version.trim()}`);
      } catch (error) {
        if (check.required) {
          console.log(`❌ ${check.name}: Not found (REQUIRED)`);
          throw new Error(`${check.name} is required but not installed`);
        } else {
          console.log(`⚠️  ${check.name}: Not found (optional)`);
        }
      }
    }
  }

  async setupEnvironment() {
    console.log('\n🔧 Setting up environment...');
    
    // Check if .env exists
    const envPath = path.join(projectRoot, '.env');
    if (!fs.existsSync(envPath)) {
      const envExamplePath = path.join(projectRoot, '.env.example');
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from .env.example');
      } else {
        // Create basic .env file
        const basicEnv = `# Claude Code UI Environment Configuration
PORT=3008
VITE_PORT=3009
NODE_ENV=development
VITE_ENVIRONMENT=development
`;
        fs.writeFileSync(envPath, basicEnv);
        console.log('✅ Created basic .env file');
      }
    } else {
      console.log('✅ .env file already exists');
    }
  }

  async installDependencies() {
    console.log('\n📦 Installing dependencies...');
    
    try {
      execSync('npm ci', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.log('⚠️  npm ci failed, trying npm install...');
      execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Dependencies installed successfully');
    }
  }

  async startDevelopment() {
    console.log('\n🚀 Starting development server...');
    console.log('📝 This will start both frontend and backend servers');
    console.log('🌐 Frontend: http://localhost:3009');
    console.log('🔧 Backend: http://localhost:3008');
    console.log('\n⏹️  Press Ctrl+C to stop the servers\n');
    
    execSync('npm run dev', { cwd: projectRoot, stdio: 'inherit' });
  }

  async startDocker() {
    console.log('\n🐳 Starting with Docker...');
    
    try {
      // Build Docker image
      console.log('🏗️  Building Docker image...');
      execSync('npm run docker:build', { cwd: projectRoot, stdio: 'inherit' });
      
      // Start containers
      console.log('🚀 Starting containers...');
      execSync('npm run docker:run', { cwd: projectRoot, stdio: 'inherit' });
      
      console.log('\n✅ Docker containers started successfully!');
      console.log('🌐 Application: http://localhost:3008');
      console.log('📊 Status: npm run deploy:status');
      console.log('📋 Logs: npm run docker:logs');
      console.log('⏹️  Stop: npm run docker:stop');
      
    } catch (error) {
      console.error('❌ Docker startup failed:', error.message);
      console.log('\n💡 Fallback: Try development mode instead');
      console.log('   node scripts/quick-start.js development');
    }
  }

  async startProduction() {
    console.log('\n🏭 Starting production setup...');
    
    // Configure for production
    execSync('npm run config:prod', { cwd: projectRoot, stdio: 'inherit' });
    
    // Build application
    console.log('🏗️  Building application...');
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    
    // Start production server
    console.log('🚀 Starting production server...');
    execSync('npm start', { cwd: projectRoot, stdio: 'inherit' });
  }

  showHelp() {
    console.log(`
🚀 Claude Code UI Quick Start

Usage: node scripts/quick-start.js [mode]

Modes:
  development  - Start development servers (default)
  docker       - Start with Docker containers
  production   - Build and start production server
  help         - Show this help message

Examples:
  node scripts/quick-start.js
  node scripts/quick-start.js docker
  node scripts/quick-start.js production

Prerequisites:
  ✅ Node.js v20+
  ✅ npm
  ⚠️  Claude CLI (recommended)
  ⚠️  Docker (for docker mode)

Quick Commands:
  npm run dev              - Development mode
  npm run docker:run       - Docker mode
  npm start               - Production mode
  npm run deploy:status   - Check status
`);
  }

  async run() {
    try {
      console.log('🎯 Claude Code UI Quick Start\n');
      
      if (this.mode === 'help' || this.mode === '--help') {
        this.showHelp();
        return;
      }

      await this.checkPrerequisites();
      await this.setupEnvironment();
      await this.installDependencies();

      switch (this.mode) {
        case 'development':
        case 'dev':
          await this.startDevelopment();
          break;
          
        case 'docker':
          await this.startDocker();
          break;
          
        case 'production':
        case 'prod':
          await this.startProduction();
          break;
          
        default:
          console.log(`❌ Unknown mode: ${this.mode}`);
          this.showHelp();
          process.exit(1);
      }
      
    } catch (error) {
      console.error('\n❌ Quick start failed:', error.message);
      console.log('\n💡 Try running individual commands:');
      console.log('   npm install');
      console.log('   npm run dev');
      process.exit(1);
    }
  }
}

// Run the quick start
const quickStart = new QuickStart();
quickStart.run();
