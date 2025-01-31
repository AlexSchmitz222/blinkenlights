import { Routes } from '@angular/router';
import { BlinkenlightsComponent } from './components/blinkenlights/blinkenlights.component';
import { StartComponent } from './components/start/start.component';

export const routes: Routes = [
    { path: "", component: StartComponent},
    { path: "show", component: BlinkenlightsComponent }
];
