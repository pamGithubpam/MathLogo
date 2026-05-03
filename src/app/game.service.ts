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
  calculations: Calculation[];
}

export interface Theme {
  name: string;
  images: string[];
}

export interface GameConfig {
  numberOfCalculations: number;
  categories: { name: string; percentage: number }[];
  rewardEnabled: boolean;
  theme?: string;
  selectedImages: string[];
}

@Injectable({
  providedIn: 'root'
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

  constructor(private http: HttpClient) {
    this.loadData();
  }

  private loadData() {
    this.http.get<{ categories: Category[] }>('assets/data/calculations.json').subscribe({
      next: data => {
        console.log('Loaded categories', data.categories.length);
        this._calculations.set(data.categories);
      },
      error: error => {
        console.error('Failed to load categories', error);
      }
    });
    this.http.get<{ themes: Theme[] }>('assets/data/themes.json').subscribe({
      next: data => {
        console.log('Loaded themes', data.themes.length);
        this._themes.set(data.themes);
      },
      error: error => {
        console.error('Failed to load themes', error);
      }
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

  private generateCalculations() {
    const config = this.gameConfig()!;
    const allCalcs: Calculation[] = [];
    config.categories.forEach(catConfig => {
      const category = this._calculations().find(c => c.name === catConfig.name);
      if (category) {
        const num = Math.round((catConfig.percentage / 100) * config.numberOfCalculations);
        const selected = this.shuffle(category.calculations).slice(0, num);
        allCalcs.push(...selected);
      }
    });
    this.currentCalculations.set(this.shuffle(allCalcs).slice(0, config.numberOfCalculations));
    this.currentIndex.set(0);
    this.score.set(0);
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
        this.score.update(s => s + 1);
      }
      return correct;
    }
    return true; // No answer needed
  }

  nextCalculation() {
    this.currentIndex.update(i => i + 1);
  }

  isGameFinished(): boolean {
    return this.currentIndex() >= this.currentCalculations().length;
  }

  getScore(): number {
    return this.score();
  }

  getTotalCalculations(): number {
    return this.currentCalculations().length;
  }

  getRandomRewardImage(): string | null {
    const config = this.gameConfig();
    if (config?.rewardEnabled && config.selectedImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * config.selectedImages.length);
      return config.selectedImages[randomIndex];
    }
    return null;
  }

  resetGame() {
    this.gameConfig.set(null);
    this.currentCalculations.set([]);
    this.currentIndex.set(0);
    this.score.set(0);
  }
}