# Tower Trials 🏰⚔️

A 2D top-down roguelike dungeon crawler built with Angular frontend and Express.js backend.

## 🎮 Game Features

### Core Gameplay
- **WASD Movement**: Smooth character movement with WASD keys
- **Mouse Attack**: Aim and attack with mouse cursor direction
- **Procedural Generation**: Randomly generated dungeon floors with rooms, corridors, and layouts
- **Permadeath**: Game restarts on death for true roguelike experience
- **Progressive Difficulty**: Enemies become stronger with each floor

### Enemy Types
- **Melee Enemies** (Red): Close-range fighters that chase the player
- **Ranged Enemies** (Blue): Keep distance and shoot projectiles
- **Fast Enemies** (Purple): Quick-moving aggressive attackers
- **Boss Enemies** (Orange): Powerful enemies every 5 floors with special attacks

### Level-Up System
- **XP Progression**: Gain experience by defeating enemies
- **Upgrade Choices**: Choose from 3 random upgrades each level:
  - Increased Health (+20 Max Health)
  - Increased Damage (+5 Attack Damage)
  - Increased Speed (+10% Movement Speed)
  - Faster Attacks (+20% Attack Speed)
  - Health Regeneration (Slowly regenerate health)

### UI/UX Features
- **Real-time HUD**: Health bar, XP bar, floor counter, kill count
- **Minimap**: Real-time level overview showing player and enemy positions
- **Time Tracking**: Session timer and survival statistics
- **Responsive Design**: Works on desktop and tablet devices
- **Retro Aesthetic**: Pixel-art inspired visual style

## 🏗️ Architecture

### Frontend (Angular)
```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── game-canvas/    # HTML5 Canvas game rendering
│   │   │   └── ui/             # HUD and UI components
│   │   ├── services/
│   │   │   ├── game-engine.service.ts    # Core game logic, level generation
│   │   │   ├── player.service.ts         # Player movement, stats, attacks
│   │   │   └── enemy.service.ts          # Enemy AI, types, behaviors
│   │   └── app.component.*     # Main app container
│   ├── styles.scss             # Global styles with Tailwind
│   └── index.html              # Main HTML file
```

### Backend (Express.js)
```
server/
├── routes/
│   ├── scores.js               # High score storage and retrieval
│   └── stats.js                # Game analytics and statistics
├── data/                       # JSON file storage
│   ├── scores.json             # High scores database
│   └── stats.json              # Game statistics
└── index.js                    # Express server setup
```

### Key Technologies
- **Frontend**: Angular 16, TypeScript, HTML5 Canvas, TailwindCSS, SCSS
- **Backend**: Express.js, Node.js, File-based JSON storage
- **Build System**: Angular CLI, npm scripts
- **Development**: Concurrently for running both frontend and backend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd tower-trials
npm run install:all
```

2. **Start development servers:**
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:4200
- Backend: http://localhost:3001

3. **Production build:**
```bash
npm run build
npm start
```

### Individual Component Commands

**Frontend only:**
```bash
cd frontend
npm install
npm start
```

**Backend only:**
```bash
cd server
npm install
npm start
```

## 🎯 Game Controls

| Control | Action |
|---------|--------|
| W, A, S, D | Move player |
| Mouse Movement | Aim direction |
| Mouse Click (Hold) | Attack in aimed direction |
| ESC | Pause/Menu |

## 🔧 Development

### Project Structure
- `/frontend` - Angular application with game logic
- `/server` - Express.js API for scores and statistics
- Root level scripts manage both applications

### Key Services

#### GameEngineService
- Main game loop and rendering
- Level generation and tile management
- Collision detection
- Camera management
- Game state management

#### PlayerService
- Player movement and input handling
- Attack system and projectiles
- Experience and leveling
- Player statistics

#### EnemyService
- AI behavior for different enemy types
- Enemy spawning and management
- Attack patterns and projectiles
- Boss mechanics

### Adding New Features

1. **New Enemy Type**: Extend `EnemyService.createEnemy()`
2. **New Upgrade**: Add to `GameEngineService.generateLevelUpOptions()`
3. **New Level Elements**: Modify `GameEngineService.generateLevel()`

## 📊 API Endpoints

### Scores
- `GET /api/scores` - Get top 10 high scores
- `POST /api/scores` - Submit new score
- `GET /api/scores/stats` - Get score statistics

### Statistics
- `GET /api/stats` - Get game statistics
- `POST /api/stats/event` - Track game event
- `GET /api/stats/summary` - Get summary statistics

## 🎨 Customization

### Styling
- Edit `frontend/src/styles.scss` for global styles
- Modify `tailwind.config.js` for theme colors
- Component-specific styles in respective `.scss` files

### Game Balance
- Adjust enemy stats in `EnemyService.createEnemy()`
- Modify player stats in `PlayerService.resetPlayer()`
- Change level generation in `GameEngineService.generateLevel()`

## 🐛 Troubleshooting

### Common Issues

**Canvas not rendering:**
- Check browser console for WebGL/Canvas errors
- Ensure browser supports HTML5 Canvas

**Server connection issues:**
- Verify both frontend and backend are running
- Check CORS configuration in `server/index.js`

**Performance issues:**
- Reduce enemy count in `EnemyService.spawnEnemiesForFloor()`
- Optimize rendering in game loop

## 📝 License

MIT License - feel free to use and modify for your own projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎮 Game Design Notes

### Difficulty Scaling
- Enemy health increases by 30% per floor
- Enemy damage increases by 20% per floor
- Boss fights every 5 floors
- Level generation becomes more complex over time

### Balance Philosophy
- Player should feel powerful but challenged
- Clear risk/reward for exploration
- Multiple viable upgrade paths
- Boss fights as skill checks

---

**Enjoy playing Tower Trials!** 🎮✨