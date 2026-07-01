import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService, Category, Theme, GameConfig, Calculation } from '../game.service';

@Component({
  selector: 'app-setup',
  imports: [FormsModule],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css'],
})
export class SetupComponent {
  gameService = inject(GameService);
  categories = this.gameService.categories;
  themes = this.gameService.themes;
  private router = inject(Router);

  selectedCategories = signal<{ name: string; percentage: number }[]>([]);
  numberOfCalculations = signal(10);
  rewardEnabled = signal(false);
  showFinalScore = signal(true);
  sequencedMode = signal(false);
  selectedTheme = signal<string>('');
  selectedImages = signal<string[]>([]);
  selectedFeatures = signal<string[]>([]);

  ngOnInit() {
    const currentConfig = this.gameService.getCurrentConfig();
    if (currentConfig) {
      this.numberOfCalculations.set(currentConfig.numberOfCalculations);
      this.selectedCategories.set([...currentConfig.categories]);
      this.rewardEnabled.set(currentConfig.rewardEnabled);
      this.showFinalScore.set(currentConfig.showFinalScore);
      this.sequencedMode.set(currentConfig.sequencedMode ?? false);
      this.selectedTheme.set(currentConfig.theme ?? '');
      this.selectedImages.set([...currentConfig.selectedImages]);
    }
  }

  private normalizeFeature(feature: string): string {
    return feature.trim().toLocaleLowerCase();
  }

  get allFeatures(): string[] {
    const features = new Map<string, string>();
    this.categories().forEach((cat) => {
      cat.features?.forEach((f) => {
        const trimmed = f.trim();
        if (!trimmed) {
          return;
        }
        const normalized = this.normalizeFeature(trimmed);
        if (!features.has(normalized)) {
          features.set(normalized, trimmed);
        }
      });
    });
    return Array.from(features.values()).sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' }),
    );
  }

  get filteredCategories(): { name: string; calculations: Calculation[] }[] {
    if (this.selectedFeatures().length === 0) {
      return this.categories();
    }
    const selectedFeatures = new Set(this.selectedFeatures().map((f) => this.normalizeFeature(f)));
    return this.categories().filter(
      (cat) =>
        Array.from(selectedFeatures).every((selectedFeature) =>
          cat.features?.some((f) => this.normalizeFeature(f) === selectedFeature),
        ) ?? false,
    );
  }

  toggleFeature(feature: string) {
    const normalizedFeature = this.normalizeFeature(feature);
    if (!normalizedFeature) {
      return;
    }

    const current = this.selectedFeatures();
    const hasFeature = current.some((f) => this.normalizeFeature(f) === normalizedFeature);

    if (hasFeature) {
      this.selectedFeatures.set(
        current.filter((f) => this.normalizeFeature(f) !== normalizedFeature),
      );
    } else {
      this.selectedFeatures.set([...current, feature.trim()]);
    }
  }

  get totalPercent(): number {
    return this.selectedCategories().reduce((sum, c) => sum + c.percentage, 0);
  }

  get percentageValid(): boolean {
    return this.selectedCategories().length === 0 || this.totalPercent === 100;
  }

  addCategory(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value && !this.selectedCategories().find((c) => c.name === value)) {
      this.selectedCategories.update((cats) => {
        const next = [...cats, { name: value, percentage: 0 }];
        return this.distributePercentages(next);
      });
    }
    select.value = '';
  }

  removeCategory(name: string) {
    this.selectedCategories.update((cats) => {
      const next = cats.filter((c) => c.name !== name);
      return next.length === 0 ? [] : this.distributePercentages(next);
    });
  }

  private distributePercentages(
    cats: { name: string; percentage: number }[],
  ): { name: string; percentage: number }[] {
    if (cats.length === 0) return [];
    if (cats.length === 1) return [{ ...cats[0], percentage: 100 }];

    const percentage = 100 / cats.length;
    const result = cats.map((c, i) => ({
      ...c,
      percentage: i === cats.length - 1 ? 100 - percentage * (cats.length - 1) : percentage,
    }));
    return result;
  }

  updatePercentage(name: string, percentage: number) {
    this.selectedCategories.update((cats) =>
      cats.map((c) => (c.name === name ? { ...c, percentage } : c)),
    );
  }

  onThemeSelect(themeName: string) {
    this.selectedTheme.set(themeName);
    this.selectedImages.set([]);
  }

  toggleImage(image: string) {
    const current = this.selectedImages();
    if (current.includes(image)) {
      this.selectedImages.set(current.filter((i) => i !== image));
    } else if (current.length < 2) {
      this.selectedImages.set([...current, image]);
    }
  }

  getThemeImagePath(themeName: string, imageName: string): string {
    const filename = imageName.includes('.') ? imageName : `${imageName}.svg`;
    return `assets/images/themes/${themeName}/${filename}`;
  }

  startGame() {
    if (!this.percentageValid || this.selectedCategories().length === 0 || !this.selectedTheme()) {
      return;
    }

    const config: GameConfig = {
      numberOfCalculations: this.numberOfCalculations(),
      categories: this.selectedCategories(),
      rewardEnabled: this.rewardEnabled(),
      theme: this.selectedTheme(),
      selectedImages: this.selectedImages(),
      showFinalScore: this.showFinalScore(),
      sequencedMode: this.sequencedMode(),
    };
    this.gameService.setGameConfig(config);
    this.router.navigate(['/game']);
  }
}
