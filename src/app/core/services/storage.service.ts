import { Injectable } from '@angular/core';
import { Shape } from '../interfaces/shape.interface';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() { }

  getShapes(): Shape[] {
    const shapes = localStorage.getItem('shapes');
    return shapes ? JSON.parse(shapes) : [];
  }

  storeShapes(shapes: Shape[]): void {
    localStorage.setItem('shapes', JSON.stringify(shapes));
  }

  getShape(id: string): Shape | null {
    const shapes = this.getShapes();
    return shapes.find(shape => shape.id === id) || null;
  }

  storeShape(shape: Shape): void {
    const shapes = this.getShapes();
    const existingIndex = shapes.findIndex(s => s.id === shape.id);
    if (existingIndex > -1) {
      shapes[existingIndex] = shape; // Update existing shape
    } else {
      shapes.push(shape); // Add new shape
    }
    this.storeShapes(shapes);
  }

}
