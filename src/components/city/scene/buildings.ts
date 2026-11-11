import * as THREE from "three";

import { pick, type Random } from "@/lib/random";

import { CITY_CONFIG } from "../city-config";
import { BUILDING_SETBACK, ROAD_HALF_WIDTH, SIDEWALK_WIDTH, neonColors, type CityPalette } from "./shared";

/**
 * Procedural buildings and street furniture. Everything is composed from
 * boxes ("parts"): tiers, cores, crowns, pipes, balconies, scaffolding,
 * rooftop plant, vending machines, parked vehicles, figures, cables. All the
 * parts of one street render as a single instanced mesh, and the facade
 * detail (windows, balcony bands, fins, bracing, grime, neon) is drawn in
 * the fragment shader, so a dense street costs one draw call.
 *
 * Coordinates are local to whatever group the mesh is added to. For a
 * street that means: x across the street, -z along the direction of travel.
 */

export type SignKind = "screen" | "blade" | "strip" | "ticker";

/** Where a screen or sign should be mounted; consumed by signs.ts. */
export type SignAnchor = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotationY: number;
  kind: SignKind;
};

/** A plot of land a building stands on. */
export type Lot = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  /** Ground level; negative for megatowers rising out of the chasm. */
  baseY: number;
  /** Which side of the street: -1 left, 1 right. */
  side: -1 | 1;
  /** Blocks back from the street; 0 is the front row. */
  row: number;
};

// Facade styles, matched in the fragment shader.
export const WINDOWS = 0;
export const BANDS = 1;
export const FINS = 2;
export const PLAIN = 3;
export const TRUSS = 4;
export const GLOW = 5;

// Neon colour indices, matching neonColors().
export const CYAN = 0;
export const PINK = 1;
export const AMBER = 2;
export const VIOLET = 3;

type Part = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  seed: number;
  style: number;
  neon: number;
  edge: number;
  /** Rotation about the z axis, for sagging cables and tilted dishes. */
  tilt: number;
};

