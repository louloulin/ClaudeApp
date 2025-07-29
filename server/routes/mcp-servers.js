import express from 'express';
import { spawn } from 'child_process';
import { db } from '../database/db.js';
const router = express.Router();

// Store active MCP server processes
const activeServers = new Map();

// Get all MCP servers
router.get('/', async (req, res) => {
  try {
    // db is already imported
    const servers = db.prepare('SELECT * FROM mcp_servers ORDER BY created_at DESC').all();
    
    // Parse JSON fields and add runtime status
    const parsedServers = servers.map(server => {
      const parsed = {
        ...server,
        args: server.args ? JSON.parse(server.args) : [],
        env: server.env ? JSON.parse(server.env) : {},
        is_running: activeServers.has(server.id)
      };
      
      // Update status based on actual process state
      if (parsed.is_running && parsed.status !== 'running') {
        // Update database status
        db.prepare('UPDATE mcp_servers SET status = ? WHERE id = ?').run('running', server.id);
        parsed.status = 'running';
      } else if (!parsed.is_running && parsed.status === 'running') {
        // Update database status
        db.prepare('UPDATE mcp_servers SET status = ? WHERE id = ?').run('stopped', server.id);
        parsed.status = 'stopped';
      }
      
      return parsed;
    });
    
    res.json(parsedServers);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    res.status(500).json({ error: 'Failed to fetch MCP servers' });
  }
});

// Get MCP server by ID
router.get('/:id', async (req, res) => {
  try {
    // db is already imported
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    // Parse JSON fields
    const parsedServer = {
      ...server,
      args: server.args ? JSON.parse(server.args) : [],
      env: server.env ? JSON.parse(server.env) : {},
      is_running: activeServers.has(server.id)
    };
    
    res.json(parsedServer);
  } catch (error) {
    console.error('Error fetching MCP server:', error);
    res.status(500).json({ error: 'Failed to fetch MCP server' });
  }
});

// Create new MCP server
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      transport,
      command,
      args = [],
      env = {},
      url,
      scope = 'user'
    } = req.body;
    
    if (!name || !transport) {
      return res.status(400).json({ error: 'Name and transport are required' });
    }
    
    if (transport === 'stdio' && !command) {
      return res.status(400).json({ error: 'Command is required for stdio transport' });
    }
    
    if (transport === 'sse' && !url) {
      return res.status(400).json({ error: 'URL is required for SSE transport' });
    }
    
    // db is already imported
    
    // Check if server with same name already exists
    const existingServer = db.prepare('SELECT id FROM mcp_servers WHERE name = ?').get(name);
    if (existingServer) {
      return res.status(409).json({ error: 'MCP server with this name already exists' });
    }
    
    const result = db.prepare(`
      INSERT INTO mcp_servers (
        name, description, transport, command, args, env, url, scope
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description,
      transport,
      command,
      JSON.stringify(args),
      JSON.stringify(env),
      url,
      scope
    );
    
    const newServer = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(result.lastInsertRowid);
    
    // Parse JSON fields for response
    const parsedServer = {
      ...newServer,
      args: JSON.parse(newServer.args),
      env: JSON.parse(newServer.env),
      is_running: false
    };
    
    res.status(201).json(parsedServer);
  } catch (error) {
    console.error('Error creating MCP server:', error);
    res.status(500).json({ error: 'Failed to create MCP server' });
  }
});

// Update MCP server
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      transport,
      command,
      args,
      env,
      url,
      scope,
      is_active
    } = req.body;
    
    // db is already imported
    
    // Check if server exists
    const existingServer = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id);
    if (!existingServer) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    // Stop server if it's running and being updated
    if (activeServers.has(parseInt(req.params.id))) {
      await stopMCPServer(parseInt(req.params.id));
    }
    
    const result = db.prepare(`
      UPDATE mcp_servers SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        transport = COALESCE(?, transport),
        command = COALESCE(?, command),
        args = COALESCE(?, args),
        env = COALESCE(?, env),
        url = COALESCE(?, url),
        scope = COALESCE(?, scope),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      description,
      transport,
      command,
      args ? JSON.stringify(args) : null,
      env ? JSON.stringify(env) : null,
      url,
      scope,
      is_active,
      req.params.id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    const updatedServer = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id);
    
    // Parse JSON fields for response
    const parsedServer = {
      ...updatedServer,
      args: JSON.parse(updatedServer.args),
      env: JSON.parse(updatedServer.env),
      is_running: false
    };
    
    res.json(parsedServer);
  } catch (error) {
    console.error('Error updating MCP server:', error);
    res.status(500).json({ error: 'Failed to update MCP server' });
  }
});

// Delete MCP server
router.delete('/:id', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    
    // Stop server if it's running
    if (activeServers.has(serverId)) {
      await stopMCPServer(serverId);
    }
    
    // db is already imported
    const result = db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    res.json({ message: 'MCP server deleted successfully' });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    res.status(500).json({ error: 'Failed to delete MCP server' });
  }
});

// Start MCP server
router.post('/:id/start', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    // db is already imported
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(serverId);
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    if (activeServers.has(serverId)) {
      return res.status(409).json({ error: 'MCP server is already running' });
    }
    
    const result = await startMCPServer(server);
    
    if (result.success) {
      res.json({ message: 'MCP server started successfully', pid: result.pid });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error starting MCP server:', error);
    res.status(500).json({ error: 'Failed to start MCP server' });
  }
});

