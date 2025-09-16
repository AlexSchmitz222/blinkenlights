import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShapeDetailsComponent } from './shape-details.component';

describe('ShapeDetailsComponent', () => {
  let component: ShapeDetailsComponent;
  let fixture: ComponentFixture<ShapeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShapeDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShapeDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
