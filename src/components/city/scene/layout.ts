import { headingVector, rightVector, type Landmark, type Route, type RoutePoint, type Street } from "../route";
import { ROAD_HALF_WIDTH, SIDEWALK_WIDTH } from "./shared";

/**
 * Keeps buildings out of each other's way. Streets now meet at all sorts
 * of angles, so instead of special-casing each corner, every lot is checked
 * in world space against every street, every landmark, and every lot placed
 * before it.
 */

const CORRIDOR = ROAD_HALF_WIDTH + SIDEWALK_WIDTH;
const CELL = 24;

type Claimed = { x: number; z: number; radius: number };

/** Street-local point to world. */
export function streetToWorld(street: Street, x: number, z: number): RoutePoint {
  const right = rightVector(street.heading);
  const forward = headingVector(street.heading);
  return { x: street.startX + right.x * x - forward.x * z, z: street.startZ + right.z * x - forward.z * z };
}

function distanceToSegment(point: RoutePoint, a: RoutePoint, b: RoutePoint) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - (a.x + dx * t), point.z - (a.z + dz * t));
}

/** How far a point lies outside a landmark's footprint (negative inside). */
function outsideLandmark(landmark: Landmark, point: RoutePoint) {
  const heading = -landmark.rotationY;
  const right = rightVector(heading);
  const forward = headingVector(heading);
  const dx = point.x - landmark.x;
  const dz = point.z - landmark.z;
  const x = Math.abs(dx * right.x + dz * right.z) - landmark.halfWidth;
  const localZ = -(dx * forward.x + dz * forward.z);
  const z = Math.max(localZ - landmark.front, landmark.back - localZ);
  return Math.max(x, z);
}

export function createOccupancy(route: Route, firstStreetBehind: number) {
  // Each street's centre line, from where it starts to where it ends.
  const corridors = route.streets.map((street, index) => [
    streetToWorld(street, 0, index === 0 ? firstStreetBehind : 0),
    streetToWorld(street, 0, -street.length),
  ]);
  const grid = new Map<string, Claimed[]>();
  const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

  /** Distance from a point to the nearest street edge or landmark (negative means on one). */
  function clearance(point: RoutePoint, ignoreStreet: number | null = null) {
    let nearest = Infinity;
    corridors.forEach(([a, b], index) => {
      if (index !== ignoreStreet) nearest = Math.min(nearest, distanceToSegment(point, a, b) - CORRIDOR);
    });
    for (const landmark of route.landmarks) nearest = Math.min(nearest, outsideLandmark(landmark, point));
    return nearest;
  }

  return {
    clearance,
    /** Reserves ground for a lot of the given size, if it is free. */
    claim(point: RoutePoint, width: number, depth: number, ownStreet: number | null) {
      const radius = Math.hypot(width, depth) / 2;
      if (clearance(point, ownStreet) < radius * 0.8 + 1) return false;
      const cx = Math.floor(point.x / CELL);
      const cz = Math.floor(point.z / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gz = cz - 1; gz <= cz + 1; gz++) {
          for (const other of grid.get(`${gx},${gz}`) ?? []) {
            if (Math.hypot(other.x - point.x, other.z - point.z) < (other.radius + radius) * 0.72) return false;
          }
        }
      }
      const cell = key(point.x, point.z);
      grid.set(cell, [...(grid.get(cell) ?? []), { x: point.x, z: point.z, radius }]);
      return true;
    },
  };
}
