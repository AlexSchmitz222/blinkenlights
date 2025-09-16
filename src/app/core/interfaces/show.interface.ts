import { Scene } from "./scene.interface";

export interface Show {
    id: string;
    friendlyName: string;
    description: string;
    Scenes: Scene[];
}