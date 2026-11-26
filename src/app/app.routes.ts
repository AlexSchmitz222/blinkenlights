import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

/** Route titles are translation keys (see TranslatedTitleStrategy). */
export const routes: Routes = [
  {
    path: '',
    title: 'titles.home',
    loadComponent: () => import('./components/start/start.component').then(m => m.StartComponent),
  },
  {
    path: 'shows',
    title: 'titles.shows',
    loadComponent: () => import('./components/show-list/show-list.component').then(m => m.ShowListComponent),
  },
  {
    path: 'shows/:showId',
    title: 'titles.showEditor',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./components/show-editor/show-editor.component').then(m => m.ShowEditorComponent),
  },
  {
    path: 'share',
    title: 'titles.share',
    loadComponent: () => import('./components/share/share-view.component').then(m => m.ShareViewComponent),
  },
  {
    path: 'play/:showId',
    title: 'titles.player',
    data: { chrome: false },
    loadComponent: () => import('./components/player/player.component').then(m => m.PlayerComponent),
  },
  {
    path: 'shapes',
    title: 'titles.shapes',
    loadComponent: () => import('./components/shape-list/shape-list.component').then(m => m.ShapeListComponent),
  },
  {
    path: 'shapes/:shapeId',
    title: 'titles.shapeEditor',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./components/shape-details/shape-details.component').then(m => m.ShapeDetailsComponent),
  },
  { path: 'show', redirectTo: 'shows' },
  { path: '**', redirectTo: '' },
];
