import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/setup', pathMatch: 'full' },
  { path: 'setup', loadComponent: () => import('./setup/setup.component').then(m => m.SetupComponent) },
  { path: 'game', loadComponent: () => import('./game/game.component').then(m => m.GameComponent) },
  { path: 'end', loadComponent: () => import('./end/end.component').then(m => m.EndComponent) }
];
