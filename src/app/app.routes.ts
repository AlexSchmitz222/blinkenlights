import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Blinkenlights',
    loadComponent: () => import('./components/start/start.component').then(m => m.StartComponent),
  },
  {
    path: 'show',
    title: 'Player · Blinkenlights',
    data: { chrome: false },
    loadComponent: () => import('./components/blinkenlights/blinkenlights.component').then(m => m.BlinkenlightsComponent),
  },
  {
    path: 'shapes',
    title: 'Shapes · Blinkenlights',
    loadComponent: () => import('./components/shape-list/shape-list.component').then(m => m.ShapeListComponent),
  },
  {
    path: 'shapes/:shapeId',
    title: 'Shape editor · Blinkenlights',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./components/shape-details/shape-details.component').then(m => m.ShapeDetailsComponent),
  },
  // Shows list/editor are added with the show model; until then send people to the start page.
  { path: 'shows', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
