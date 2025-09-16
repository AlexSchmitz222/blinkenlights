import { Routes } from '@angular/router';
import { BlinkenlightsComponent } from './components/blinkenlights/blinkenlights.component';
import { StartComponent } from './components/start/start.component';
import { ShapeListComponent } from './components/shape-list/shape-list.component';
import { ShapeDetailsComponent } from './components/shape-details/shape-details.component';

export const routes: Routes = [
    { path: "", component: StartComponent},
    { path: "show", component: BlinkenlightsComponent },
    { path: "shapes", component: ShapeListComponent},
    { path: "shapes/:shapeId", component: ShapeDetailsComponent }
];
