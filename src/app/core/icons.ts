import { inject, provideAppInitializer } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Icons from Material Design Icons (https://pictogrammers.com/library/mdi/), stored as SVG files in
 * `public/icons/`. To add one: download `<name>.svg` from pictogrammers into that folder and add the
 * name here. Use it with `<mat-icon svgIcon="<name>" />`.
 */
export const ICONS = [
  'alert-outline',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'bug-outline',
  'check',
  'chevron-down',
  'chevron-right',
  'close',
  'content-copy',
  'content-save',
  'cursor-move',
  'delete',
  'dots-vertical',
  'download',
  'drag',
  'eraser',
  'filmstrip',
  'flip-horizontal',
  'flip-vertical',
  'format-text',
  'fullscreen',
  'fullscreen-exit',
  'grid',
  'home-outline',
  'information-outline',
  'invert-colors',
  'layers-outline',
  'magic-staff',
  'minus',
  'movie-open-outline',
  'pause',
  'pencil',
  'play',
  'plus',
  'redo',
  'repeat',
  'repeat-off',
  'shape-outline',
  'skip-next',
  'skip-previous',
  'step-backward',
  'step-forward',
  'stop',
  'text-box-outline',
  'theme-light-dark',
  'timer-outline',
  'undo',
  'upload',
  'weather-night',
  'white-balance-sunny',
  'window-closed-variant',
] as const;

export type IconName = (typeof ICONS)[number];

export function provideIcons() {
  return provideAppInitializer(() => {
    const registry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (const name of ICONS) {
      registry.addSvgIcon(name, sanitizer.bypassSecurityTrustResourceUrl(`icons/${name}.svg`));
    }
  });
}
