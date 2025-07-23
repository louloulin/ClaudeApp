#!/usr/bin/env node

/**
 * Deployment Script for Claude Code UI
 * Handles deployment to different environments
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class DeploymentManager {
  constructor() {
    this.environment = process.argv[2] || 'development';
    this.isDryRun = process.argv.includes('--dry-run');
    this.skipBuild = process.argv.includes('--skip-build');
    this.force = process.argv.includes('--force');
  }

  async runCommand(command, description) {
    console.log(`🔄 ${description}...`);
    if (this.isDryRun) {
      console.log(`   [DRY RUN] Would run: ${command}`);
      return '';
    }
    
    try {
      const output = execSync(command, { 
        cwd: projectRoot, 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      console.log(`✅ ${description} completed`);
      return output;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      throw error;
    }
  }

  validateEnvironment() {
    console.log(`🔍 Validating deployment environment: ${this.environment}...`);
    
    const validEnvironments = ['development', 'testing', 'production'];
    if (!validEnvironments.includes(this.environment)) {
      throw new Error(`Invalid environment: ${this.environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }

    // Check if Docker is available
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker-compose --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Docker and Docker Compose are required for deployment');
    }

    console.log('✅ Environment validation passed');
  }

  async buildApplication() {
    if (this.skipBuild) {
      console.log('⏭️  Skipping build');
      return;
    }

    console.log('🏗️  Building application...');
    
    // Configure environment
    await this.runCommand(`node scripts/configure-capacitor.js ${this.environment}`, 'Configuring Capacitor');
    
    // Build frontend
    await this.runCommand('npm run build', 'Building frontend');
    
    // Build Docker image
    const imageTag = `claude-code-ui:${this.environment}`;
    await this.runCommand(`docker build -t ${imageTag} .`, 'Building Docker image');
    
    console.log('✅ Application build completed');
  }

  async deployDevelopment() {
    console.log('🚀 Deploying to development environment...');
    
    await this.runCommand('docker-compose down', 'Stopping existing containers');
    await this.runCommand('docker-compose up -d', 'Starting development containers');
    
    console.log('✅ Development deployment completed');
    console.log('🌐 Application available at: http://localhost:3008');
  }

  async deployTesting() {
    console.log('🚀 Deploying to testing environment...');
    
    // Use production compose file but with testing configuration
    await this.runCommand('docker-compose -f docker-compose.prod.yml down', 'Stopping existing containers');
    await this.runCommand('docker-compose -f docker-compose.prod.yml up -d', 'Starting testing containers');
    
    console.log('✅ Testing deployment completed');
  }

  async deployProduction() {
    console.log('🚀 Deploying to production environment...');
    
    if (!this.force) {
      console.log('⚠️  Production deployment requires --force flag for safety');
      console.log('   Use: node scripts/deploy.js production --force');
      return;
    }

    // Backup current deployment
    await this.runCommand('docker-compose -f docker-compose.prod.yml down', 'Stopping production containers');
    
    // Deploy new version
    await this.runCommand('docker-compose -f docker-compose.prod.yml up -d', 'Starting production containers');
    
    // Health check
    console.log('🏥 Performing health check...');
    await this.waitForHealthCheck();
    
    console.log('✅ Production deployment completed');
  }

  async waitForHealthCheck(maxAttempts = 30, interval = 5000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        execSync('curl -f http://localhost:3008/api/config', { stdio: 'pipe' });
        console.log('✅ Health check passed');
        return;
      } catch (error) {
        console.log(`⏳ Health check attempt ${attempt}/${maxAttempts} failed, retrying...`);
        if (attempt === maxAttempts) {
          throw new Error('Health check failed after maximum attempts');
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }

  async deployMobile() {
    console.log('📱 Deploying mobile applications...');
    
    // Configure for production
    await this.runCommand('node scripts/configure-capacitor.js production', 'Configuring Capacitor for production');
    
    // Build mobile apps
    await this.runCommand('npm run build:android', 'Building Android app');
    await this.runCommand('npm run build:ios', 'Building iOS app');
    
    console.log('✅ Mobile applications built');
    console.log('📋 Next steps for mobile deployment:');
    console.log('   Android: Upload APK/AAB to Google Play Console');
    console.log('   iOS: Upload to App Store Connect using Xcode');
  }

  async showStatus() {
    console.log('📊 Deployment Status:');
    
    try {
      const containers = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
      console.log('\n🐳 Running Containers:');
      console.log(containers);
    } catch (error) {
      console.log('❌ Could not retrieve container status');
    }

    try {
      const images = execSync('docker images claude-code-ui --format "table {{.Repository}}\\t{{.Tag}}\\t{{.CreatedAt}}"', { encoding: 'utf8' });
      console.log('\n🖼️  Available Images:');
      console.log(images);
    } catch (error) {
      console.log('❌ Could not retrieve image information');
    }
  }

  async deploy() {
    try {
      console.log(`🚀 Starting deployment to ${this.environment}...`);
      
      if (this.isDryRun) {
        console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
      }

      this.validateEnvironment();
      await this.buildApplication();

      switch (this.environment) {
        case 'development':
          await this.deployDevelopment();
          break;
        case 'testing':
          await this.deployTesting();
          break;
        case 'production':
          await this.deployProduction();
          break;
      }

      await this.showStatus();

      console.log('\n🎉 Deployment completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }
}

// Show usage if no arguments provided or help requested
if (process.argv.length < 3 || process.argv.includes('--help')) {
  console.log(`
Usage: node scripts/deploy.js <environment> [options]

Environments:
  development - Local development deployment
  testing     - Testing environment deployment  
  production  - Production deployment (requires --force)

Options:
  --dry-run     - Show what would be done without making changes
  --skip-build  - Skip building the application
  --force       - Required for production deployment

Special commands:
  mobile        - Build mobile applications
  status        - Show deployment status

Examples:
  node scripts/deploy.js development
  node scripts/deploy.js production --force
  node scripts/deploy.js mobile
  node scripts/deploy.js status
`);
  process.exit(0);
}

// Handle special commands
if (process.argv[2] === 'status') {
  const manager = new DeploymentManager();
  manager.showStatus();
} else if (process.argv[2] === 'mobile') {
  const manager = new DeploymentManager();
  manager.deployMobile();
} else {
  // Run normal deployment
  const deploymentManager = new DeploymentManager();
  deploymentManager.deploy();
}
