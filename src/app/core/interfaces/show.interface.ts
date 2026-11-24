import { Size } from "./grid.interface";
import { Scene } from "./scene.interface";

/** A show is played scene by scene, frame by frame, on a grid of `size`. */
export interface Show {
    id: string;
    name: string;
    description: string;
    size: Size;
    /** Start over after the last frame. */
    loop: boolean;
    scenes: Scene[];
    /** ISO timestamps. */
    createdAt?: string;
    updatedAt?: string;
}

export interface GridPreset {
    id: string;
    name: string;
    size: Size;
    description: string;
}

/** Grid sizes of the historic installations, plus a roomier one for this app. */
export const GRID_PRESETS: GridPreset[] = [
    { id: 'blinkenlights', name: 'Blinkenlights', size: { width: 18, height: 8 }, description: 'Haus des Lehrers, Berlin 2001' },
    { id: 'arcade', name: 'Arcade', size: { width: 26, height: 20 }, description: 'Bibliothèque nationale de France, Paris 2002' },
    { id: 'wide', name: 'Wide', size: { width: 39, height: 21 }, description: 'A roomier canvas' },
];

export function findPreset(size: Size): GridPreset | undefined {
    return GRID_PRESETS.find(p => p.size.width === size.width && p.size.height === size.height);
}
