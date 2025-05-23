const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const STATS_FILE = path.join(__dirname, '../data/stats.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(STATS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load stats from file
async function loadStats() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(STATS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return default stats
    return {
      totalGamesStarted: 0,
      totalGamesCompleted: 0,
      totalPlayTime: 0,
      mostPopularFloor: 1,
      averageSessionLength: 0,
      playerRetention: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      gameEvents: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Save stats to file
async function saveStats(stats) {
  try {
    await ensureDataDirectory();
    stats.lastUpdated = new Date().toISOString();
    await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error saving stats:', error);
    throw error;
  }
}

// GET /api/stats - Get game statistics
router.get('/', async (req, res) => {
  try {
    const stats = await loadStats();
    
    // Calculate some additional metrics
    const completionRate = stats.totalGamesStarted > 0 
      ? (stats.totalGamesCompleted / stats.totalGamesStarted * 100).toFixed(2)
      : 0;
    
    const responseStats = {
      ...stats,
      completionRate: parseFloat(completionRate),
      totalEvents: stats.gameEvents.length
    };
    
    // Don't send all events, just summary
    delete responseStats.gameEvents;
    
    res.json({
      success: true,
      stats: responseStats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// POST /api/stats/event - Track game event
router.post('/event', async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }
    
    const stats = await loadStats();
    
    // Create event object
    const gameEvent = {
      type: eventType,
      data: eventData || {},
      timestamp: new Date().toISOString()
    };
    
    // Update relevant stats based on event type
    switch (eventType) {
      case 'game_started':
        stats.totalGamesStarted++;
        break;
        
      case 'game_completed':
        stats.totalGamesCompleted++;
        if (eventData && eventData.timeSurvived) {
          stats.totalPlayTime += eventData.timeSurvived;
          
          // Update average session length
          stats.averageSessionLength = stats.totalPlayTime / stats.totalGamesCompleted;
        }
        break;
        
      case 'floor_reached':
        if (eventData && eventData.floor) {
          // Track most popular floor (where players spend most time)
          stats.mostPopularFloor = eventData.floor;
        }
        break;
        
      case 'player_death':
        if (eventData && eventData.floor) {
          // Could track common death floors for balancing
        }
        break;
        
      case 'level_up':
        if (eventData && eventData.level) {
          // Track level progression
        }
        break;
    }
    
    // Add event to history (keep only last 1000 events)
    stats.gameEvents.push(gameEvent);
    if (stats.gameEvents.length > 1000) {
      stats.gameEvents = stats.gameEvents.slice(-1000);
    }
    
    await saveStats(stats);
    
    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// GET /api/stats/events - Get recent events (for debugging)
router.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const eventType = req.query.type;
    
    const stats = await loadStats();
    let events = stats.gameEvents || [];
    
    // Filter by event type if specified
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    // Get most recent events
    const recentEvents = events.slice(-limit).reverse();
    
    res.json({
      success: true,
      events: recentEvents,
      total: events.length
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// POST /api/stats/retention - Update player retention metrics
router.post('/retention', async (req, res) => {
  try {
    const { playerId, lastSeen } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'Player ID is required'
      });
    }
    
    const stats = await loadStats();
    
    // Simple retention tracking (in a real app, you'd use a database)
    const now = new Date();
    const lastSeenDate = new Date(lastSeen || now);
    const daysDiff = (now - lastSeenDate) / (1000 * 60 * 60 * 24);
    
    // Update retention stats based on how recently player was seen
    if (daysDiff <= 1) {
      stats.playerRetention.daily++;
    } else if (daysDiff <= 7) {
      stats.playerRetention.weekly++;
    } else if (daysDiff <= 30) {
      stats.playerRetention.monthly++;
    }
    
    await saveStats(stats);
    
    res.json({
      success: true,
      message: 'Retention data updated'
    });
    
  } catch (error) {
    console.error('Error updating retention:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update retention data'
    });
  }
});

// GET /api/stats/summary - Get summary statistics
router.get('/summary', async (req, res) => {
  try {
    const stats = await loadStats();
    
    // Calculate summary metrics
    const summary = {
      gamesPlayed: stats.totalGamesStarted,
      completionRate: stats.totalGamesStarted > 0 
        ? ((stats.totalGamesCompleted / stats.totalGamesStarted) * 100).toFixed(1)
        : '0.0',
      averageSessionTime: stats.averageSessionLength 
        ? `${Math.floor(stats.averageSessionLength / 60)}m ${Math.floor(stats.averageSessionLength % 60)}s`
        : '0m 0s',
      totalPlayTime: stats.totalPlayTime 
        ? `${Math.floor(stats.totalPlayTime / 3600)}h ${Math.floor((stats.totalPlayTime % 3600) / 60)}m`
        : '0h 0m',
      activeUsers: {
        daily: stats.playerRetention.daily,
        weekly: stats.playerRetention.weekly,
        monthly: stats.playerRetention.monthly
      }
    };
    
    res.json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics'
    });
  }
});

// DELETE /api/stats - Reset all statistics (for development/testing)
router.delete('/', async (req, res) => {
  try {
    const defaultStats = {
      totalGamesStarted: 0,
      totalGamesCompleted: 0,
      totalPlayTime: 0,
      mostPopularFloor: 1,
      averageSessionLength: 0,
      playerRetention: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      gameEvents: [],
      lastUpdated: new Date().toISOString()
    };
    
    await saveStats(defaultStats);
    
    res.json({
      success: true,
      message: 'All statistics reset'
    });
  } catch (error) {
    console.error('Error resetting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset statistics'
    });
  }
});

module.exports = router;