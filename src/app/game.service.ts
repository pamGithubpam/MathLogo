import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Calculation {
  text: string;
  answer?: string;
}

export interface Category {
  name: string;
  image?: string;
  features?: string[];
  calculations: Calculation[];
}

export interface Theme {
  name: string;
  images: string[];
  feedback?: { correct: string; wrong: string };
}

export interface GameConfig {
  numberOfCalculations: number;
  categories: { name: string; percentage: number }[];
  rewardEnabled: boolean;
  theme?: string;
  selectedImages: string[];
  showFinalScore: boolean;
  sequencedMode?: boolean;
  sprintMode?: boolean;
  sprintDurationSeconds?: number;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private _calculations = signal<Category[]>([]);
  private _themes = signal<Theme[]>([]);
  readonly categories = this._calculations;
  readonly themes = this._themes;
  private gameConfig = signal<GameConfig | null>(null);
  private currentCalculations = signal<Calculation[]>([]);
  private currentIndex = signal(0);
  private score = signal(0);
  private currentCategoryIndex = signal(0);
  private calculationsByCategory = signal<Calculation[][]>([]);
  private totalCalculationsCount = signal(0);
  private processedCalculationsCount = signal(0);
  private sprintEnded = signal(false);
  private static readonly SPRINT_BUFFER_SIZE = 60;

  constructor(private http: HttpClient) {
    this.loadData();
  }

  private loadData() {
    this.http.get<{ categories: Category[] }>('assets/data/calculations.json').subscribe({
      next: (data) => {
        console.log('Loaded categories', data.categories.length);
        this._calculations.set(data.categories);
      },
      error: (error) => {
        console.error('Failed to load categories', error);
      },
    });
    this.http.get<{ themes: Theme[] }>('assets/data/themes.json').subscribe({
      next: (data) => {
        console.log('Loaded themes', data.themes.length);
        this._themes.set(data.themes);
      },
      error: (error) => {
        console.error('Failed to load themes', error);
      },
    });
  }

  getCategories(): Category[] {
    return this._calculations();
  }

  getThemes(): Theme[] {
    return this._themes();
  }

  setGameConfig(config: GameConfig) {
    this.gameConfig.set(config);
    this.generateCalculations();
  }

  getCurrentConfig(): GameConfig | null {
    return this.gameConfig();
  }

  private generateCalculations() {
    const config = this.gameConfig()!;

    this.sprintEnded.set(false);

    if (config.sprintMode && config.sequencedMode) {
      this.generateSprintSequencedCalculations(config);
    } else if (config.sprintMode) {
      this.generateSprintCalculations(config);
    } else if (config.sequencedMode) {
      this.generateSequencedCalculations(config);
    } else {
      this.generateMixedCalculations(config);
    }

    this.currentIndex.set(0);
    this.score.set(0);
    this.processedCalculationsCount.set(0);
    this.currentCategoryIndex.set(0);
  }

  private buildCalculationsBatch(config: GameConfig, count: number): Calculation[] {
    const allCalcs: Calculation[] = [];
    config.categories.forEach((catConfig) => {
      const category = this._calculations().find((c) => c.name === catConfig.name);
      if (category && category.calculations.length > 0) {
        const num = Math.max(1, Math.round((catConfig.percentage / 100) * count));
        const selected: Calculation[] = [];
        while (selected.length < num) {
          const remaining = num - selected.length;
          selected.push(...this.shuffle(category.calculations).slice(0, remaining));
        }
        allCalcs.push(...selected);
      }
    });
    return this.shuffle(allCalcs);
  }

  private generateMixedCalculations(config: GameConfig) {
    const shuffled = this.buildCalculationsBatch(config, config.numberOfCalculations).slice(
      0,
      config.numberOfCalculations,
    );
    this.currentCalculations.set(shuffled);
    this.totalCalculationsCount.set(shuffled.length);
    this.calculationsByCategory.set([]);
  }

  private generateSprintCalculations(config: GameConfig) {
    const initial = this.buildCalculationsBatch(config, GameService.SPRINT_BUFFER_SIZE);
    this.currentCalculations.set(initial);
    this.totalCalculationsCount.set(0);
    this.calculationsByCategory.set([]);
  }

  private buildCategoryBatch(categoryName: string, count: number): Calculation[] {
    const category = this._calculations().find((c) => c.name === categoryName);
    if (!category || category.calculations.length === 0) {
      return [];
    }
    const selected: Calculation[] = [];
    while (selected.length < count) {
      selected.push(...this.shuffle(category.calculations).slice(0, count - selected.length));
    }
    return selected;
  }

  private generateSprintSequencedCalculations(config: GameConfig) {
    const byCategory = config.categories.map((catConfig) =>
      this.buildCategoryBatch(catConfig.name, GameService.SPRINT_BUFFER_SIZE),
    );
    this.calculationsByCategory.set(byCategory);
    this.totalCalculationsCount.set(0);
    this.currentCalculations.set(byCategory.length > 0 ? byCategory[0] : []);
  }

