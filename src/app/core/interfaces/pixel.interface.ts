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

export const emptyPixel: Pixel = {
    position: {
        x: 0,
        y: 0
    },
    active: false
}

