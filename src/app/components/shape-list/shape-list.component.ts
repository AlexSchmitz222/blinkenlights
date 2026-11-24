import { Component, OnInit } from '@angular/core';
import { Shape } from '../../core/interfaces/shape.interface';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Shapes } from '../../shapes/shapes.shapes';

import { Pixel } from '../../core/interfaces/pixel.interface';
import { Grid } from '../../core/interfaces/grid.interface';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { ShapeService } from '../../core/services/shape.service';
import { GridService } from '../../core/services/grid.service';
import { StorageService } from '../../core/services/storage.service';
@Component({
  selector: 'app-shape-list',
  imports: [MatCardModule, MatChipsModule, MatButtonModule, RouterLink, MatToolbarModule, MatIconModule],
  templateUrl: './shape-list.component.html',
  styleUrl: './shape-list.component.scss'
})
export class ShapeListComponent implements OnInit {

  shapeList: Grid[] = [];

  constructor(private shapeService: ShapeService, private gridService: GridService, private storageService: StorageService) { }

  ngOnInit(): void {
    this.storageService.getShapes().forEach((shape) => {
      this.shapeList.push(this.shapeService.transformShapeToGrid(shape, shape.id, shape.description));
    });

  }

}
