import { ROUTE, type Landmark } from "../route";
import { AMBER, BANDS, CYAN, CityBuilder, FINS, GLOW, PINK, PLAIN, TRUSS, VIOLET, WINDOWS } from "./buildings";

/**
 * Landmark buildings: one per site section, each with its own silhouette,
 * accent colours, and a glowing drive-through lobby.
 *
 * Built in the landmark's own frame: the entrance is on the +z face and the
 * camera drives in heading -z. The ground floor is an open colonnade, so the
 * road can turn through it at any angle; light strips on the floor trace
 * the way through. One landmark is a wide hall where the road makes a U-turn
 * round a central island, leaving by a second door beside the first.
 */

const H = ROUTE.landmarkHalf;
const W = ROUTE.portalHalfWidth;
const P = ROUTE.portalHeight;
const SIDE = H * 2;

/** [accent, secondary] neon indices: a distinct pairing per landmark. */
const COLOURS: readonly (readonly [number, number])[] = [
  [CYAN, PINK],
  [PINK, AMBER],
  [AMBER, CYAN],
  [VIOLET, CYAN],
  [CYAN, AMBER],
  [PINK, VIOLET],
  [AMBER, PINK],
  [VIOLET, AMBER],
];

type Design = (b: CityBuilder, accent: number, secondary: number) => void;

/** Stepped pyramid with a beacon. */
const ziggurat: Design = (b, accent, secondary) => {
  let y = P;
  for (const [width, height] of [
    [32, 22],
    [25, 18],
    [18, 15],
    [11, 13],
  ]) {
    b.box(0, y, 0, width, height, width, BANDS, accent);
    b.crown(0, y + height, 0, width, width, secondary);
    y += height;
  }
  b.spire(0, y, 0, 20);
};

/** Twin towers joined by a bridge. */
const twins: Design = (b, accent, secondary) => {
  b.box(0, P, 0, SIDE, 10, SIDE, FINS, accent);
  const y = P + 10;
  for (const side of [-1, 1]) {
    b.box(side * 9.5, y, 0, 11, 62, 14, WINDOWS, accent);
    b.crown(side * 9.5, y + 62, 0, 11, 14, secondary);
    b.spire(side * 9.5, y + 62, 0, 10);
  }
  b.box(0, y + 36, 0, 10, 4, 6, BANDS, secondary, 0.7);
  b.box(0, y + 35.7, 0, 10, 0.3, 0.5, GLOW, secondary, 0);
};

/** Finned podium under floating slabs separated by bands of light. */
const strata: Design = (b, accent, secondary) => {
  b.box(0, P, 0, SIDE, 12, SIDE, FINS, accent);
  let y = P + 12;
  for (let level = 0; level < 5; level++) {
    const odd = level % 2 === 1;
    b.box(odd ? 2.5 : -2.5, y, 0, 27, 8.5, 27, BANDS, odd ? secondary : accent);
    b.box(0, y + 8.5, 0, 22, 1, 22, GLOW, odd ? accent : secondary, 0);
    y += 9.5;
  }
  b.box(0, y, 0, 14, 6, 14, PLAIN, accent);
  b.spire(0, y + 6, 0, 12);
};

/** Braced frame under construction, with cantilevered units and a crane. */
const crane: Design = (b, accent, secondary) => {
  b.box(0, P, 0, SIDE, 6, SIDE, PLAIN, accent, 0.5);
  const y = P + 6;
  b.box(0, y, 0, 20, 64, 20, TRUSS, accent, 0.7);
  for (let unit = 0; unit < 3; unit++) {
    const side = unit % 2 === 1 ? 1 : -1;
    b.box(side * 13, y + 12 + unit * 16, 0, 10, 6, 12, BANDS, secondary, 0.7);
    b.box(side * 13, y + 11.7 + unit * 16, 0, 10, 0.3, 12, GLOW, secondary, 0);
  }
  b.box(0, y + 64, 0, 22, 2, 22, PLAIN, accent, 0.6);
  b.box(0, y + 66, 0, 2, 8, 2, PLAIN, AMBER, 0.5);
  b.box(8, y + 73, 0, 40, 1, 1.2, PLAIN, AMBER, 0.7);
  b.box(-10, y + 71.5, 0, 4, 2.5, 3, PLAIN, AMBER, 0.5);
  b.box(24, y + 61, 0, 0.12, 12, 0.12, PLAIN, AMBER, 0);
  b.box(24, y + 60.4, 0, 0.8, 0.6, 0.8, GLOW, AMBER, 0);
};

