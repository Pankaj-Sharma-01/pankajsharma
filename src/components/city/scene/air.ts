import * as THREE from "three";

import type { Random } from "@/lib/random";

import type { RoutePoint } from "../route";
import type { SignAnchor } from "./buildings";
import { createSigns, type SignAtlases } from "./signs";
import type { CityPalette } from "./shared";

/**
 * Things in the sky: flying traffic circling each landmark on looped paths,
 * small drones hovering by the entrances, and slow blimps carrying scrolling
 * LED tickers.
 */

type Flyer = {
  centerX: number;
  centerZ: number;
  radius: number;
  height: number;
  /** Radians per second; sign sets the direction of the loop. */
  speed: number;
  phase: number;
  /** Hovering drones bob instead of holding altitude. */
  bob: number;
  scale: number;
};

export type AirOptions = {
  palette: CityPalette;
  random: Random;
  /** Landmark centres, for the traffic loops. */
  landmarks: readonly RoutePoint[];
  /** Where blimps drift: a centre and a heading for each. */
  blimps: readonly (RoutePoint & { heading: number })[];
  flyersPerLandmark: number;
  atlases: SignAtlases;
};

export function createAir({ palette, random, landmarks, blimps, flyersPerLandmark, atlases }: AirOptions) {
  const group = new THREE.Group();

  // --- Flying traffic and drones ---------------------------------------
  const flyers: Flyer[] = [];
  for (const landmark of landmarks) {
    for (let index = 0; index < flyersPerLandmark; index++) {
      flyers.push({
        centerX: landmark.x,
        centerZ: landmark.z,
        radius: 45 + random() * 70,
        height: 36 + random() * 50,
        speed: (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.14),
        phase: random() * Math.PI * 2,
        bob: 0,
        scale: 1,
      });
    }
    // Two drones idling above the entrance.
    for (let index = 0; index < 2; index++) {
      flyers.push({
        centerX: landmark.x,
        centerZ: landmark.z,
        radius: 19 + random() * 4,
        height: 15 + random() * 6,
        speed: (index === 0 ? 1 : -1) * (0.25 + random() * 0.2),
        phase: random() * Math.PI * 2,
        bob: 1.2,
        scale: 0.4,
      });
    }
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.6, 0.4, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    flyers.length,
  );
  mesh.frustumCulled = false;
  const cyan = new THREE.Color(palette.accent).multiplyScalar(0.8);
  const pink = new THREE.Color(palette.hot).multiplyScalar(0.8);
  flyers.forEach((flyer, index) => mesh.setColorAt(index, flyer.speed > 0 ? cyan : pink));
  group.add(mesh);

  // --- Blimps ----------------------------------------------------------
  const hull = new THREE.SphereGeometry(1, 20, 12);
  const hullMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.7),
  });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: palette.hot });
  const blimpObjects = blimps.map((blimp, index) => {
    const object = new THREE.Group();
    const body = new THREE.Mesh(hull, hullMaterial);
    body.scale.set(3.6, 3.6, 12);
    object.add(body);
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 4), hullMaterial);
    gondola.position.y = -3.9;
    object.add(gondola);
    // Tickers down both flanks.
    const anchors: SignAnchor[] = [-1, 1].map((side) => ({
      x: side * 3.75,
      y: 0,
      z: 0,
      width: 15,
      height: 1.7,
      rotationY: (side * Math.PI) / 2,
      kind: "ticker" as const,
    }));
    const signs = createSigns(anchors, atlases, palette, random);
    object.add(signs.group);
    const lights = [-1, 1].map((end) => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lightMaterial);
      light.position.set(0, -1.2, end * 11.5);
      object.add(light);
      return light;
    });
    object.rotation.y = blimp.heading;
    group.add(object);
    return { object, signs, lights, blimp, phase: index * 2.1, height: 78 + index * 9 };
  });

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  return {
    group,
    update(elapsed: number) {
      flyers.forEach((flyer, index) => {
        const angle = flyer.phase + elapsed * flyer.speed;
        position.set(
          flyer.centerX + Math.cos(angle) * flyer.radius,
          flyer.height + Math.sin(elapsed * 1.7 + flyer.phase) * flyer.bob,
          flyer.centerZ + Math.sin(angle) * flyer.radius,
        );
        // Nose along the direction of travel round the loop.
        rotation.setFromAxisAngle(up, -angle + (flyer.speed > 0 ? Math.PI : 0));
        scale.setScalar(flyer.scale);
        mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
      });
      mesh.instanceMatrix.needsUpdate = true;

      for (const { object, signs, lights, blimp, phase, height } of blimpObjects) {
        // A slow drift back and forth along the heading.
        const drift = Math.sin(elapsed * 0.05 + phase) * 30;
        object.position.set(
          blimp.x - Math.sin(blimp.heading) * drift,
          height + Math.sin(elapsed * 0.3 + phase) * 1.5,
          blimp.z - Math.cos(blimp.heading) * drift,
        );
        signs.update(elapsed);
        const on = Math.sin(elapsed * 3 + phase) > 0.4;
        for (const light of lights) light.visible = on;
      }
    },
  };
}