// Stop MCP server
router.post('/:id/stop', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    
    if (!activeServers.has(serverId)) {
      return res.status(409).json({ error: 'MCP server is not running' });
    }
    
    const result = await stopMCPServer(serverId);
    
    if (result.success) {
      res.json({ message: 'MCP server stopped successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error stopping MCP server:', error);
    res.status(500).json({ error: 'Failed to stop MCP server' });
  }
});

// Get MCP server tools
router.get('/:id/tools', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    
    if (!activeServers.has(serverId)) {
      return res.status(409).json({ error: 'MCP server is not running' });
    }
    
    const serverProcess = activeServers.get(serverId);
    
    // In a real implementation, you would query the MCP server for its tools
    // For now, return a placeholder response
    res.json({
      tools: serverProcess.tools || [],
      message: 'Tools list retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching MCP server tools:', error);
    res.status(500).json({ error: 'Failed to fetch MCP server tools' });
  }
});

// Get MCP tool usage statistics
router.get('/:id/usage', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    // db is already imported
    
    const usage = db.prepare(`
      SELECT 
        tool_name,
        COUNT(*) as usage_count,
        SUM(tokens_used) as total_tokens,
        AVG(execution_time) as avg_execution_time,
        MAX(timestamp) as last_used
      FROM mcp_tool_usage 
      WHERE server_id = ? AND timestamp >= datetime('now', '-${days} days')
      GROUP BY tool_name
      ORDER BY usage_count DESC
    `).all(req.params.id);
    
    res.json(usage);
  } catch (error) {
    console.error('Error fetching MCP tool usage:', error);
    res.status(500).json({ error: 'Failed to fetch MCP tool usage' });
  }
});

// Helper function to start MCP server
async function startMCPServer(server) {
  try {
    // db is already imported
    
    if (server.transport === 'stdio') {
      const args = server.args ? JSON.parse(server.args) : [];
      const env = server.env ? JSON.parse(server.env) : {};
      
      const child = spawn(server.command, args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const serverProcess = {
        process: child,
        pid: child.pid,
        tools: [], // Will be populated when tools are discovered
        startTime: Date.now()
      };
      
      activeServers.set(server.id, serverProcess);
      
      // Update database status
      db.prepare(`
        UPDATE mcp_servers SET 
          status = 'running',
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(server.id);
      
      // Handle process events
      child.on('error', (error) => {
        console.error(`MCP server ${server.name} error:`, error);
        activeServers.delete(server.id);
        
        db.prepare(`
          UPDATE mcp_servers SET 
            status = 'error',
            error_message = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(error.message, server.id);
      });
      
      child.on('exit', (code, signal) => {
        console.log(`MCP server ${server.name} exited with code ${code}, signal ${signal}`);
        activeServers.delete(server.id);
        
        const status = code === 0 ? 'stopped' : 'error';
        const errorMessage = code !== 0 ? `Process exited with code ${code}` : null;
        
        db.prepare(`
          UPDATE mcp_servers SET 
            status = ?,
            error_message = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(status, errorMessage, server.id);
      });
      
      return { success: true, pid: child.pid };
    } else if (server.transport === 'sse') {
      // For SSE transport, we don't spawn a process but mark as running
      // The actual connection would be handled by the MCP client
      
      activeServers.set(server.id, {
        type: 'sse',
        url: server.url,
        startTime: Date.now()
      });
      
      db.prepare(`
        UPDATE mcp_servers SET 
          status = 'running',
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(server.id);
      
      return { success: true };
    }
    
    return { success: false, error: 'Unsupported transport type' };
  } catch (error) {
    console.error('Error starting MCP server:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to stop MCP server
async function stopMCPServer(serverId) {
  try {
    // db is already imported
    const serverProcess = activeServers.get(serverId);
    
    if (!serverProcess) {
      return { success: false, error: 'Server process not found' };
    }
    
    if (serverProcess.process) {
      // Kill the process
      serverProcess.process.kill('SIGTERM');
      
      // Wait a bit, then force kill if necessary
      setTimeout(() => {
        if (!serverProcess.process.killed) {
          serverProcess.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    activeServers.delete(serverId);
    
    // Update database status
    db.prepare(`
      UPDATE mcp_servers SET 
        status = 'stopped',
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(serverId);
    
    return { success: true };
  } catch (error) {
    console.error('Error stopping MCP server:', error);
    return { success: false, error: error.message };
  }
}

// Record MCP tool usage
router.post('/:id/tools/:tool_name/usage', async (req, res) => {
  try {
    const {
      user_id = 1,
      session_id,
      input_data = {},
      output_data = {},
      execution_time,
      tokens_used = 0,
      status = 'success',
      error_message
    } = req.body;
    
    // db is already imported
    
    const result = db.prepare(`
      INSERT INTO mcp_tool_usage (
        server_id, user_id, tool_name, session_id,
        input_data, output_data, execution_time, tokens_used,
        status, error_message, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      req.params.id,
      user_id,
      req.params.tool_name,
      session_id,
      JSON.stringify(input_data),
      JSON.stringify(output_data),
      execution_time,
      tokens_used,
      status,
      error_message
    );
    
    res.status(201).json({ 
      id: result.lastInsertRowid,
      message: 'Tool usage recorded successfully' 
    });
  } catch (error) {
    console.error('Error recording MCP tool usage:', error);
    res.status(500).json({ error: 'Failed to record tool usage' });
  }
});

// Cleanup function to stop all servers on shutdown
process.on('SIGINT', () => {
  console.log('Stopping all MCP servers...');
  for (const [serverId, serverProcess] of activeServers) {
    if (serverProcess.process) {
      serverProcess.process.kill('SIGTERM');
    }
  }
  activeServers.clear();
});

export default router;