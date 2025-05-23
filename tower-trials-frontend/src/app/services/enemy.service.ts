import { Injectable } from '@angular/core';

export interface Enemy {
  id: string;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  type: 'melee' | 'ranged' | 'fast' | 'boss';
  attackCooldown: number;
  lastAttackTime: number;
  targetX: number;
  targetY: number;
  isAttacking: boolean;
  patrolDirection: number;
  lastDirectionChange: number;
  color: string;
  xpValue: number;
}

export interface EnemyProjectile {
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
export class EnemyService {
  private enemies: Enemy[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private nextEnemyId = 0;
  
  private playerService: any; // Will be injected
  private gameEngine: any; // Will be injected

  constructor() {}

  setServices(playerService: any, gameEngine: any) {
    this.playerService = playerService;
    this.gameEngine = gameEngine;
  }

  spawnEnemiesForFloor(floor: number) {
    this.enemies = [];
    this.enemyProjectiles = [];
    
    const baseEnemyCount = 3 + Math.floor(floor / 2);
    const enemyCount = Math.min(baseEnemyCount, 15); // Cap at 15 enemies
    
    for (let i = 0; i < enemyCount; i++) {
      this.spawnRandomEnemy(floor);
    }
  }

  private spawnRandomEnemy(floor: number) {
    const enemyTypes: ('melee' | 'ranged' | 'fast')[] = ['melee', 'ranged', 'fast'];
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    // Find random walkable position
    let x, y;
    let attempts = 0;
    do {
      x = Math.random() * 1600; // Level size
      y = Math.random() * 1600;
      attempts++;
    } while (!this.gameEngine?.isWalkable(x, y) && attempts < 50);
    
    if (attempts >= 50) {
      x = 800; // Fallback position
      y = 800;
    }
    
    const enemy = this.createEnemy(type, x, y, floor);
    this.enemies.push(enemy);
  }

  private createEnemy(type: 'melee' | 'ranged' | 'fast' | 'boss', x: number, y: number, floor: number): Enemy {
    const id = (this.nextEnemyId++).toString();
    const healthMultiplier = 1 + (floor - 1) * 0.3;
    const damageMultiplier = 1 + (floor - 1) * 0.2;
    
    let baseStats;
    switch (type) {
      case 'melee':
        baseStats = {
          health: 30 * healthMultiplier,
          damage: 15 * damageMultiplier,
          speed: 80,
          attackCooldown: 1500,
          radius: 16,
          color: '#ff4444',
          xpValue: 10
        };
        break;
      case 'ranged':
        baseStats = {
          health: 20 * healthMultiplier,
          damage: 12 * damageMultiplier,
          speed: 60,
          attackCooldown: 2000,
          radius: 14,
          color: '#4444ff',
          xpValue: 15
        };
        break;
      case 'fast':
        baseStats = {
          health: 15 * healthMultiplier,
          damage: 8 * damageMultiplier,
          speed: 120,
          attackCooldown: 800,
          radius: 12,
          color: '#ff44ff',
          xpValue: 12
        };
        break;
      case 'boss':
        baseStats = {
          health: 200 * healthMultiplier,
          damage: 25 * damageMultiplier,
          speed: 40,
          attackCooldown: 1000,
          radius: 32,
          color: '#ffaa00',
          xpValue: 100
        };
        break;
    }

    return {
      id,
      x,
      y,
      type,
      health: baseStats.health,
      maxHealth: baseStats.health,
      damage: baseStats.damage,
      speed: baseStats.speed,
      attackCooldown: baseStats.attackCooldown,
      radius: baseStats.radius,
      color: baseStats.color,
      xpValue: baseStats.xpValue,
      lastAttackTime: 0,
      targetX: x,
      targetY: y,
      isAttacking: false,
      patrolDirection: Math.random() * Math.PI * 2,
      lastDirectionChange: Date.now()
    };
  }

  spawnBoss() {
    // Find center of level for boss spawn
    const centerX = 800;
    const centerY = 800;
    
    const boss = this.createEnemy('boss', centerX, centerY, this.gameEngine?.currentFloor || 1);
    this.enemies.push(boss);
  }

  update(deltaTime: number) {
    const dt = deltaTime / 1000;
    const player = this.playerService?.getPlayer();
    
    if (!player) return;

    // Update enemies
    this.enemies.forEach(enemy => {
      this.updateEnemyAI(enemy, player, dt);
      this.updateEnemyAttack(enemy, player);
    });

    // Update enemy projectiles
    this.updateEnemyProjectiles(dt);

    // Check projectile collisions
    this.checkProjectileCollisions();
  }

  private updateEnemyAI(enemy: Enemy, player: any, deltaTime: number) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    switch (enemy.type) {
      case 'melee':
        this.updateMeleeAI(enemy, player, deltaTime, distanceToPlayer);
        break;
      case 'ranged':
        this.updateRangedAI(enemy, player, deltaTime, distanceToPlayer);
        break;
      case 'fast':
        this.updateFastAI(enemy, player, deltaTime, distanceToPlayer);
        break;
      case 'boss':
        this.updateBossAI(enemy, player, deltaTime, distanceToPlayer);
        break;
    }
  }

