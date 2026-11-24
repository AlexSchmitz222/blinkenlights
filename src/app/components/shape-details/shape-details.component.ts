import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { emptyGrid, Grid } from '../../core/interfaces/grid.interface';
import { ShapeService } from '../../core/services/shape.service';
import { emptyShape, Shape } from '../../core/interfaces/shape.interface';

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
  styleUrl: './shape-details.component.scss'
})
export class ShapeDetailsComponent implements OnInit {
  sliderParams: {
    width: { min: number, max: number },
    height: { min: number, max: number }
  } = {
      width: { min: 2, max: 10 },
      height: { min: 2, max: 10 }
    };

  invert: boolean = false
  shapeId: string | null = null;
  shape: Shape = emptyShape;
  grid: Grid = emptyGrid;

  constructor(
    private route: ActivatedRoute,
    private shapeService: ShapeService,
    private basicDialogService: BasicDialogService,
    private storageService: StorageService
  ) {

  }
  ngOnInit() {
    this.shapeId = this.route.snapshot.paramMap.get('shapeId');
    if (this.shapeId == 'new') {
      console.log(this.shape)
      this.shape.size.width = this.sliderParams.width.min;
      this.shape.size.height = this.sliderParams.height.min;
      this.shape.id = 'New Shape'
      this.shape.pattern.push({ position: { x: 0, y: 0 }, active: false })
      this.grid = this.shapeService.transformShapeToGrid(this.shape, this.shape.id)
      console.log(this.shape)
    } else {
      if (this.shapeId != null) {
        let shape = this.storageService.getShape(this.shapeId);
        if (shape) {
          console.log(`found shape with it ${shape.id}`)
          this.shape = this.shapeService.generateShapeWithNonActivePixels(shape);
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
    console.log(this.shape);
  }

  updateMinGridSize() {
    let minSize = this.shapeService.getShapeRequiredSize(this.shape)
    this.sliderParams.width.min = minSize.width < 2 ? 2 : minSize.width;
    this.sliderParams.height.min = minSize.height < 2 ? 2 : minSize.height;
  }

  invertShape() {
    this.invert = !this.invert;
    this.shape = this.shapeService.invertShapePattern(this.shape, this.invert);
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
    this.basicDialogService.showInputDialog("Change Shape Name", "text").subscribe((result) => {
      if (result) {
        this.shape.id = result;
        this.updateGrid(true);
      }
    })
  }

  changeShapeDescription() {
    this.basicDialogService.showTextareaDialog("Change Shape Description").subscribe((result) => {
      if (result) {
        console.log(`Shape description changed to: ${result}`);
        this.shape.description = result;
        this.updateGrid(true);
      }
    })
  }

  saveShape() {
    this.storageService.storeShape(this.shape);
  
  }

}
