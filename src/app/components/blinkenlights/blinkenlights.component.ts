import { Component, OnInit } from '@angular/core';
import { Pixel } from '../../core/interfaces/pixel.interface';
import { CommonModule } from '@angular/common';
import { DrawService } from '../../core/services/draw.service';
import { Grid } from '../../core/interfaces/grid.interface';
import { GridService } from '../../core/services/grid.service';

@Component({
  selector: 'app-blinkenlights',
  imports: [CommonModule],
  templateUrl: './blinkenlights.component.html',
  styleUrl: './blinkenlights.component.scss'
})
export class BlinkenlightsComponent {


  grid: Grid = {
    id: "grid",
    size: {
      width: 20,
      height: 10,
    },
    backgroundColor: "#000",
    pixels: []
  }
  width: number = 20; //aka cols
  height: number = 10; //aka rows
  pixelGrid: Pixel[][] = []; //^= Pixel[row][col] ^= Pixel[y][x]

  constructor(private gridService: GridService,
    private drawService: DrawService) { }

  ngOnInit() {
    this.gridService.initializeGrid(this.grid);
    this.drawService.drawPixel(this.grid, 1, 1, true);
    this.drawService.drawLine(this.grid, 1, 5, 15, 9, true);
    this.drawService.drawRectangle(this.grid, 8, 1, 5, 5, true, false);
    this.drawService.drawRectangle(this.grid, 14, 1, 5, 5, true, true);
  }

}


