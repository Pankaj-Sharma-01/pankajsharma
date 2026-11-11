import { ROUTE, type Turn } from "../route";
import { AMBER, BANDS, CYAN, CityBuilder, FINS, GLOW, PINK, PLAIN, TRUSS, VIOLET, WINDOWS } from "./buildings";

/**
 * Landmark buildings: one per site section, each with its own silhouette,
 * accent colours, and a glowing drive-through lobby.
 *
 * Built in the landmark's own frame: the entrance is on the +z face, the
 * camera drives in heading -z, turns inside, and leaves through the side
 * face on `turn` (+x for a right turn, -x for a left) or straight out the back.
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

/** Ground floor: the footprint minus the drive-through, with light lines to follow. */
function lobby(b: CityBuilder, turn: Turn, accent: number, secondary: number) {
  const wall = (x: number, z: number, w: number, d: number) => b.box(x, 0, z, w, P, d, PLAIN, accent, 0.25);
  // Guide lights low and high on a wall face: `along` is the axis the strip runs on.
  const guide = (x: number, z: number, length: number, along: "x" | "z") => {
    for (const [y, neon] of [
      [1, accent],
      [P - 1.6, secondary],
    ]) {
      b.box(x, y, z, along === "x" ? length : 0.15, 0.3, along === "z" ? length : 0.15, GLOW, neon, 0);
    }
  };
  const inset = W - 0.12;

  if (turn === 0) {
    for (const side of [-1, 1]) {
      wall((side * (H + W)) / 2, 0, H - W, SIDE);
      guide(side * inset, 0, SIDE, "z");
    }
  } else {
    // Outer block (full depth), back block, and the block inside the turn.
    wall((-turn * (H + W)) / 2, 0, H - W, SIDE);
    wall((turn * (H - W)) / 2, -(H + W) / 2, H + W, H - W);
    wall((turn * (H + W)) / 2, (H + W) / 2, H - W, H - W);
    guide(-turn * inset, (H - W) / 2, H + W, "z");
    guide(turn * inset, (H + W) / 2, H - W, "z");
    guide((turn * (H - W)) / 2, -inset, H + W, "x");
    guide((turn * (H + W)) / 2, inset, H - W, "x");
  }

  // Ceiling light bars along the way through.
  for (const z of [12, 5]) b.box(0, P - 0.35, z, W * 2 - 2, 0.2, 0.5, GLOW, secondary, 0);
  if (turn === 0) {
    for (const z of [-5, -12]) b.box(0, P - 0.35, z, W * 2 - 2, 0.2, 0.5, GLOW, secondary, 0);
  } else {
    for (const x of [5, 12]) b.box(turn * x, P - 0.35, 0, 0.5, 0.2, W * 2 - 2, GLOW, secondary, 0);
  }
}

/** Glowing double frame around an opening, on a face perpendicular to `axis`. */
function portal(b: CityBuilder, axis: "x" | "z", face: number, accent: number, secondary: number) {
  for (const [grow, neon, offset] of [
    [0.3, accent, 0.25],
    [1.3, secondary, 0.12],
  ]) {
    const at = face + Math.sign(face) * offset;
    const half = W + grow;
    const height = P + grow;
    for (const side of [-1, 1]) {
      if (axis === "z") b.box(side * half, 0, at, 0.45, height, 0.3, GLOW, neon, 0);
      else b.box(at, 0, side * half, 0.3, height, 0.45, GLOW, neon, 0);
    }
    if (axis === "z") b.box(0, height, at, half * 2 + 0.45, 0.45, 0.3, GLOW, neon, 0);
    else b.box(at, height, 0, 0.3, 0.45, half * 2 + 0.45, GLOW, neon, 0);
  }
}

/** Adds landmark number `index` to the builder and returns its neon colour indices. */
export function buildLandmark(b: CityBuilder, index: number, turn: Turn) {
  const [accent, secondary] = COLOURS[index % COLOURS.length];
  lobby(b, turn, accent, secondary);
  portal(b, "z", H, accent, secondary);
  if (turn === 0) portal(b, "z", -H, accent, secondary);
  else portal(b, "x", turn * H, accent, secondary);
  DESIGNS[index % DESIGNS.length](b, accent, secondary);
  return { accent, secondary };
}
