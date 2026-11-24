import { ShapeObject } from '../core/interfaces/frame.interface';
import { GRID_PRESETS, Show } from '../core/interfaces/show.interface';
import { Shape } from '../core/interfaces/shape.interface';
import { ShowGeneratorService } from '../core/services/show-generator.service';
import { DEFAULT_SHAPES } from '../shapes/shapes.shapes';

/** Ids of default shapes the demo shows use; seeding makes sure they exist. */
export const DEMO_SHAPE_IDS = ['heart_filled', 'star'];

function shape(id: string): Shape {
  return DEFAULT_SHAPES.find(s => s.id === id)!;
}

function preset(id: string) {
  return GRID_PRESETS.find(p => p.id === id)!.size;
}

/** Shows that are created in a fresh browser on first start, so there is something to play right away. */
export function buildDemoShows(gen: ShowGeneratorService): Show[] {
  const now = new Date().toISOString();

  // --- "Welcome" on the wide grid ---------------------------------------------------------------
  const wide = preset('wide');
  const heart = shape('heart_filled');
  const star = shape('star');
  const heartObject: ShapeObject = {
    id: 'demo_heart',
    type: 'shape',
    shapeId: heart.id,
    position: { x: Math.floor((wide.width - heart.size.width) / 2), y: Math.floor((wide.height - heart.size.height) / 2) },
  };
  const starObject: ShapeObject = { id: 'demo_star', type: 'shape', shapeId: star.id, position: { x: -star.size.width, y: 1 } };

  const welcome: Show = {
    id: 'show_demo_welcome',
    name: 'Welcome',
    description: 'A heart beats, a star shoots by, and a greeting scrolls past.',
    size: wide,
    loop: true,
    createdAt: now,
    updatedAt: now,
    scenes: [
      {
        id: 'scene_demo_heart',
        name: 'Heartbeat',
        frames: [
          ...gen.blink([heartObject], 2, 180, 120, 'invert'),
          { id: 'frame_demo_heart_rest', duration: 700, objects: [structuredClone(heartObject)] },
        ],
      },
      {
        id: 'scene_demo_star',
        name: 'Shooting star',
        frames: gen.moveObject(starObject, { x: wide.width, y: wide.height - star.size.height - 1 }, 32, 45),
      },
      {
        id: 'scene_demo_text',
        name: 'Greeting',
        frames: gen.scrollText('Blinkenlights ♥', wide, { stepDuration: 55 }),
      },
    ],
  };

  // --- "Hallo Berlin" on the original 18×8 grid -------------------------------------------------
  const classic = preset('blinkenlights');
  const hallo: Show = {
    id: 'show_demo_berlin',
    name: 'Hallo Berlin',
    description: 'A greeting on the original 18×8 Blinkenlights grid.',
    size: classic,
    loop: true,
    createdAt: now,
    updatedAt: now,
    scenes: [
      { id: 'scene_demo_berlin', name: 'Greeting', frames: gen.scrollText('Hallo Berlin! ♥', classic, { stepDuration: 90 }) },
    ],
  };

  return [welcome, hallo];
}
