import { I18nService } from '../../core/i18n/i18n.service';
import { StorageService } from '../../core/services/storage.service';

/** Confirmation text for deleting a shape, naming the shows that use it. */
export function shapeDeletionMessage(i18n: I18nService, storage: StorageService, shapeId: string): string {
  const shows = storage.showsUsingShape(shapeId);
  if (shows.length === 0) return i18n.t('common.cannotBeUndone');
  const quoted = shows.slice(0, 3).map(s => `"${s.name}"`).join(', ');
  const names = shows.length > 3 ? i18n.t('shapes.andMore', { names: quoted, count: shows.length - 3 }) : quoted;
  return i18n.t('shapes.usedIn', { names, count: shows.length });
}
