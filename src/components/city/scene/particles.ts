import * as THREE from "three";

import type { Random } from "@/lib/random";

/**
 * Particles animated entirely on the GPU: the CPU never touches them after
 * creation. Rain and mist are a box of points that tiles the world and is
 * drawn around the camera; steam is a set of puffs rising from fixed vents.
 */

/** Shared uniform: converts a size in world units to pixels at distance 1. Set on resize. */
export const pointScale = { value: 400 };

const wrappedVertexShader = /* glsl */ `
  uniform vec3 uBox;
  uniform vec3 uVelocity;
  uniform vec3 uCenter;
  uniform float uTime;
  uniform float uSize;
  uniform float uPointScale;
  varying float vFade;

  void main() {
    // Each point repeats every uBox units, so the pattern is fixed in the
    // world while only the copy nearest the camera is drawn.
    vec3 offset = mod(position + uVelocity * uTime - uCenter, uBox) - 0.5 * uBox;
    offset.y += 0.5 * uBox.y;
    vec4 mvPosition = viewMatrix * vec4(uCenter.x + offset.x, offset.y, uCenter.z + offset.z, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uSize * uPointScale / -mvPosition.z;
    // Fade out toward the edge of the box rather than popping.
    vFade = 1.0 - smoothstep(0.35, 0.5, max(abs(offset.x) / uBox.x, abs(offset.z) / uBox.z));
  }
`;

const pointFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSoft;
  varying float vFade;

  void main() {
    float falloff = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(uColor, uOpacity * vFade * mix(1.0, falloff, uSoft));
  }
`;

export type WrappedPointsOptions = {
  count: number;
  /** Size of the repeating box: width, height, depth. */
  box: [number, number, number];
  /** Drift in units per second. */
  velocity: [number, number, number];
  /** Point diameter in world units. */
  size: number;
  color: THREE.ColorRepresentation;
  opacity: number;
  /** Soft round sprites (mist) rather than hard dots (rain). */
  soft: boolean;
  additive?: boolean;
};

export function createWrappedPoints(random: Random, options: WrappedPointsOptions) {
  const positions = new Float32Array(options.count * 3);
  for (let index = 0; index < options.count; index++) {
    positions[index * 3] = random() * options.box[0];
    positions[index * 3 + 1] = random() * options.box[1];
    positions[index * 3 + 2] = random() * options.box[2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: wrappedVertexShader,
    fragmentShader: pointFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uBox: { value: new THREE.Vector3(...options.box) },
      uVelocity: { value: new THREE.Vector3(...options.velocity) },
      uCenter: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uSize: { value: options.size },
      uPointScale: pointScale,
      uColor: { value: new THREE.Color(options.color) },
      uOpacity: { value: options.opacity },
      uSoft: { value: options.soft ? 1 : 0 },
    },
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(elapsed: number, cameraPosition: THREE.Vector3) {
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uCenter.value.copy(cameraPosition);
    },
  };
}

const steamVertexShader = /* glsl */ `
  attribute vec3 aPuff; // phase, speed, drift direction
  uniform float uTime;
  uniform float uPointScale;
  varying float vFade;

  void main() {
    float life = fract(uTime * aPuff.y + aPuff.x);
    vec3 rising = position;
    rising.y += life * 7.0;
    rising.x += sin(aPuff.z * 6.283 + life * 3.0) * life * 1.2;
    rising.z += cos(aPuff.z * 6.283) * life * 0.8;
    vec4 mvPosition = modelViewMatrix * vec4(rising, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (1.2 + life * 3.6) * uPointScale / -mvPosition.z;
    // Thin as it leaves the vent, thickest mid-air, gone at the top.
    vFade = life * (1.0 - life) * 4.0;
  }
`;

/** Steam rising from vents at the given positions (local to wherever this is added). */
export function createSteam(random: Random, vents: readonly THREE.Vector3[], color: THREE.ColorRepresentation) {
  const perVent = 14;
  const count = vents.length * perVent;
  const positions = new Float32Array(count * 3);
  const puffs = new Float32Array(count * 3);
  vents.forEach((vent, ventIndex) => {
    for (let puff = 0; puff < perVent; puff++) {
      const index = ventIndex * perVent + puff;
      positions.set([vent.x, vent.y, vent.z], index * 3);
      puffs.set([random(), 0.12 + random() * 0.1, random()], index * 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPuff", new THREE.BufferAttribute(puffs, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: steamVertexShader,
    fragmentShader: pointFragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointScale: pointScale,
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.16 },
      uSoft: { value: 1 },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(elapsed: number) {
      material.uniforms.uTime.value = elapsed;
    },
  };
}
