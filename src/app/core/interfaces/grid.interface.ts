import { Pixel } from "./pixel.interface";

export interface Grid {
    id: string;
    description?: string;
    size: {
        width: number;
        height: number;
    }
    backgroundColor?: string;
    pixels: Pixel[][];
    inverted: boolean;
}

export const emptyGrid = {
    id: '',
    size: {
        width: 0,
        height: 0
    },
    pixels: [],
    inverted: false
}
