/**
 * Geometry of the home page journey. Pure maths, no three.js, so the 3D
 * scene and the HUD minimap share one definition.
 *
 * The route winds through the city. Each section of the site is a landmark
 * building: you drive up to its entrance (a "stop"), go in, turn inside the
 * lobby, and come out onto the next street. Turns come in varied angles,
 * rounded off with true circular arcs, and one landmark is a wide hall where
 * the road makes a full U-turn. After the last landmark the road runs out to
 * the cliff and the falls.
 *
 * World axes: +x east, -z north (toward the sunrise). Headings are measured
 * clockwise from north, so a right turn adds to the heading.
 *
 * Every stage (stop to stop) covers exactly the same distance along the
 * path, so scroll progress maps linearly onto distance travelled. Street
 * lengths are worked out to make that true whatever the turns are.
 */

export const ROUTE = {
  /** Path distance between consecutive stops. */
  stageLength: 128,
  /** How far in front of a landmark's entrance the camera stops. */
  approach: 34,
  /** Half the side of a regular landmark's square footprint. */
  landmarkHalf: 16,
  /** Half-width and height of a drive-through lobby. */
  portalHalfWidth: 8,
  portalHeight: 11,
  /** Radius of the turn inside a regular lobby. Larger turns need it to fit the footprint. */
  cornerRadius: 10,
  /**
   * Radius of the U-turn. Twice this is the distance between the two
   * carriageways: a street plus its pavements, and a narrow median.
   */
  uTurnRadius: 20,
  /** Ceiling height of the U-turn hall. */
  uTurnHeight: 13,
  /** Gap between the camera's final position and the cliff edge. */
  cliffGap: 14,
  /**
   * Turn made inside each landmark, in degrees; positive is right, 180 is a
   * U-turn. Regular turns must stay within ±110 so the arc fits the lobby.
   * The last turn is always recomputed so the final street faces the sun.
   */
  turns: [60, -100, -50, 180, -75, -60, 80, -35],
} as const;

export type RoutePoint = { x: number; z: number };

/** Unit vector of travel for a heading. */
export function headingVector(heading: number): RoutePoint {
  return { x: Math.sin(heading), z: -Math.cos(heading) };
}

/** Unit vector pointing to the right of a heading. */
export function rightVector(heading: number): RoutePoint {
  return { x: Math.cos(heading), z: Math.sin(heading) };
}

/** A straight street between two landmarks (or from the start / to the cliff). */
export type Street = {
  index: number;
  startX: number;
  startZ: number;
  heading: number;
  /** Group rotation about y that maps a street-local -z axis onto the heading. */
  rotationY: number;
  length: number;
  /** Path distance at the start of the street. */
  startDistance: number;
  /**
   * Stretch of the street (street-local z, from > to) outside any landmark
   * footprint: where the pavements, lamps, traffic, and buildings go.
   */
  openFrom: number;
  openTo: number;
};

/** A landmark building, in its own frame: entrance on the +z face, driving in toward -z. */
export type Landmark = {
  index: number;
  /** Origin of the landmark's local frame, in world coordinates. */
  x: number;
  z: number;
  rotationY: number;
  /** Signed turn made inside, in radians (positive right). */
  turn: number;
  uTurn: boolean;
  /** Footprint, in local coordinates: |x| <= halfWidth, back <= z <= front. */
  halfWidth: number;
  front: number;
  back: number;
  height: number;
  /** Local x of the entrance's centre, on the front face. */
  entranceX: number;
  /** Local position and heading (0 = local -z) of the exit opening. */
  exit: { x: number; z: number; heading: number };
  /** Local points along the drive through the lobby, entrance to exit, about 2 units apart. */
  lane: (RoutePoint & { heading: number })[];
};

export type Route = {
  streets: Street[];
  landmarks: Landmark[];
  /** Number of stops after the start: one per landmark, then the falls. */
  stops: number;
  totalLength: number;
  pointAt: (distance: number) => RoutePoint;
  /** Index of the street whose stretch of the journey contains a distance. */
  streetIndexAt: (distance: number) => number;
};

type LineSegment = { kind: "line"; x: number; z: number; heading: number; length: number; start: number };
type ArcSegment = {
  kind: "arc";
  x: number;
  z: number;
  heading: number;
  radius: number;
  /** Signed sweep in radians, positive right. */
  angle: number;
  length: number;
  start: number;
};
type Segment = LineSegment | ArcSegment;

