import * as THREE from "three";

import type { Random } from "@/lib/random";

import {
  ROAD_HALF_WIDTH,
  SIDEWALK_WIDTH,
  SPACING,
  boxMatrix,
  instanced,
  noiseChunk,
  worldVertexShader,
  type CityPalette,
} from "./shared";

/**
 * The avenue: wet asphalt with painted markings, pavements, street lamps,
 * an elevated rail line with a passing train, ground traffic, and flying
 * traffic overhead.
 */

export type RoadOptions = {
  palette: CityPalette;
  random: Random;
  /** z where the road begins (behind the camera's start). */
  startZ: number;
  /** z of the cliff edge, where the road ends. */
  cliffZ: number;
  /** z of each gate, first to last. */
  gateZs: readonly number[];
  lowPower: boolean;
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
  uniform vec3 uLine;
  uniform float uCrossOffset;
  uniform float uCrossMinZ;
  uniform float uCrossMaxZ;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${noiseChunk}

  void main() {
    float x = vWorld.x;
    float z = vWorld.z;
    float ax = abs(x);
    float range = distance(vWorld, cameraPosition);
    // Reflections strengthen at grazing angles, i.e. further down the road.
    float grazing = smoothstep(8.0, 120.0, range);

    vec3 color = uAsphalt * (0.85 + 0.3 * noise(vWorld.xz * 1.5));

    // Standing water mirrors the dawn sky.
    float wet = smoothstep(0.35, 0.75, fbm(vWorld.xz * 0.08));
    color = mix(color, mix(uDusk, uHorizon, grazing) * 0.55, (0.15 + 0.5 * wet) * grazing);

    // The sun's reflection runs down the centre of the road.
    float path = exp(-ax / (1.5 + 0.04 * range));
    float glitter = step(0.72, noise(vec2(x * 0.9, z * 0.35 + uTime * 0.6)));
    color += uSun * path * grazing * (0.22 + 0.55 * glitter * wet);

    // Paint: double centre line, lane dashes, edge lines.
    float centre = 1.0 - smoothstep(0.07, 0.13, abs(ax - 0.22));
    color = mix(color, uSun * 0.7, centre);
    float dash = (1.0 - smoothstep(0.07, 0.12, abs(ax - 6.0))) * step(0.5, fract(z / 8.0));
    color = mix(color, uLine, dash * 0.8);
    float edge = 1.0 - smoothstep(0.1, 0.2, abs(ax - ${(ROAD_HALF_WIDTH - 0.7).toFixed(1)}));
    color = mix(color, uAccent, edge);

    // Crosswalk before each gate.
    float local = mod(z - uCrossOffset, ${SPACING.toFixed(1)});
    float crossing = step(local, 3.0) * step(uCrossMinZ, z) * step(z, uCrossMaxZ);
    float stripes = step(0.5, fract(x / 1.6 + 0.25)) * step(ax, 10.4);
    color = mix(color, uLine, crossing * stripes * 0.75);

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

function radialGlowTexture() {
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

export function createRoad({ palette, random, startZ, cliffZ, gateZs, lowPower }: RoadOptions) {
  const group = new THREE.Group();
  const length = startZ - cliffZ;
  const centerZ = (startZ + cliffZ) / 2;
  const box = new THREE.BoxGeometry(1, 1, 1);

  const dark = new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.45);
  const structure = new THREE.MeshBasicMaterial({ color: dark });
  const amberGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.sun).multiplyScalar(0.85) });
  const pinkGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.hot).multiplyScalar(0.8) });

  // --- Surface ---------------------------------------------------------
  const surfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: worldVertexShader,
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
        uLine: { value: new THREE.Color(palette.foreground).multiplyScalar(0.55) },
        uCrossOffset: { value: (gateZs[0] ?? 0) + 5 },
        uCrossMinZ: { value: gateZs.at(-1) ?? 0 },
        uCrossMaxZ: { value: (gateZs[0] ?? 0) + 10 },
      },
    ]),
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, length), surfaceMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, 0.04, centerZ);
  group.add(surface);

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
  for (let z = startZ - 40; z > cliffZ + 10; z -= LAMP_SPACING) {
    for (const side of [-1, 1]) {
      poles.push(boxMatrix(side * lampX, 4.3, z, 0.18, 8, 0.18));
      poles.push(boxMatrix(side * (lampX - 1.1), 8.3, z, 2.4, 0.14, 0.14));
      heads.push(boxMatrix(side * (lampX - 2.1), 8.2, z, 1, 0.12, 0.4));
      pools.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(side * (lampX - 2.6), 0.07, z),
          flat,
          new THREE.Vector3(13, 13, 1),
        ),
      );
    }
  }
  group.add(instanced(box, structure, poles), instanced(box, amberGlow, heads));
  const poolTexture = radialGlowTexture();
  group.add(
    instanced(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: poolTexture,
        color: new THREE.Color(palette.sun).multiplyScalar(0.35),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      pools,
    ),
  );

  // --- Elevated rail ---------------------------------------------------
  const railEndZ = cliffZ + 24;
  const railLength = startZ - railEndZ;
  const railCenterZ = (startZ + railEndZ) / 2;
  const pillars: THREE.Matrix4[] = [boxMatrix(RAIL_X, RAIL_HEIGHT, railCenterZ, 1.3, 0.8, railLength)];
  for (let z = startZ - 24; z > railEndZ; z -= LAMP_SPACING) {
    pillars.push(boxMatrix(RAIL_X, RAIL_HEIGHT / 2, z, 0.7, RAIL_HEIGHT, 0.7));
  }
  group.add(instanced(box, structure, pillars));
  group.add(instanced(box, pinkGlow, [boxMatrix(RAIL_X, RAIL_HEIGHT - 0.5, railCenterZ, 0.16, 0.16, railLength)]));

  const train = new THREE.Group();
  const carLength = 11;
  const carCount = 4;
  for (let car = 0; car < carCount; car++) {
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
  train.position.set(RAIL_X, RAIL_HEIGHT + 0.4, startZ);
  group.add(train);
  const trainLength = carCount * (carLength + 0.8);

  // --- Ground traffic: headlights toward you, tail lights away ---------
  const carTotal = lowPower ? 18 : 48;
  const cars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.3, 0.18, 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    carTotal,
  );
  cars.frustumCulled = false;
  const lanes = [-8.5, -4, 4, 8.5];
  const carState = Array.from({ length: carTotal }, (_, index) => {
    const lane = lanes[index % lanes.length];
    return { x: lane, z: startZ - random() * length, speed: (lane < 0 ? 1 : -1) * (22 + random() * 26) };
  });
  const headlightColor = new THREE.Color(palette.foreground).multiplyScalar(0.6);
  const taillightColor = new THREE.Color(palette.hot).multiplyScalar(0.8);
  carState.forEach((car, index) => cars.setColorAt(index, car.speed > 0 ? headlightColor : taillightColor));
  group.add(cars);

  // --- Flying traffic --------------------------------------------------
  const flyerTotal = lowPower ? 6 : 16;
  const flyers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.6, 0.4, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    flyerTotal,
  );
  flyers.frustumCulled = false;
  const flyerState = Array.from({ length: flyerTotal }, (_, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    return {
      x: direction * (6 + random() * 34),
      y: 24 + random() * 40,
      z: startZ - random() * length,
      speed: direction * (34 + random() * 30),
    };
  });
  const cyanLight = new THREE.Color(palette.accent).multiplyScalar(0.8);
  flyerState.forEach((flyer, index) => flyers.setColorAt(index, flyer.speed > 0 ? cyanLight : taillightColor));
  group.add(flyers);

  const matrix = new THREE.Matrix4();

  return {
    group,
    update(elapsed: number, delta: number, cameraZ: number) {
      surfaceMaterial.uniforms.uTime.value = elapsed;

      // Vehicles recycle within a window around the camera.
      const nearZ = cameraZ + 40;
      const farZ = Math.max(cameraZ - 320, cliffZ + 4); // ground traffic never drives off the cliff
      carState.forEach((car, index) => {
        car.z += car.speed * delta;
        if (car.z > nearZ) car.z = farZ;
        if (car.z < farZ) car.z = nearZ;
        cars.setMatrixAt(index, matrix.makeTranslation(car.x, 0.35, car.z));
      });
      cars.instanceMatrix.needsUpdate = true;

      const skyFarZ = cameraZ - 420;
      flyerState.forEach((flyer, index) => {
        flyer.z += flyer.speed * delta;
        if (flyer.z > nearZ) flyer.z = skyFarZ;
        if (flyer.z < skyFarZ) flyer.z = nearZ;
        flyers.setMatrixAt(index, matrix.makeTranslation(flyer.x, flyer.y, flyer.z));
      });
      flyers.instanceMatrix.needsUpdate = true;

      // The train overtakes you, then loops round from behind.
      const loop = 760;
      const trainZ = cameraZ + 90 - ((elapsed * 64) % loop);
      train.position.z = trainZ;
      train.visible = trainZ - carLength / 2 > railEndZ && trainZ + trainLength < startZ;
    },
    dispose() {
      poolTexture.dispose();
    },
  };
}
