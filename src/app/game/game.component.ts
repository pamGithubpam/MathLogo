import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService, Calculation } from '../game.service';

@Component({
  selector: 'app-game',
  imports: [CommonModule, FormsModule],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  private gameService = inject(GameService);
  private router = inject(Router);

  currentCalculation = signal<Calculation | null>(null);
  userAnswer = signal('');
  showReward = signal(false);
  rewardImage = signal<string | null>(null);
  feedbackImage = signal<string | null>(null);
  feedbackMessage = signal('');

  ngOnInit() {
    this.loadNextCalculation();
  }

  loadNextCalculation() {
    this.currentCalculation.set(this.gameService.getCurrentCalculation());
    this.userAnswer.set('');
    this.showReward.set(false);
    this.rewardImage.set(null);
    this.feedbackImage.set(null);
    this.feedbackMessage.set('');
  }

  addDigit(value: string) {
    this.userAnswer.set(`${this.userAnswer()}${value}`);
  }

  deleteDigit() {
    this.userAnswer.set(this.userAnswer().slice(0, -1));
  }

  clearAnswer() {
    this.userAnswer.set('');
  }

  submitAnswer() {
    const calc = this.currentCalculation();
    if (!calc) return;

    const correct = this.gameService.submitAnswer(this.userAnswer());
    this.feedbackImage.set(this.gameService.getThemeFeedbackImage(correct));
    this.feedbackMessage.set(correct ? 'Bonne réponse !' : 'Mauvaise réponse.');

    if (correct || !calc.answer) {
      this.showRewardIfEnabled();
    } else {
      setTimeout(() => this.next(), 1500);
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
      // Leave the theme feedback visible first, then show the reward.
      setTimeout(() => {
        this.showReward.set(true);
        setTimeout(() => {
          this.showReward.set(false);
          this.next();
        }, 2000);
      }, 1500);
    } else {
      setTimeout(() => this.next(), 1500);
    }
  }

  skip() {
    this.next();
  }

  quitGame() {
    this.router.navigate(['/setup']);
  }
}
