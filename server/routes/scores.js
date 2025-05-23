const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const SCORES_FILE = path.join(__dirname, '../data/scores.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(SCORES_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load scores from file
async function loadScores() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(SCORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save scores to file
async function saveScores(scores) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2));
  } catch (error) {
    console.error('Error saving scores:', error);
    throw error;
  }
}

// Validate score data
function validateScore(score) {
  return (
    typeof score.playerName === 'string' &&
    score.playerName.length > 0 &&
    score.playerName.length <= 20 &&
    typeof score.floor === 'number' &&
    score.floor >= 1 &&
    typeof score.enemiesKilled === 'number' &&
    score.enemiesKilled >= 0 &&
    typeof score.timeSurvived === 'number' &&
    score.timeSurvived >= 0
  );
}

// GET /api/scores - Get high scores
router.get('/', async (req, res) => {
  try {
    const scores = await loadScores();
    
    // Sort by floor reached (descending), then by time survived (descending)
    const sortedScores = scores
      .sort((a, b) => {
        if (b.floor !== a.floor) {
          return b.floor - a.floor;
        }
        return b.timeSurvived - a.timeSurvived;
      })
      .slice(0, 10); // Top 10 scores
    
    res.json({
      success: true,
      scores: sortedScores
    });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scores'
    });
  }
});

// POST /api/scores - Submit new score
router.post('/', async (req, res) => {
  try {
    const { playerName, floor, enemiesKilled, timeSurvived } = req.body;
    
    const newScore = {
      playerName: playerName || 'Anonymous',
      floor,
      enemiesKilled,
      timeSurvived,
      timestamp: new Date().toISOString()
    };
    
    // Validate score data
    if (!validateScore(newScore)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score data'
      });
    }
    
    // Load existing scores
    const scores = await loadScores();
    
    // Add new score
    scores.push(newScore);
    
    // Keep only top 100 scores to prevent file from growing too large
    const sortedScores = scores
      .sort((a, b) => {
        if (b.floor !== a.floor) {
          return b.floor - a.floor;
        }
        return b.timeSurvived - a.timeSurvived;
      })
      .slice(0, 100);
    
    // Save updated scores
    await saveScores(sortedScores);
    
    // Find the rank of the new score
    const rank = sortedScores.findIndex(score => 
      score.timestamp === newScore.timestamp
    ) + 1;
    
    res.json({
      success: true,
      message: 'Score submitted successfully',
      rank: rank || null,
      isTopTen: rank <= 10
    });
    
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit score'
    });
  }
});

// GET /api/scores/stats - Get score statistics
router.get('/stats', async (req, res) => {
  try {
    const scores = await loadScores();
    
    if (scores.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalGames: 0,
          averageFloor: 0,
          averageEnemiesKilled: 0,
          averageTimeSurvived: 0,
          bestFloor: 0,
          mostEnemiesKilled: 0,
          longestTimeSurvived: 0
        }
      });
    }
    
    const stats = {
      totalGames: scores.length,
      averageFloor: scores.reduce((sum, score) => sum + score.floor, 0) / scores.length,
      averageEnemiesKilled: scores.reduce((sum, score) => sum + score.enemiesKilled, 0) / scores.length,
      averageTimeSurvived: scores.reduce((sum, score) => sum + score.timeSurvived, 0) / scores.length,
      bestFloor: Math.max(...scores.map(score => score.floor)),
      mostEnemiesKilled: Math.max(...scores.map(score => score.enemiesKilled)),
      longestTimeSurvived: Math.max(...scores.map(score => score.timeSurvived))
    };
    
    // Round averages to 2 decimal places
    stats.averageFloor = Math.round(stats.averageFloor * 100) / 100;
    stats.averageEnemiesKilled = Math.round(stats.averageEnemiesKilled * 100) / 100;
    stats.averageTimeSurvived = Math.round(stats.averageTimeSurvived * 100) / 100;
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching score stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch score statistics'
    });
  }
});

// DELETE /api/scores - Clear all scores (for development/testing)
router.delete('/', async (req, res) => {
  try {
    await saveScores([]);
    res.json({
      success: true,
      message: 'All scores cleared'
    });
  } catch (error) {
    console.error('Error clearing scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear scores'
    });
  }
});

module.exports = router;