/** A stack of offset volumes, each with a lit spine. */
const stack: Design = (b, accent, secondary) => {
  let y = P;
  [30, 26, 31, 24, 29, 22, 27].forEach((width, index) => {
    const odd = index % 2 === 1;
    const height = 7 + (index % 3);
    const x = (odd ? 1 : -1) * (1.5 + index * 0.3);
    const z = ((index % 3) - 1) * 1.2;
    b.box(x, y, z, width, height, 24, odd ? WINDOWS : PLAIN, odd ? secondary : accent, 0.7);
    b.box(x, y + 0.4, z + 12.2, width * 0.9, 0.35, 0.2, GLOW, odd ? accent : secondary, 0);
    y += height;
  });
  b.spire(0, y, 0, 14);
};

/** Slim shaft carrying a wide observation deck, a dish, and an antenna farm. */
const observatory: Design = (b, accent, secondary) => {
  b.box(0, P, 0, SIDE, 4, SIDE, PLAIN, accent, 0.5);
  const y = P + 4;
  b.box(0, y, 0, 13, 50, 13, PLAIN, accent, 0.35);
  b.box(0, y + 49.5, 0, 15, 0.5, 15, GLOW, secondary, 0);
  b.box(0, y + 50, 0, 34, 11, 34, BANDS, accent);
  b.crown(0, y + 61, 0, 34, 34, secondary);
  b.box(-7, y + 63, 5, 12, 0.5, 12, PLAIN, secondary, 0.8, 0.5);
  for (const [x, z, height] of [
    [6, -6, 22],
    [10, 4, 12],
    [2, 9, 16],
    [-10, -8, 9],
    [11, -11, 14],
  ]) {
    b.spire(x, y + 61, z, height);
  }
};

/** A slab that is mostly screen. */
const screens: Design = (b, accent, secondary) => {
  b.box(0, P, 0, SIDE, 5, SIDE, PLAIN, accent, 0.5);
  const y = P + 5;
  b.box(0, y, -2, 30, 70, 12, FINS, accent);
  // Light frame around the display wall.
  b.box(0, y + 2, 4.15, 26.5, 0.5, 0.3, GLOW, secondary, 0);
  b.box(0, y + 60, 4.15, 26.5, 0.5, 0.3, GLOW, secondary, 0);
  for (const side of [-1, 1]) {
    b.box(side * 13, y + 2, 4.15, 0.5, 58.5, 0.3, GLOW, secondary, 0);
    b.box(side * 16, y, -2, 1, 60, 8, PLAIN, secondary, 0.6);
  }
  for (const height of [17, 45]) {
    b.anchors.push({ x: 0, y: y + height, z: 4.4, width: 24, height: 26, rotationY: 0, kind: "screen" });
  }
  b.spire(0, y + 70, -2, 16);
};

/** Tower with pulsing light columns up its corners and a cross on top. */
const pulse: Design = (b, accent, secondary) => {
  b.box(0, P, 0, SIDE, 5, SIDE, PLAIN, accent, 0.5);
  const y = P + 5;
  b.box(0, y, 0, 22, 82, 22, WINDOWS, accent);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.box(sx * 11.2, y, sz * 11.2, 0.8, 82, 0.8, GLOW, secondary, 0);
  }
  for (const height of [25, 50, 75]) b.crown(0, y + height, 0, 24, 24, accent);
  b.box(0, y + 82, 0, 26, 3, 6, PLAIN, secondary, 0.8);
  b.box(0, y + 82, 0, 6, 3, 26, PLAIN, secondary, 0.8);
  b.spire(0, y + 85, 0, 14);
};

const DESIGNS: readonly Design[] = [ziggurat, twins, strata, crane, stack, observatory, screens, pulse];

/** Rotates a local offset by a heading (0 = -z, clockwise). */
function along(heading: number, across: number, ahead: number) {
  return {
    x: Math.cos(heading) * across + Math.sin(heading) * ahead,
    z: Math.sin(heading) * across - Math.cos(heading) * ahead,
  };
}

/**
 * Glowing double frame around an opening at (x, z), for travel along
 * `heading`. `outward` is -1 for an entrance (frame stands before the
 * opening) and 1 for an exit (frame stands after it).
 */
function portal(
  b: CityBuilder,
  x: number,
  z: number,
  heading: number,
  outward: -1 | 1,
  height: number,
  accent: number,
  secondary: number,
) {
  for (const [grow, neon, distance] of [
    [0.3, accent, 0.25],
    [1.3, secondary, 0.12],
  ]) {
    const half = W + grow;
    const top = height + grow;
    const offset = outward * distance;
    const centre = along(heading, 0, offset);
    for (const side of [-1, 1]) {
      const pillar = along(heading, side * half, offset);
      b.box(x + pillar.x, 0, z + pillar.z, 0.45, top, 0.3, GLOW, neon, 0, 0, -heading);
    }
    b.box(x + centre.x, top, z + centre.z, half * 2 + 0.45, 0.45, 0.3, GLOW, neon, 0, 0, -heading);
  }
}

