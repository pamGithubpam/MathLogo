import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../game.service';

@Component({
  selector: 'app-end',
  templateUrl: './end.component.html',
  styleUrl: './end.component.css'
})
export class EndComponent {
  private gameService = inject(GameService);
  private router = inject(Router);

  score = this.gameService.getScore();
  total = this.gameService.getTotalCalculations();

  restart() {
    this.gameService.resetGame();
    this.router.navigate(['/setup']);
  }
}