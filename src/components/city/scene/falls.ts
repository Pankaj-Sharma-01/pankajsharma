import * as THREE from "three";

import type { Random } from "@/lib/random";

import type { Lot } from "./buildings";
import {
  ROAD_HALF_WIDTH,
  boxMatrix,
  instanced,
  noiseChunk,
  uvVertexShader,
  worldVertexShader,
  type CityPalette,
} from "./shared";

/**
 * The falls: past the cliff, the land is a lake whose water pours over the
 * rim of a vast circular chasm and falls away forever. Everything is at or
 * below ground level, so it stays hidden until the road ends.
 */

const CHASM_RADIUS = 200;
/** How far the chasm circle reaches back under the road's end. */
const CHASM_OVERLAP = 30;
export const FALL_DEPTH = 760;
const DECK_LENGTH = 14;

export type Chasm = { centerZ: number; radius: number };

export function chasmFor(cliffZ: number): Chasm {
  return { centerZ: cliffZ - CHASM_RADIUS + CHASM_OVERLAP, radius: CHASM_RADIUS };
}

/**
 * Megatowers around the chasm: standing in the lake beyond the rim, and a
 * few slender spires rising out of the depths. Kept off the road's side and
 * out of the line of sight to the sunrise.
 */
export function abyssLots(random: Random, cliffZ: number, lowPower: boolean): Lot[] {
  const { centerZ, radius } = chasmFor(cliffZ);
  const lots: Lot[] = [];

  const ring = lowPower ? 22 : 46;
  for (let index = 0; index < ring; index++) {
    const angle = random() * Math.PI * 2;
    const distance = radius + 130 + random() * 420;
    const x = Math.sin(angle) * distance;
    const z = centerZ + Math.cos(angle) * distance;
    if (z > cliffZ - 25 || Math.abs(x) < 150) continue;
    lots.push({
      x,
      z,
      width: 12 + random() * 24,
      depth: 12 + random() * 24,
      height: FALL_DEPTH + 50 + random() * 280,
      baseY: -FALL_DEPTH,
      side: x < 0 ? -1 : 1,
      row: 9,
    });
  }

  const inside = lowPower ? 3 : 6;
  for (let index = 0; index < inside; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const angle = Math.PI + side * (0.7 + random() * 0.9);
    const distance = radius * (0.5 + random() * 0.3);
    lots.push({
      x: Math.sin(angle) * distance,
      z: centerZ + Math.cos(angle) * distance,
      width: 5 + random() * 6,
      depth: 5 + random() * 6,
      height: FALL_DEPTH - 30 + random() * 90,
      baseY: -FALL_DEPTH,
      side,
      row: 9,
    });
  }
  return lots;
}

const lakeFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uSky;
  uniform vec3 uHot;
  uniform vec3 uSun;
  uniform vec3 uFoam;
  uniform vec2 uCenter;
  uniform float uRadius;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${noiseChunk}

  void main() {
    vec2 relative = vWorld.xz - uCenter;
    float distanceToCenter = length(relative);
    float angle = atan(relative.y, relative.x);

    // Ripples, and currents drawn toward the rim.
    float ripple = noise(vWorld.xz * 0.3 + vec2(0.0, uTime * 0.5));
    float current = noise(vec2(angle * 80.0, distanceToCenter * 0.12 + uTime * 1.2));
    vec3 color = mix(uDeep, uSky, 0.2 + 0.4 * ripple);

    // Sunrise reflected as a glittering path toward the sun (down -z).
    float width = 4.0 + 0.09 * distance(vWorld, cameraPosition);
    float path = exp(-abs(vWorld.x) / width);
    float glitter = step(0.8, noise(vWorld.xz * vec2(0.7, 0.22) + vec2(0.0, uTime * 1.4)));
    color += uSun * glitter * path * 1.3 + uHot * path * 0.18;

    // White water at the lip.
    float lip = 1.0 - smoothstep(0.0, 9.0, distanceToCenter - uRadius);
    color = mix(color, uFoam, lip * (0.15 + 0.45 * current));

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

const waterfallFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uWater;
  uniform vec3 uDeep;
  uniform vec3 uSun;
  uniform vec3 uFoam;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    // Vertical streaks: noise stretched along the fall, each column falling
    // at its own speed, plus fine fast detail for spray.
    float x = vUv.x * 900.0;
    float speed = 1.0 + 0.35 * hash(vec2(floor(x), 0.0));
    float streaks = noise(vec2(x, vUv.y * 16.0 + uTime * 1.1 * speed));
    float detail = noise(vec2(x * 2.7, vUv.y * 80.0 + uTime * 6.0));
    float water = clamp(streaks * 0.65 + detail * 0.45, 0.0, 1.0);

    vec3 color = mix(uDeep, uWater, smoothstep(0.3, 0.95, water));
    color += uSun * pow(detail, 8.0) * 0.8;
    color = mix(color, uFoam, smoothstep(0.985, 1.0, vUv.y) * 0.5);

    // Down to infinity: the water thins into the depths.
    float alpha = smoothstep(0.0, 0.7, vUv.y) * (0.35 + 0.4 * water) * uReveal;
    gl_FragColor = vec4(color, alpha);
  }