/**
 * Ground floor: columns round the edge (leaving the way through clear), and
 * light strips along the lane: kerb lights low on each side, a dashed centre
 * line, and bars across the ceiling.
 */
function lobby(b: CityBuilder, landmark: Landmark, accent: number, secondary: number) {
  const { lane, halfWidth, front, back, height } = landmark;
  const clearOfLane = (x: number, z: number) =>
    lane.every((point) => Math.hypot(point.x - x, point.z - z) > W + 1.2);

  // Columns every few units round the perimeter.
  const spacing = 6.5;
  const width = halfWidth * 2;
  const depth = front - back;
  const perimeter = 2 * (width + depth);
  const count = Math.round(perimeter / spacing);
  for (let index = 0; index < count; index++) {
    let at = (index / count) * perimeter;
    let x: number;
    let z: number;
    if (at < width) [x, z] = [-halfWidth + at, front];
    else if ((at -= width) < depth) [x, z] = [halfWidth, front - at];
    else if ((at -= depth) < width) [x, z] = [halfWidth - at, back];
    else [x, z] = [-halfWidth, back + (at - width)];
    const inset = { x: x - Math.sign(x) * 0.6 * (Math.abs(x) >= halfWidth - 0.01 ? 1 : 0), z };
    if (Math.abs(z - front) < 0.01) inset.z -= 0.6;
    if (Math.abs(z - back) < 0.01) inset.z += 0.6;
    if (!clearOfLane(inset.x, inset.z)) continue;
    b.box(inset.x, 0, inset.z, 0.9, height, 0.9, PLAIN, accent, 0.4);
    b.box(inset.x, 0, inset.z, 1.1, 0.25, 1.1, GLOW, secondary, 0);
  }

  lane.forEach((point, index) => {
    const yaw = -point.heading;
    if (index % 2 === 0) {
      for (const side of [-1, 1]) {
        const kerb = along(point.heading, side * (W - 0.7), 0);
        b.box(point.x + kerb.x, 0.05, point.z + kerb.z, 0.22, 0.08, 1.6, GLOW, accent, 0, 0, yaw);
      }
    }
    if (index % 2 === 1) b.box(point.x, 0.05, point.z, 0.16, 0.05, 1.2, GLOW, AMBER, 0, 0, yaw);
    if (index % 3 === 0) b.box(point.x, height - 0.35, point.z, W * 2 - 2, 0.2, 0.5, GLOW, secondary, 0, 0, yaw);
  });

  // The hall has its own roof; a regular landmark's tower is its ceiling.
  if (landmark.uTurn) b.box(0, height, (front + back) / 2, width, 0.6, depth, PLAIN, accent, 0.5);
}

/** Round island in the middle of the U-turn hall, ringed with light. */
function island(b: CityBuilder, landmark: Landmark, accent: number, secondary: number) {
  const radius = ROUTE.uTurnRadius - W - 1.5;
  const size = radius * 1.3;
  b.box(0, 0, 0, size, landmark.height, size, FINS, accent, 0.6);
  for (const y of [0.3, landmark.height * 0.5, landmark.height - 0.6]) b.crown(0, y, 0, size + 0.4, size + 0.4, secondary);
  // A screen on each face you pass as you go round.
  for (const [x, z, rotationY] of [
    [0, size / 2 + 0.05, 0],
    [size / 2 + 0.05, 0, Math.PI / 2],
    [-size / 2 - 0.05, 0, -Math.PI / 2],
    [0, -size / 2 - 0.05, Math.PI],
  ]) {
    b.anchors.push({ x, y: landmark.height / 2, z, width: size * 0.8, height: landmark.height * 0.55, rotationY, kind: "screen" });
  }
}

/** Adds a landmark to the builder and returns its neon colour indices. */
export function buildLandmark(b: CityBuilder, landmark: Landmark) {
  const [accent, secondary] = COLOURS[landmark.index % COLOURS.length];
  lobby(b, landmark, accent, secondary);
  portal(b, landmark.entranceX, landmark.front, 0, -1, landmark.height, accent, secondary);
  portal(b, landmark.exit.x, landmark.exit.z, landmark.exit.heading, 1, landmark.height, accent, secondary);

  if (landmark.uTurn) {
    island(b, landmark, accent, secondary);
    // The tower stands on the hall's roof, set back from the doors.
    b.offset = { x: 0, y: landmark.height + 0.6 - P, z: (landmark.front + landmark.back) / 2 };
  }
  const anchorsBefore = b.anchors.length;
  DESIGNS[landmark.index % DESIGNS.length](b, accent, secondary);
  // Signs a design adds directly need the same offset as its boxes.
  for (const anchor of b.anchors.slice(anchorsBefore)) {
    anchor.x += b.offset.x;
    anchor.y += b.offset.y;
    anchor.z += b.offset.z;
  }
  b.offset = { x: 0, y: 0, z: 0 };
  return { accent, secondary };
}
