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
  'content-cut',
  'content-duplicate',
  'content-paste',
  'content-save',
  'creation',
  'cursor-move',
  'delete',
  'dots-vertical',
  'download',
  'drag',
  'eraser',
  'file-gif-box',
  'filmstrip',
  'flip-horizontal',
  'flip-vertical',
  'format-color-fill',
  'format-text',
  'fullscreen',
  'fullscreen-exit',
  'grid',
  'home-outline',
  'image-plus',
  'information-outline',
  'invert-colors',
  'keyboard-outline',
  'layers-outline',
  'magic-staff',
  'minus',
  'movie-open-outline',
  'pause',
  'pencil',
  'play',
  'plus',
  'rectangle',
  'rectangle-outline',
  'redo',
  'repeat',
  'repeat-off',
  'shape-outline',
  'skip-next',
  'skip-previous',
  'speedometer',
  'step-backward',
  'step-forward',
  'stop',
  'text-box-outline',
  'theme-light-dark',
  'timer-outline',
  'transition',
  'translate',
  'undo',
  'upload',
  'vector-line',
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