function endOf(segment: Segment): RoutePoint & { heading: number } {
  return pointOn(segment, segment.length);
}

function pointOn(segment: Segment, along: number): RoutePoint & { heading: number } {
  if (segment.kind === "line") {
    const direction = headingVector(segment.heading);
    return { x: segment.x + direction.x * along, z: segment.z + direction.z * along, heading: segment.heading };
  }
  const sign = Math.sign(segment.angle);
  const right = rightVector(segment.heading);
  const centerX = segment.x + right.x * segment.radius * sign;
  const centerZ = segment.z + right.z * segment.radius * sign;
  const heading = segment.heading + (along / segment.radius) * sign;
  const radial = rightVector(heading);
  return { x: centerX - radial.x * segment.radius * sign, z: centerZ - radial.z * segment.radius * sign, heading };
}

/** World point to a landmark's local frame. */
function toLocal(origin: RoutePoint, heading: number, point: RoutePoint): RoutePoint {
  const right = rightVector(heading);
  const forward = headingVector(heading);
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  return { x: dx * right.x + dz * right.z, z: -(dx * forward.x + dz * forward.z) };
}

/** Where a ray from the centre of a square footprint leaves it. */
function squareExit(half: number, heading: number) {
  const direction = headingVector(heading);
  const reach = half / Math.max(Math.abs(direction.x), Math.abs(direction.z));
  return { x: direction.x * reach, z: direction.z * reach, reach };
}

/** Turn angles for `landmarks` landmarks, ending on the starting heading. */
function planTurns(landmarks: number): number[] {
  const degrees: number[] = Array.from({ length: landmarks }, (_, index) => ROUTE.turns[index % ROUTE.turns.length]);
  if (landmarks > 0) {
    const others = degrees.slice(0, -1).reduce((sum, turn) => sum + turn, 0);
    // Normalise into (-180, 180] and keep it a regular turn.
    let last = -(((others % 360) + 540) % 360) + 180;
    if (Math.abs(last) > 110) last = Math.sign(last) * 110;
    degrees[landmarks - 1] = last;
  }
  return degrees.map((turn) => (turn * Math.PI) / 180);
}

