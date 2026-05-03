import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService, Category, Theme, GameConfig } from '../game.service';

@Component({
  selector: 'app-setup',
  imports: [FormsModule],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent {
  gameService = inject(GameService);
  categories = this.gameService.categories;
  themes = this.gameService.themes;
  private router = inject(Router);

  selectedCategories = signal<{ name: string; percentage: number }[]>([]);
  numberOfCalculations = signal(10);
  rewardEnabled = signal(false);
  selectedTheme = signal<string>('');
  selectedImages = signal<string[]>([]);

  get totalPercent(): number {
    return this.selectedCategories().reduce((sum, c) => sum + c.percentage, 0);
  }

  get percentageValid(): boolean {
    return this.selectedCategories().length === 0 || this.totalPercent === 100;
  }

  addCategory(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value && !this.selectedCategories().find(c => c.name === value)) {
      this.selectedCategories.update(cats => {
        const next = [...cats, { name: value, percentage: 0 }];
        return this.distributePercentages(next);
      });
    }
  }

  removeCategory(name: string) {
    this.selectedCategories.update(cats => {
      const next = cats.filter(c => c.name !== name);
      return next.length === 0 ? [] : this.distributePercentages(next);
    });
  }

  private distributePercentages(cats: { name: string; percentage: number }[]): { name: string; percentage: number }[] {
    if (cats.length === 0) return [];
    if (cats.length === 1) return [{ ...cats[0], percentage: 100 }];
    
    const percentage = 100 / cats.length;
    const result = cats.map((c, i) => ({
      ...c,
      percentage: i === cats.length - 1 ? 100 - (percentage * (cats.length - 1)) : percentage
    }));
    return result;
  }

  updatePercentage(name: string, percentage: number) {
    this.selectedCategories.update(cats =>
      cats.map(c => c.name === name ? { ...c, percentage } : c)
    );
  }

  onThemeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTheme.set(value);
    this.selectedImages.set([]);
  }

  onThemeSelect(themeName: string) {
    this.selectedTheme.set(themeName);
    this.selectedImages.set([]);
  }

  toggleImage(image: string) {
    const current = this.selectedImages();
    if (current.includes(image)) {
      this.selectedImages.set(current.filter(i => i !== image));
    } else if (current.length < 2) {
      this.selectedImages.set([...current, image]);
    }
  }

  getCategoryImage(categoryName: string): string | null {
    const category = this.categories().find(c => c.name === categoryName);
    if (category && category.image) {
      return `assets/images/categories/${category.image}.svg`;
    }
    return null;
  }

  startGame() {
    if (!this.percentageValid || this.selectedCategories().length === 0) {
      return;
    }

    const config: GameConfig = {
      numberOfCalculations: this.numberOfCalculations(),
      categories: this.selectedCategories(),
      rewardEnabled: this.rewardEnabled(),
      theme: this.selectedTheme(),
      selectedImages: this.selectedImages()
    };
    this.gameService.setGameConfig(config);
    this.router.navigate(['/game']);
  }
}