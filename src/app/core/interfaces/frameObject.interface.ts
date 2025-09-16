export interface frameObject {
    id: string;
    shapeType: string;
    size?: {
        width: number;
        height: number;
    }
    position: {
        x: number;
        y: number;
    }
}