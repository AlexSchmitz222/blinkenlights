import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { Shapes } from '../../shapes/shapes.shapes';
@Component({
  selector: 'app-start',
  imports: [
    RouterLink,
    MatButtonModule
  ],
  template: `<div>
              <button mat-raised-button routerLink="/show">Start!</button>
              <button mat-raised-button routerLink="/shapes">Shapes</button>
              <button mat-raised-button (click)="moveToLocalStorage()">Move to Local Storage</button>
            </div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
            div {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%; 
              display: flex;
              justify-content: center;
              align-items: center; 
              background-color: #000;
            }`
})
export class StartComponent {
  private storageService = inject(StorageService);

  shapes = Shapes;
  moveToLocalStorage() {
    this.storageService.storeShapes(this.shapes);
  }
}
