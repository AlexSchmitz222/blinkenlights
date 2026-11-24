import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlayerComponent } from './player.component';

describe('PlayerComponent', () => {
  let fixture: ComponentFixture<PlayerComponent>;

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PlayerComponent);
  });

  afterEach(() => vi.useRealTimers());

  it('autoplays a seeded demo show and renders its frame', () => {
    fixture.componentRef.setInput('showId', 'show_demo_berlin');
    fixture.detectChanges();
    const player = fixture.componentInstance.player;
    expect(player.playing()).toBe(true);
    expect(fixture.nativeElement.querySelector('.info .title').textContent).toContain('Hallo Berlin');

    vi.advanceTimersByTime(90 * 5);
    expect(player.position()).toBe(5);
  });

  it('shows a message for unknown shows', () => {
    fixture.componentRef.setInput('showId', 'nope');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("doesn't exist");
  });
});
