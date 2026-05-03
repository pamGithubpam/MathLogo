import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService, Calculation } from '../game.service';

@Component({
  selector: 'app-game',
  imports: [FormsModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {
  private gameService = inject(GameService);
  private router = inject(Router);

  currentCalculation = signal<Calculation | null>(null);
  userAnswer = signal('');
  showReward = signal(false);
  rewardImage = signal<string | null>(null);

  ngOnInit() {
    this.loadNextCalculation();
  }

  loadNextCalculation() {
    this.currentCalculation.set(this.gameService.getCurrentCalculation());
    this.userAnswer.set('');
    this.showReward.set(false);
    this.rewardImage.set(null);
  }

  submitAnswer() {
    const calc = this.currentCalculation();
    if (!calc) return;

    const correct = this.gameService.submitAnswer(this.userAnswer());
    if (correct || !calc.answer) {
      this.showRewardIfEnabled();
    } else {
      // Incorrect, but for simplicity, just proceed or show message
      // For now, proceed
      this.next();
    }
  }

  next() {
    this.gameService.nextCalculation();
    if (this.gameService.isGameFinished()) {
      this.router.navigate(['/end']);
    } else {
      this.loadNextCalculation();
    }
  }

  private showRewardIfEnabled() {
    const image = this.gameService.getRandomRewardImage();
    if (image) {
      this.rewardImage.set(image);
      this.showReward.set(true);
      // Auto-hide after 2 seconds
      setTimeout(() => {
        this.showReward.set(false);
        this.next();
      }, 2000);
    } else {
      this.next();
    }
  }

  skip() {
    this.next();
  }
}