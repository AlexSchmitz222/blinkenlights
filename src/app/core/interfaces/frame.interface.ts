import { frameObject } from "./frameObject.interface";
import { Shape } from "./shape.interface";

export interface Frame {
    id: string;         //Frame Id
    duration: number;   //Frame Duration (eg. how long the Frame should be displayed. 0 means forever)
    shapes: frameObject[];    //List of frame objects
}