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

// Street cross-section, in world units. The route's shape is in ../route.ts.
export const ROAD_HALF_WIDTH = 12;
export const SIDEWALK_WIDTH = 6;
/** Distance from a street's centre line to the first building plots. */
export const BUILDING_SETBACK = ROAD_HALF_WIDTH + SIDEWALK_WIDTH + 1;

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

/**
 * Vertex shader for flat surfaces (road, lake). `vLocal` is the position in
 * the object's own frame, so patterns follow a street whichever way it runs;
 * `vWorld` is for distance-based effects.
 */
export const surfaceVertexShader = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

/** Soft white disc fading to transparent, for halos and pools of light. */
export function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.25)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}
