import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BlinkenlightsComponent } from './blinkenlights.component';

describe('BlinkenlightsComponent', () => {
  let component: BlinkenlightsComponent;
  let fixture: ComponentFixture<BlinkenlightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlinkenlightsComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlinkenlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
