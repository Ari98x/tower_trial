import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PlayerService } from './player.service';
import { EnemyService } from './enemy.service';

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameStats {
  currentFloor: number;
  enemiesKilled: number;
  timeSurvived: number;
}

export interface LevelUpgrade {
  id: string;
  name: string;
  description: string;
  effect: () => void;
}

export interface Tile {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'exit' | 'entrance';
  walkable: boolean;
}

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game-over',
  LEVEL_UP = 'level-up'
}

@Injectable({
  providedIn: 'root'
})
export class GameEngineService {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  
  // Game state
  private gameStateSubject = new BehaviorSubject<GameState>(GameState.MENU);
  gameState$ = this.gameStateSubject.asObservable();
  
  private gameStatsSubject = new BehaviorSubject<GameStats>({
    currentFloor: 1,
    enemiesKilled: 0,
    timeSurvived: 0
  });
  gameStats$ = this.gameStatsSubject.asObservable();

  // Level data
  public currentFloor = 1;
  public enemiesKilled = 0;
  private startTime = 0;
  private lastUpdateTime = 0;
  
  // Level generation
  private levelWidth = 50;
  private levelHeight = 50;
  private tileSize = 32;
  private tiles: Tile[][] = [];
  
  // Camera
  public camera = { x: 0, y: 0 };
  
  // Level up system
  public levelUpOptions: LevelUpgrade[] = [];
  
  constructor(
    private playerService: PlayerService,
    private enemyService: EnemyService
  ) {
    // Initialize cross-service dependencies
    this.playerService.setGameEngine(this);
    this.enemyService.setServices(this.playerService, this);
  }

  initializeRenderer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  startGame() {
    this.currentFloor = 1;
    this.enemiesKilled = 0;
    this.startTime = Date.now();
    this.lastUpdateTime = 0;
    
    this.generateLevel();
    this.playerService.resetPlayer();
    this.enemyService.spawnEnemiesForFloor(this.currentFloor);
    
    this.gameStateSubject.next(GameState.PLAYING);
  }

  restartGame() {
    this.startGame();
  }

  goToMenu() {
    this.gameStateSubject.next(GameState.MENU);
  }

  stopGame() {
    this.gameStateSubject.next(GameState.GAME_OVER);
  }

  update(timestamp: number) {
    if (this.gameStateSubject.value !== GameState.PLAYING) {
      return;
    }

    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;

    // Update player
    this.playerService.update(deltaTime);
    
    // Update enemies
    this.enemyService.update(deltaTime);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Check collisions
    this.checkCollisions();
    
    // Check level progression
    this.checkLevelProgression();
    
    // Update game stats
    this.updateGameStats();
  }

  render() {
    if (!this.ctx || this.gameStateSubject.value !== GameState.PLAYING) {
      return;
    }

    // Clear canvas
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render level
    this.renderLevel();
    
    // Render enemies
    this.enemyService.render(this.ctx, this.camera);
    
    // Render player
    this.playerService.render(this.ctx, this.camera);
  }

  private generateLevel() {
    this.tiles = [];
    
    // Initialize all tiles as walls
    for (let y = 0; y < this.levelHeight; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.levelWidth; x++) {
        this.tiles[y][x] = {
          x,
          y,
          type: 'wall',
          walkable: false
        };
      }
    }
    
    // Create rooms using simple algorithm
    this.generateRooms();
    
    // Connect rooms with corridors
    this.generateCorridors();
    
