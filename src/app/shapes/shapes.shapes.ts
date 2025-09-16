import { Shape } from "../core/interfaces/shape.interface";


export const Shapes: Shape[] = [
    {
        id: 'house',
        description: 'A depiction of a simple house',
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
        ],
        inverted: false
    },
    {
        id: 'heart_filled',
        description: 'A depiction of a filled heart',
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
        ],
        inverted: false
    },
    {
        id: 'star',
        description: 'A depiction of a simple eight angled star',
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
        ],
        inverted: false
    },
    {
        id: 'plusSign',
        description: 'A depiction of a plus sign',
        size: { width: 7, height: 7 },
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
        ],
        inverted: false
    }, {
        id: 'diamond',
        description: 'A depiction of a diamond shape',
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
        ],
        inverted: false 
    }
]
