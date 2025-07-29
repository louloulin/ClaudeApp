import express from 'express';
import { db } from '../database/db.js';
const router = express.Router();

// Get usage overview
router.get('/overview', async (req, res) => {
  try {
    const { days = 30, user_id } = req.query;
    // db is already imported
    
    const dateFilter = days ? `AND timestamp >= datetime('now', '-${days} days')` : '';
    const userFilter = user_id ? `AND user_id = ${user_id}` : '';
    
    // Get total usage stats
    const totalStats = db.prepare(`
      SELECT 
        COUNT(*) as total_operations,
        SUM(tokens_input) as total_input_tokens,
        SUM(tokens_output) as total_output_tokens,
        SUM(tokens_total) as total_tokens,
        SUM(cost) as total_cost,
        AVG(duration) as avg_duration
      FROM usage_records 
      WHERE 1=1 ${dateFilter} ${userFilter}
    `).get();
    
    // Get usage by operation type
    const operationStats = db.prepare(`
      SELECT 
        operation_type,
        COUNT(*) as count,
        SUM(tokens_total) as tokens,
        SUM(cost) as cost
      FROM usage_records 
      WHERE 1=1 ${dateFilter} ${userFilter}
      GROUP BY operation_type
      ORDER BY cost DESC
    `).all();
    
    // Get usage by model
    const modelStats = db.prepare(`
      SELECT 
        model,
        COUNT(*) as count,
        SUM(tokens_total) as tokens,
        SUM(cost) as cost
      FROM usage_records 
      WHERE 1=1 ${dateFilter} ${userFilter}
      GROUP BY model
      ORDER BY cost DESC
    `).all();
    
    // Get daily usage for the last 30 days
    const dailyStats = db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as operations,
        SUM(tokens_total) as tokens,
        SUM(cost) as cost
      FROM usage_records 
      WHERE timestamp >= datetime('now', '-30 days') ${userFilter}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `).all();
    
    res.json({
      total: totalStats,
      by_operation: operationStats,
      by_model: modelStats,
      daily: dailyStats
    });
  } catch (error) {
    console.error('Error fetching usage overview:', error);
    res.status(500).json({ error: 'Failed to fetch usage overview' });
  }
});

// Get detailed usage records
router.get('/records', async (req, res) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      user_id, 
      agent_id, 
      model, 
      operation_type,
      start_date,
      end_date
    } = req.query;
    
    // db is already imported
    let whereConditions = [];
    let params = [];
    
    if (user_id) {
      whereConditions.push('user_id = ?');
      params.push(user_id);
    }
    
    if (agent_id) {
      whereConditions.push('agent_id = ?');
      params.push(agent_id);
    }
    
    if (model) {
      whereConditions.push('model = ?');
      params.push(model);
    }
    
    if (operation_type) {
      whereConditions.push('operation_type = ?');
      params.push(operation_type);
    }
    
    if (start_date) {
      whereConditions.push('timestamp >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('timestamp <= ?');
      params.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const records = db.prepare(`
      SELECT 
        ur.*,
        a.name as agent_name,
        a.icon as agent_icon
      FROM usage_records ur
      LEFT JOIN agents a ON ur.agent_id = a.id
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    // Parse metadata JSON
    const parsedRecords = records.map(record => ({
      ...record,
      metadata: record.metadata ? JSON.parse(record.metadata) : null
    }));
    
    // Get total count for pagination
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM usage_records
      ${whereClause}
    `).get(...params).count;
    
    res.json({
      records: parsedRecords,
      total: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching usage records:', error);
    res.status(500).json({ error: 'Failed to fetch usage records' });
  }
});

// Get usage by date range
router.get('/date-range', async (req, res) => {
  try {
    const { start_date, end_date, user_id, group_by = 'day' } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    // db is already imported
    const userFilter = user_id ? 'AND user_id = ?' : '';
    const params = [start_date, end_date];
    if (user_id) params.push(user_id);
    
    let dateFormat;
    switch (group_by) {
      case 'hour':
        dateFormat = "strftime('%Y-%m-%d %H:00:00', timestamp)";
        break;
      case 'week':
        dateFormat = "strftime('%Y-W%W', timestamp)";
        break;
      case 'month':
        dateFormat = "strftime('%Y-%m', timestamp)";
        break;
      default:
        dateFormat = "DATE(timestamp)";
    }
    
    const stats = db.prepare(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as operations,
        SUM(tokens_input) as input_tokens,
        SUM(tokens_output) as output_tokens,
        SUM(tokens_total) as total_tokens,
        SUM(cost) as cost,
        AVG(duration) as avg_duration
      FROM usage_records 
      WHERE timestamp >= ? AND timestamp <= ? ${userFilter}
      GROUP BY ${dateFormat}
      ORDER BY period
    `).all(...params);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching usage by date range:', error);
    res.status(500).json({ error: 'Failed to fetch usage by date range' });
  }
});

// Get agent usage statistics
router.get('/agents', async (req, res) => {
  try {
    const { days = 30, user_id } = req.query;
    // db is already imported
    
    const dateFilter = days ? `AND ur.timestamp >= datetime('now', '-${days} days')` : '';
    const userFilter = user_id ? `AND ur.user_id = ${user_id}` : '';
    
    const agentStats = db.prepare(`
      SELECT 
        a.id,
        a.name,
        a.icon,
        a.model,
        COUNT(ur.id) as executions,
        SUM(ur.tokens_total) as total_tokens,
        SUM(ur.cost) as total_cost,
        AVG(ur.duration) as avg_duration,
        MAX(ur.timestamp) as last_used
      FROM agents a
      LEFT JOIN usage_records ur ON a.id = ur.agent_id ${dateFilter} ${userFilter}
      GROUP BY a.id, a.name, a.icon, a.model
      ORDER BY total_cost DESC NULLS LAST
    `).all();
    
    res.json(agentStats);
  } catch (error) {
    console.error('Error fetching agent usage statistics:', error);
    res.status(500).json({ error: 'Failed to fetch agent usage statistics' });
  }
});

