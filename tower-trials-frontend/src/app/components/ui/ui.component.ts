import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameEngineService } from '../../services/game-engine.service';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-ui',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui.component.html',
  styleUrls: ['./ui.component.scss']
})
export class UiComponent implements OnInit, OnDestroy {
  playerHealth = 100;
  playerMaxHealth = 100;
  playerXP = 0;
  playerLevel = 1;
  xpToNextLevel = 100;
  currentFloor = 1;
  enemiesKilled = 0;
  timeSurvived = '00:00';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private gameEngine: GameEngineService,
    private playerService: PlayerService
  ) {}

  ngOnInit() {
    // Subscribe to player stats
    this.subscriptions.push(
      this.playerService.playerStats$.subscribe(stats => {
        this.playerHealth = stats.health;
        this.playerMaxHealth = stats.maxHealth;
        this.playerXP = stats.xp;
        this.playerLevel = stats.level;
        this.xpToNextLevel = stats.xpToNextLevel;
      })
    );

    // Subscribe to game stats
    this.subscriptions.push(
      this.gameEngine.gameStats$.subscribe(stats => {
        this.currentFloor = stats.currentFloor;
        this.enemiesKilled = stats.enemiesKilled;
        this.timeSurvived = this.formatTime(stats.timeSurvived);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get healthPercentage(): number {
    return (this.playerHealth / this.playerMaxHealth) * 100;
  }

  get xpPercentage(): number {
    const currentLevelXP = this.playerXP % this.xpToNextLevel;
    return (currentLevelXP / this.xpToNextLevel) * 100;
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Minimap data getter
  get minimapData() {
    return this.gameEngine.getMinimapData();
  }
}
