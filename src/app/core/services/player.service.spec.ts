import { TestBed } from '@angular/core/testing';
import { PlayerService } from './player.service';
import { Show } from '../interfaces/show.interface';
import { Frame } from '../interfaces/frame.interface';

function frame(id: string, duration: number): Frame {
  return { id, duration, objects: [] };
}

function show(loop = false): Show {
  return {
    id: 'show',
    name: 'Test',
    description: '',
    size: { width: 4, height: 4 },
    loop,
    scenes: [
      { id: 's1', name: 'One', frames: [frame('a', 100), frame('b', 200)] },
      { id: 's2', name: 'Two', frames: [frame('c', 100)] },
    ],
  };
}

describe('PlayerService', () => {
  let player: PlayerService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [PlayerService] });
    player = TestBed.inject(PlayerService);
  });

  afterEach(() => vi.useRealTimers());

  it('flattens scenes into a timeline with start times', () => {
    player.load(show());
    expect(player.timeline().map(e => [e.frame.id, e.sceneIndex, e.start])).toEqual([
      ['a', 0, 0], ['b', 0, 100], ['c', 1, 300],
    ]);
    expect(player.totalDuration()).toBe(400);
  });

  it('advances after each frame duration and stops at the end', () => {
    player.load(show(), { autoplay: true });
    expect(player.current()?.frame.id).toBe('a');
    vi.advanceTimersByTime(100);
    expect(player.current()?.frame.id).toBe('b');
    vi.advanceTimersByTime(199);
    expect(player.current()?.frame.id).toBe('b');
    vi.advanceTimersByTime(1);
    expect(player.current()?.frame.id).toBe('c');
    expect(player.currentScene()?.name).toBe('Two');
    vi.advanceTimersByTime(100);
    expect(player.current()?.frame.id).toBe('c');
    expect(player.playing()).toBe(false);
  });

  it('loops when the show loops', () => {
    player.load(show(true), { autoplay: true });
    vi.advanceTimersByTime(400);
    expect(player.current()?.frame.id).toBe('a');
    expect(player.playing()).toBe(true);
  });

  it('loop override wins over the show setting', () => {
    player.load(show(true), { autoplay: true });
    player.loopOverride.set(false);
    vi.advanceTimersByTime(1000);
    expect(player.playing()).toBe(false);
  });

  it('pauses and resumes', () => {
    player.load(show(), { autoplay: true });
    player.pause();
    vi.advanceTimersByTime(1000);
    expect(player.current()?.frame.id).toBe('a');
    player.play();
    vi.advanceTimersByTime(100);
    expect(player.current()?.frame.id).toBe('b');
  });

  it('holds on frames with duration 0', () => {
    const s = show();
    s.scenes[0].frames[1].duration = 0;
    player.load(s, { autoplay: true });
    vi.advanceTimersByTime(100);
    expect(player.current()?.frame.id).toBe('b');
    vi.advanceTimersByTime(10_000);
    expect(player.current()?.frame.id).toBe('b');
    expect(player.playing()).toBe(false);
    player.play(); // continue past the held frame
    expect(player.current()?.frame.id).toBe('c');
    expect(player.playing()).toBe(true);
  });

  it('restarts from the beginning when play is pressed at the end', () => {
    player.load(show());
    player.seek(2);
    player.play();
    expect(player.current()?.frame.id).toBe('a');
  });

  it('steps, seeks and wraps when looping', () => {
    player.load(show(true));
    player.previous();
    expect(player.current()?.frame.id).toBe('c');
    player.next();
    expect(player.current()?.frame.id).toBe('a');
    player.seekScene(1);
    expect(player.current()?.frame.id).toBe('c');
    player.seek(99);
    expect(player.position()).toBe(2);
  });

  it('does nothing for an empty show', () => {
    player.load({ ...show(), scenes: [] });
    player.play();
    expect(player.playing()).toBe(false);
    expect(player.current()).toBeNull();
  });

  it('plays faster or slower with the speed setting', () => {
    player.load(show(), { autoplay: true });
    player.setSpeed(2);
    vi.advanceTimersByTime(50);
    expect(player.current()?.frame.id).toBe('b');
    player.setSpeed(0.5);
    vi.advanceTimersByTime(399);
    expect(player.current()?.frame.id).toBe('b');
    vi.advanceTimersByTime(1);
    expect(player.current()?.frame.id).toBe('c');
  });

  it('steps through the offered speeds and stops at the ends', () => {
    player.changeSpeed(1);
    expect(player.speed()).toBe(1.5);
    player.changeSpeed(1);
    player.changeSpeed(1);
    expect(player.speed()).toBe(2);
    for (let i = 0; i < 6; i++) player.changeSpeed(-1);
    expect(player.speed()).toBe(0.25);
  });
});
