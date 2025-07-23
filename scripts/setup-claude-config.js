#!/usr/bin/env node

/**
 * Setup Claude CLI configuration for custom API endpoints
 * This script creates the necessary configuration files for Claude CLI
 * to use custom Anthropic API endpoints like Moonshot
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

async function setupClaudeConfig() {
  console.log('🔧 Setting up Claude CLI configuration...');
  
  const homeDir = process.env.HOME || os.homedir();
  const claudeConfigPath = path.join(homeDir, '.claude.json');
  
  // Get API configuration from environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log(`   API Key: ${apiKey ? 'set (****)' : 'not set'}`);
  console.log(`   Base URL: ${baseUrl || 'default (api.anthropic.com)'}`);
  console.log(`   Config file: ${claudeConfigPath}`);
  
  // Create Claude configuration
  const claudeConfig = {
    // API configuration
    apiKey: apiKey,
  };
  
  // Add base URL if specified
  if (baseUrl) {
    claudeConfig.baseUrl = baseUrl;
  }
  
  // Check if config file already exists
  let existingConfig = {};
  try {
    const existingData = await fs.readFile(claudeConfigPath, 'utf8');
    existingConfig = JSON.parse(existingData);
    console.log('📄 Found existing Claude config, merging...');
  } catch (error) {
    console.log('📄 Creating new Claude config file...');
  }
  
  // Merge configurations
  const finalConfig = {
    ...existingConfig,
    ...claudeConfig
  };
  
  try {
    // Ensure .claude directory exists
    await fs.mkdir(path.dirname(claudeConfigPath), { recursive: true });
    
    // Write configuration file
    await fs.writeFile(claudeConfigPath, JSON.stringify(finalConfig, null, 2), 'utf8');
    
    console.log('✅ Claude CLI configuration updated successfully!');
    console.log(`📁 Config saved to: ${claudeConfigPath}`);
    
    // Also create environment file for container
    const envContent = `# Claude CLI Environment Variables
export ANTHROPIC_API_KEY="${apiKey}"
${baseUrl ? `export ANTHROPIC_BASE_URL="${baseUrl}"` : ''}
export CLAUDE_API_KEY="${apiKey}"
`;
    
    const envPath = path.join(process.cwd(), '.claude-env');
    await fs.writeFile(envPath, envContent, 'utf8');
    console.log(`📁 Environment file saved to: ${envPath}`);
    
  } catch (error) {
    console.error('❌ Failed to write Claude config:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupClaudeConfig().catch(console.error);
}

export { setupClaudeConfig };
