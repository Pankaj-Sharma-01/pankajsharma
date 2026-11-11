/**
 * Geometry of the home page journey. Pure maths, no three.js, so the 3D
 * scene and the HUD minimap share one definition.
 *
 * The route is a serpentine through the city. Each section of the site is a
 * landmark building standing at a corner: you drive up to its entrance (a
 * "stop"), go in, turn inside the lobby, and come out onto the next street.
 * After the last landmark the road runs out to the cliff and the falls.
 *
 * World axes: +x east, -z "north" (toward the sunrise). Every stage of the
 * journey (stop to stop) covers the same distance, so scroll progress maps
 * linearly onto distance travelled.
 */

export const ROUTE = {
  /** Distance travelled between consecutive stops. */
  stageLength: 128,
  /** How far in front of a landmark's entrance the camera stops. */
  approach: 34,
  /** Half the side of a landmark's square footprint. */
  landmarkHalf: 16,
  /** Half-width and height of the drive-through lobby. */
  portalHalfWidth: 8,
  portalHeight: 11,
  /** Radius of the rounded turn inside a lobby. */
  cornerRadius: 10,
  /** Gap between the camera's final position and the cliff edge. */
  cliffGap: 14,
} as const;

/** -1 left, 0 straight on, 1 right. */
export type Turn = -1 | 0 | 1;

export type RouteLeg = {
  index: number;
  startX: number;
  startZ: number;
  /** Unit direction of travel. */
  dirX: number;
  dirZ: number;
  length: number;
  /** Rotation that maps a leg-local -z axis onto the direction of travel. */
  rotationY: number;
  /** Distance along the whole route at which this leg starts. */
  startDistance: number;
  /** Turn made inside the landmark this leg starts from (0 for the first leg). */
  turnAtStart: Turn;
  /** Turn made inside the landmark at this leg's end (0 for the last leg). */
  turnAtEnd: Turn;
};

export type RoutePoint = { x: number; z: number };

export type Route = {
  legs: RouteLeg[];
  /** Centres of the landmarks, in order. */
  corners: RoutePoint[];
  /** Number of stops after the start: one per landmark, then the falls. */
  stops: number;
  totalLength: number;
  /** Position at a distance along the route, with turns rounded off. */
  pointAt: (distance: number) => RoutePoint;
  /** Index of the leg that contains a distance. */
  legIndexAt: (distance: number) => number;
};

// Right, left, left, right: a serpentine that always heads back toward -z.
const TURN_CYCLE: readonly Turn[] = [1, -1, -1, 1];

export function createRoute(landmarks: number): Route {
  const { stageLength, approach, landmarkHalf, cornerRadius } = ROUTE;
  const lead = approach + landmarkHalf; // from a stop to the centre of its landmark
  const stops = landmarks + 1;

  const legs: RouteLeg[] = [];
  const corners: RoutePoint[] = [];
  let x = 0;
  let z = 0;
  let dirX = 0;
  let dirZ = -1;
  let startDistance = 0;
  let previousTurn: Turn = 0;

  for (let index = 0; index <= landmarks; index++) {
    const isFirst = index === 0;
    const isLast = index === landmarks;
    const length = stageLength + (isFirst ? lead : 0) - (isLast ? lead : 0) + (isFirst && isLast ? lead : 0);
    // With an odd number of landmarks the last one is driven straight
    // through, so the final street still faces the sunrise.
    const straightThrough = index === landmarks - 1 && landmarks % 2 === 1;
    const turnAtEnd: Turn = isLast || straightThrough ? 0 : TURN_CYCLE[index % TURN_CYCLE.length];

    legs.push({
      index,
      startX: x,
      startZ: z,
      dirX,
      dirZ,
      length,
      rotationY: Math.atan2(-dirX, -dirZ),
      startDistance,
      turnAtStart: previousTurn,
      turnAtEnd,
    });

    x += dirX * length;
    z += dirZ * length;
    startDistance += length;
    if (!isLast) corners.push({ x, z });
    if (turnAtEnd !== 0) {
      // The right-hand vector of (dirX, dirZ) is (-dirZ, dirX).
      [dirX, dirZ] = [-dirZ * turnAtEnd + 0, dirX * turnAtEnd + 0];
    }
    previousTurn = turnAtEnd;
  }

  const totalLength = startDistance;

  /** Quadratic curve through a corner; `offset` is distance past the corner (-R..R). */
  function roundCorner(into: RouteLeg, out: RouteLeg, offset: number): RoutePoint {
    const t = (offset + cornerRadius) / (2 * cornerRadius);
    const before = (1 - t) * (1 - t) * -cornerRadius;
    const after = t * t * cornerRadius;
    return {
      x: out.startX + into.dirX * before + out.dirX * after,
      z: out.startZ + into.dirZ * before + out.dirZ * after,
    };
  }

  function legIndexAt(distance: number) {
    for (const leg of legs) {
      if (distance < leg.startDistance + leg.length) return leg.index;
    }
    return legs.length - 1;
  }

  function pointAt(distance: number): RoutePoint {
    const leg = legs[legIndexAt(distance)];
    const along = distance - leg.startDistance;
    if (leg.turnAtEnd !== 0 && along > leg.length - cornerRadius) {
      return roundCorner(leg, legs[leg.index + 1], along - leg.length);
    }
    if (leg.turnAtStart !== 0 && along < cornerRadius) {
      return roundCorner(legs[leg.index - 1], leg, along);
    }
    return { x: leg.startX + leg.dirX * along, z: leg.startZ + leg.dirZ * along };
  }

  return { legs, corners, stops, totalLength, pointAt, legIndexAt };
}
