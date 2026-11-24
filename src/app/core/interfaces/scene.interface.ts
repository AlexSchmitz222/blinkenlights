import { Frame } from "./frame.interface";

/** A named sequence of frames, e.g. "heart pulses". */
export interface Scene {
    id: string;
    name: string;
    frames: Frame[];
}
