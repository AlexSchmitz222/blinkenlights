import { Component, OnInit } from '@angular/core';
import { Pixel } from '../../core/interfaces/pixel.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blinkenlights',
  imports: [CommonModule],
  templateUrl: './blinkenlights.component.html',
  styleUrl: './blinkenlights.component.scss'
})
export class BlinkenlightsComponent {

  width: number = 20; //aka cols
  height: number = 10; //aka rows
  
  pixelGrid: Pixel[][] = [];

  ngOnInit() {
    this.initializePixelGrid();
  }

  initializePixelGrid() {
    this.pixelGrid = [];
    for (let height = 0; height < this.height; height++) {
      const row: Pixel[] = [];
      for (let width = 0; width < this.width; width++) {
        row.push({
          id: height + '_' + width,
          position: {
            x: width, 
            y: height
          },
          active: false
        });
      }
      this.pixelGrid.push(row);
    }
    console.log(this.pixelGrid)
  }
}


