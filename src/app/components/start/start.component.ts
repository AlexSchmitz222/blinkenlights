import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-start',
  imports: [
    RouterLink,
    MatButtonModule
  ],
  template: `<div>
              <button mat-raised-button routerLink="/show">Start!</button>
            </div>`,
  styles: `
            div {
              width: 100%;
              height: 100%; 
              display: flex;
              justify-content: center;
              align-items: center; 
            }`
})
export class StartComponent {

}
