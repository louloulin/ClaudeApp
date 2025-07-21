#!/usr/bin/env node

/**
 * Claude Instance Pool Demo
 * 
 * This script demonstrates the multi-tenant Claude instance pool functionality.
 * It shows how multiple users can have isolated Claude instances and workspaces.
 */

import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { initializeDatabase, userDb } from '../database/db.js';
import claudeInstancePool from '../claude-pool.js';
import resourceMonitor from '../resource-monitor.js';

async function runDemo() {
  console.log('🎭 Claude Instance Pool Demo');
  console.log('============================\n');

  try {
    // Set up demo environment
    process.env.USER_WORKSPACES_DIR = path.join(os.tmpdir(), 'claude-ui-demo-workspaces');
    
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    
    // Create demo users
    console.log('👥 Creating demo users...');
    const timestamp = Date.now();
    const alice = userDb.createUser(`alice_${timestamp}`, 'password123', `alice_${timestamp}@example.com`, 'user');
    const bob = userDb.createUser(`bob_${timestamp}`, 'password456', `bob_${timestamp}@example.com`, 'user');
    const charlie = userDb.createUser(`charlie_${timestamp}`, 'password789', `charlie_${timestamp}@example.com`, 'user');
    
    console.log(`✅ Created users: Alice (ID: ${alice.id}), Bob (ID: ${bob.id}), Charlie (ID: ${charlie.id})\n`);
    
    // Initialize Claude instance pool
    console.log('🏊 Initializing Claude instance pool...');
    await claudeInstancePool.initialize();
    
    // Start resource monitoring
    console.log('📊 Starting resource monitoring...');
    resourceMonitor.start();
    
    console.log('\n🎬 Demo Scenarios:\n');
    
    // Scenario 1: Create instances for different users
    console.log('📝 Scenario 1: Creating Claude instances for different users');
    console.log('─'.repeat(60));
    
    const aliceInstance = await claudeInstancePool.getOrCreateInstance(alice.id);
    console.log(`✅ Alice's instance: ${aliceInstance.id}`);
    console.log(`   Workspace: ${aliceInstance.workspace}`);
    
    const bobInstance = await claudeInstancePool.getOrCreateInstance(bob.id);
    console.log(`✅ Bob's instance: ${bobInstance.id}`);
    console.log(`   Workspace: ${bobInstance.workspace}`);
    
    const charlieInstance = await claudeInstancePool.getOrCreateInstance(charlie.id);
    console.log(`✅ Charlie's instance: ${charlieInstance.id}`);
    console.log(`   Workspace: ${charlieInstance.workspace}\n`);
    
    // Scenario 2: Show instance reuse
    console.log('📝 Scenario 2: Instance reuse for same user');
    console.log('─'.repeat(60));
    
    const aliceInstance2 = await claudeInstancePool.getOrCreateInstance(alice.id);
    console.log(`✅ Alice's second request: ${aliceInstance2.id}`);
    console.log(`   Same instance? ${aliceInstance.id === aliceInstance2.id ? 'Yes ♻️' : 'No 🆕'}\n`);
    
    // Scenario 3: Show workspace isolation
    console.log('📝 Scenario 3: Workspace isolation');
    console.log('─'.repeat(60));
    
    // Create test files in each workspace
    await fs.writeFile(path.join(aliceInstance.workspace, 'alice-project.txt'), 'Alice\'s secret project');
    await fs.writeFile(path.join(bobInstance.workspace, 'bob-notes.txt'), 'Bob\'s important notes');
    await fs.writeFile(path.join(charlieInstance.workspace, 'charlie-code.js'), 'console.log("Charlie was here");');
    
    console.log('✅ Created test files in each workspace');
    
    // Verify isolation
    const aliceFiles = await fs.readdir(aliceInstance.workspace);
    const bobFiles = await fs.readdir(bobInstance.workspace);
    const charlieFiles = await fs.readdir(charlieInstance.workspace);
    
    console.log(`   Alice's workspace files: ${aliceFiles.join(', ')}`);
    console.log(`   Bob's workspace files: ${bobFiles.join(', ')}`);
    console.log(`   Charlie's workspace files: ${charlieFiles.join(', ')}\n`);
    
    // Scenario 4: Process management simulation
    console.log('📝 Scenario 4: Process management simulation');
    console.log('─'.repeat(60));
    
    // Simulate registering processes
    claudeInstancePool.registerProcess(alice.id, 'session-alice-1', { pid: 12345, command: 'claude' });
    claudeInstancePool.registerProcess(bob.id, 'session-bob-1', { pid: 12346, command: 'claude' });
    claudeInstancePool.registerProcess(bob.id, 'session-bob-2', { pid: 12347, command: 'claude' });
    
    console.log('✅ Registered simulated processes');
    
    // Show statistics
    console.log('\n📊 Instance Statistics:');
    console.log('─'.repeat(60));
    
    const allStats = claudeInstancePool.getAllInstancesStats();
    allStats.forEach(stats => {
      const userName = stats.userId === alice.id ? 'Alice' : 
                      stats.userId === bob.id ? 'Bob' : 'Charlie';
      console.log(`   ${userName}:`);
      console.log(`     Instance ID: ${stats.id}`);
      console.log(`     Status: ${stats.status}`);
      console.log(`     Active Processes: ${stats.activeProcesses}`);
      console.log(`     Health: ${stats.health.status}`);
      console.log(`     Created: ${stats.createdAt.toISOString()}`);
      console.log('');
    });
    
    // Scenario 5: Health monitoring
    console.log('📝 Scenario 5: Health monitoring');
    console.log('─'.repeat(60));
    
    console.log('✅ Performing health checks...');
    await claudeInstancePool.performHealthChecks();
    
    const healthyInstances = allStats.filter(s => claudeInstancePool.isInstanceHealthy(s.id));
    console.log(`✅ Healthy instances: ${healthyInstances.length}/${allStats.length}\n`);
    
    // Scenario 6: Quota enforcement simulation
    console.log('📝 Scenario 6: Quota enforcement simulation');
    console.log('─'.repeat(60));
    
    // Set low quota for Charlie
    userDb.updateUserQuotas(charlie.id, { quota_claude_instances: 0 });
    console.log('✅ Set Charlie\'s instance quota to 0');
    
    try {
      await claudeInstancePool.getOrCreateInstance(charlie.id);
      console.log('❌ Quota enforcement failed - this should not happen');
    } catch (error) {
      console.log(`✅ Quota enforcement working: ${error.message}\n`);
    }
    
    // Cleanup
    console.log('🧹 Cleanup');
    console.log('─'.repeat(60));
    
    console.log('✅ Unregistering processes...');
    claudeInstancePool.unregisterProcess(alice.id, 'session-alice-1');
    claudeInstancePool.unregisterProcess(bob.id, 'session-bob-1');
    claudeInstancePool.unregisterProcess(bob.id, 'session-bob-2');
    
    console.log('✅ Shutting down resource monitor...');
    resourceMonitor.stop();
    
    console.log('✅ Shutting down Claude instance pool...');
    await claudeInstancePool.shutdown();
    
    console.log('✅ Cleaning up demo workspaces...');
    await fs.rm(process.env.USER_WORKSPACES_DIR, { recursive: true, force: true });
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\nKey features demonstrated:');
    console.log('• Multi-user instance isolation');
    console.log('• Workspace file system isolation');
    console.log('• Instance reuse and lifecycle management');
    console.log('• Process registration and monitoring');
    console.log('• Health monitoring and statistics');
    console.log('• Resource quota enforcement');
    console.log('• Graceful shutdown and cleanup');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
