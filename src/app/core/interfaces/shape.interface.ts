import { Pixel } from "./pixel.interface";

export interface Shape {
    id: string;
    description: string;
    size: {
        width: number;
        height: number;
    }
    pattern: Pixel[];
    inverted: boolean;
}

export const emptyShape: Shape = {
    id: '',
    description: '',
    size: {
        width: 0,
        height: 0,
    },
    pattern: [],
    inverted: false
}