`;

const mistFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    float n = fbm(vUv * 6.0 + vec2(uTime * 0.025, uTime * 0.04));
    float round = 1.0 - smoothstep(0.32, 0.5, length(vUv - 0.5));
    gl_FragColor = vec4(mix(uColorA, uColorB, n), smoothstep(0.25, 0.85, n) * uOpacity * round * uReveal);
  }
`;

/** The lake: everything past the cliff at ground level, minus the chasm. */
function lakeShape(cliffZ: number, chasm: Chasm) {
  // Shape space is (x, -z) because the shape is rotated flat onto the ground.
  // Where the chasm's rim meets the straight cliff edge, either side of the road:
  const halfChord = Math.sqrt(chasm.radius ** 2 - (chasm.radius - CHASM_OVERLAP) ** 2);
  const startAngle = Math.atan2(-halfChord, cliffZ - chasm.centerZ);
  const shape = new THREE.Shape();
  const far = cliffZ - 2400;
  shape.moveTo(-1400, -cliffZ);
  shape.lineTo(-halfChord, -cliffZ);
  // Around the far side of the chasm, from the left end of the rim to the right.
  const steps = 96;
  for (let step = 1; step < steps; step++) {
    const angle = startAngle - (step / steps) * (2 * Math.PI + 2 * startAngle);
    shape.lineTo(Math.sin(angle) * chasm.radius, -(chasm.centerZ + Math.cos(angle) * chasm.radius));
  }
  shape.lineTo(halfChord, -cliffZ);
  shape.lineTo(1400, -cliffZ);
  shape.lineTo(1400, -far);
  shape.lineTo(-1400, -far);
  shape.closePath();
  return shape;
}