const vertexShader = /* glsl */ `
  attribute vec4 aInfo; // seed, style, neon index, edge strength
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec4 vInfo;
  #include <fog_pars_vertex>

  void main() {
    vec4 local = instanceMatrix * vec4(position, 1.0);
    vLocal = local.xyz;
    vNormal = normal;
    vUv = uv;
    vInfo = aInfo;
    vec4 mvPosition = modelViewMatrix * local;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uNeon[4];
  uniform vec3 uSun;
  uniform vec3 uCool;
  uniform float uTime;
  uniform float uGlow;
  uniform float uSpill;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec4 vInfo;
  #include <fog_pars_fragment>

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float seed = vInfo.x;
    float style = vInfo.y;
    vec3 neon = uNeon[int(vInfo.z + 0.5)];
    bool wall = abs(vNormal.y) < 0.5;
    // Horizontal facade coordinate in scene units, so detail never stretches.
    float u = abs(vNormal.x) > 0.5 ? vLocal.z : vLocal.x;
    float y = vLocal.y;

    // Each part gets its own shade of cladding.
    vec3 color = uBase * (0.8 + 0.4 * fract(seed * 7.31));
    // Sunrise catching the upper floors.
    color += uSun * 0.1 * smoothstep(25.0, 110.0, y);

    if (style > 4.5) {
      // Neon tube / warning light; some blink.
      float blink = seed > 0.7 ? 0.3 + 0.7 * step(0.0, sin(uTime * 2.5 + seed * 60.0)) : 1.0;
      color = neon * uGlow * blink;
    } else if (!wall) {
      color *= 0.7;
    } else {
      // Colour temperature of this building's lighting: warm, cool, or neon.
      float temperature = fract(seed * 13.7);
      vec3 lamp = temperature < 0.5 ? uSun : (temperature < 0.8 ? uCool : neon);

      if (style < 0.5) {
        // Window grid.
        vec2 grid = vec2(u / 1.7, y / 2.4);
        vec2 cell = floor(grid);
        vec2 f = fract(grid);
        float pane = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.78);
        float r = hash(cell + seed * 31.0);
        float lit = step(0.8, r);
        float flicker = mix(1.0, 0.55 + 0.45 * sin(uTime * (2.0 + r * 6.0) + r * 40.0), step(0.97, r));
        float choice = hash(cell * 1.31 + seed);
        vec3 tint = choice < 0.7 ? lamp : (choice < 0.85 ? uNeon[0] : uNeon[1]);
        color += pane * lit * flicker * tint * (0.2 + 0.5 * r);
      } else if (style < 1.5) {
        // Balcony bands: a ledge, then a strip of lit and unlit flats per floor.
        float level = floor(y / 3.0);
        float fy = fract(y / 3.0);
        float strip = step(0.38, fy) * step(fy, 0.74);
        float r = hash(vec2(floor(u / 4.0), level) + seed * 17.0);
        vec3 tint = hash(vec2(level, seed)) < 0.6 ? lamp : neon;
        color += strip * (0.03 + step(0.55, r) * tint * (0.15 + 0.4 * r));
        color *= 1.0 - 0.35 * step(fy, 0.12);
      } else if (style < 2.5) {
        // Vertical fins with the odd light chasing up between them.
        float slat = step(0.45, fract(u / 0.8));
        color *= 0.55 + 0.75 * slat;
        float lane = step(0.93, hash(vec2(floor(u / 0.8), seed * 91.0)));
        color += lane * (1.0 - slat) * neon * 0.5 * (0.6 + 0.4 * sin(y * 0.2 - uTime * 1.5 + seed * 10.0));
      } else if (style < 3.5) {
        // Plain metal cladding with panel seams.
        vec2 panel = fract(vec2(u / 3.2, y / 3.2));
        color *= 1.0 - 0.3 * clamp(step(panel.x, 0.04) + step(panel.y, 0.04), 0.0, 1.0);
      } else {
        // Cross-braced structural frame.
        vec2 bay = fract(vec2(u / 7.0, y / 7.0));
        float diagonal = 1.0 - smoothstep(0.03, 0.07, min(abs(bay.x - bay.y), abs(bay.x + bay.y - 1.0)));
        float beam = 1.0 - smoothstep(0.02, 0.05, min(bay.y, 1.0 - bay.y));
        color = uBase * 0.6 + neon * 0.35 * max(diagonal, beam);
      }

      // Grime running down the cladding, and street neon washing up it.
      color *= 0.86 + 0.14 * hash(vec2(floor(u / 0.7), seed * 5.0));
      color += neon * uSpill * (y < 0.0 ? 0.0 : exp(-y / 7.0));
    }

    // Neon outline: constant on-screen width at any size.
    vec2 edgeDistance = min(vUv, 1.0 - vUv);
    float distanceToEdge = min(edgeDistance.x, edgeDistance.y);
    float edge = 1.0 - smoothstep(0.0, fwidth(distanceToEdge) * 1.6, distanceToEdge);
    color = mix(color, neon, edge * vInfo.w);

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

export type StreetLotOptions = {
  /** Street runs from local z = `from` down to `to` (from > to). */
  from: number;
  to: number;
  /** Rows of blocks back from the street: [left side, right side]. */
  columns: readonly [number, number];
  /**
   * Corners where this street meets a perpendicular one. On `side`, the
   * block beside the corner is shared with that other street, so each keeps
   * only the plots nearer to itself (split along the diagonal).
   */
  sharedCorners: readonly { z: number; side: -1 | 1 }[];
  /** Side whose rows carry on a little past `to`, to back the scene behind a landmark. */
  extendPast: -1 | 0 | 1;
};

const BLOCK = 14;
const EXTENSION = 50;

/** City blocks lining one street. */
export function streetLots(random: Random, options: StreetLotOptions): Lot[] {
  const lots: Lot[] = [];
  const sides = [-1, 1] as const;
  for (const side of sides) {
    const maxColumns = options.columns[side === -1 ? 0 : 1];
    const end = side === options.extendPast ? options.to - EXTENSION : options.to;
    for (let z = options.from; z > end; z -= BLOCK) {
      // Past the street's end only a few rows are needed.
      const columns = z < options.to ? Math.min(maxColumns, 3) : maxColumns;
      for (let column = 0; column < columns; column++) {
        const width = 6 + random() * 6;
        const depth = 6 + random() * 6;
        // Taller further from the street: the skyline rises behind it.
        const height = 6 + random() * (18 + (column / 7) * 75) + (random() < 0.06 ? 60 : 0);
        const lateral = BUILDING_SETBACK + column * BLOCK + BLOCK / 2 + (random() - 0.5) * 3;
        const lotZ = Math.max(z + (random() - 0.5) * 3, end + depth / 2);
        if (random() < 0.12) continue;
        const shared = options.sharedCorners.some(
          (corner) => corner.side === side && Math.abs(lotZ - corner.z) < lateral + 7,
        );
        if (shared) continue;
        lots.push({ x: side * lateral, z: lotZ, width, depth, height, baseY: 0, side, row: column });
      }
    }
  }
  return lots;
}

export class CityBuilder {
  readonly parts: Part[] = [];
  readonly anchors: SignAnchor[] = [];

  constructor(
    readonly random: Random,
    /** Add rooftop clutter, facade fittings, and the richer building types. */
    private readonly detailed: boolean,
  ) {}

  /** Adds a box standing on `baseY`. */
  box(
    x: number,
    baseY: number,
    z: number,
    w: number,
    h: number,
    d: number,
    style: number,
    neon: number,
    edge = 0.5,
    tilt = 0,
  ) {
    this.parts.push({ x, y: baseY, z, w, h, d, seed: this.random(), style, neon, edge, tilt });
  }

  neon() {
    const roll = this.random();
    return roll < 0.45 ? CYAN : roll < 0.8 ? PINK : roll < 0.93 ? AMBER : VIOLET;
  }

  build(lot: Lot) {
    const r = this.random;
    let uniform = false; // true when the facade is one flat face, top to bottom
    if (lot.baseY < 0) {
      this.megatower(lot);
      return;
    }
    if (lot.row === 0 && lot.height < 20) {
      this.shop(lot);
    } else if (!this.detailed || lot.row > 2) {
      if (r() < 0.6) this.tiered(lot);
      else uniform = this.slab(lot);
    } else {
      const roll = r();
      if (roll < 0.3) this.tiered(lot);
      else if (roll < 0.5) uniform = this.slab(lot);
      else if (roll < 0.65) uniform = this.truss(lot);
      else if (roll < 0.8) this.mushroom(lot);
      else uniform = this.apartment(lot);
    }
    if (this.detailed && lot.row <= 1) this.fittings(lot);
    this.signs(lot, uniform);
  }

  /** Stepped tower with setbacks and a spire. */
  private tiered(lot: Lot) {
    const r = this.random;
    const style = pick(r, [WINDOWS, WINDOWS, BANDS, FINS]);
    const neon = this.neon();
    const tiers = 2 + Math.floor(r() * 3);
    let { width, depth } = lot;
    let y = lot.baseY;
    let left = lot.height;
    for (let tier = 0; tier < tiers; tier++) {
      const h = tier === tiers - 1 ? left : left * (0.45 + r() * 0.2);
      this.box(lot.x, y, lot.z, width, h, depth, style, neon);
      y += h;
      left -= h;
      width *= 0.7 + r() * 0.12;
      depth *= 0.7 + r() * 0.12;
    }
    if (this.detailed) this.spire(lot.x, y, lot.z, 5 + r() * 12);
  }

  /** Flat slab with a service core at the back and a glowing crown. */
  private slab(lot: Lot) {
    const r = this.random;
    const neon = this.neon();
    this.box(lot.x, lot.baseY, lot.z, lot.width, lot.height, lot.depth, pick(r, [FINS, BANDS, WINDOWS]), neon);
    this.box(
      lot.x + (r() - 0.5) * lot.width * 0.4,
      lot.baseY,
      lot.z - lot.depth / 2 - 1,
      lot.width * 0.35,
      lot.height * (1.02 + r() * 0.08),
      2.4,
      PLAIN,
      neon,
      0.25,
    );
    if (this.detailed) {
      this.crown(lot.x, lot.baseY + lot.height, lot.z, lot.width, lot.depth, neon);
      this.roofClutter(lot.x, lot.baseY + lot.height, lot.z, lot.width, lot.depth);
    }
    return true;
  }

  /** Cross-braced frame tower with a capped top. */
  private truss(lot: Lot) {
    const neon = this.neon();
    const frame = lot.height * 0.92;
    this.box(lot.x, lot.baseY, lot.z, lot.width * 0.86, frame, lot.depth * 0.86, TRUSS, neon, 0.7);
    this.box(lot.x, lot.baseY + frame, lot.z, lot.width, 0.5, lot.depth, PLAIN, neon, 0.6);
    this.box(lot.x, lot.baseY + frame + 0.5, lot.z, lot.width * 0.7, lot.height * 0.08, lot.depth * 0.7, BANDS, neon);
    this.spire(lot.x, lot.baseY + lot.height + 0.5, lot.z, 4 + this.random() * 8);
    return true;
  }

  /** Narrow shaft carrying a wide head. */
  private mushroom(lot: Lot) {
    const r = this.random;
    const neon = this.neon();
    const shaft = lot.height * (0.55 + r() * 0.15);
    this.box(lot.x, lot.baseY, lot.z, lot.width * 0.5, shaft, lot.depth * 0.5, PLAIN, neon, 0.35);
    this.box(lot.x, lot.baseY + shaft - 0.4, lot.z, lot.width * 0.56, 0.4, lot.depth * 0.56, GLOW, neon, 0);
    this.box(lot.x, lot.baseY + shaft, lot.z, lot.width, lot.height - shaft, lot.depth, BANDS, neon);
    this.roofClutter(lot.x, lot.baseY + lot.height, lot.z, lot.width, lot.depth);
  }

  /** Apartment block with pods bolted onto the street side. */
  private apartment(lot: Lot) {
    const r = this.random;
    const neon = this.neon();
    this.box(lot.x, lot.baseY, lot.z, lot.width, lot.height, lot.depth, BANDS, neon);
    const pods = 2 + Math.floor(r() * 3);
    for (let pod = 0; pod < pods; pod++) {
      const y = 8 + pod * 3.6 + r() * 1.5;
      if (y + 3 > lot.height) break;
      this.box(
        lot.x - lot.side * (lot.width / 2 + 0.9),
        y,
        lot.z + (r() - 0.5) * lot.depth * 0.5,
        1.8,
        2.6,
        3.2,
        PLAIN,
        this.neon(),
        0.8,
      );
    }
    this.crown(lot.x, lot.baseY + lot.height, lot.z, lot.width, lot.depth, neon);
    this.roofClutter(lot.x, lot.baseY + lot.height, lot.z, lot.width, lot.depth);
    return true;
  }

  /** Low street-front unit: awning, shop sign, rooftop plant. */
  private shop(lot: Lot) {
    const r = this.random;
    const neon = this.neon();
    this.box(lot.x, 0, lot.z, lot.width, lot.height, lot.depth, pick(r, [WINDOWS, BANDS, PLAIN]), neon, 0.45);
    const face = lot.x - lot.side * (lot.width / 2);
    this.box(face - lot.side * 1.1, 3.8, lot.z, 2.2, 0.25, lot.depth * 0.9, PLAIN, neon, 0.6);
    this.anchors.push({
      x: face - lot.side * 0.25,
      y: 4.9,
      z: lot.z,
      width: lot.depth * 0.85,
      height: 1.05,
      rotationY: (-lot.side * Math.PI) / 2,
      kind: "strip",
    });
    this.roofClutter(lot.x, lot.height, lot.z, lot.width, lot.depth);
    if (this.detailed && r() < 0.5) {
      // Water tank on a plinth.
      const x = lot.x + (r() - 0.5) * lot.width * 0.4;
      const z = lot.z + (r() - 0.5) * lot.depth * 0.4;
      this.box(x, lot.height, z, 1.6, 1.2, 1.6, PLAIN, AMBER, 0);
      this.box(x, lot.height + 1.2, z, 2.4, 2.2, 2.4, PLAIN, AMBER, 0.5);
    }
  }

  /** Tower rising from the bottom of the chasm, far taller than the city. */
  private megatower(lot: Lot) {
    const r = this.random;
    const neon = this.neon();
    const above = lot.height + lot.baseY; // height above ground level
    const shoulder = above * 0.65;
    this.box(lot.x, lot.baseY, lot.z, lot.width, shoulder - lot.baseY, lot.depth, pick(r, [WINDOWS, BANDS, FINS]), neon);
    this.box(lot.x, shoulder, lot.z, lot.width * 0.7, above - shoulder, lot.depth * 0.7, pick(r, [WINDOWS, FINS]), neon);
    this.crown(lot.x, shoulder, lot.z, lot.width, lot.depth, neon);
    this.spire(lot.x, above, lot.z, 20 + r() * 40);
    if (r() < 0.6) {
      const width = lot.width * 0.8;
      this.anchors.push({
        x: lot.x,
        y: 20 + r() * Math.max(10, shoulder - 50),
        z: lot.z + lot.depth / 2 + 0.4,
        width,
        height: width * (0.7 + r() * 0.6),
        rotationY: 0,
        kind: "screen",
      });
    }
  }

  /** Distant tower for the far skyline: big, simple, mostly lost in haze. */
  farTower(x: number, z: number, width: number, height: number) {
    const neon = this.neon();
    const style = pick(this.random, [WINDOWS, BANDS, FINS]);
    this.box(x, 0, z, width, height * 0.7, width, style, neon, 0.35);
    this.box(x, height * 0.7, z, width * 0.65, height * 0.3, width * 0.65, style, neon, 0.35);
    this.spire(x, height, z, 14 + this.random() * 30);
  }

  /** Enclosed bridge spanning the street, with a news ticker along its front. */
  skybridge(z: number, y: number) {
    const span = 2 * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH + 2);
    const neon = this.neon();
    this.box(0, y, z, span, 3, 4.5, BANDS, neon, 0.6);
    this.box(0, y - 0.2, z, span, 0.2, 0.4, GLOW, neon, 0);
    this.anchors.push({ x: 0, y: y - 1.1, z: z + 2.4, width: span * 0.8, height: 1.3, rotationY: 0, kind: "ticker" });
  }

  /** Mast with a warning light. */
  spire(x: number, y: number, z: number, height: number) {
    this.box(x, y, z, 0.3, height, 0.3, PLAIN, PINK, 0);
    this.box(x, y + height, z, 0.6, 0.6, 0.6, GLOW, PINK, 0);
  }

  /** Neon tubes around a roof edge. */
  crown(x: number, y: number, z: number, w: number, d: number, neon: number) {
    for (const side of [-1, 1]) {
      this.box(x, y, z + (side * d) / 2, w, 0.35, 0.35, GLOW, neon, 0);
      this.box(x + (side * w) / 2, y, z, 0.35, 0.35, d, GLOW, neon, 0);
    }
  }

  /** Air handlers, vents, and the occasional antenna. */
  roofClutter(x: number, y: number, z: number, w: number, d: number) {
    if (!this.detailed) return;
    const r = this.random;
    const units = 1 + Math.floor(r() * 3);
    for (let unit = 0; unit < units; unit++) {
      const size = 1.2 + r() * 1.6;
      this.box(x + (r() - 0.5) * (w - size), y, z + (r() - 0.5) * (d - size), size, 0.8 + r() * 0.8, size, PLAIN, CYAN, 0.2);
    }
    if (r() < 0.5) {
      const mast = 3 + r() * 4;
      const ax = x + (r() - 0.5) * w * 0.6;
      const az = z + (r() - 0.5) * d * 0.6;
      this.box(ax, y, az, 0.15, mast, 0.15, PLAIN, PINK, 0);
      this.box(ax, y + mast, az, 0.35, 0.35, 0.35, GLOW, PINK, 0);
    }
  }

  /** Things bolted to the street face: pipes, AC units, balconies, scaffolding, neon. */
  private fittings(lot: Lot) {
    const r = this.random;
    const face = lot.x - lot.side * (lot.width / 2);
    const along = () => lot.z + (r() - 0.5) * lot.depth * 0.8;
    const reach = Math.min(lot.height, 30);

    if (r() < 0.6) this.box(face - lot.side * 0.2, 0, along(), 0.3, reach, 0.3, PLAIN, AMBER, 0.15);
    if (lot.height > 8) {
      const units = Math.floor(r() * 4);
      for (let unit = 0; unit < units; unit++) {
        this.box(face - lot.side * 0.5, 5 + r() * Math.min(lot.height - 7, 14), along(), 1, 0.8, 1.4, PLAIN, CYAN, 0.25);
      }
    }
    if (lot.height > 16 && r() < 0.5) {
      const neon = this.neon();
      const levels = Math.min(5, Math.floor((lot.height - 8) / 3));
      for (let level = 0; level < levels; level++) {
        this.box(face - lot.side * 0.7, 6.5 + level * 3, lot.z, 1.4, 0.18, lot.depth * 0.7, PLAIN, neon, 0.35);
      }
    }
    if (r() < 0.16) {
      this.box(face - lot.side * 0.4, 0, lot.z, 0.5, Math.min(lot.height, 14), lot.depth * 0.6, TRUSS, AMBER, 0.6);
    }
    if (lot.height > 10 && r() < 0.35) {
      const corner = r() < 0.5 ? -1 : 1;
      this.box(face - lot.side * 0.12, 2, lot.z + (corner * lot.depth) / 2, 0.25, lot.height - 3, 0.25, GLOW, this.neon(), 0);
    }
  }

  /** Decides where screens and signs hang on a street building. */
  private signs(lot: Lot, uniform: boolean) {
    const r = this.random;
    const face = lot.x - lot.side * (lot.width / 2 + 0.3);
    // Stepped towers narrow above their first tier, so keep signs low on them.
    const top = uniform || lot.height < 20 ? lot.height : lot.height * 0.45;

    if (lot.row === 0) {
      // Screen on the facade that faces the street.
      const height = Math.min(2.5 + r() * 4, top - 7);
      if (height > 1.5 && r() < 0.75) {
        this.anchors.push({
          x: face,
          y: 6.2 + height / 2 + r() * Math.max(0, top - 7 - height),
          z: lot.z,
          width: Math.min(lot.depth * 0.8, height * (1 + r() * 0.8)),
          height,
          rotationY: (-lot.side * Math.PI) / 2,
          kind: "screen",
        });
      }
      // Blade sign projecting over the pavement, facing oncoming traffic.
      const blade = Math.min(4 + r() * 4, top - 5.5);
      if (blade > 2.5 && r() < 0.6) {
        this.anchors.push({
          x: face - lot.side * 0.8,
          y: 5.5 + blade / 2,
          z: lot.z + (r() - 0.5) * lot.depth * 0.7,
          width: blade / 4,
          height: blade,
          rotationY: 0,
          kind: "blade",
        });
      }
    }

    if (lot.row <= 2 && uniform && lot.height > 34) {
      // Big screen high on the face you drive toward, or an LED ticker round it.
      const width = lot.width * 0.8;
      if (r() < 0.6) {
        this.anchors.push({
          x: lot.x,
          y: lot.height * (0.5 + r() * 0.3),
          z: lot.z + lot.depth / 2 + 0.3,
          width,
          height: width * (0.7 + r() * 0.7),
          rotationY: 0,
          kind: "screen",
        });
      } else {
        this.anchors.push({
          x: lot.x,
          y: lot.height * (0.3 + r() * 0.2),
          z: lot.z + lot.depth / 2 + 0.3,
          width: lot.width,
          height: 1.4,
          rotationY: 0,
          kind: "ticker",
        });
      }
    }
  }

  // --- Street furniture --------------------------------------------------
  // All of these take a side (-1 left, 1 right) and a position along the street.

  /** Vending machine against the buildings, its front lit. */
  vendingMachine(side: number, z: number) {
    const x = side * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH - 0.7);
    this.box(x, 0.3, z, 0.9, 2.1, 1.3, PLAIN, this.neon(), 0.5);
    this.box(x - side * 0.5, 0.9, z, 0.08, 1.2, 1, GLOW, pick(this.random, [CYAN, PINK, AMBER]), 0);
  }

  /** A few stacked crates. */
  crates(side: number, z: number) {
    const r = this.random;
    const x = side * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH - 1.4);
    const count = 2 + Math.floor(r() * 3);
    for (let index = 0; index < count; index++) {
      const size = 0.7 + r() * 0.5;
      const stacked = index > 1 ? 0.9 : 0;
      this.box(x + (r() - 0.5) * 1.2, 0.3 + stacked, z + index * 0.9 - stacked, size, size, size, PLAIN, AMBER, 0.45);
    }
  }

  /** Vehicle parked at the kerb, lights on. */
  parkedVehicle(side: number, z: number) {
    const r = this.random;
    const x = side * (ROAD_HALF_WIDTH - 1.4);
    const length = 3.8 + r() * 1.2;
    const neon = this.neon();
    this.box(x, 0.35, z, 1.9, 0.85, length, PLAIN, neon, 0.55);
    this.box(x, 1.2, z + 0.2, 1.7, 0.65, length * 0.5, PLAIN, neon, 0.3);
    // Tail lights toward the camera, headlights away.
    this.box(x, 0.75, z + length / 2, 1.6, 0.14, 0.06, GLOW, PINK, 0);
    this.box(x, 0.7, z - length / 2, 1.5, 0.14, 0.06, GLOW, AMBER, 0);
  }

  /** Small standing figure; some carry an umbrella or wear a lit visor. */
  figure(side: number, z: number) {
    const r = this.random;
    const x = side * (ROAD_HALF_WIDTH + 0.8 + r() * (SIDEWALK_WIDTH - 1.8));
    const height = 1.15 + r() * 0.25;
    this.box(x, 0.3, z, 0.45, height, 0.3, PLAIN, this.neon(), 0.3);
    this.box(x, 0.3 + height + 0.04, z, 0.28, 0.28, 0.28, PLAIN, AMBER, 0.2);
    const roll = r();
    if (roll < 0.25) this.box(x, 0.3 + height + 0.55, z, 1.15, 0.06, 1.15, PLAIN, this.neon(), 0.8);
    else if (roll < 0.45) this.box(x, 0.3 + height + 0.13, z + 0.15, 0.3, 0.07, 0.04, GLOW, pick(r, [CYAN, PINK]), 0);
  }

  /** Cable slung across the street between buildings, sagging in the middle, with a lantern. */
  cable(z: number, y: number) {
    const half = ROAD_HALF_WIDTH + SIDEWALK_WIDTH + 1.5;
    const sag = 0.06;
    this.box(-half / 2, y, z, half + 0.1, 0.07, 0.07, PLAIN, PINK, 0, -sag);
    this.box(half / 2, y, z, half + 0.1, 0.07, 0.07, PLAIN, PINK, 0, sag);
    if (this.random() < 0.7) {
      this.box(0, y - (half / 2) * sag - 0.5, z, 0.32, 0.4, 0.32, GLOW, pick(this.random, [PINK, AMBER, CYAN]), 0);
    }
  }

  /** Builds the single instanced mesh for everything added so far. */
  createMesh(palette: CityPalette) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);
    const info = new Float32Array(this.parts.length * 4);
    this.parts.forEach((part, index) => info.set([part.seed, part.style, part.neon, part.edge], index * 4));
    geometry.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uBase: { value: new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.3) },
          uNeon: { value: neonColors(palette) },
          uSun: { value: new THREE.Color(palette.sun) },
          uCool: { value: new THREE.Color(palette.foreground).multiplyScalar(0.75) },
          uTime: { value: 0 },
          uGlow: { value: CITY_CONFIG.glow.neonTubes },
          uSpill: { value: CITY_CONFIG.glow.facadeSpill },
        },
      ]),
    });

    const mesh = new THREE.InstancedMesh(geometry, material, this.parts.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const zAxis = new THREE.Vector3(0, 0, 1);
    this.parts.forEach((part, index) => {
      position.set(part.x, part.y, part.z);
      rotation.setFromAxisAngle(zAxis, part.tilt);
      scale.set(part.w, part.h, part.d);
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;

    return {
      mesh,
      update(elapsed: number) {
        material.uniforms.uTime.value = elapsed;
      },
    };
  }
}
