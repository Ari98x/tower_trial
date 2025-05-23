import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  xp: number;
  level: number;
  xpToNextLevel: number;
  damage: number;
  speed: number;
  attackSpeed: number;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  mouseX: number;
  mouseY: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  xp: number;
  level: number;
  damage: number;
  speed: number;
  attackSpeed: number;
  lastAttackTime: number;
  facing: number; // angle in radians
  hasRegeneration: boolean;
  lastRegenTime: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetime: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private player: Player = {
    x: 400,
    y: 300,
    width: 24,
    height: 24,
    health: 100,
    maxHealth: 100,
    xp: 0,
    level: 1,
    damage: 10,
    speed: 150,
    attackSpeed: 1,
    lastAttackTime: 0,
    facing: 0,
    hasRegeneration: false,
    lastRegenTime: 0
  };

  private playerStatsSubject = new BehaviorSubject<PlayerStats>({
    health: this.player.health,
    maxHealth: this.player.maxHealth,
    xp: this.player.xp,
    level: this.player.level,
    xpToNextLevel: this.getXPRequirement(this.player.level),
    damage: this.player.damage,
    speed: this.player.speed,
    attackSpeed: this.player.attackSpeed
  });

  playerStats$ = this.playerStatsSubject.asObservable();

  private currentInput: PlayerInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    mouseX: 0,
    mouseY: 0
  };

  private projectiles: Projectile[] = [];
  private gameEngine: any; // Will be injected

  constructor() {}

  setGameEngine(gameEngine: any) {
    this.gameEngine = gameEngine;
  }

  resetPlayer() {
    this.player = {
      x: 400,
      y: 300,
      width: 24,
      height: 24,
      health: 100,
      maxHealth: 100,
      xp: 0,
      level: 1,
      damage: 10,
      speed: 150,
      attackSpeed: 1,
      lastAttackTime: 0,
      facing: 0,
      hasRegeneration: false,
      lastRegenTime: 0
    };
    this.projectiles = [];
    this.updatePlayerStats();
  }

  updateInput(input: PlayerInput) {
    this.currentInput = input;
  }

  update(deltaTime: number) {
    this.handleMovement(deltaTime);
    this.handleAttack();
    this.handleRegeneration(deltaTime);
    this.updateProjectiles(deltaTime);
  }

  private handleMovement(deltaTime: number) {
    let moveX = 0;
    let moveY = 0;

    if (this.currentInput.left) moveX -= 1;
    if (this.currentInput.right) moveX += 1;
    if (this.currentInput.up) moveY -= 1;
    if (this.currentInput.down) moveY += 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707;
      moveY *= 0.707;
    }

    // Apply movement
    const speed = this.player.speed * (deltaTime / 1000);
    const newX = this.player.x + moveX * speed;
    const newY = this.player.y + moveY * speed;

    // Check if new position is walkable (will be validated by game engine)
    this.player.x = newX;
    this.player.y = newY;

    // Update facing direction based on mouse position
    if (this.currentInput.mouseX !== 0 || this.currentInput.mouseY !== 0) {
      // Convert mouse position to world coordinates (accounting for camera)
      const worldMouseX = this.currentInput.mouseX + (this.gameEngine?.camera?.x || 0);
      const worldMouseY = this.currentInput.mouseY + (this.gameEngine?.camera?.y || 0);
      
      const dx = worldMouseX - this.player.x;
      const dy = worldMouseY - this.player.y;
      this.player.facing = Math.atan2(dy, dx);
    }
  }

  private handleAttack() {
    if (this.currentInput.attack) {
      const now = Date.now();
      const attackCooldown = 1000 / this.player.attackSpeed; // attacks per second
      
      if (now - this.player.lastAttackTime > attackCooldown) {
        this.attack();
        this.player.lastAttackTime = now;
      }
    }
  }

  private attack() {
    // Create projectile
    const projectileSpeed = 300;
    const projectile: Projectile = {
      x: this.player.x,
      y: this.player.y,
      vx: Math.cos(this.player.facing) * projectileSpeed,
      vy: Math.sin(this.player.facing) * projectileSpeed,
      damage: this.player.damage,
      lifetime: 2000 // 2 seconds
    };

    this.projectiles.push(projectile);
  }

  private handleRegeneration(deltaTime: number) {
    if (this.player.hasRegeneration && this.player.health < this.player.maxHealth) {
      const now = Date.now();
      if (now - this.player.lastRegenTime > 1000) { // Regen every second
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
        this.player.lastRegenTime = now;
        this.updatePlayerStats();
      }
    }
  }

  private updateProjectiles(deltaTime: number) {
    const dt = deltaTime / 1000;
    
    this.projectiles = this.projectiles.filter(projectile => {
      // Update position
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.lifetime -= deltaTime;

      // Check if projectile is still alive
      if (projectile.lifetime <= 0) {
        return false;
      }

      // Check wall collision (if game engine is available)
      if (this.gameEngine && !this.gameEngine.isWalkable(projectile.x, projectile.y)) {
        return false;
      }

      return true;
    });
  }

  render(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }) {
    // Render player
    const screenX = this.player.x - camera.x - this.player.width / 2;
    const screenY = this.player.y - camera.y - this.player.height / 2;

    // Player body
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(screenX, screenY, this.player.width, this.player.height);

    // Player direction indicator
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.player.x - camera.x, this.player.y - camera.y);
    ctx.lineTo(
      this.player.x - camera.x + Math.cos(this.player.facing) * 20,
      this.player.y - camera.y + Math.sin(this.player.facing) * 20
    );
    ctx.stroke();

    // Render projectiles
    this.projectiles.forEach(projectile => {
      const projScreenX = projectile.x - camera.x;
      const projScreenY = projectile.y - camera.y;
      
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(projScreenX, projScreenY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Collision and damage methods
  takeDamage(damage: number) {
    this.player.health = Math.max(0, this.player.health - damage);
    this.updatePlayerStats();
    
    if (this.player.health <= 0) {
      this.onPlayerDeath();
    }
  }

  private onPlayerDeath() {
    // Trigger game over
    if (this.gameEngine) {
      this.gameEngine.stopGame();
    }
  }

  handleWallCollision() {
    // Simple wall collision - could be improved with proper physics
    // For now, we'll let the game engine handle this
  }

  // Experience and leveling
  gainXP(amount: number) {
    this.player.xp += amount;
    
    const xpRequired = this.getXPRequirement(this.player.level);
    if (this.player.xp >= xpRequired) {
      this.levelUp();
    }
    
    this.updatePlayerStats();
  }

  private levelUp() {
    this.player.level++;
    this.player.xp = 0; // Reset XP for next level
    
    // Show level up screen
    if (this.gameEngine) {
      this.gameEngine.showLevelUpScreen();
    }
    
    this.updatePlayerStats();
  }

  private getXPRequirement(level: number): number {
    return level * 100; // Simple progression
  }

  // Upgrade methods
  upgradeMaxHealth(amount: number) {
    this.player.maxHealth += amount;
    this.player.health += amount; // Also heal player
    this.updatePlayerStats();
  }

  upgradeDamage(amount: number) {
    this.player.damage += amount;
    this.updatePlayerStats();
  }

  upgradeSpeed(multiplier: number) {
    this.player.speed *= (1 + multiplier);
    this.updatePlayerStats();
  }

  upgradeAttackSpeed(multiplier: number) {
    this.player.attackSpeed *= (1 + multiplier);
    this.updatePlayerStats();
  }

  enableRegeneration() {
    this.player.hasRegeneration = true;
    this.player.lastRegenTime = Date.now();
  }

  // Utility methods
  getPlayer(): Player {
    return this.player;
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  setPosition(x: number, y: number) {
    this.player.x = x;
    this.player.y = y;
  }

  private updatePlayerStats() {
    this.playerStatsSubject.next({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      xp: this.player.xp,
      level: this.player.level,
      xpToNextLevel: this.getXPRequirement(this.player.level),
      damage: this.player.damage,
      speed: this.player.speed,
      attackSpeed: this.player.attackSpeed
    });
  }

  // Check if projectile hits enemy
  checkProjectileEnemyCollision(enemies: any[]): any[] {
    const hits: any[] = [];
    
    this.projectiles = this.projectiles.filter(projectile => {
      for (const enemy of enemies) {
        const dx = projectile.x - enemy.x;
        const dy = projectile.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.radius + 3) { // 3 is projectile radius
          hits.push({ enemy, damage: projectile.damage });
          return false; // Remove projectile
        }
      }
      return true; // Keep projectile
    });
    
    return hits;
  }
}
