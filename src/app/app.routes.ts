import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Blinkenlights',
    loadComponent: () => import('./components/start/start.component').then(m => m.StartComponent),
  },
  {
    path: 'shows',
    title: 'Shows · Blinkenlights',
    loadComponent: () => import('./components/show-list/show-list.component').then(m => m.ShowListComponent),
  },
  {
    path: 'shows/:showId',
    title: 'Show editor · Blinkenlights',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./components/show-editor/show-editor.component').then(m => m.ShowEditorComponent),
  },
  {
    path: 'play/:showId',
    title: 'Player · Blinkenlights',
    data: { chrome: false },
    loadComponent: () => import('./components/player/player.component').then(m => m.PlayerComponent),
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
  { path: 'show', redirectTo: 'shows' },
  { path: '**', redirectTo: '' },
];