  private updateMeleeAI(enemy: Enemy, player: any, deltaTime: number, distanceToPlayer: number) {
    const aggroRange = 150;
    const attackRange = 30;
    
    if (distanceToPlayer < aggroRange) {
      // Chase player
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const moveX = (dx / distanceToPlayer) * enemy.speed * deltaTime;
      const moveY = (dy / distanceToPlayer) * enemy.speed * deltaTime;
      
      const newX = enemy.x + moveX;
      const newY = enemy.y + moveY;
      
      if (this.gameEngine?.isWalkable(newX, newY)) {
        enemy.x = newX;
        enemy.y = newY;
      }
      
      enemy.isAttacking = distanceToPlayer < attackRange;
    } else {
      // Patrol behavior
      this.updatePatrolBehavior(enemy, deltaTime);
    }
  }

  private updateRangedAI(enemy: Enemy, player: any, deltaTime: number, distanceToPlayer: number) {
    const aggroRange = 200;
    const optimalRange = 120;
    const tooCloseRange = 80;
    
    if (distanceToPlayer < aggroRange) {
      if (distanceToPlayer < tooCloseRange) {
        // Move away from player
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const moveX = (dx / distanceToPlayer) * enemy.speed * deltaTime;
        const moveY = (dy / distanceToPlayer) * enemy.speed * deltaTime;
        
        const newX = enemy.x + moveX;
        const newY = enemy.y + moveY;
        
        if (this.gameEngine?.isWalkable(newX, newY)) {
          enemy.x = newX;
          enemy.y = newY;
        }
      } else if (distanceToPlayer > optimalRange) {
        // Move closer to optimal range
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const moveX = (dx / distanceToPlayer) * enemy.speed * deltaTime * 0.5;
        const moveY = (dy / distanceToPlayer) * enemy.speed * deltaTime * 0.5;
        
        const newX = enemy.x + moveX;
        const newY = enemy.y + moveY;
        
        if (this.gameEngine?.isWalkable(newX, newY)) {
          enemy.x = newX;
          enemy.y = newY;
        }
      }
      
      enemy.isAttacking = distanceToPlayer < aggroRange;
    } else {
      this.updatePatrolBehavior(enemy, deltaTime);
    }
  }

  private updateFastAI(enemy: Enemy, player: any, deltaTime: number, distanceToPlayer: number) {
    const aggroRange = 180;
    const attackRange = 25;
    
    if (distanceToPlayer < aggroRange) {
      // Fast aggressive chase
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const moveX = (dx / distanceToPlayer) * enemy.speed * deltaTime;
      const moveY = (dy / distanceToPlayer) * enemy.speed * deltaTime;
      
      const newX = enemy.x + moveX;
      const newY = enemy.y + moveY;
      
      if (this.gameEngine?.isWalkable(newX, newY)) {
        enemy.x = newX;
        enemy.y = newY;
      }
      
      enemy.isAttacking = distanceToPlayer < attackRange;
    } else {
      this.updatePatrolBehavior(enemy, deltaTime);
    }
  }

  private updateBossAI(enemy: Enemy, player: any, deltaTime: number, distanceToPlayer: number) {
    const aggroRange = 300;
    const now = Date.now();
    
    if (distanceToPlayer < aggroRange) {
      // Boss movement pattern - slower but more deliberate
      if (now - enemy.lastDirectionChange > 2000) { // Change pattern every 2 seconds
        enemy.patrolDirection = Math.random() * Math.PI * 2;
        enemy.lastDirectionChange = now;
      }
      
      // Move in pattern while slowly approaching player
      const patternX = Math.cos(enemy.patrolDirection) * enemy.speed * deltaTime * 0.5;
      const patternY = Math.sin(enemy.patrolDirection) * enemy.speed * deltaTime * 0.5;
      
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const chaseX = (dx / distanceToPlayer) * enemy.speed * deltaTime * 0.3;
      const chaseY = (dy / distanceToPlayer) * enemy.speed * deltaTime * 0.3;
      
      const newX = enemy.x + patternX + chaseX;
      const newY = enemy.y + patternY + chaseY;
      
      if (this.gameEngine?.isWalkable(newX, newY)) {
        enemy.x = newX;
        enemy.y = newY;
      }
      
      enemy.isAttacking = true; // Boss always attacks when in range
    }
  }

