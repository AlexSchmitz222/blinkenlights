import { Frame } from "./frame.interface";

export interface Scene {
    id: string;
    description?: string;
    frames: Frame[];
}