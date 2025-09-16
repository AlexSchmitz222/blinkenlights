import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawService } from '../../core/services/draw.service';
import { Grid, emptyGrid } from '../../core/interfaces/grid.interface';
import { GridService } from '../../core/services/grid.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
@Component({
  selector: 'app-blinkenlights',
  imports: [CommonModule, MatSlideToggleModule],
  templateUrl: './blinkenlights.component.html',
  styleUrl: './blinkenlights.component.scss'
})
export class BlinkenlightsComponent implements OnInit {

  grid: Grid = emptyGrid;
  debug: boolean = false;


  constructor(private gridService: GridService,
    private drawService: DrawService) { }

  ngOnInit() {
    this.grid = this.gridService.generateEmptyGrid('', { width: 39, height: 21 });
    console.log(this.grid);
    this.drawService.drawPixel(this.grid, 0, 0, 'invert');
    this.drawService.drawPixel(this.grid, this.grid.size.width - 1, 0, 'invert');
    this.drawService.drawPixel(this.grid, 0, this.grid.size.height - 1, 'invert');
    this.drawService.drawPixel(this.grid, this.grid.size.width - 1, this.grid.size.height - 1, 'invert');
    this.drawService.drawPixel(this.grid, (this.grid.size.width - 1) / 2, (this.grid.size.height - 1) / 2, 'invert');
    //this.drawService.drawLine(this.grid, 0, 4, 14, 8, true);
    //this.drawService.drawRectangle(this.grid, 7, 0, 5, 5, true, false);
    //this.drawService.drawRectangle(this.grid, 13, 0, 5, 5, true, true);

    /*this.drawService.drawShape(this.grid, 0, 0, Shapes);
    this.drawService.drawShape(this.grid, 0, this.grid.size.height - house.size.height, house, true);

    this.drawService.drawShape(this.grid, house.size.width + 1, 0, heart);
    this.drawService.drawShape(this.grid, house.size.width + 1, this.grid.size.height - heart.size.height, heart, true);

    this.drawService.drawShape(this.grid, house.size.width + 1 + heart.size.width + 1, 0, star);
    this.drawService.drawShape(this.grid, house.size.width + 1 + heart.size.width + 1, this.grid.size.height - star.size.height, star, true);

    this.drawService.drawShape(this.grid, house.size.width + 1 + heart.size.width + 1 + star.size.width + 1, 0, plusSign);
    this.drawService.drawShape(this.grid, house.size.width + 1 + heart.size.width + 1 + star.size.width + 1, this.grid.size.height - plusSign.size.height, plusSign, true);

    this.drawService.drawShape(this.grid, house.size.width + 1 + heart.size.width + 1 + star.size.width + 1 + plusSign.size.width + 1, 0, diamond);
    this.drawService.drawShape(this.grid, house.size.width + 1 + heart.size.width + 1 + star.size.width + 1 + plusSign.size.width + 1, this.grid.size.height - diamond.size.height, diamond, true);
*/
  }

}