// Get user usage statistics
router.get('/users', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    // db is already imported
    
    const dateFilter = days ? `AND ur.timestamp >= datetime('now', '-${days} days')` : '';
    
    const userStats = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(ur.id) as operations,
        SUM(ur.tokens_total) as total_tokens,
        SUM(ur.cost) as total_cost,
        AVG(ur.duration) as avg_duration,
        MAX(ur.timestamp) as last_activity
      FROM users u
      LEFT JOIN usage_records ur ON u.id = ur.user_id ${dateFilter}
      GROUP BY u.id, u.username, u.email
      ORDER BY total_cost DESC NULLS LAST
    `).all();
    
    res.json(userStats);
  } catch (error) {
    console.error('Error fetching user usage statistics:', error);
    res.status(500).json({ error: 'Failed to fetch user usage statistics' });
  }
});

// Get cost analysis
router.get('/cost-analysis', async (req, res) => {
  try {
    const { days = 30, user_id } = req.query;
    // db is already imported
    
    const dateFilter = days ? `AND timestamp >= datetime('now', '-${days} days')` : '';
    const userFilter = user_id ? `AND user_id = ${user_id}` : '';
    
    // Get cost breakdown by model
    const modelCosts = db.prepare(`
      SELECT 
        model,
        SUM(cost) as total_cost,
        SUM(tokens_input) as input_tokens,
        SUM(tokens_output) as output_tokens,
        COUNT(*) as operations
      FROM usage_records 
      WHERE 1=1 ${dateFilter} ${userFilter}
      GROUP BY model
      ORDER BY total_cost DESC
    `).all();
    
    // Get cost breakdown by operation type
    const operationCosts = db.prepare(`
      SELECT 
        operation_type,
        SUM(cost) as total_cost,
        COUNT(*) as operations,
        AVG(cost) as avg_cost_per_operation
      FROM usage_records 
      WHERE 1=1 ${dateFilter} ${userFilter}
      GROUP BY operation_type
      ORDER BY total_cost DESC
    `).all();
    
    // Get daily cost trend
    const dailyCosts = db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        SUM(cost) as daily_cost,
        COUNT(*) as operations
      FROM usage_records 
      WHERE timestamp >= datetime('now', '-30 days') ${userFilter}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();
    
    // Calculate cost projections
    const recentDailyCosts = dailyCosts.slice(-7); // Last 7 days
    const avgDailyCost = recentDailyCosts.reduce((sum, day) => sum + day.daily_cost, 0) / recentDailyCosts.length;
    const projectedMonthlyCost = avgDailyCost * 30;
    
    res.json({
      by_model: modelCosts,
      by_operation: operationCosts,
      daily_trend: dailyCosts,
      projections: {
        avg_daily_cost: avgDailyCost,
        projected_monthly_cost: projectedMonthlyCost
      }
    });
  } catch (error) {
    console.error('Error fetching cost analysis:', error);
    res.status(500).json({ error: 'Failed to fetch cost analysis' });
  }
});

// Record new usage (for API integration)
router.post('/record', async (req, res) => {
  try {
    const {
      user_id = 1,
      project_id,
      session_id,
      agent_id,
      model,
      tokens_input = 0,
      tokens_output = 0,
      cost = 0,
      duration,
      operation_type,
      metadata = {}
    } = req.body;
    
    if (!model || !operation_type) {
      return res.status(400).json({ error: 'model and operation_type are required' });
    }
    
    // db is already imported
    const { v4: uuidv4 } = require('uuid');
    const usage_id = uuidv4();
    
    const result = db.prepare(`
      INSERT INTO usage_records (
        id, user_id, project_id, session_id, agent_id, model,
        tokens_input, tokens_output, tokens_total, cost, duration,
        operation_type, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      usage_id,
      user_id,
      project_id,
      session_id,
      agent_id,
      model,
      tokens_input,
      tokens_output,
      tokens_input + tokens_output,
      cost,
      duration,
      operation_type,
      JSON.stringify(metadata)
    );
    
    // Update user resource usage
    db.prepare(`
      UPDATE user_resource_usage SET
        tokens_used_total = tokens_used_total + ?,
        cost_total = cost_total + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(tokens_input + tokens_output, cost, user_id);
    
    res.status(201).json({ 
      id: usage_id,
      message: 'Usage recorded successfully' 
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

// Get system pricing configuration
router.get('/pricing', async (req, res) => {
  try {
    // db is already imported
    const config = db.prepare("SELECT value FROM system_config WHERE key = 'model_pricing'").get();
    
    if (!config) {
      return res.status(404).json({ error: 'Pricing configuration not found' });
    }
    
    res.json(JSON.parse(config.value));
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ error: 'Failed to fetch pricing configuration' });
  }
});

// Update system pricing configuration
router.put('/pricing', async (req, res) => {
  try {
    const pricing = req.body;
    // db is already imported
    
    const result = db.prepare(`
      UPDATE system_config SET 
        value = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE key = 'model_pricing'
    `).run(JSON.stringify(pricing));
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pricing configuration not found' });
    }
    
    res.json({ message: 'Pricing configuration updated successfully' });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ error: 'Failed to update pricing configuration' });
  }
});

export default router;