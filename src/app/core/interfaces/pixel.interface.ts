export interface Pixel {
    id?: string;
    position: {
        x: number;
        y: number
    }
    active: pixelState;
    color?: string;
}

export type pixelState = boolean | 'invert'