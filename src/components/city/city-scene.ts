import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { createRandom } from "@/lib/random";

import { CityBuilder, streetLots } from "./scene/buildings";
import { abyssLots, createFalls } from "./scene/falls";
import { createRoad } from "./scene/road";
import {
  GATE_AHEAD,
  GATE_HEIGHT,
  ROAD_HALF_WIDTH,
  SPACING,
  START_Z,
  lerp,
  smoothstep,
  type CityPalette,
} from "./scene/shared";
import { createSigns } from "./scene/signs";
import { createSky } from "./scene/sky";

/**
 * The home page city: a neon avenue at sunrise that the camera drives down
 * as the page scrolls, with one gate per site section. The road ends at a
 * cliff facing an endless waterfall, ringed by megatowers.
 *
 * Framework-free on purpose: React only mounts the canvas and passes in
 * callbacks. Everything is generated procedurally (no models or image files
 * to download) and seeded, so the city is identical on every visit. All
 * colours come from the CSS design tokens via `palette`.
 *
 * This file wires the scene together; the pieces live in ./scene/.
 */

export type { CityPalette };

export type CityGate = {
  number: string;
  label: string;
  href: string;
};

export type CitySceneOptions = {
  canvas: HTMLCanvasElement;
  gates: readonly CityGate[];
  palette: CityPalette;
  /** CSS font-family for gate labels and signs. */
  fontFamily: string;
  /** Fewer and simpler buildings, no bloom, lower resolution. */
  lowPower: boolean;
  /** Scroll progress, 0 at the top of the city to 1 at the falls. */
  getProgress: () => number;
  onNavigate: (href: string) => void;
};

export type CityScene = {
  dispose: () => void;
};

const STREET_EYE_HEIGHT = 5.5;
/** Camera height and gaze at the cliff edge, to take in the falls. */
const CLIFF_EYE_HEIGHT = 14;
const CLIFF_LOOK_HEIGHT = 1;
/** Distance from the camera's final position to the cliff edge. */
const CLIFF_GAP = 14;

// ---------------------------------------------------------------------------
// Gates: neon arches over the avenue, labelled with the section name.
// ---------------------------------------------------------------------------

