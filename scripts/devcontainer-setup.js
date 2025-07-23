#!/usr/bin/env node

/**
 * DevContainer Setup Script for Claude Code UI
 * Helps users set up and manage the DevContainer environment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class DevContainerManager {
  constructor() {
    this.command = process.argv[2] || 'help';
  }

  async runCommand(command, description) {
    console.log(`🔄 ${description}...`);
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

  checkPrerequisites() {
    console.log('🔍 Checking DevContainer prerequisites...');
    
    const requirements = [
      { name: 'Docker', command: 'docker --version' },
      { name: 'Docker Compose', command: 'docker-compose --version' },
      { name: 'VS Code', command: 'code --version' }
    ];

    for (const req of requirements) {
      try {
        const version = execSync(req.command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${req.name}: ${version.split('\n')[0]}`);
      } catch (error) {
        console.log(`❌ ${req.name}: Not found`);
        throw new Error(`${req.name} is required for DevContainer`);
      }
    }
  }

  async buildContainer() {
    console.log('🏗️  Building DevContainer...');
    
    // Build the development image
    await this.runCommand(
      'docker build --target development -t claude-code-ui:dev .',
      'Building development image'
    );
    
    console.log('✅ DevContainer built successfully');
  }

  async startContainer() {
    console.log('🚀 Starting DevContainer...');
    
    // Start the container with docker-compose
    await this.runCommand(
      'docker-compose -f .devcontainer/docker-compose.yml up -d',
      'Starting DevContainer services'
    );
    
    console.log('✅ DevContainer started');
    console.log('📝 Open VS Code and use "Dev Containers: Attach to Running Container"');
  }

  async stopContainer() {
    console.log('⏹️  Stopping DevContainer...');
    
    await this.runCommand(
      'docker-compose -f .devcontainer/docker-compose.yml down',
      'Stopping DevContainer services'
    );
    
    console.log('✅ DevContainer stopped');
  }

  async rebuildContainer() {
    console.log('🔄 Rebuilding DevContainer...');
    
    // Stop existing containers
    try {
      await this.runCommand(
        'docker-compose -f .devcontainer/docker-compose.yml down',
        'Stopping existing containers'
      );
    } catch (error) {
      console.log('ℹ️  No existing containers to stop');
    }
    
    // Remove existing image
    try {
      await this.runCommand(
        'docker rmi claude-code-ui:dev',
        'Removing existing image'
      );
    } catch (error) {
      console.log('ℹ️  No existing image to remove');
    }
    
    // Rebuild and start
    await this.buildContainer();
    await this.startContainer();
  }

  async showStatus() {
    console.log('📊 DevContainer Status');
    console.log('='.repeat(50));
    
    try {
      console.log('\n🐳 Running Containers:');
      execSync('docker ps --filter "name=devcontainer" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { stdio: 'inherit' });
    } catch (error) {
      console.log('❌ No DevContainer containers running');
    }
    
    try {
      console.log('\n🖼️  DevContainer Images:');
      execSync('docker images claude-code-ui --format "table {{.Repository}}\\t{{.Tag}}\\t{{.CreatedAt}}"', { stdio: 'inherit' });
    } catch (error) {
      console.log('❌ No DevContainer images found');
    }
    
    try {
      console.log('\n📦 Docker Volumes:');
      execSync('docker volume ls --filter "name=devcontainer" --format "table {{.Name}}\\t{{.Driver}}"', { stdio: 'inherit' });
    } catch (error) {
      console.log('❌ No DevContainer volumes found');
    }
  }

  async cleanupContainer() {
    console.log('🧹 Cleaning up DevContainer resources...');
    
    // Stop containers
    try {
      await this.runCommand(
        'docker-compose -f .devcontainer/docker-compose.yml down -v',
        'Stopping containers and removing volumes'
      );
    } catch (error) {
      console.log('ℹ️  No containers to stop');
    }
    
    // Remove images
    try {
      await this.runCommand(
        'docker rmi claude-code-ui:dev',
        'Removing DevContainer image'
      );
    } catch (error) {
      console.log('ℹ️  No image to remove');
    }
    
    // Clean up unused resources
    await this.runCommand(
      'docker system prune -f',
      'Cleaning up unused Docker resources'
    );
    
    console.log('✅ DevContainer cleanup completed');
  }

  async openVSCode() {
    console.log('📝 Opening VS Code with DevContainer...');
    
    // Check if container is running
    try {
      execSync('docker ps --filter "name=devcontainer" --format "{{.Names}}"', { stdio: 'pipe' });
    } catch (error) {
      console.log('⚠️  DevContainer not running, starting it first...');
      await this.startContainer();
    }
    
    // Open VS Code
    await this.runCommand(
      'code .',
      'Opening VS Code'
    );
    
    console.log('📝 VS Code opened. Use "Dev Containers: Attach to Running Container" or "Dev Containers: Reopen in Container"');
  }

  showHelp() {
    console.log(`
🐳 Claude Code UI DevContainer Manager

Usage: node scripts/devcontainer-setup.js <command>

Commands:
  build      - Build the DevContainer image
  start      - Start the DevContainer
  stop       - Stop the DevContainer
  restart    - Restart the DevContainer
  rebuild    - Rebuild and restart the DevContainer
  status     - Show DevContainer status
  cleanup    - Clean up DevContainer resources
  vscode     - Open VS Code with DevContainer
  help       - Show this help message

Examples:
  node scripts/devcontainer-setup.js build
  node scripts/devcontainer-setup.js start
  node scripts/devcontainer-setup.js vscode

Prerequisites:
  ✅ Docker Desktop
  ✅ Docker Compose
  ✅ Visual Studio Code
  ✅ Dev Containers extension

Quick Start:
  1. node scripts/devcontainer-setup.js build
  2. node scripts/devcontainer-setup.js vscode
  3. In VS Code: "Dev Containers: Reopen in Container"

Features:
  🚀 Node.js 20 + Go 1.21 + Bun
  🛠️  Complete development toolchain
  🐳 Docker-in-Docker support
  📦 Persistent caches and volumes
  🔧 Pre-configured VS Code extensions
  🌐 Port forwarding for development servers
`);
  }

  async run() {
    try {
      console.log('🐳 Claude Code UI DevContainer Manager\n');
      
      switch (this.command) {
        case 'build':
          this.checkPrerequisites();
          await this.buildContainer();
          break;
          
        case 'start':
          this.checkPrerequisites();
          await this.startContainer();
          break;
          
        case 'stop':
          await this.stopContainer();
          break;
          
        case 'restart':
          await this.stopContainer();
          await this.startContainer();
          break;
          
        case 'rebuild':
          this.checkPrerequisites();
          await this.rebuildContainer();
          break;
          
        case 'status':
          await this.showStatus();
          break;
          
        case 'cleanup':
          await this.cleanupContainer();
          break;
          
        case 'vscode':
          this.checkPrerequisites();
          await this.openVSCode();
          break;
          
        case 'help':
        case '--help':
        default:
          this.showHelp();
          break;
      }
      
    } catch (error) {
      console.error('\n❌ DevContainer operation failed:', error.message);
      console.log('\n💡 Try:');
      console.log('   1. Ensure Docker is running');
      console.log('   2. Check Docker has sufficient resources');
      console.log('   3. Run: node scripts/devcontainer-setup.js cleanup');
      process.exit(1);
    }
  }
}

// Run the DevContainer manager
const manager = new DevContainerManager();
manager.run();
