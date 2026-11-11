import * as THREE from "three";

import type { Random } from "@/lib/random";

import { CITY_CONFIG } from "../city-config";
import {
  ROAD_HALF_WIDTH,
  SIDEWALK_WIDTH,
  boxMatrix,
  instanced,
  noiseChunk,
  surfaceVertexShader,
  type CityPalette,
} from "./shared";

/**
 * One street: wet asphalt with painted markings, manholes and reflections,
 * pavements, street lamps, ground traffic, and optionally an elevated rail
 * line with a passing train.
 *
 * Built in street-local coordinates: x across, travelling toward -z.
 */

export type StreetOptions = {
  palette: CityPalette;
  random: Random;
  /** The carriageway runs from local z = `from` down to `to`. */
  from: number;
  to: number;
  /** Where to paint a crosswalk, or null for none. */
  crosswalkZ: number | null;
  /** Add the elevated rail line along the left pavement. */
  rail: boolean;
  /** Whether the street points at the sun, so its reflection lies along the road. */
  facesSun: boolean;
  cars: number;
  glowTexture: THREE.Texture;
};

const LAMP_SPACING = 32;
const RAIL_X = -(ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2);
const RAIL_HEIGHT = 12;

const roadFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uAsphalt;
  uniform vec3 uDusk;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uAccent;
  uniform vec3 uHot;
  uniform vec3 uLine;
  uniform float uCrossZ;
  uniform float uSunPath;
  uniform float uReflections;
  varying vec3 vLocal;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${noiseChunk}

  void main() {
    float x = vLocal.x;
    float z = vLocal.z;
    float ax = abs(x);
    float range = distance(vWorld, cameraPosition);
    // Reflections strengthen at grazing angles, i.e. further down the road.
    float grazing = smoothstep(8.0, 120.0, range);

    vec3 color = uAsphalt * (0.85 + 0.3 * noise(vWorld.xz * 1.5));

    // Standing water mirrors the dawn sky.
    float wet = smoothstep(0.35, 0.75, fbm(vWorld.xz * 0.08));
    color = mix(color, mix(uDusk, uHorizon, grazing) * 0.55, (0.15 + 0.5 * wet) * grazing);

    // Neon from the signs, smeared along the wet surface toward the kerbs.
    float streak = fbm(vec2(x * 0.55, z * 0.045));
    float tone = noise(vec2(x * 0.2 + 9.0, z * 0.02));
    vec3 neon = tone < 0.4 ? uHot : (tone < 0.7 ? uAccent : uSun);
    color += neon * smoothstep(0.5, 0.85, streak) * (0.4 + 0.6 * wet) * grazing * uReflections * smoothstep(2.5, 9.0, ax);

    // The sun's reflection runs down the centre of streets that face it.
    float path = exp(-ax / (1.5 + 0.04 * range));
    float glitter = step(0.72, noise(vec2(x * 0.9, z * 0.35 + uTime * 0.6)));
    color += uSun * path * grazing * (0.22 + 0.55 * glitter * wet) * uSunPath;

    // Manhole covers, staggered between the lanes.
    float period = 37.0;
    float slot = floor(z / period);
    vec2 cover = vec2(x - (mod(slot, 2.0) < 0.5 ? 4.6 : -5.2), z - (slot + 0.5) * period);
    float coverDistance = length(cover);
    color = mix(color, uAsphalt * 0.45, 1.0 - smoothstep(0.78, 0.86, coverDistance));
    color += uLine * 0.12 * smoothstep(0.6, 0.66, coverDistance) * (1.0 - smoothstep(0.72, 0.78, coverDistance));

    // Paint: double centre line, lane dashes, edge lines.
    float centre = 1.0 - smoothstep(0.07, 0.13, abs(ax - 0.22));
    color = mix(color, uSun * 0.7, centre);
    float dash = (1.0 - smoothstep(0.07, 0.12, abs(ax - 6.0))) * step(0.5, fract(z / 8.0));
    color = mix(color, uLine, dash * 0.8);
    float edge = 1.0 - smoothstep(0.1, 0.2, abs(ax - ${(ROAD_HALF_WIDTH - 0.7).toFixed(1)}));
    color = mix(color, uAccent, edge);

    // Crosswalk.
    float crossing = step(abs(z - uCrossZ), 1.5);
    float stripes = step(0.5, fract(x / 1.6 + 0.25)) * step(ax, 10.4);
    color = mix(color, uLine, crossing * stripes * 0.75);

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

export function createStreet(options: StreetOptions) {
  const { palette, random, from, to, glowTexture } = options;
  const group = new THREE.Group();
  const length = from - to;
  const centerZ = (from + to) / 2;
  const box = new THREE.BoxGeometry(1, 1, 1);

  const dark = new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.45);
  const structure = new THREE.MeshBasicMaterial({ color: dark });
  const amberGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.sun).multiplyScalar(0.85) });

  // --- Surface ---------------------------------------------------------
  const surfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: surfaceVertexShader,
    fragmentShader: roadFragmentShader,
    fog: true,
    // Wins the depth fight against the ground plane just beneath it.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uAsphalt: { value: new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.25) },
        uDusk: { value: new THREE.Color(palette.skyDusk) },
        uHorizon: { value: new THREE.Color(palette.skyHorizon) },
        uSun: { value: new THREE.Color(palette.sun) },
        uAccent: { value: new THREE.Color(palette.accent) },
        uHot: { value: new THREE.Color(palette.hot) },
        uLine: { value: new THREE.Color(palette.foreground).multiplyScalar(0.55) },
        uCrossZ: { value: options.crosswalkZ ?? 1e6 },
        uSunPath: { value: options.facesSun ? 1 : 0 },
        uReflections: { value: CITY_CONFIG.glow.roadReflections },
      },
    ]),
  });
  // Baked flat so the shader's local position is already street coordinates.
  const surfaceGeometry = new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, length);
  surfaceGeometry.rotateX(-Math.PI / 2);
  surfaceGeometry.translate(0, 0.04, centerZ);
  group.add(new THREE.Mesh(surfaceGeometry, surfaceMaterial));

  // --- Pavements -------------------------------------------------------
  const pavementX = ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2;
  group.add(
    instanced(box, structure, [
      boxMatrix(-pavementX, 0.15, centerZ, SIDEWALK_WIDTH, 0.3, length),
      boxMatrix(pavementX, 0.15, centerZ, SIDEWALK_WIDTH, 0.3, length),
    ]),
  );

  // --- Street lamps ----------------------------------------------------
  const poles: THREE.Matrix4[] = [];
  const heads: THREE.Matrix4[] = [];
  const pools: THREE.Matrix4[] = [];
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const lampX = ROAD_HALF_WIDTH + 0.7;
  for (let z = from - 14; z > to + 8; z -= LAMP_SPACING) {
    for (const side of [-1, 1]) {
      poles.push(boxMatrix(side * lampX, 4.3, z, 0.18, 8, 0.18));
      poles.push(boxMatrix(side * (lampX - 1.1), 8.3, z, 2.4, 0.14, 0.14));
      heads.push(boxMatrix(side * (lampX - 2.1), 8.2, z, 1, 0.12, 0.4));
      pools.push(
        new THREE.Matrix4().compose(new THREE.Vector3(side * (lampX - 2.6), 0.07, z), flat, new THREE.Vector3(13, 13, 1)),
      );
    }
  }
  if (poles.length > 0) {
    group.add(instanced(box, structure, poles), instanced(box, amberGlow, heads));
    group.add(
      instanced(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: glowTexture,
          color: new THREE.Color(palette.sun).multiplyScalar(CITY_CONFIG.glow.groundPools),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
        pools,
      ),
    );
  }

  // --- Elevated rail ---------------------------------------------------
  let train: THREE.Group | null = null;
  const carLength = 11;
  const trainCars = 4;
  const trainLength = trainCars * (carLength + 0.8);
  const railFrom = from - 6;
  const railTo = to + 6;
  if (options.rail) {
    const pillars: THREE.Matrix4[] = [boxMatrix(RAIL_X, RAIL_HEIGHT, (railFrom + railTo) / 2, 1.3, 0.8, railFrom - railTo)];
    for (let z = railFrom - 10; z > railTo; z -= LAMP_SPACING) {
      pillars.push(boxMatrix(RAIL_X, RAIL_HEIGHT / 2, z, 0.7, RAIL_HEIGHT, 0.7));
    }
    group.add(instanced(box, structure, pillars));
    group.add(
      instanced(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.hot).multiplyScalar(0.8) }), [
        boxMatrix(RAIL_X, RAIL_HEIGHT - 0.5, (railFrom + railTo) / 2, 0.16, 0.16, railFrom - railTo),
      ]),
    );

    train = new THREE.Group();
    for (let car = 0; car < trainCars; car++) {
      const z = car * (carLength + 0.8);
      const body = new THREE.Mesh(box, structure);
      body.scale.set(2.2, 2.4, carLength);
      body.position.set(0, 1.6, z);
      const windows = new THREE.Mesh(box, amberGlow);
      windows.scale.set(2.3, 0.6, carLength - 1.2);
      windows.position.set(0, 1.9, z);
      train.add(body, windows);
    }
    const headlight = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: palette.foreground }));
    headlight.scale.set(1.4, 0.3, 0.2);
    headlight.position.set(0, 1.1, -carLength / 2 - 0.1);
    train.add(headlight);
    train.position.set(RAIL_X, RAIL_HEIGHT + 0.4, from);
    group.add(train);
  }

  // --- Ground traffic: headlights toward you, tail lights away ---------
  const cars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.3, 0.18, 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    options.cars,
  );
  cars.frustumCulled = false;
  const lanes = [-8.5, -4, 4, 8.5];
  const trafficFrom = Math.min(from, 60) - 4;
  const trafficTo = to + 4;
  const carState = Array.from({ length: options.cars }, (_, index) => {
    const lane = lanes[index % lanes.length];
    return {
      x: lane,
      z: trafficFrom - random() * (trafficFrom - trafficTo),
      speed: (lane < 0 ? 1 : -1) * (22 + random() * 26),
    };
  });
  const headlightColor = new THREE.Color(palette.foreground).multiplyScalar(0.6);
  const taillightColor = new THREE.Color(palette.hot).multiplyScalar(0.8);
  carState.forEach((car, index) => cars.setColorAt(index, car.speed > 0 ? headlightColor : taillightColor));
  group.add(cars);

  const matrix = new THREE.Matrix4();

  return {
    group,
    /** `cameraZ` is the camera's position along this street, in its local coordinates. */
    update(elapsed: number, delta: number, cameraZ: number) {
      surfaceMaterial.uniforms.uTime.value = elapsed;

      // Cars drive the length of the street and reappear at the other end,
      // as if emerging from the buildings there.
      carState.forEach((car, index) => {
        car.z += car.speed * delta;
        if (car.z > trafficFrom) car.z = trafficTo;
        if (car.z < trafficTo) car.z = trafficFrom;
        cars.setMatrixAt(index, matrix.makeTranslation(car.x, 0.35, car.z));
      });
      cars.instanceMatrix.needsUpdate = true;

      if (train) {
        // The train overtakes you, then loops round from behind.
        const trainZ = cameraZ + 90 - ((elapsed * 64) % 520);
        train.position.z = trainZ;
        train.visible = trainZ - carLength / 2 > railTo && trainZ + trainLength < railFrom;
      }
    },
  };
}