  private generateSequencedCalculations(config: GameConfig) {
    const allCalcsByCategory: Calculation[][] = [];
    let total = 0;
    config.categories.forEach((catConfig) => {
      const category = this._calculations().find((c) => c.name === catConfig.name);
      if (category) {
        const num = Math.round((catConfig.percentage / 100) * config.numberOfCalculations);
        const selected = this.shuffle(category.calculations).slice(0, num);
        allCalcsByCategory.push(selected);
        total += selected.length;
      }
    });

    this.calculationsByCategory.set(allCalcsByCategory);
    this.totalCalculationsCount.set(total);
    // Initialize with calculations from the first category
    if (allCalcsByCategory.length > 0) {
      this.currentCalculations.set(allCalcsByCategory[0]);
    } else {
      this.currentCalculations.set([]);
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getCurrentCalculation(): Calculation | null {
    const calcs = this.currentCalculations();
    const index = this.currentIndex();
    return index < calcs.length ? calcs[index] : null;
  }

  submitAnswer(answer: string): boolean {
    const calc = this.getCurrentCalculation();
    if (calc && calc.answer) {
      const correct = answer.trim() === calc.answer;
      if (correct) {
        this.score.update((s) => s + 1);
      }
      return correct;
    }
    return true; // No answer needed
  }

  nextCalculation() {
    this.currentIndex.update((i) => i + 1);
    this.processedCalculationsCount.update((c) => c + 1);

    if (this.isSprintMode() && this.currentIndex() >= this.currentCalculations().length) {
      this.replenishSprintCalculations();
    }
  }

  private replenishSprintCalculations() {
    const config = this.gameConfig();
    if (!config) return;

    if (this.isSequencedMode()) {
      const categoryIndex = this.currentCategoryIndex();
      if (categoryIndex >= 0 && categoryIndex < this.calculationsByCategory().length) {
        const catConfig = config.categories[categoryIndex];
        const more = this.buildCategoryBatch(catConfig.name, GameService.SPRINT_BUFFER_SIZE);
        this.calculationsByCategory.update((cats) => {
          const next = [...cats];
          next[categoryIndex] = [...next[categoryIndex], ...more];
          return next;
        });
        this.currentCalculations.set(this.calculationsByCategory()[categoryIndex]);
        return;
      }
    }

    const more = this.buildCalculationsBatch(config, GameService.SPRINT_BUFFER_SIZE);
    this.currentCalculations.update((calcs) => [...calcs, ...more]);
  }

  isGameFinished(): boolean {
    if (this.isSprintMode()) {
      return this.sprintEnded();
    }

    if (!this.isSequencedMode()) {
      return this.currentIndex() >= this.currentCalculations().length;
    }

    // In sequenced mode, game is finished only if we're at the last category
    // and we've completed all calculations in that category
    const isLastCategory = this.currentCategoryIndex() >= this.calculationsByCategory().length - 1;
    const isCurrentCategoryComplete = this.currentIndex() >= this.currentCalculations().length;

    return isLastCategory && isCurrentCategoryComplete;
  }

  endSprint() {
    this.sprintEnded.set(true);
  }

  isSprintMode(): boolean {
    return this.gameConfig()?.sprintMode ?? false;
  }

  getSprintDurationSeconds(): number {
    return this.gameConfig()?.sprintDurationSeconds ?? 60;
  }

  getSprintCalculationsCount(): number {
    return this.processedCalculationsCount();
  }

  getScore(): number {
    return this.score();
  }

  getTotalCalculations(): number {
    return this.totalCalculationsCount();
  }

  showFinalScore(): boolean {
    return this.gameConfig()?.showFinalScore ?? true;
  }

  private toThemeImageFilename(imageName: string): string {
    return imageName.includes('.') ? imageName : `${imageName}.svg`;
  }

  getRandomRewardImage(): string | null {
    const config = this.gameConfig();
    const themeName = config?.theme;
    if (config?.rewardEnabled && themeName && config.selectedImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * config.selectedImages.length);
      const imageName = config.selectedImages[randomIndex];
      return `assets/images/themes/${themeName}/${this.toThemeImageFilename(imageName)}`;
    }
    return null;
  }

  getThemeFeedbackImage(correct: boolean): string | null {
    const config = this.gameConfig();
    const themeName = config?.theme;
    if (!themeName) {
      return null;
    }
    const theme = this._themes().find((t) => t.name === themeName);
    if (!theme) {
      return null;
    }
    const imageName = correct
      ? (theme.feedback?.correct ?? 'correct')
      : (theme.feedback?.wrong ?? 'wrong');
    return `assets/images/themes/${themeName}/${this.toThemeImageFilename(imageName)}`;
  }

  resetGame() {
    this.gameConfig.set(null);
    this.currentCalculations.set([]);
    this.currentIndex.set(0);
    this.score.set(0);
    this.processedCalculationsCount.set(0);
    this.currentCategoryIndex.set(0);
    this.calculationsByCategory.set([]);
    this.totalCalculationsCount.set(0);
    this.sprintEnded.set(false);
  }

  restartGameWithSameConfig() {
    if (this.gameConfig()) {
      this.generateCalculations();
    }
  }

  isSequencedMode(): boolean {
    return this.gameConfig()?.sequencedMode ?? false;
  }

  getCurrentCategoryIndex(): number {
    return this.currentCategoryIndex();
  }

  getNumberOfCategories(): number {
    return this.calculationsByCategory().length;
  }

  switchToCategory(categoryIndex: number) {
    if (categoryIndex >= 0 && categoryIndex < this.calculationsByCategory().length) {
      this.currentCategoryIndex.set(categoryIndex);
      this.currentCalculations.set(this.calculationsByCategory()[categoryIndex]);
      this.currentIndex.set(0);
    }
  }

  switchToMixedMode() {
    const config = this.gameConfig();
    if (config && this.isSequencedMode()) {
      if (this.isSprintMode()) {
        this.currentCalculations.set(
          this.buildCalculationsBatch(config, GameService.SPRINT_BUFFER_SIZE),
        );
      } else {
        // Generate mixed calculations from all categories
        this.generateMixedCalculations(config);
      }
      this.currentCategoryIndex.set(-1);
      this.currentIndex.set(0);
    }
  }

  getConfiguredCategories(): { name: string; percentage: number }[] {
    return this.gameConfig()?.categories ?? [];
  }
}
