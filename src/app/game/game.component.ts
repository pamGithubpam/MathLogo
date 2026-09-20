import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
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
export class GameComponent implements OnInit, OnDestroy {
  private gameService = inject(GameService);
  private router = inject(Router);

  currentCalculation = signal<Calculation | null>(null);
  userAnswer = signal('');
  showReward = signal(false);
  rewardImage = signal<string | null>(null);
  feedbackImage = signal<string | null>(null);
  feedbackMessage = signal('');
  isSequencedMode = signal(false);
  currentCategoryIndex = signal(0);
  numberOfCategories = signal(0);
  selectedCategories = signal<string[]>([]);
  showQuitPanel = signal(false);
  isSprintMode = signal(false);
  sprintTimeRemaining = signal(0);
  sprintCalculationsDone = signal(0);
  private sprintTimerHandle?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.isSequencedMode.set(this.gameService.isSequencedMode());
    this.numberOfCategories.set(this.gameService.getNumberOfCategories());
    this.isSprintMode.set(this.gameService.isSprintMode());

    if (this.isSequencedMode()) {
      const categories = this.gameService.getConfiguredCategories();
      this.selectedCategories.set(categories.map((c) => c.name));
      this.currentCategoryIndex.set(this.gameService.getCurrentCategoryIndex());
    }

    if (this.isSprintMode()) {
      this.sprintTimeRemaining.set(this.gameService.getSprintDurationSeconds());
      this.startSprintTimer();
    }

    this.loadNextCalculation();
  }

  ngOnDestroy() {
    this.stopSprintTimer();
  }

  private startSprintTimer() {
    this.sprintTimerHandle = setInterval(() => {
      this.sprintTimeRemaining.update((t) => t - 1);
      if (this.sprintTimeRemaining() <= 0) {
        this.stopSprintTimer();
        this.gameService.endSprint();
        this.router.navigate(['/end']);
      }
    }, 1000);
  }

  private stopSprintTimer() {
    if (this.sprintTimerHandle) {
      clearInterval(this.sprintTimerHandle);
      this.sprintTimerHandle = undefined;
    }
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

  nextSprint() {
    this.gameService.nextCalculation();
    this.sprintCalculationsDone.set(this.gameService.getSprintCalculationsCount());
    this.loadNextCalculation();
  }

  quitGame() {
    this.showQuitPanel.set(true);
  }

  restartSameConfig() {
    this.gameService.restartGameWithSameConfig();
    this.showQuitPanel.set(false);
    this.sprintCalculationsDone.set(0);
    if (this.isSprintMode()) {
      this.stopSprintTimer();
      this.sprintTimeRemaining.set(this.gameService.getSprintDurationSeconds());
      this.startSprintTimer();
    }
    this.loadNextCalculation();
  }

  returnToConfig() {
    this.showQuitPanel.set(false);
    this.router.navigate(['/setup']);
  }

  newGame() {
    this.gameService.resetGame();
    this.showQuitPanel.set(false);
    this.router.navigate(['/setup']);
  }

  closeCancelQuitPanel() {
    this.showQuitPanel.set(false);
  }

  switchToCategory(categoryIndex: number) {
    if (this.isSequencedMode()) {
      this.gameService.switchToCategory(categoryIndex);
      this.currentCategoryIndex.set(categoryIndex);
      this.loadNextCalculation();
    }
  }

  switchToMixedMode() {
    if (this.isSequencedMode()) {
      this.gameService.switchToMixedMode();
      this.currentCategoryIndex.set(-1);
      this.loadNextCalculation();
    }
  }
}
