import { Shape } from "./shape.interface";

export interface Character extends Shape{
    heightOffset: number; //the height offset of the character relative to the text baseline

}