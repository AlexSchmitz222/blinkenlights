import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Show } from '../interfaces/show.interface';
import { Frame } from '../interfaces/frame.interface';

export interface TimelineEntry {
  frame: Frame;
  sceneIndex: number;
  frameIndex: number;
  /** Start time within the show in ms (frames with duration 0 count as 0). */
  start: number;
}

/** Frames shorter than this are stretched; browsers can't reliably time faster than this. */
export const MIN_FRAME_DURATION = 20;

/**
 * Plays a show frame by frame. Not a root service: provide it per component
 * (`providers: [PlayerService]`) so the player and an editor preview don't share state.
 */
@Injectable()
export class PlayerService {
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly show = signal<Show | null>(null);
  /** Index into `timeline`. */
  readonly position = signal(0);
  readonly playing = signal(false);
  /** Overrides `show.loop` when set. */
  readonly loopOverride = signal<boolean | null>(null);

  readonly loop = computed(() => this.loopOverride() ?? this.show()?.loop ?? false);

  readonly timeline = computed<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    let start = 0;
    this.show()?.scenes.forEach((scene, sceneIndex) =>
      scene.frames.forEach((frame, frameIndex) => {
        entries.push({ frame, sceneIndex, frameIndex, start });
        start += frame.duration;
      }),
    );
    return entries;
  });

  readonly current = computed<TimelineEntry | null>(() => this.timeline()[this.position()] ?? null);
  readonly currentScene = computed(() => {
    const entry = this.current();
    return entry ? this.show()?.scenes[entry.sceneIndex] ?? null : null;
  });
  readonly frameCount = computed(() => this.timeline().length);
  readonly totalDuration = computed(() => this.timeline().reduce((sum, e) => sum + e.frame.duration, 0));
  readonly atEnd = computed(() => this.position() >= this.frameCount() - 1);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  load(show: Show | null, options: { autoplay?: boolean } = {}) {
    this.stop();
    this.show.set(show);
    if (options.autoplay && show) this.play();
  }

  /** Replace the show while keeping the position (used while editing). */
  update(show: Show) {
    this.show.set(show);
    if (this.position() >= this.frameCount()) this.position.set(Math.max(0, this.frameCount() - 1));
    if (this.playing()) this.schedule();
  }

  play() {
    if (this.frameCount() === 0) return;
    if (this.current()?.frame.duration === 0) {
      // Waiting on a hold frame: "play" means continue past it.
      if (!this.advance()) this.position.set(0);
    } else if (this.atEnd() && !this.loop()) {
      this.position.set(0);
    }
    this.playing.set(true);
    this.schedule();
  }

  pause() {
    this.playing.set(false);
    this.clearTimer();
  }

  toggle() {
    if (this.playing()) this.pause();
    else this.play();
  }

  stop() {
    this.pause();
    this.position.set(0);
  }

  next() {
    this.advance();
    if (this.playing()) this.schedule();
  }

  previous() {
    const count = this.frameCount();
    if (count === 0) return;
    const pos = this.position();
    this.position.set(pos > 0 ? pos - 1 : this.loop() ? count - 1 : 0);
    if (this.playing()) this.schedule();
  }

  seek(position: number) {
    const count = this.frameCount();
    if (count === 0) return;
    this.position.set(Math.min(count - 1, Math.max(0, Math.round(position))));
    if (this.playing()) this.schedule();
  }

  /** Jump to the first frame of a scene. */
  seekScene(sceneIndex: number) {
    const index = this.timeline().findIndex(e => e.sceneIndex === sceneIndex);
    if (index > -1) this.seek(index);
  }

  private schedule() {
    this.clearTimer();
    const entry = this.current();
    if (!this.playing() || !entry) return;
    // duration 0 = hold this frame until the user continues
    if (entry.frame.duration === 0) {
      this.playing.set(false);
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      const moved = this.advance();
      if (moved) this.schedule();
      else this.playing.set(false);
    }, Math.max(MIN_FRAME_DURATION, entry.frame.duration));
  }

  /** Moves one frame forward. Returns false when the end was reached and the show doesn't loop. */
  private advance(): boolean {
    const count = this.frameCount();
    if (count === 0) return false;
    const pos = this.position();
    if (pos < count - 1) {
      this.position.set(pos + 1);
      return true;
    }
    if (this.loop()) {
      this.position.set(0);
      return true;
    }
    return false;
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
