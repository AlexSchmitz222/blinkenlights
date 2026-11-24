import { Shape } from "../core/interfaces/shape.interface";


/** Shapes that are seeded into a fresh browser on first start. */
export const DEFAULT_SHAPES: Shape[] = [
    {
        id: 'house',
        name: 'House',
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
        name: 'Heart',
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
        name: 'Star',
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
        name: 'Plus',
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
        name: 'Diamond',
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
