import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeMode, ThemeService } from './core/theme/theme.service';
import { LogoComponent } from './shared/logo/logo.component';

@Component({
  selector: 'app-root',
  imports: [LogoComponent, RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly theme = inject(ThemeService);

  readonly themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'system', label: 'System', icon: 'theme-light-dark' },
    { mode: 'light', label: 'Light', icon: 'white-balance-sunny' },
    { mode: 'dark', label: 'Dark', icon: 'weather-night' },
  ];

  readonly themeIcon = computed(() => this.themeOptions.find(o => o.mode === this.theme.mode())!.icon);

  /** Routes can set `data: { chrome: false }` to hide the toolbar (e.g. the fullscreen player). */
  readonly showChrome = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => {
        let r = this.route;
        while (r.firstChild) r = r.firstChild;
        return r.snapshot.data['chrome'] !== false;
      }),
    ),
    { initialValue: true },
  );
}
