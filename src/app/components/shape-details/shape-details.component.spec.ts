import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ShapeDetailsComponent } from './shape-details.component';

describe('ShapeDetailsComponent', () => {
  let component: ShapeDetailsComponent;
  let fixture: ComponentFixture<ShapeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShapeDetailsComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShapeDetailsComponent);
    fixture.componentRef.setInput('shapeId', 'new');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create a new, untouched shape', () => {
    expect(component).toBeTruthy();
    expect(component.shape()?.name).toBeTruthy();
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('becomes dirty after drawing and clean after saving', () => {
    component.onPixel({ x: 1, y: 1, phase: 'start', button: 0 });
    expect(component.activeCount()).toBe(1);
    expect(component.hasUnsavedChanges()).toBe(true);
    component.save();
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(component.shape()?.id).toMatch(/^shape_/);
  });

  it('erases along a stroke that started on a lit pixel', () => {
    component.onPixel({ x: 0, y: 0, phase: 'start', button: 0 });
    component.onPixel({ x: 1, y: 0, phase: 'start', button: 0 });
    component.onPixel({ x: 0, y: 0, phase: 'start', button: 0 }); // starts on lit → erase stroke
    component.onPixel({ x: 1, y: 0, phase: 'move', button: 0 });
    expect(component.activeCount()).toBe(0);
  });

  it('does not shrink below the drawn pixels', () => {
    component.onPixel({ x: 5, y: 5, phase: 'start', button: 0 });
    component.setSize('width', 2);
    expect(component.shape()?.size.width).toBe(6);
  });
});