export function createFalls(palette: CityPalette, random: Random, cliffZ: number, lowPower: boolean) {
  const group = new THREE.Group();
  const time = { value: 0 };
  // 0 until the final stretch of the road: the falls are a surprise at the end.
  const reveal = { value: 0 };
  const chasm = chasmFor(cliffZ);
  const foam = new THREE.Color(palette.foreground).lerp(new THREE.Color(palette.accent), 0.25);
  const box = new THREE.BoxGeometry(1, 1, 1);

  // --- Lake, flowing to the rim ----------------------------------------
  const lakeMaterial = new THREE.ShaderMaterial({
    vertexShader: worldVertexShader,
    fragmentShader: lakeFragmentShader,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(palette.ultra).multiplyScalar(0.25) },
        uSky: { value: new THREE.Color(palette.skyDusk).lerp(new THREE.Color(palette.hot), 0.35) },
        uHot: { value: new THREE.Color(palette.hot) },
        uSun: { value: new THREE.Color(palette.sun) },
        uFoam: { value: foam },
        uCenter: { value: new THREE.Vector2(0, chasm.centerZ) },
        uRadius: { value: chasm.radius },
      },
    ]),
  });
  const lake = new THREE.Mesh(new THREE.ShapeGeometry(lakeShape(cliffZ, chasm), 1), lakeMaterial);
  lake.rotation.x = -Math.PI / 2;
  lake.position.y = 0.01;
  group.add(lake);

  // --- The curtain: the chasm wall, minus the arc under the road's end --
  const nearArc = Math.acos((chasm.radius - CHASM_OVERLAP) / chasm.radius);
  const waterfall = new THREE.Mesh(
    new THREE.CylinderGeometry(
      chasm.radius,
      chasm.radius,
      FALL_DEPTH,
      lowPower ? 96 : 192,
      1,
      true,
      nearArc,
      2 * Math.PI - 2 * nearArc,
    ),
    new THREE.ShaderMaterial({
      vertexShader: uvVertexShader,
      fragmentShader: waterfallFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: time,
        uReveal: reveal,
        uWater: { value: new THREE.Color(palette.accent) },
        uDeep: { value: new THREE.Color(palette.ultra).multiplyScalar(0.45) },
        uSun: { value: new THREE.Color(palette.sun) },
        uFoam: { value: foam },
      },
    }),
  );
  waterfall.position.set(0, -FALL_DEPTH / 2, chasm.centerZ);
  group.add(waterfall);

  // --- Mist drifting down in the chasm ---------------------------------
  const mistGeometry = new THREE.PlaneGeometry(chasm.radius * 2.2, chasm.radius * 2.2);
  for (const [y, opacity] of [
    [-35, 0.45],
    [-110, 0.4],
    [-220, 0.35],
  ] as const) {
    const mist = new THREE.Mesh(
      mistGeometry,
      new THREE.ShaderMaterial({
        vertexShader: uvVertexShader,
        fragmentShader: mistFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: time,
          uReveal: reveal,
          uOpacity: { value: opacity },
          uColorA: { value: new THREE.Color(palette.ultra).multiplyScalar(0.6) },
          uColorB: { value: new THREE.Color(palette.hot).lerp(new THREE.Color(palette.foreground), 0.35) },
        },
      }),
    );
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(0, y, chasm.centerZ);
    group.add(mist);
  }

  // --- Depth rings: neon hoops sinking out of sight, to show the drop ---
  const ringMaterials: { material: THREE.MeshBasicMaterial; strength: number }[] = [];
  const ringCount = lowPower ? 5 : 9;
  for (let index = 0; index < ringCount; index++) {
    const t = index / (ringCount - 1);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(index % 2 === 0 ? palette.accent : palette.hot),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(150 - t * 70, 0.8, 6, 96), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -50 - t * 600, chasm.centerZ);
    group.add(ring);
    ringMaterials.push({ material, strength: 0.9 - t * 0.6 });
  }

  // --- Spray rising off the falling water ------------------------------
  const sprayCount = lowPower ? 500 : 1600;
  const sprayPositions = new Float32Array(sprayCount * 3);
  const spraySpeeds = new Float32Array(sprayCount);
  for (let index = 0; index < sprayCount; index++) {
    // Keep to the far arc of the rim, where the water falls.
    const angle = Math.PI + (random() - 0.5) * 4.6;
    const distance = chasm.radius - random() * 26;
    sprayPositions[index * 3] = Math.sin(angle) * distance;
    sprayPositions[index * 3 + 1] = -140 + random() * 150;
    sprayPositions[index * 3 + 2] = chasm.centerZ + Math.cos(angle) * distance;
    spraySpeeds[index] = 5 + random() * 9;
  }
  const sprayGeometry = new THREE.BufferGeometry();
  sprayGeometry.setAttribute("position", new THREE.BufferAttribute(sprayPositions, 3));
  const sprayMaterial = new THREE.PointsMaterial({
    color: foam,
    size: 1.1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const spray = new THREE.Points(sprayGeometry, sprayMaterial);
  spray.frustumCulled = false;
  group.add(spray);

  // --- Viewing deck cantilevered over the edge, and cliff railings -----
  const dark = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.5),
  });
  const cyan = new THREE.MeshBasicMaterial({ color: palette.accent });
  const pink = new THREE.MeshBasicMaterial({ color: palette.hot });
  const deckZ = cliffZ - DECK_LENGTH / 2;
  const cliffHalfWidth = 150;
  const sideLength = cliffHalfWidth - ROAD_HALF_WIDTH;
  const sideX = ROAD_HALF_WIDTH + sideLength / 2;
  group.add(
    instanced(box, dark, [
      boxMatrix(0, -0.25, deckZ, ROAD_HALF_WIDTH * 2, 0.5, DECK_LENGTH),
      // Struts under the deck.
      boxMatrix(-ROAD_HALF_WIDTH + 2, -3, deckZ + 2, 0.6, 6, 0.6),
      boxMatrix(ROAD_HALF_WIDTH - 2, -3, deckZ + 2, 0.6, 6, 0.6),
    ]),
    instanced(box, cyan, [
      boxMatrix(-ROAD_HALF_WIDTH, 1.1, deckZ, 0.12, 0.12, DECK_LENGTH),
      boxMatrix(ROAD_HALF_WIDTH, 1.1, deckZ, 0.12, 0.12, DECK_LENGTH),
      boxMatrix(0, 1.1, cliffZ - DECK_LENGTH, ROAD_HALF_WIDTH * 2, 0.12, 0.12),
      boxMatrix(-sideX, 1.1, cliffZ + 0.5, sideLength, 0.12, 0.12),
      boxMatrix(sideX, 1.1, cliffZ + 0.5, sideLength, 0.12, 0.12),
    ]),
    instanced(box, pink, [
      boxMatrix(0, 0.02, cliffZ - DECK_LENGTH, ROAD_HALF_WIDTH * 2, 0.1, 0.1),
      boxMatrix(-sideX, 0.02, cliffZ, sideLength, 0.1, 0.1),
      boxMatrix(sideX, 0.02, cliffZ, sideLength, 0.1, 0.1),
    ]),
  );

  return {
    group,
    /** Angles (radians, 0 = toward the road) for beacon pylons on the rim. */
    pylonPositions(count: number) {
      return Array.from({ length: count }, (_, index) => {
        const angle = Math.PI + ((index + 0.5) / count - 0.5) * 4.4;
        const distance = chasm.radius + 14;
        return { x: Math.sin(angle) * distance, z: chasm.centerZ + Math.cos(angle) * distance };
      });
    },
    /** `arrival`: 0 before the last stretch of road, 1 at the cliff. */
    update(elapsed: number, delta: number, arrival: number) {
      time.value = elapsed;
      reveal.value = arrival;
      lakeMaterial.uniforms.uTime.value = elapsed;

      ringMaterials.forEach(({ material, strength }, index) => {
        material.opacity = arrival * strength * (0.75 + 0.25 * Math.sin(elapsed * 1.2 - index * 0.9));
      });

      sprayMaterial.opacity = arrival * 0.5;
      if (arrival > 0) {
        for (let index = 0; index < sprayCount; index++) {
          let y = sprayPositions[index * 3 + 1] + spraySpeeds[index] * delta;
          if (y > 12) y = -140;
          sprayPositions[index * 3 + 1] = y;
        }
        sprayGeometry.attributes.position.needsUpdate = true;
      }
    },
  };
}
