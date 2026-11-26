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

  describe('drawing tools', () => {
    const lit = () => component.activeCount();
    const down = (x: number, y: number, button = 0) => component.onPixel({ x, y, phase: 'start', button });
    const move = (x: number, y: number, button = 0) => component.onPixel({ x, y, phase: 'move', button });
    const up = () => component.onPixelEnd();

    it('previews a line while dragging and keeps only the final one', () => {
      component.setTool('line');
      down(0, 0);
      move(7, 0);
      expect(lit()).toBe(8);
      move(3, 0); // dragging back shrinks the preview
      expect(lit()).toBe(4);
      up();
      expect(lit()).toBe(4);
    });

    it('draws outlined and filled rectangles', () => {
      component.setTool('rect');
      down(0, 0); move(3, 2); up();
      expect(lit()).toBe(10); // 4×3 outline
      component.setTool('rectFilled');
      down(5, 5); move(6, 6); up();
      expect(lit()).toBe(14);
    });

    it('erases with the right mouse button', () => {
      component.setTool('rectFilled');
      down(0, 0); move(3, 3); up();
      component.setTool('line');
      down(0, 0, 2); move(3, 0, 2); up();
      expect(lit()).toBe(12);
    });

    it('fills a closed area', () => {
      component.setTool('rect');
      down(0, 0); move(4, 4); up(); // 5×5 outline = 16 pixels
      component.setTool('fill');
      down(2, 2); up();
      expect(lit()).toBe(25);
    });

    it('undoes a whole stroke in one step and redoes it', () => {
      down(0, 0); move(1, 0); move(2, 0); up(); // pencil stroke of 3 pixels
      down(5, 5); up();
      expect(lit()).toBe(4);
      component.undo();
      expect(lit()).toBe(3);
      component.undo();
      expect(lit()).toBe(0);
      expect(component.canUndo()).toBe(false);
      component.redo();
      expect(lit()).toBe(3);
    });

    it('switches tools with the keyboard', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
      expect(component.tool()).toBe('line');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
      expect(component.tool()).toBe('fill');
    });
  });
});
