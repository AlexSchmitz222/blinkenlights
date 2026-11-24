import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { Grid, createEmptyGrid } from '../../core/interfaces/grid.interface';
import { GridService } from '../../core/services/grid.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-blinkenlights',
  imports: [MatSlideToggleModule],
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
