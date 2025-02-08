import { Pixel } from "./pixel.interface";

export interface Grid {
    id: string;
    size: {
        width: number;
        height: number;
    }
    backgroundColor: string;
    pixels: Pixel[][];
}