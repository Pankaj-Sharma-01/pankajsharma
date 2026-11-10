import * as THREE from "three";

export type CityPalette = {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  /** Electric cyan. */
  accent: string;
  /** Hot pink. */
  hot: string;
  /** Sunrise amber. */
  sun: string;
  /** Ultraviolet. */
  ultra: string;
  skyZenith: string;
  skyDusk: string;
  skyHorizon: string;
};

// Layout, in world units. The journey has gates + 1 stops: one per gate,
// then the falls. Gate i (1-based) sits GATE_AHEAD units in front of where
// the camera is at stop i, so each gate is framed when its section is on
// screen, and scrolling on drives through it. The last stop is the cliff.
export const SPACING = 64;
export const START_Z = 30;
export const GATE_AHEAD = 38;
export const ROAD_HALF_WIDTH = 12;
export const SIDEWALK_WIDTH = 6;
export const GATE_HEIGHT = 17;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Neon colours in shader index order: cyan, pink, amber, violet. */
export function neonColors(palette: CityPalette): THREE.Color[] {
  return [palette.accent, palette.hot, palette.sun, palette.ultra].map((color) => new THREE.Color(color));
}

/** Matrix for a unit box/plane scaled to (w, h, d) and centred at (x, y, z). */
export function boxMatrix(x: number, y: number, z: number, w: number, h: number, d: number) {
  return new THREE.Matrix4().makeScale(w, h, d).setPosition(x, y, z);
}

export function instanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: readonly THREE.Matrix4[],
) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  // Instances span the whole city; per-mesh culling would wrongly hide them.
  mesh.frustumCulled = false;
  return mesh;
}

export const noiseChunk = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }
`;

export const uvVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** World-position vertex shader with fog, for flat surfaces (road, lake). */
export const worldVertexShader = /* glsl */ `
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
