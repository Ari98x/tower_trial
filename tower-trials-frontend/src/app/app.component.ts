import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { GameEngineService, GameState } from './services/game-engine.service';
import { GameCanvasComponent } from './components/game-canvas/game-canvas.component';
import { UiComponent } from './components/ui/ui.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, GameCanvasComponent, UiComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Tower Trials';
  gameState: GameState = GameState.MENU;
  GameState = GameState; // Make enum available in template
  
  private gameStateSubscription!: Subscription;

  constructor(public gameEngine: GameEngineService) {}

  ngOnInit() {
    this.gameStateSubscription = this.gameEngine.gameState$.subscribe(
      state => this.gameState = state
    );
  }

  ngOnDestroy() {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
  }

  startGame() {
    this.gameEngine.startGame();
  }

  restartGame() {
    this.gameEngine.restartGame();
  }

  goToMenu() {
    this.gameEngine.goToMenu();
  }

  selectUpgrade(upgrade: any) {
    this.gameEngine.selectUpgrade(upgrade);
  }

  get levelUpOptions() {
    return this.gameEngine.levelUpOptions;
  }
}
