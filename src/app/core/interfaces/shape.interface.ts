import { Pixel } from "./pixel.interface";

export interface Shape {
    id: string;
    size: {
        width: number;
        height: number;
    }
    pattern: Pixel[];
}

export const house: Shape = {
    id: 'house',
    size: { width: 7, height: 9 },
    pattern: [
        { position: { x: 3, y: 0 }, active: true },

        { position: { x: 2, y: 1 }, active: true },
        { position: { x: 3, y: 1 }, active: true },
        { position: { x: 4, y: 1 }, active: true },

        { position: { x: 1, y: 2 }, active: true },
        { position: { x: 2, y: 2 }, active: true },
        { position: { x: 3, y: 2 }, active: true },
        { position: { x: 4, y: 2 }, active: true },
        { position: { x: 5, y: 2 }, active: true },

        { position: { x: 0, y: 3 }, active: true },
        { position: { x: 1, y: 3 }, active: true },
        { position: { x: 2, y: 3 }, active: true },
        { position: { x: 3, y: 3 }, active: true },
        { position: { x: 4, y: 3 }, active: true },
        { position: { x: 5, y: 3 }, active: true },
        { position: { x: 6, y: 3 }, active: true },

        { position: { x: 0, y: 4 }, active: true },
        { position: { x: 3, y: 4 }, active: true },
        { position: { x: 6, y: 4 }, active: true },

        { position: { x: 0, y: 5 }, active: true },
        { position: { x: 3, y: 5 }, active: true },
        { position: { x: 6, y: 5 }, active: true },

        { position: { x: 0, y: 6 }, active: true },
        { position: { x: 1, y: 6 }, active: true },
        { position: { x: 2, y: 6 }, active: true },
        { position: { x: 3, y: 6 }, active: true },
        { position: { x: 6, y: 6 }, active: true },

        { position: { x: 0, y: 7 }, active: true },
        { position: { x: 1, y: 7 }, active: true },
        { position: { x: 2, y: 7 }, active: true },
        { position: { x: 3, y: 7 }, active: true },
        { position: { x: 6, y: 7 }, active: true },

        { position: { x: 0, y: 8 }, active: true },
        { position: { x: 1, y: 8 }, active: true },
        { position: { x: 2, y: 8 }, active: true },
        { position: { x: 3, y: 8 }, active: true },
        { position: { x: 4, y: 8 }, active: true },
        { position: { x: 5, y: 8 }, active: true },
        { position: { x: 6, y: 8 }, active: true }
    ]
};

export const heart: Shape = {
    id: 'heart_filled',
    size: { width: 7, height: 7 },
    pattern: [
        { position: { x: 1, y: 0 }, active: true },
        { position: { x: 5, y: 0 }, active: true },

        { position: { x: 0, y: 1 }, active: true },
        { position: { x: 1, y: 1 }, active: true },
        { position: { x: 2, y: 1 }, active: true },
        { position: { x: 4, y: 1 }, active: true },
        { position: { x: 5, y: 1 }, active: true },
        { position: { x: 6, y: 1 }, active: true },

        { position: { x: 0, y: 2 }, active: true },
        { position: { x: 1, y: 2 }, active: true },
        { position: { x: 2, y: 2 }, active: true },
        { position: { x: 3, y: 2 }, active: true },
        { position: { x: 4, y: 2 }, active: true },
        { position: { x: 5, y: 2 }, active: true },
        { position: { x: 6, y: 2 }, active: true },

        { position: { x: 0, y: 3 }, active: true },
        { position: { x: 1, y: 3 }, active: true },
        { position: { x: 2, y: 3 }, active: true },
        { position: { x: 3, y: 3 }, active: true },
        { position: { x: 4, y: 3 }, active: true },
        { position: { x: 5, y: 3 }, active: true },
        { position: { x: 6, y: 3 }, active: true },

        { position: { x: 1, y: 4 }, active: true },
        { position: { x: 2, y: 4 }, active: true },
        { position: { x: 3, y: 4 }, active: true },
        { position: { x: 4, y: 4 }, active: true },
        { position: { x: 5, y: 4 }, active: true },

        { position: { x: 2, y: 5 }, active: true },
        { position: { x: 3, y: 5 }, active: true },
        { position: { x: 4, y: 5 }, active: true },

        { position: { x: 3, y: 6 }, active: true },
    ]
};

export const star: Shape = {
    id: 'star',
    size: { width: 7, height: 7 },
    pattern: [
        { position: { x: 0, y: 0 }, active: true },
        { position: { x: 3, y: 0 }, active: true },
        { position: { x: 6, y: 0 }, active: true },

        { position: { x: 1, y: 1 }, active: true },
        { position: { x: 3, y: 1 }, active: true },
        { position: { x: 5, y: 1 }, active: true },

        { position: { x: 2, y: 2 }, active: true },
        { position: { x: 3, y: 2 }, active: true },
        { position: { x: 4, y: 2 }, active: true },

        { position: { x: 0, y: 3 }, active: true },
        { position: { x: 1, y: 3 }, active: true },
        { position: { x: 2, y: 3 }, active: true },
        { position: { x: 3, y: 3 }, active: true },
        { position: { x: 4, y: 3 }, active: true },
        { position: { x: 5, y: 3 }, active: true },
        { position: { x: 6, y: 3 }, active: true },

        { position: { x: 2, y: 4 }, active: true },
        { position: { x: 3, y: 4 }, active: true },
        { position: { x: 4, y: 4 }, active: true },

        { position: { x: 1, y: 5 }, active: true },
        { position: { x: 3, y: 5 }, active: true },
        { position: { x: 5, y: 5 }, active: true },

        { position: { x: 0, y: 6 }, active: true },
        { position: { x: 3, y: 6 }, active: true },
        { position: { x: 6, y: 6 }, active: true },
    ]
};

export const plusSign: Shape = {
    id: 'plusSign',
    size: { width: 7, height: 7  },
    pattern: [
        { position: { x: 3, y: 0 }, active: true },

        { position: { x: 3, y: 1 }, active: true },

        { position: { x: 3, y: 2 }, active: true },

        { position: { x: 0, y: 3 }, active: true },
        { position: { x: 1, y: 3 }, active: true },
        { position: { x: 2, y: 3 }, active: true },
        { position: { x: 3, y: 3 }, active: true },
        { position: { x: 4, y: 3 }, active: true },
        { position: { x: 5, y: 3 }, active: true },
        { position: { x: 6, y: 3 }, active: true },

        { position: { x: 3, y: 4 }, active: true },

        { position: { x: 3, y: 5 }, active: true },

        { position: { x: 3, y: 6 }, active: true }
    ]
};

export const diamond: Shape = {
    id: 'diamond',
    size: { width: 7, height: 7 },
    pattern: [
        { position: { x: 3, y: 0 }, active: true },

        { position: { x: 2, y: 1 }, active: true },
        { position: { x: 4, y: 1 }, active: true },

        { position: { x: 1, y: 2 }, active: true },
        { position: { x: 5, y: 2 }, active: true },

        { position: { x: 0, y: 3 }, active: true },
        { position: { x: 6, y: 3 }, active: true },

        { position: { x: 1, y: 4 }, active: true },
        { position: { x: 5, y: 4 }, active: true },

        { position: { x: 2, y: 5 }, active: true },
        { position: { x: 4, y: 5 }, active: true },

        { position: { x: 3, y: 6 }, active: true }
    ]
};