function createLabelTexture(text: string, color: string, fontFamily: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `700 60px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = color;
    context.shadowBlur = 12;
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    context.shadowBlur = 0;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

type GateObject = {
  group: THREE.Group;
  frameMaterial: THREE.MeshBasicMaterial;
  baseColor: THREE.Color;
  label: THREE.Mesh;
  hitArea: THREE.Mesh;
  href: string;
};

function createGate(gate: CityGate, z: number, color: string, fontFamily: string): GateObject {
  const group = new THREE.Group();
  group.position.z = z;

  // Slightly dimmed so bloom halos the frame instead of flooding the screen.
  const baseColor = new THREE.Color(color).multiplyScalar(0.8);
  const frameMaterial = new THREE.MeshBasicMaterial({ color: baseColor.clone() });
  const pillarGeometry = new THREE.BoxGeometry(0.45, GATE_HEIGHT, 0.45);
  const beamGeometry = new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2 + 0.45, 0.45, 0.45);
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeometry, frameMaterial);
    pillar.position.set(side * ROAD_HALF_WIDTH, GATE_HEIGHT / 2, 0);
    group.add(pillar);
  }
  const beam = new THREE.Mesh(beamGeometry, frameMaterial);
  beam.position.y = GATE_HEIGHT;
  group.add(beam);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20 * (160 / 1024)),
    new THREE.MeshBasicMaterial({
      map: createLabelTexture(`${gate.number} // ${gate.label.toUpperCase()}`, color, fontFamily),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  // Above the beam, against the darker sky rather than the sun.
  label.position.y = GATE_HEIGHT + 2;
  group.add(label);

  // Faint holographic curtain, also used as the click target.
  const hitArea = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, GATE_HEIGHT),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.012,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  hitArea.position.y = GATE_HEIGHT / 2;
  group.add(hitArea);

  return { group, frameMaterial, baseColor, label, hitArea, href: gate.href };
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function createCityScene(options: CitySceneOptions): CityScene | null {
  const { canvas, gates, palette, fontFamily, lowPower, getProgress, onNavigate } = options;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: "high-performance" });
  } catch {
    return null; // No WebGL: the page works without the city.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5));

  const random = createRandom(2077);
  // Stops along the journey: one per gate, then the falls.
  const stops = gates.length + 1;
  const cliffZ = START_Z - stops * SPACING - CLIFF_GAP;
  const cityStartZ = START_Z + 300;
  const roadStartZ = START_Z + 120;
  const gateZs = gates.map((_, index) => START_Z - (index + 1) * SPACING - GATE_AHEAD);

  const scene = new THREE.Scene();
  // Dawn haze: distant buildings dissolve into pink-violet.
  const haze = new THREE.Color(palette.skyHorizon).lerp(new THREE.Color(palette.skyDusk), 0.55).multiplyScalar(0.55);
  scene.background = haze;
  const streetFogDensity = lowPower ? 0.0085 : 0.0068;
  // Thinner at the cliff so the falls and megatowers read from the edge.
  const cliffFogDensity = 0.0021;
  const fog = new THREE.FogExp2(haze, streetFogDensity);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 2000);

  const sky = createSky(palette);
  scene.add(sky.mesh);

  // Ground and synthwave grid, both ending exactly at the cliff.
  const groundLength = cityStartZ - cliffZ;
  const groundCenterZ = (cityStartZ + cliffZ) / 2;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, groundLength),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.background) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = groundCenterZ;
  scene.add(ground);

  const grid = new THREE.GridHelper(groundLength, Math.round(groundLength / 8), palette.ultra, palette.ultra);
  const gridMaterial = grid.material as THREE.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.35;
  grid.position.set(0, 0.02, groundCenterZ);
  scene.add(grid);

  const road = createRoad({ palette, random, startZ: roadStartZ, cliffZ, gateZs, lowPower });
  scene.add(road.group);

  const falls = createFalls(palette, random, cliffZ, lowPower);
  scene.add(falls.group);

  // Buildings: the street up to the cliff, megatowers around the chasm,
  // skybridges over the avenue, and beacon pylons on the rim.
  const builder = new CityBuilder(random, !lowPower);
  for (const lot of streetLots(random, START_Z + 140, cliffZ + 4, lowPower)) builder.build(lot);
  for (const lot of abyssLots(random, cliffZ, lowPower)) builder.build(lot);
  for (let index = 2; index < gateZs.length; index += 4) {
    // High enough to clear the next gate's label from the stop before it.
    builder.skybridge((gateZs[index - 1] + gateZs[index]) / 2, 37 + random() * 5);
  }
  for (const { x, z } of falls.pylonPositions(lowPower ? 8 : 14)) builder.spire(x, 0, z, 22);
  const buildings = builder.createMesh(palette);
  scene.add(buildings.mesh);

  const signs = createSigns(builder.anchors, palette, fontFamily, random);
  scene.add(signs.group);

  // Gates alternate cyan and pink.
  const gateObjects = gates.map((gate, index) =>
    createGate(gate, gateZs[index], index % 2 === 0 ? palette.accent : palette.hot, fontFamily),
  );
  for (const gate of gateObjects) scene.add(gate.group);

  // Light rain, catching the dawn.
  const dropCount = lowPower ? 900 : 2600;
  const dropPositions = new Float32Array(dropCount * 3);
  for (let index = 0; index < dropCount; index++) {
    dropPositions[index * 3] = (random() - 0.5) * 120;
    dropPositions[index * 3 + 1] = random() * 60;
    dropPositions[index * 3 + 2] = -random() * 160 + 20;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(dropPositions, 3));
  const rain = new THREE.Points(
    rainGeometry,
    new THREE.PointsMaterial({
      color: palette.muted,
      size: 0.09,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  rain.frustumCulled = false;
  scene.add(rain);

  // Post-processing: bloom is what makes the neon and the sun glow.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (!lowPower) {
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.65, 0.5, 0.42));
  }
  composer.addPass(new OutputPass());

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    // Wider field of view in portrait so the gates still fit.
    camera.fov = camera.aspect < 1 ? 78 : 60;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // Pointer: parallax everywhere, hover/click on gates over the canvas.
  const pointer = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  let pointerOverCanvas = false;
  let hoveredGate: GateObject | null = null;
  const raycaster = new THREE.Raycaster();
  const hitAreas = gateObjects.map((gate) => gate.hitArea);
  const hoverColor = new THREE.Color(palette.foreground);

  function onPointerMove(event: PointerEvent) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    pointerOverCanvas = event.target === canvas;
  }

  function gateUnderPointer(): GateObject | null {
    if (!pointerOverCanvas) return null;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitAreas, false)[0];
    if (!hit || hit.distance > 160) return null;
    return gateObjects.find((gate) => gate.hitArea === hit.object) ?? null;
  }

  function onClick() {
    const gate = gateUnderPointer();
    if (gate) onNavigate(gate.href);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("click", onClick);

  // Render loop.
  const timer = new THREE.Timer();
  let smoothedProgress = getProgress();
  let animationFrame = 0;
  const lookTarget = new THREE.Vector3();

  function frame(timestamp: number) {
    animationFrame = requestAnimationFrame(frame);
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();

    // Ease toward the scroll position so the drive feels weighty, not jumpy.
    smoothedProgress += (getProgress() - smoothedProgress) * (1 - Math.exp(-delta * 4.5));
    parallax.lerp(pointer, 1 - Math.exp(-delta * 3));

    // Street level all the way; over the last stretch the camera rises and
    // tilts down over the edge into the falls, with the sunrise beyond.
    const arrival = smoothstep((stops - 1) / stops, 1, smoothedProgress);
    const cameraZ = START_Z - smoothedProgress * stops * SPACING;
    const cameraY = lerp(STREET_EYE_HEIGHT, CLIFF_EYE_HEIGHT, arrival);
    camera.position.set(parallax.x * 2.2, cameraY + parallax.y * 1.2, cameraZ);
    lookTarget.set(
      parallax.x * 6,
      lerp(STREET_EYE_HEIGHT + 2, CLIFF_LOOK_HEIGHT, arrival) + parallax.y * 3,
      cameraZ - 60,
    );
    camera.lookAt(lookTarget);
    fog.density = lerp(streetFogDensity, cliffFogDensity, arrival);

    sky.update(elapsed, camera.position);
    buildings.update(elapsed);
    signs.update(elapsed);
    road.update(elapsed, delta, cameraZ);
    falls.update(elapsed, delta, arrival);

    // Rain falls around the camera.
    for (let index = 0; index < dropCount; index++) {
      let y = dropPositions[index * 3 + 1] - delta * 38;
      if (y < 0) y += 60;
      dropPositions[index * 3 + 1] = y;
    }
    rainGeometry.attributes.position.needsUpdate = true;
    rain.position.set(camera.position.x, 0, cameraZ);

    // Gate hover: flash the frame white and lift the label.
    const gate = gateUnderPointer();
    if (gate !== hoveredGate) {
      if (hoveredGate) {
        hoveredGate.frameMaterial.color.copy(hoveredGate.baseColor);
        hoveredGate.label.scale.setScalar(1);
      }
      if (gate) {
        gate.frameMaterial.color.copy(hoverColor);
        gate.label.scale.setScalar(1.08);
      }
      hoveredGate = gate;
      canvas.style.cursor = gate ? "pointer" : "";
    }
    for (const gateObject of gateObjects) {
      (gateObject.hitArea.material as THREE.MeshBasicMaterial).opacity =
        gateObject === hoveredGate ? 0.05 : 0.012 + 0.008 * Math.sin(elapsed * 2 + gateObject.group.position.z);
    }

    composer.render(delta);
  }
  animationFrame = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose();
            material.dispose();
          }
        }
      });
      signs.dispose();
      road.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
