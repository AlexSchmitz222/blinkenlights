import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-start',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page hero">
      <h1>blinkenlights</h1>
      <p class="muted">
        A digital homage to the Blinkenlights installation by the Chaos Computer Club (Berlin, 2001):
        build little light shows out of pixels, frames and scenes, and play them back on a virtual house front.
      </p>
      <div class="actions">
        <a matButton="filled" routerLink="/shows"><mat-icon svgIcon="movie-open-outline" />Shows</a>
        <a matButton="outlined" routerLink="/shapes"><mat-icon svgIcon="shape-outline" />Shapes</a>
      </div>
    </section>
  `,
  styles: `
    .hero {
      max-width: 720px;
      padding-top: 15vh;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    h1 {
      font-size: clamp(32px, 6vw, 56px);
      font-weight: 700;
      letter-spacing: -0.04em;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
  `,
})
export class StartComponent {}
