import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShowListComponent } from './show-list.component';

describe('ShowListComponent', () => {
  let fixture: ComponentFixture<ShowListComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ShowListComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ShowListComponent);
    fixture.detectChanges();
  });

  it('lists the demo shows with stats', () => {
    const cards = fixture.nativeElement.querySelectorAll('.card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Blinkenlights');
    expect(fixture.nativeElement.textContent).toMatch(/\d+ frames/);
  });
});