  private updatePatrolBehavior(enemy: Enemy, deltaTime: number) {
    const now = Date.now();
    
    // Change direction occasionally
    if (now - enemy.lastDirectionChange > 3000) {
      enemy.patrolDirection = Math.random() * Math.PI * 2;
      enemy.lastDirectionChange = now;
    }
    
    const moveX = Math.cos(enemy.patrolDirection) * enemy.speed * deltaTime * 0.3;
    const moveY = Math.sin(enemy.patrolDirection) * enemy.speed * deltaTime * 0.3;
    
    const newX = enemy.x + moveX;
    const newY = enemy.y + moveY;
    
    if (this.gameEngine?.isWalkable(newX, newY)) {
      enemy.x = newX;
      enemy.y = newY;
    } else {
      // Hit wall, change direction
      enemy.patrolDirection = Math.random() * Math.PI * 2;
      enemy.lastDirectionChange = now;
    }
  }

  private updateEnemyAttack(enemy: Enemy, player: any) {
    if (!enemy.isAttacking) return;
    
    const now = Date.now();
    if (now - enemy.lastAttackTime < enemy.attackCooldown) return;
    
    enemy.lastAttackTime = now;
    
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (enemy.type === 'melee' || enemy.type === 'fast') {
      // Melee attack
      if (distance < 40) {
        this.playerService?.takeDamage(enemy.damage);
      }
    } else if (enemy.type === 'ranged' || enemy.type === 'boss') {
      // Ranged attack
      this.createEnemyProjectile(enemy, player);
      
      // Boss special attack - spread shot
      if (enemy.type === 'boss') {
        this.createEnemyProjectile(enemy, player, -0.3);
        this.createEnemyProjectile(enemy, player, 0.3);
      }
    }
  }

  private createEnemyProjectile(enemy: Enemy, player: any, angleOffset: number = 0) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const angle = Math.atan2(dy, dx) + angleOffset;
    const speed = 150;
    
    const projectile: EnemyProjectile = {
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: enemy.damage,
      lifetime: 3000
    };
    
    this.enemyProjectiles.push(projectile);
  }

  private updateEnemyProjectiles(deltaTime: number) {
    this.enemyProjectiles = this.enemyProjectiles.filter(projectile => {
      projectile.x += projectile.vx * deltaTime;
      projectile.y += projectile.vy * deltaTime;
      projectile.lifetime -= deltaTime * 1000;
      
      // Remove if expired or hit wall
      if (projectile.lifetime <= 0 || !this.gameEngine?.isWalkable(projectile.x, projectile.y)) {
        return false;
      }
      
      return true;
    });
  }

  private checkProjectileCollisions() {
    const player = this.playerService?.getPlayer();
    if (!player) return;
    
    // Check enemy projectiles hitting player
    this.enemyProjectiles = this.enemyProjectiles.filter(projectile => {
      const dx = projectile.x - player.x;
      const dy = projectile.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.width / 2 + 3) { // 3 is projectile radius
        this.playerService?.takeDamage(projectile.damage);
        return false; // Remove projectile
      }
      
      return true;
    });
    
    // Check player projectiles hitting enemies
    const hits = this.playerService?.checkProjectileEnemyCollision(this.enemies) || [];
    hits.forEach((hit: any) => {
      this.damageEnemy(hit.enemy, hit.damage);
    });
  }

  checkPlayerCollisions() {
    const player = this.playerService?.getPlayer();
    if (!player) return;
    
    this.enemies.forEach(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Contact damage for melee enemies
      if ((enemy.type === 'melee' || enemy.type === 'fast') && distance < enemy.radius + player.width / 2) {
        const now = Date.now();
        if (now - enemy.lastAttackTime > 500) { // Prevent spam damage
          this.playerService?.takeDamage(enemy.damage * 0.5); // Reduced contact damage
          enemy.lastAttackTime = now;
        }
      }
    });
  }

  private damageEnemy(enemy: Enemy, damage: number) {
    enemy.health -= damage;
    
    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    // Give XP to player
    this.playerService?.gainXP(enemy.xpValue);
    
    // Remove enemy
    const index = this.enemies.findIndex(e => e.id === enemy.id);
    if (index >= 0) {
      this.enemies.splice(index, 1);
    }
    
    // Notify game engine
    this.gameEngine?.onEnemyKilled();
  }

  render(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }) {
    // Render enemies
    this.enemies.forEach(enemy => {
      const screenX = enemy.x - camera.x;
      const screenY = enemy.y - camera.y;
      
      // Enemy body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Health bar
      if (enemy.health < enemy.maxHealth) {
        const barWidth = enemy.radius * 2;
        const barHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, screenY - enemy.radius - 10, barWidth, barHeight);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(screenX - barWidth / 2, screenY - enemy.radius - 10, barWidth * healthPercent, barHeight);
      }
      
      // Boss indicator
      if (enemy.type === 'boss') {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, enemy.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    // Render enemy projectiles
    this.enemyProjectiles.forEach(projectile => {
      const screenX = projectile.x - camera.x;
      const screenY = projectile.y - camera.y;
      
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Utility methods
  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getEnemyCount(): number {
    return this.enemies.length;
  }
}
