import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../database/db.js';
const router = express.Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    // db is already imported
    const agents = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all();
    
    // Parse JSON fields
    const parsedAgents = agents.map(agent => ({
      ...agent,
      tools: agent.tools ? JSON.parse(agent.tools) : [],
      permissions: agent.permissions ? JSON.parse(agent.permissions) : {},
      metadata: agent.metadata ? JSON.parse(agent.metadata) : {}
    }));
    
    res.json(parsedAgents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    // db is already imported
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Parse JSON fields
    const parsedAgent = {
      ...agent,
      tools: agent.tools ? JSON.parse(agent.tools) : [],
      permissions: agent.permissions ? JSON.parse(agent.permissions) : {},
      metadata: agent.metadata ? JSON.parse(agent.metadata) : {}
    };
    
    res.json(parsedAgent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Create new agent
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      icon = '🤖',
      version = '1.0.0',
      author,
      model = 'claude-3-5-sonnet-20241022',
      system_prompt,
      default_task,
      tools = [],
      permissions = {},
      metadata = {}
    } = req.body;
    
    if (!name || !system_prompt) {
      return res.status(400).json({ error: 'Name and system_prompt are required' });
    }
    
    // db is already imported
    const result = db.prepare(`
      INSERT INTO agents (
        name, description, icon, version, author, model, 
        system_prompt, default_task, tools, permissions, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description,
      icon,
      version,
      author,
      model,
      system_prompt,
      default_task,
      JSON.stringify(tools),
      JSON.stringify(permissions),
      JSON.stringify(metadata)
    );
    
    const newAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(result.lastInsertRowid);
    
    // Parse JSON fields for response
    const parsedAgent = {
      ...newAgent,
      tools: JSON.parse(newAgent.tools),
      permissions: JSON.parse(newAgent.permissions),
      metadata: JSON.parse(newAgent.metadata)
    };
    
    res.status(201).json(parsedAgent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      version,
      author,
      model,
      system_prompt,
      default_task,
      tools,
      permissions,
      metadata
    } = req.body;
    
    // db is already imported
    
    // Check if agent exists
    const existingAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const result = db.prepare(`
      UPDATE agents SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        version = COALESCE(?, version),
        author = COALESCE(?, author),
        model = COALESCE(?, model),
        system_prompt = COALESCE(?, system_prompt),
        default_task = COALESCE(?, default_task),
        tools = COALESCE(?, tools),
        permissions = COALESCE(?, permissions),
        metadata = COALESCE(?, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      description,
      icon,
      version,
      author,
      model,
      system_prompt,
      default_task,
      tools ? JSON.stringify(tools) : null,
      permissions ? JSON.stringify(permissions) : null,
      metadata ? JSON.stringify(metadata) : null,
      req.params.id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const updatedAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    
    // Parse JSON fields for response
    const parsedAgent = {
      ...updatedAgent,
      tools: JSON.parse(updatedAgent.tools),
      permissions: JSON.parse(updatedAgent.permissions),
      metadata: JSON.parse(updatedAgent.metadata)
    };
    
    res.json(parsedAgent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    // db is already imported
    const result = db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Execute agent
router.post('/:id/execute', async (req, res) => {
  try {
    const { task, project_path, user_id = 1 } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    // db is already imported
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const session_id = uuidv4();
    
    // Create execution record
    const executionResult = db.prepare(`
      INSERT INTO agent_executions (
        agent_id, user_id, session_id, project_path, task, status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(agent.id, user_id, session_id, project_path, task);
    
    const execution_id = executionResult.lastInsertRowid;
    
    // Start execution in background
    executeAgentTask(execution_id, agent, task, project_path, session_id);
    
    res.json({
      execution_id,
      session_id,
      status: 'pending',
      message: 'Agent execution started'
    });
  } catch (error) {
    console.error('Error executing agent:', error);
    res.status(500).json({ error: 'Failed to execute agent' });
  }
});

// Get agent executions
router.get('/:id/executions', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    // db is already imported
    
    const executions = db.prepare(`
      SELECT * FROM agent_executions 
      WHERE agent_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(req.params.id, parseInt(limit), parseInt(offset));
    
    // Parse JSON fields
    const parsedExecutions = executions.map(execution => ({
      ...execution,
      result: execution.result ? JSON.parse(execution.result) : null
    }));
    
    res.json(parsedExecutions);
  } catch (error) {
    console.error('Error fetching agent executions:', error);
    res.status(500).json({ error: 'Failed to fetch agent executions' });
  }
});

// Get execution status
router.get('/executions/:execution_id', async (req, res) => {
  try {
    // db is already imported
    const execution = db.prepare('SELECT * FROM agent_executions WHERE id = ?').get(req.params.execution_id);
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    // Parse JSON fields
    const parsedExecution = {
      ...execution,
      result: execution.result ? JSON.parse(execution.result) : null
    };
    
    res.json(parsedExecution);
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// Helper function to execute agent task
async function executeAgentTask(execution_id, agent, task, project_path, session_id) {
  // db is already imported
  const startTime = Date.now();
  
  try {
    // Update status to running
    db.prepare('UPDATE agent_executions SET status = ? WHERE id = ?').run('running', execution_id);
    
    // Find claude binary (similar to claudia implementation)
    const claudeBinary = findClaudeBinary();
    if (!claudeBinary) {
      throw new Error('Claude binary not found');
    }
    
    // Prepare command arguments
    const args = ['--agent', agent.name];
    if (project_path) {
      args.push('--project', project_path);
    }
    args.push(task);
    
    // Execute claude command
    const child = spawn(claudeBinary, args, {
      cwd: project_path || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        // Success
        const result = {
          output: stdout,
          exit_code: code,
          duration
        };
        
        db.prepare(`
          UPDATE agent_executions SET 
            status = 'completed',
            result = ?,
            duration = ?,
            completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(result), duration, execution_id);
        
        // Record usage (simplified - in real implementation, parse from claude output)
        recordUsage(agent.id, session_id, agent.model, 0, 0, 0.0, 'agent_execution');
      } else {
        // Error
        db.prepare(`
          UPDATE agent_executions SET 
            status = 'failed',
            error_message = ?,
            duration = ?,
            completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(stderr || `Process exited with code ${code}`, duration, execution_id);
      }
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      
      db.prepare(`
        UPDATE agent_executions SET 
          status = 'failed',
          error_message = ?,
          duration = ?,
          completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(error.message, duration, execution_id);
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    db.prepare(`
      UPDATE agent_executions SET 
        status = 'failed',
        error_message = ?,
        duration = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(error.message, duration, execution_id);
  }
}

// Helper function to find claude binary
function findClaudeBinary() {
  const possiblePaths = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(process.env.HOME || '', '.local', 'bin', 'claude'),
    'claude' // Try PATH
  ];
  
  for (const claudePath of possiblePaths) {
    try {
      if (fs.existsSync(claudePath) || claudePath === 'claude') {
        return claudePath;
      }
    } catch (error) {
      // Continue to next path
    }
  }
  
  return null;
}

// Helper function to record usage
function recordUsage(agent_id, session_id, model, tokens_input, tokens_output, cost, operation_type) {
  try {
    // db is already imported
    const usage_id = uuidv4();
    
    db.prepare(`
      INSERT INTO usage_records (
        id, user_id, session_id, agent_id, model, 
        tokens_input, tokens_output, tokens_total, cost, 
        operation_type, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      usage_id,
      1, // Default user_id
      session_id,
      agent_id,
      model,
      tokens_input,
      tokens_output,
      tokens_input + tokens_output,
      cost,
      operation_type
    );
  } catch (error) {
    console.error('Error recording usage:', error);
  }
}

export default router;