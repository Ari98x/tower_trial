import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { GameEngineService } from '../../services/game-engine.service';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [],
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.scss']
})
export class GameCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  private keys: { [key: string]: boolean } = {};
  private mousePosition = { x: 0, y: 0 };
  private isMouseDown = false;

  constructor(
    private gameEngine: GameEngineService,
    private playerService: PlayerService
  ) {}

  ngOnInit() {
    this.setupEventListeners();
  }

  ngAfterViewInit() {
    this.initializeCanvas();
    this.startGameLoop();
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.removeEventListeners();
  }

  private initializeCanvas() {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.resizeCanvas();
    this.gameEngine.initializeRenderer(this.ctx, this.canvas);
  }

  private resizeCanvas() {
    const container = this.canvas.parentElement!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    
    // Maintain pixel art style
    this.ctx.imageSmoothingEnabled = false;
  }

  private startGameLoop() {
    const gameLoop = (timestamp: number) => {
      this.update(timestamp);
      this.render();
      this.animationId = requestAnimationFrame(gameLoop);
    };
    this.animationId = requestAnimationFrame(gameLoop);
  }

  private update(timestamp: number) {
    // Update player input
    this.playerService.updateInput({
      up: this.keys['w'] || this.keys['W'],
      down: this.keys['s'] || this.keys['S'],
      left: this.keys['a'] || this.keys['A'],
      right: this.keys['d'] || this.keys['D'],
      attack: this.isMouseDown,
      mouseX: this.mousePosition.x,
      mouseY: this.mousePosition.y
    });

    // Update game engine
    this.gameEngine.update(timestamp);
  }

  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render game
    this.gameEngine.render();
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private removeEventListeners() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keys[event.key] = true;
    event.preventDefault();
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys[event.key] = false;
    event.preventDefault();
  }

  private onResize() {
    this.resizeCanvas();
  }

  onMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = event.clientX - rect.left;
    this.mousePosition.y = event.clientY - rect.top;
  }

  onMouseDown(event: MouseEvent) {
    this.isMouseDown = true;
    this.onMouseMove(event);
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
  }
}
