import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { createEmptyGrid, Grid } from '../../core/interfaces/grid.interface';
import { ShapeService } from '../../core/services/shape.service';
import { createEmptyShape, Shape } from '../../core/interfaces/shape.interface';

import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BasicDialogService } from '../../core/services/basic-dialog.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-shape-details',
  imports: [MatToolbarModule, RouterLink, MatButtonModule, MatInputModule, MatFormFieldModule, FormsModule, MatChipsModule, MatSliderModule, MatSlideToggleModule, MatSidenavModule, MatDividerModule],
  templateUrl: './shape-details.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './shape-details.component.scss'
})
export class ShapeDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shapeService = inject(ShapeService);
  private basicDialogService = inject(BasicDialogService);
  private storageService = inject(StorageService);

  sliderParams: {
    width: { min: number, max: number },
    height: { min: number, max: number }
  } = {
      width: { min: 2, max: 10 },
      height: { min: 2, max: 10 }
    };

  invert: boolean = false
  shapeId: string | null = null;
  shape: Shape = createEmptyShape();
  grid: Grid = createEmptyGrid();
  ngOnInit() {
    this.shapeId = this.route.snapshot.paramMap.get('shapeId');
    if (this.shapeId == 'new') {
      this.shape.size.width = this.sliderParams.width.min;
      this.shape.size.height = this.sliderParams.height.min;
      this.shape.id = 'New Shape'
      this.shape.pattern.push({ position: { x: 0, y: 0 }, active: false })
      this.grid = this.shapeService.transformShapeToGrid(this.shape, this.shape.id)
    } else {
      if (this.shapeId != null) {
        let shape = this.storageService.getShape(this.shapeId);
        if (shape) {
          this.shape = shape;
          this.grid = this.shapeService.transformShapeToGrid(this.shape, this.shape.id)
        }

      }
    }
    this.updateMinGridSize();
  }

  updateGrid(updateShape: boolean = false) {
    if (updateShape) {
      this.shape = this.shapeService.transformGridToShape(this.grid, this.shape.id, this.shape.description);
    }
    this.grid = this.shapeService.transformShapeToGrid(this.shape, this.shape.id);
    this.updateMinGridSize()
  }

  updateMinGridSize() {
    let minSize = this.shapeService.getShapeRequiredSize(this.shape)
    this.sliderParams.width.min = minSize.width < 2 ? 2 : minSize.width;
    this.sliderParams.height.min = minSize.height < 2 ? 2 : minSize.height;
  }

  invertShape() {
    this.invert = !this.invert;
    this.shape = this.shapeService.invertShape(this.shape);
    this.grid = this.shapeService.transformShapeToGrid(this.shape, this.shape.id);
    this.updateMinGridSize();
  }

  clearGrid() {
    this.basicDialogService.showBooleanDialog("Really...?", "Do you really want to clear the shape?").subscribe((result) => {
      if (result) {
        this.shape.pattern = [];
        this.updateGrid();
      }
    })

  }

  changeShapeName() {
    this.basicDialogService.showInputDialog({ title: "Rename shape", label: "Name", value: this.shape.id }).subscribe((result) => {
      if (result) {
        this.shape.id = result;
        this.updateGrid(true);
      }
    })
  }

  changeShapeDescription() {
    this.basicDialogService.showInputDialog({ title: "Edit description", label: "Description", value: this.shape.description, multiline: true }).subscribe((result) => {
      if (result) {
        this.shape.description = result;
        this.updateGrid(true);
      }
    })
  }

  saveShape() {
    this.storageService.storeShape(this.shape);
  
  }

}