    // Place entrance and exit
    this.placeEntranceAndExit();
  }

  private generateRooms() {
    const roomCount = Math.floor(Math.random() * 8) + 6;
    
    for (let i = 0; i < roomCount; i++) {
      const roomWidth = Math.floor(Math.random() * 8) + 4;
      const roomHeight = Math.floor(Math.random() * 8) + 4;
      const roomX = Math.floor(Math.random() * (this.levelWidth - roomWidth - 2)) + 1;
      const roomY = Math.floor(Math.random() * (this.levelHeight - roomHeight - 2)) + 1;
      
      // Create room
      for (let y = roomY; y < roomY + roomHeight; y++) {
        for (let x = roomX; x < roomX + roomWidth; x++) {
          this.tiles[y][x] = {
            x,
            y,
            type: 'floor',
            walkable: true
          };
        }
      }
    }
  }

  private generateCorridors() {
    // Simple corridor generation - connect random floor tiles
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(Math.random() * this.levelWidth);
      const y = Math.floor(Math.random() * this.levelHeight);
      
      if (x > 0 && x < this.levelWidth - 1 && y > 0 && y < this.levelHeight - 1) {
        this.tiles[y][x] = {
          x,
          y,
          type: 'floor',
          walkable: true
        };
      }
    }
  }

  private placeEntranceAndExit() {
    // Find floor tiles for entrance and exit
    const floorTiles = [];
    for (let y = 0; y < this.levelHeight; y++) {
      for (let x = 0; x < this.levelWidth; x++) {
        if (this.tiles[y][x].walkable) {
          floorTiles.push({ x, y });
        }
      }
    }
    
    if (floorTiles.length >= 2) {
      const entrance = floorTiles[0];
      const exit = floorTiles[floorTiles.length - 1];
      
      this.tiles[entrance.y][entrance.x].type = 'entrance';
      this.tiles[exit.y][exit.x].type = 'exit';
      
      // Position player at entrance
      this.playerService.setPosition(entrance.x * this.tileSize + this.tileSize / 2, 
                                   entrance.y * this.tileSize + this.tileSize / 2);
    }
  }

  private renderLevel() {
    const startX = Math.floor(this.camera.x / this.tileSize) - 1;
    const endX = Math.ceil((this.camera.x + this.canvas.width) / this.tileSize) + 1;
    const startY = Math.floor(this.camera.y / this.tileSize) - 1;
    const endY = Math.ceil((this.camera.y + this.canvas.height) / this.tileSize) + 1;

    for (let y = Math.max(0, startY); y < Math.min(this.levelHeight, endY); y++) {
      for (let x = Math.max(0, startX); x < Math.min(this.levelWidth, endX); x++) {
        const tile = this.tiles[y][x];
        const screenX = x * this.tileSize - this.camera.x;
        const screenY = y * this.tileSize - this.camera.y;

        // Render tile
        switch (tile.type) {
          case 'wall':
            this.ctx.fillStyle = '#333';
            break;
          case 'floor':
            this.ctx.fillStyle = '#666';
            break;
          case 'entrance':
            this.ctx.fillStyle = '#00ff00';
            break;
          case 'exit':
            this.ctx.fillStyle = '#ffff00';
            break;
        }
        
        this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        
        // Add border for walls
        if (tile.type === 'wall') {
          this.ctx.strokeStyle = '#555';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
        }
      }
    }
  }

  private updateCamera() {
    const player = this.playerService.getPlayer();
    if (player) {
      this.camera.x = player.x - this.canvas.width / 2;
      this.camera.y = player.y - this.canvas.height / 2;
    }
  }

  private checkCollisions() {
    // Player-wall collisions
    const player = this.playerService.getPlayer();
    if (player) {
      this.checkPlayerWallCollision(player);
    }
    
    // Player-enemy collisions
    this.enemyService.checkPlayerCollisions();
    
    // Player-projectile collisions
    this.checkProjectileCollisions();
  }

  private checkPlayerWallCollision(player: any) {
    const tileX = Math.floor(player.x / this.tileSize);
    const tileY = Math.floor(player.y / this.tileSize);
    
    if (tileX >= 0 && tileX < this.levelWidth && tileY >= 0 && tileY < this.levelHeight) {
      const tile = this.tiles[tileY][tileX];
      if (!tile.walkable) {
        // Push player out of wall
        this.playerService.handleWallCollision();
      }
    }
  }

  private checkProjectileCollisions() {
    // Implementation for projectile collisions
  }

  private checkLevelProgression() {
    const player = this.playerService.getPlayer();
    if (player) {
      const tileX = Math.floor(player.x / this.tileSize);
      const tileY = Math.floor(player.y / this.tileSize);
      
      if (tileX >= 0 && tileX < this.levelWidth && tileY >= 0 && tileY < this.levelHeight) {
        const tile = this.tiles[tileY][tileX];
        if (tile.type === 'exit' && this.enemyService.getEnemyCount() === 0) {
          this.nextFloor();
        }
      }
    }
  }

  private nextFloor() {
    this.currentFloor++;
    this.generateLevel();
    this.enemyService.spawnEnemiesForFloor(this.currentFloor);
    
    // Every 5 floors is a boss floor
    if (this.currentFloor % 5 === 0) {
      this.enemyService.spawnBoss();
    }
  }

  private updateGameStats() {
    const timeSurvived = (Date.now() - this.startTime) / 1000;
    this.gameStatsSubject.next({
      currentFloor: this.currentFloor,
      enemiesKilled: this.enemiesKilled,
      timeSurvived
    });
  }

  // Level up system
  showLevelUpScreen() {
    this.generateLevelUpOptions();
    this.gameStateSubject.next(GameState.LEVEL_UP);
  }

  private generateLevelUpOptions() {
    const allUpgrades: LevelUpgrade[] = [
      {
        id: 'health',
        name: 'Increased Health',
        description: '+20 Max Health',
        effect: () => this.playerService.upgradeMaxHealth(20)
      },
      {
        id: 'damage',
        name: 'Increased Damage',
        description: '+5 Attack Damage',
        effect: () => this.playerService.upgradeDamage(5)
      },
      {
        id: 'speed',
        name: 'Increased Speed',
        description: '+10% Movement Speed',
        effect: () => this.playerService.upgradeSpeed(0.1)
      },
      {
        id: 'attack_speed',
        name: 'Faster Attacks',
        description: '+20% Attack Speed',
        effect: () => this.playerService.upgradeAttackSpeed(0.2)
      },
      {
        id: 'regeneration',
        name: 'Health Regeneration',
        description: 'Slowly regenerate health',
        effect: () => this.playerService.enableRegeneration()
      }
    ];

    // Select 3 random upgrades
    this.levelUpOptions = [];
    const shuffled = [...allUpgrades].sort(() => 0.5 - Math.random());
    this.levelUpOptions = shuffled.slice(0, 3);
  }

  selectUpgrade(upgrade: LevelUpgrade) {
    upgrade.effect();
    this.gameStateSubject.next(GameState.PLAYING);
  }

  // Utility methods
  isWalkable(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    
    if (tileX < 0 || tileX >= this.levelWidth || tileY < 0 || tileY >= this.levelHeight) {
      return false;
    }
    
    return this.tiles[tileY][tileX].walkable;
  }

  getMinimapData() {
    return {
      tiles: this.tiles,
      levelWidth: this.levelWidth,
      levelHeight: this.levelHeight,
      tileSize: this.tileSize,
      player: this.playerService.getPlayer(),
      enemies: this.enemyService.getEnemies()
    };
  }

  getTimeSurvived(): string {
    const seconds = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  onEnemyKilled() {
    this.enemiesKilled++;
  }
}