export function createRoute(landmarkCount: number): Route {
  const { stageLength, approach, landmarkHalf, portalHalfWidth, cornerRadius, uTurnRadius } = ROUTE;
  const turns = planTurns(landmarkCount);

  // How each landmark shapes the path: the distance from its entrance to the
  // start of the turn, and the length of the turn itself.
  const shapes = turns.map((turn) => {
    if (Math.abs(turn) >= Math.PI - 1e-6) {
      const front = 6;
      return { uTurn: true, entryDepth: front, arcLength: Math.PI * uTurnRadius, front };
    }
    const tangent = cornerRadius * Math.tan(Math.abs(turn) / 2);
    return { uTurn: false, entryDepth: landmarkHalf - tangent, arcLength: cornerRadius * Math.abs(turn), tangent };
  });

  // Street lengths that make every stage exactly `stageLength`.
  const lead = (index: number) => approach + shapes[index].entryDepth;
  const streetLengths = Array.from({ length: landmarkCount + 1 }, (_, index) => {
    if (landmarkCount === 0) return stageLength;
    if (index === 0) return stageLength + lead(0);
    const previous = shapes[index - 1];
    if (index === landmarkCount) return stageLength - lead(index - 1) - previous.arcLength;
    return stageLength + shapes[index].entryDepth - previous.entryDepth - previous.arcLength;
  });

  const segments: Segment[] = [];
  const streets: Street[] = [];
  const landmarks: Landmark[] = [];
  let cursor = { x: 0, z: 0, heading: 0 };
  let distance = 0;
  let previousExitClear = 0;

  function push(segment: Segment) {
    segments.push(segment);
    distance += segment.length;
    cursor = endOf(segment);
  }

  for (let index = 0; index <= landmarkCount; index++) {
    const length = streetLengths[index];
    const isLast = index === landmarkCount;
    const nextEntry = isLast ? 0 : shapes[index].entryDepth;
    streets.push({
      index,
      startX: cursor.x,
      startZ: cursor.z,
      heading: cursor.heading,
      rotationY: -cursor.heading,
      length,
      startDistance: distance,
      openFrom: -previousExitClear,
      openTo: -(length - nextEntry),
    });
    push({ kind: "line", ...cursor, length, start: distance });
    if (isLast) break;

    // The landmark at the end of this street.
    const shape = shapes[index];
    const turn = turns[index];
    const sign = Math.sign(turn);
    const arcStart = { ...cursor };
    const arc: ArcSegment = {
      kind: "arc",
      ...cursor,
      radius: shape.uTurn ? uTurnRadius : cornerRadius,
      angle: shape.uTurn ? sign * Math.PI : turn,
      length: shape.arcLength,
      start: distance,
    };
    push(arc);

    let origin: RoutePoint;
    let landmark: Omit<Landmark, "lane">;
    if (shape.uTurn) {
      // Origin at the centre of the semicircle; both doors on the front face.
      const right = rightVector(arcStart.heading);
      origin = { x: arcStart.x + right.x * uTurnRadius * sign, z: arcStart.z + right.z * uTurnRadius * sign };
      const halfWidth = uTurnRadius + portalHalfWidth + 4;
      landmark = {
        index,
        ...origin,
        rotationY: -arcStart.heading,
        turn,
        uTurn: true,
        halfWidth,
        front: shape.front ?? 6,
        back: -(uTurnRadius + portalHalfWidth + 3),
        height: ROUTE.uTurnHeight,
        entranceX: -sign * uTurnRadius,
        exit: { x: sign * uTurnRadius, z: shape.front ?? 6, heading: Math.PI },
      };
      previousExitClear = shape.front ?? 6;
    } else {
      // Origin where the straight lines in and out would meet.
      const forward = headingVector(arcStart.heading);
      const tangent = shape.tangent ?? 0;
      origin = { x: arcStart.x + forward.x * tangent, z: arcStart.z + forward.z * tangent };
      const exit = squareExit(landmarkHalf, turn);
      landmark = {
        index,
        ...origin,
        rotationY: -arcStart.heading,
        turn,
        uTurn: false,
        halfWidth: landmarkHalf,
        front: landmarkHalf,
        back: -landmarkHalf,
        height: ROUTE.portalHeight,
        entranceX: 0,
        exit: { x: exit.x, z: exit.z, heading: turn },
      };
      previousExitClear = exit.reach - tangent;
    }

    // Sample the drive through the lobby: in through the front, round the
    // turn, and out to the exit, in local coordinates.
    const lane: Landmark["lane"] = [];
    const inDepth = landmark.front - toLocal(origin, arcStart.heading, arcStart).z;
    for (let along = -inDepth; along < arc.length + previousExitClear; along += 2) {
      const point =
        along < 0
          ? pointOn({ kind: "line", ...arcStart, length: 0, start: 0 }, along)
          : along <= arc.length
            ? pointOn(arc, along)
            : pointOn({ kind: "line", ...cursor, length: 0, start: 0 }, along - arc.length);
      lane.push({ ...toLocal(origin, arcStart.heading, point), heading: point.heading - arcStart.heading });
    }
    landmarks.push({ ...landmark, lane });
  }

  const totalLength = distance;

  function segmentAt(at: number) {
    let low = 0;
    let high = segments.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (segments[middle].start <= at) low = middle;
      else high = middle - 1;
    }
    return segments[low];
  }

  function pointAt(at: number): RoutePoint {
    // Past either end, carry straight on.
    const clamped = Math.max(0, at);
    const segment = segmentAt(clamped);
    const point = pointOn(segment, clamped - segment.start);
    return { x: point.x, z: point.z };
  }

  // A street's stretch of the journey runs from the middle of the turn
  // before it to the middle of the turn after it.
  const boundaries = streets.map((street, index) => {
    if (index === 0) return 0;
    return street.startDistance - shapes[index - 1].arcLength / 2;
  });

  function streetIndexAt(at: number) {
    let index = 0;
    while (index + 1 < boundaries.length && boundaries[index + 1] <= at) index++;
    return index;
  }

  return { streets, landmarks, stops: landmarkCount + 1, totalLength, pointAt, streetIndexAt };
}
