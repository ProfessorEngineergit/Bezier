/**
 * The Space key: over the view cube, go to the face, edge or corner under the pointer; otherwise
 * square the view to the face under the pointer and frame it (and hand that face to `starts.onFace`, which
 * starts a sketch on it), or, over empty space, to the side the view is already nearest. A single
 * side, from the cube or from the nearest, is also handed to `starts.onSide`, which starts a sketch on
 * its plane.
 */

import type { StableRef } from '@bezier/core';
import type { CubeSide } from '@bezier/renderer';
import type { ViewportHandle } from './Viewport.js';

/**
 * Pointer position over the model canvas, updated in place on move so the key press reads it for
 * free.
 */
export const pointerOverCanvas = { x: 0, y: 0, over: false };

/** The cube face, edge or corner under the pointer, set by the cube; null when none. */
export const cubeHover: { sides: readonly CubeSide[] | null } = { sides: null };

/**
 * The side the camera is nearest to, from the cube's matrix: its third row is the camera direction
 * in world axes with Y flipped (the matrix is the view rotation in CSS transform space).
 */
export function nearestSide(matrix: readonly number[]): CubeSide {
  const from = { x: matrix[2] ?? 0, y: -(matrix[6] ?? 0), z: matrix[10] ?? 0 };
  const ax = Math.abs(from.x);
  const ay = Math.abs(from.y);
  const az = Math.abs(from.z);
  if (az >= ax && az >= ay) return from.z >= 0 ? 'top' : 'bottom';
  if (ax >= ay) return from.x >= 0 ? 'right' : 'left';
  return from.y >= 0 ? 'back' : 'front';
}

/** What Space starts a sketch on: the face under the pointer, or else the plane of a side. */
export interface SketchStarts {
  onFace: (face: StableRef) => void;
  onSide: (side: CubeSide) => void;
}

export function squareView(
  viewport: ViewportHandle | null,
  animate: boolean,
  starts?: SketchStarts,
): void {
  if (viewport === null) return;
  // Over the cube: go to the face, edge or corner under the pointer.
  if (cubeHover.sides !== null) {
    viewport.setViewBetween(cubeHover.sides, animate);
    const [only] = cubeHover.sides;
    if (cubeHover.sides.length === 1 && only !== undefined) starts?.onSide(only);
    return;
  }
  const { x, y, over } = pointerOverCanvas;
  const face = over ? viewport.squareAt(x, y, animate) : null;
  if (face !== null) {
    starts?.onFace(face);
    return;
  }
  const side = nearestSide(viewport.viewCubeMatrix());
  viewport.setView(side, animate);
  starts?.onSide(side);
}
