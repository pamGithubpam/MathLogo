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

  isSprintMode = this.gameService.isSprintMode();
  sprintCount = this.gameService.getSprintCalculationsCount();
  sprintDuration = this.gameService.getSprintDurationSeconds();
  score = this.gameService.getScore();
  total = this.gameService.getTotalCalculations();
  showScore = this.gameService.showFinalScore();

  get encouragementMessage(): string {
    const count = this.sprintCount;
    if (count >= 30) return 'Incroyable, tu es une vraie fusée du calcul ! 🚀';
    if (count >= 15) return 'Bravo, quelle rapidité ! 🌟';
    if (count >= 5) return 'Bien joué, continue comme ça ! 💪';
    return "C'est un bon début, entraîne-toi encore pour aller plus vite ! 😊";
  }

  restartSameConfig() {
    this.gameService.restartGameWithSameConfig();
    this.router.navigate(['/setup']);
  }

  newGame() {
    this.gameService.resetGame();
    this.router.navigate(['/setup']);
  }
}
