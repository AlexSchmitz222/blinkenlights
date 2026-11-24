import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { Grid, createEmptyGrid } from '../../core/interfaces/grid.interface';
import { GridService } from '../../core/services/grid.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';

@Component({
  selector: 'app-blinkenlights',
  imports: [PixelGridComponent, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './blinkenlights.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './blinkenlights.component.scss'
})
export class BlinkenlightsComponent implements OnInit {
  private gridService = inject(GridService);

  grid: Grid = createEmptyGrid();
  debug = false;

  ngOnInit() {
    this.grid = this.gridService.generateEmptyGrid('', { width: 39, height: 21 });
  }
}
