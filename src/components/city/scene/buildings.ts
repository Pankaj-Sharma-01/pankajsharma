import * as THREE from "three";

import { pick, type Random } from "@/lib/random";

import { ROAD_HALF_WIDTH, SIDEWALK_WIDTH, neonColors, type CityPalette } from "./shared";

/**
 * Procedural buildings. Every building is composed from boxes ("parts"):
 * tiers, cores, crowns, awnings, rooftop clutter, spires. All parts of all
 * buildings render as one instanced mesh, and the facade detail (windows,
 * balcony bands, fins, bracing, neon) is drawn in the fragment shader, so a
 * dense city costs a single draw call.
 */

/** Where a screen or sign should be mounted; consumed by signs.ts. */
export type SignAnchor = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotationY: number;
  kind: "screen" | "blade";
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
  /** Which side of the avenue: -1 left, 1 right. */
  side: -1 | 1;
  /** Blocks back from the avenue; 0 is the front row. */
  row: number;
};

// Facade styles, matched in the fragment shader.
const WINDOWS = 0;
const BANDS = 1;
const FINS = 2;
const PLAIN = 3;
const TRUSS = 4;
const GLOW = 5;

// Neon colour indices, matching neonColors().
const CYAN = 0;
const PINK = 1;
const AMBER = 2;

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
};

