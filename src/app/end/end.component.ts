import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameService } from '../game.service';

@Component({
  selector: 'app-end',
  imports: [CommonModule],
  templateUrl: './end.component.html',
  styleUrl: './end.component.css',
})
export class EndComponent {
  private gameService = inject(GameService);
  private router = inject(Router);

  score = this.gameService.getScore();
  total = this.gameService.getTotalCalculations();
  showScore = this.gameService.showFinalScore();

  restartSameConfig() {
    this.gameService.restartGameWithSameConfig();
    this.router.navigate(['/game']);
  }

  newGame() {
    this.gameService.resetGame();
    this.router.navigate(['/setup']);
  }
}