const vertexShader = /* glsl */ `
  attribute vec4 aInfo; // seed, style, neon index, edge strength
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec4 vInfo;
  #include <fog_pars_vertex>

  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normal;
    vUv = uv;
    vInfo = aInfo;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uNeon[4];
  uniform vec3 uSun;
  uniform float uTime;
  varying vec3 vWorld;
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
    // Horizontal facade coordinate in world units, so detail never stretches.
    float u = abs(vNormal.x) > 0.5 ? vWorld.z : vWorld.x;
    float y = vWorld.y;

    vec3 color = uBase;
    // Sunrise catching the upper floors.
    color += uSun * 0.1 * smoothstep(25.0, 110.0, y);

    if (style > 4.5) {
      // Neon tube / warning light; some blink.
      float blink = seed > 0.7 ? 0.3 + 0.7 * step(0.0, sin(uTime * 2.5 + seed * 60.0)) : 1.0;
      color = neon * 0.75 * blink;
    } else if (!wall) {
      color *= 0.7;
    } else if (style < 0.5) {
      // Window grid.
      vec2 grid = vec2(u / 1.7, y / 2.4);
      vec2 cell = floor(grid);
      vec2 f = fract(grid);
      float pane = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.78);
      float r = hash(cell + seed * 31.0);
      float lit = step(0.8, r);
      float flicker = mix(1.0, 0.55 + 0.45 * sin(uTime * (2.0 + r * 6.0) + r * 40.0), step(0.97, r));
      float choice = hash(cell * 1.31 + seed);
      vec3 tint = choice < 0.45 ? uSun : (choice < 0.75 ? uNeon[0] : uNeon[1]);
      color += pane * lit * flicker * tint * (0.2 + 0.5 * r);
    } else if (style < 1.5) {
      // Balcony bands: a ledge, then a strip of lit and unlit flats per floor.
      float level = floor(y / 3.0);
      float fy = fract(y / 3.0);
      float strip = step(0.38, fy) * step(fy, 0.74);
      float r = hash(vec2(floor(u / 4.0), level) + seed * 17.0);
      vec3 tint = hash(vec2(level, seed)) < 0.6 ? uSun : neon;
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

    // Neon outline: constant on-screen width at any size.
    vec2 edgeDistance = min(vUv, 1.0 - vUv);
    float distanceToEdge = min(edgeDistance.x, edgeDistance.y);
    float edge = 1.0 - smoothstep(0.0, fwidth(distanceToEdge) * 1.6, distanceToEdge);
    color = mix(color, neon, edge * vInfo.w);

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

/** City blocks lining the avenue, from zFrom down to zTo. */
export function streetLots(random: Random, zFrom: number, zTo: number, lowPower: boolean): Lot[] {
  const cell = 14;
  const columns = lowPower ? 4 : 7;
  const lots: Lot[] = [];
  for (let z = zFrom; z > zTo; z -= cell) {
    for (const side of [-1, 1] as const) {
      for (let column = 0; column < columns; column++) {
        if (random() < 0.12) continue;
        const width = 6 + random() * 6;
        const depth = 6 + random() * 6;
        // Taller further from the avenue: the skyline rises behind the street.
        const height = 6 + random() * (18 + (column / columns) * 75) + (random() < 0.06 ? 60 : 0);
        const x =
          side * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH + 1 + column * cell + cell / 2 + (random() - 0.5) * 3);
        lots.push({
          x,
          z: Math.max(z + (random() - 0.5) * 3, zTo + depth / 2),
          width,
          depth,
          height,
          baseY: 0,
          side,
          row: column,
        });
      }
    }
  }
  return lots;
}

export class CityBuilder {
  readonly parts: Part[] = [];
  readonly anchors: SignAnchor[] = [];

  constructor(
    private readonly random: Random,
    /** Add rooftop clutter, crowns, and the richer building types. */
    private readonly detailed: boolean,
  ) {}

  /** Adds a box standing on `baseY`. */
  box(x: number, baseY: number, z: number, w: number, h: number, d: number, style: number, neon: number, edge = 0.5) {
    this.parts.push({ x, y: baseY, z, w, h, d, seed: this.random(), style, neon, edge });
  }

  private neon() {
    const roll = this.random();
    return roll < 0.5 ? CYAN : roll < 0.85 ? PINK : AMBER;
  }

  build(lot: Lot) {
    const r = this.random;
    let uniform = false; // true when the facade is one flat face, top to bottom
    if (lot.baseY < 0) {
      this.megatower(lot);
    } else if (lot.row === 0 && lot.height < 20) {
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
    if (lot.baseY === 0) this.signs(lot, uniform);
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

  /** Low street-front unit: awning, sign band, rooftop plant. */
  private shop(lot: Lot) {
    const r = this.random;
    const neon = this.neon();
    this.box(lot.x, 0, lot.z, lot.width, lot.height, lot.depth, pick(r, [WINDOWS, BANDS, PLAIN]), neon, 0.45);
    const face = lot.x - lot.side * (lot.width / 2);
    this.box(face - lot.side * 1.1, 3.8, lot.z, 2.2, 0.25, lot.depth * 0.9, PLAIN, neon, 0.6);
    this.box(face - lot.side * 0.12, 4.4, lot.z, 0.2, 0.8, lot.depth * 0.85, GLOW, this.neon(), 0);
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

  /** Enclosed bridge spanning the avenue between two blocks. */
  skybridge(z: number, y: number) {
    const span = 2 * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH + 2);
    const neon = this.neon();
    this.box(0, y, z, span, 3, 4.5, BANDS, neon, 0.6);
    this.box(0, y - 0.2, z, span, 0.2, 0.4, GLOW, neon, 0);
  }

  /** Mast with a warning light. */
  spire(x: number, y: number, z: number, height: number) {
    this.box(x, y, z, 0.3, height, 0.3, PLAIN, PINK, 0);
    this.box(x, y + height, z, 0.6, 0.6, 0.6, GLOW, PINK, 0);
  }

  /** Neon tubes around a roof edge. */
  private crown(x: number, y: number, z: number, w: number, d: number, neon: number) {
    for (const side of [-1, 1]) {
      this.box(x, y, z + (side * d) / 2, w, 0.35, 0.35, GLOW, neon, 0);
      this.box(x + (side * w) / 2, y, z, 0.35, 0.35, d, GLOW, neon, 0);
    }
  }

  /** Air handlers, vents, and the occasional antenna. */
  private roofClutter(x: number, y: number, z: number, w: number, d: number) {
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

  /** Decides where screens and blade signs hang on a street building. */
  private signs(lot: Lot, uniform: boolean) {
    const r = this.random;
    const face = lot.x - lot.side * (lot.width / 2 + 0.3);
    // Stepped towers narrow above their first tier, so keep signs low on them.
    const top = uniform || lot.height < 20 ? lot.height : lot.height * 0.45;

    if (lot.row === 0) {
      // Screen on the facade that faces the avenue.
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

    // Big screen high on the face you drive toward.
    if (lot.row <= 2 && uniform && lot.height > 34 && r() < 0.75) {
      const width = lot.width * 0.8;
      const height = width * (0.7 + r() * 0.7);
      this.anchors.push({
        x: lot.x,
        y: lot.height * (0.5 + r() * 0.3),
        z: lot.z + lot.depth / 2 + 0.3,
        width,
        height,
        rotationY: 0,
        kind: "screen",
      });
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
          uTime: { value: 0 },
        },
      ]),
    });

    const mesh = new THREE.InstancedMesh(geometry, material, this.parts.length);
    const matrix = new THREE.Matrix4();
    this.parts.forEach((part, index) => {
      matrix.makeScale(part.w, part.h, part.d);
      matrix.setPosition(part.x, part.y, part.z);
      mesh.setMatrixAt(index, matrix);
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
