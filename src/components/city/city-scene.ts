import * as THREE from "three";

import { createRandom, type Random } from "@/lib/random";

import { CITY_CONFIG } from "./city-config";
import { ROUTE, createRoute, type RouteLeg } from "./route";
import { createAir } from "./scene/air";
import { CityBuilder, streetLots } from "./scene/buildings";
import { abyssLots, createFalls } from "./scene/falls";
import { buildLandmark } from "./scene/landmarks";
import { createSteam, createWrappedPoints, pointScale } from "./scene/particles";
import { createPipeline } from "./scene/post";
import { createStreet } from "./scene/road";
import { ROAD_HALF_WIDTH, lerp, smoothstep, type CityPalette } from "./scene/shared";
import { createSignAtlases, createSigns, type SignFonts } from "./scene/signs";
import { createSky } from "./scene/sky";

/**
 * The home page city: a drive through a neon megacity at sunrise, steered
 * by the page's scroll position. The route (./route.ts) winds through the
 * streets; each section of the site is a landmark building you drive into,
 * turn inside, and leave by another door. The last street ends at a cliff
 * facing an endless waterfall.
 *
 * Framework-free on purpose: React only mounts the canvas and passes in
 * callbacks. Everything is generated procedurally (no models or image files
 * to download) and seeded, so the city is identical on every visit. Colours
 * come from the CSS design tokens via `palette`; every other tunable is in
 * ./city-config.ts.
 *
 * This file wires the scene together; the pieces live in ./scene/. Each
 * street and each landmark is its own group in its own local coordinates,
 * and only the ones near the camera are drawn.
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
  /** CSS font-family values for signs and labels. */
  fonts: SignFonts;
  /** Start on the reduced density and a lower quality tier. */
  lowPower: boolean;
  /** Scroll progress, 0 at the start of the route to 1 at the falls. */
  getProgress: () => number;
  onNavigate: (href: string) => void;
  /** Called about once a second with the measured frame rate and quality tier. */
  onStats?: (fps: number, tier: number) => void;
  /** Hold this quality tier instead of adapting to the frame rate (for debugging). */
  lockTier?: number;
};

export type CityScene = {
  dispose: () => void;
};

const H = ROUTE.landmarkHalf;
const W = ROUTE.portalHalfWidth;
const P = ROUTE.portalHeight;
/** Streets and landmarks this many legs either side of the camera are drawn. */
const VIEW_LEGS = 1;
/** Switch to the next street's set this far before reaching a corner, while the lobby hides it. */
const SWITCH_AHEAD = 22;

function textTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.textAlign = "center";
    context.textBaseline = "middle";
    draw(context);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Neon lettering over a landmark's entrance. */
function entranceLabel(text: string, color: string, font: string) {
  return textTexture(1024, 160, (context) => {
    context.font = `700 60px ${font}`;
    context.shadowColor = color;
    context.shadowBlur = 12;
    context.fillStyle = color;
    context.fillText(text, 512, 80, 1000);
    context.shadowBlur = 0;
    context.fillText(text, 512, 80, 1000);
  });
}

/** The wall you face on entering a lobby: sector number, name, and which way to turn. */
function lobbySign(gate: CityGate, turn: number, color: string, secondary: string, palette: CityPalette, font: string) {
  return textTexture(1024, 512, (context) => {
    context.fillStyle = palette.background;
    context.fillRect(0, 0, 1024, 512);
    context.strokeStyle = color;
    context.lineWidth = 10;
    context.strokeRect(14, 14, 996, 484);
    context.shadowColor = color;
    context.shadowBlur = 24;
    context.fillStyle = color;
    context.font = `700 220px ${font}`;
    context.fillText(gate.number, 512, 190);
    context.shadowBlur = 0;
    context.fillStyle = palette.foreground;
    context.font = `700 72px ${font}`;
    context.fillText(gate.label.toUpperCase(), 512, 350, 900);
    // Chevrons pointing toward the exit.
    context.fillStyle = secondary;
    for (let chevron = 0; chevron < 5; chevron++) {
      const x = 512 + turn * (chevron - 2) * 70;
      context.beginPath();
      context.moveTo(x - turn * 18, 420);
      context.lineTo(x + turn * 18, 446);
      context.lineTo(x - turn * 18, 472);
      context.lineTo(x - turn * 4, 446);
      context.closePath();
      context.fill();
    }
  });
}

export function createCityScene(options: CitySceneOptions): CityScene | null {
  const { canvas, gates, palette, fonts, lowPower, getProgress, onNavigate, onStats, lockTier } = options;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: "high-performance" });
  } catch {
    return null; // No WebGL: the page works without the city.
  }

  const random: Random = createRandom(2077);
  const density = lowPower ? CITY_CONFIG.density.reduced : CITY_CONFIG.density.full;
  const route = createRoute(gates.length);
  const lastLeg = route.legs[route.legs.length - 1];
  const neonCss = [palette.accent, palette.hot, palette.sun, palette.ultra];
  const atlases = createSignAtlases(palette, fonts, random);

  const scene = new THREE.Scene();
  // Dawn haze: distant buildings dissolve into pink-violet.
  const haze = new THREE.Color(palette.skyHorizon).lerp(new THREE.Color(palette.skyDusk), 0.55).multiplyScalar(0.55);
  scene.background = haze;
  const fog = new THREE.FogExp2(haze, CITY_CONFIG.fog.street);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(CITY_CONFIG.camera.fovLandscape, 1, 0.5, 2000);

  const sky = createSky(palette);
  scene.add(sky.mesh);

  // Ground and grid, both ending exactly at the cliff at the end of the last street.
  const cliffWorldZ = lastLeg.startZ - lastLeg.length - ROUTE.cliffGap;
  const groundFarZ = 520;
  const groundLength = groundFarZ - cliffWorldZ;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3200, groundLength),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.background) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(lastLeg.startX, 0, (groundFarZ + cliffWorldZ) / 2);
  scene.add(ground);

  const grid = new THREE.GridHelper(groundLength, Math.round(groundLength / 8), palette.ultra, palette.ultra);
  const gridMaterial = grid.material as THREE.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.35;
  grid.position.set(lastLeg.startX, 0.02, (groundFarZ + cliffWorldZ) / 2);
  scene.add(grid);

  // --- Streets ---------------------------------------------------------

  /** Rows of blocks on one side. A street inside a U-turn shares its block with the street opposite. */
  function columnsFor(leg: RouteLeg, side: -1 | 1) {
    const next = route.legs[leg.index + 1];
    const previous = route.legs[leg.index - 1];
    const opensU = leg.turnAtEnd === side && next?.turnAtEnd === side;
    const closesU = leg.turnAtStart === side && previous?.turnAtStart === side;
    return opensU || closesU ? Math.min(3, density.columns) : density.columns;
  }

  function createLeg(leg: RouteLeg) {
    const group = new THREE.Group();
    group.position.set(leg.startX, 0, leg.startZ);
    group.rotation.y = leg.rotationY;
    const isFirst = leg.index === 0;
    const isLast = leg === lastLeg;
    const cliffZ = -(leg.length + ROUTE.cliffGap);
    // A street runs between the faces of the landmarks at its ends.
    const streetFrom = isFirst ? 120 : -H;
    const streetTo = isLast ? cliffZ : -(leg.length - H);

    const builder = new CityBuilder(random, !lowPower);
    const sharedCorners: { z: number; side: -1 | 1 }[] = [];
    if (leg.turnAtStart !== 0) sharedCorners.push({ z: 0, side: leg.turnAtStart });
    if (leg.turnAtEnd !== 0) sharedCorners.push({ z: -leg.length, side: leg.turnAtEnd });
    const lots = streetLots(random, {
      from: isFirst ? 140 : -(H + 2),
      to: isLast ? cliffZ + 4 : -(leg.length - H - 2),
      columns: [columnsFor(leg, -1), columnsFor(leg, 1)],
      sharedCorners,
      extendPast: leg.turnAtEnd === 0 ? 0 : leg.turnAtEnd === 1 ? -1 : 1,
    });
    for (const lot of lots) builder.build(lot);

    // Street furniture, spread along the part of the street you drive.
    const propFrom = Math.min(streetFrom, 70) - 8;
    const propTo = streetTo + 8;
    const along = () => lerp(propFrom, propTo, random());
    const side = () => (random() < 0.5 ? -1 : 1);
    for (let index = 0; index < density.propsPerLeg; index++) {
      const roll = random();
      if (roll < 0.35) builder.vendingMachine(side(), along());
      else if (roll < 0.6) builder.crates(side(), along());
      else builder.parkedVehicle(side(), along());
    }
    for (let index = 0; index < density.figuresPerLeg; index++) builder.figure(side(), along());
    for (let index = 0; index < density.cablesPerLeg; index++) builder.cable(along(), 9 + random() * 7);
    if (leg.index % 2 === 1) builder.skybridge(-leg.length * 0.45, 37 + random() * 5);

    let falls: ReturnType<typeof createFalls> | null = null;
    if (isLast) {
      falls = createFalls(palette, random, cliffZ, density, { x: leg.startX, z: leg.startZ });
      group.add(falls.group);
      for (const lot of abyssLots(random, cliffZ, density.megatowers)) builder.build(lot);
      for (const { x, z } of falls.pylonPositions(lowPower ? 8 : 14)) builder.spire(x, 0, z, 22);
    }

    const buildings = builder.createMesh(palette);
    const signs = createSigns(builder.anchors, atlases, palette, random);
    const street = createStreet({
      palette,
      random,
      from: streetFrom,
      to: streetTo,
      crosswalkZ: isLast ? null : streetTo + 9,
      rail: leg.index % 2 === 0 && !isLast,
      facesSun: leg.dirZ === -1,
      cars: density.carsPerLeg,
      glowTexture: atlases.glow,
    });
    group.add(street.group, buildings.mesh, signs.group);

    let steam: ReturnType<typeof createSteam> | null = null;
    if (CITY_CONFIG.effects.steam) {
      const vents = Array.from(
        { length: density.steamVentsPerLeg },
        () => new THREE.Vector3(side() * (ROAD_HALF_WIDTH - 1), 0.1, along()),
      );
      steam = createSteam(random, vents, palette.foreground);
      group.add(steam.points);
    }

    scene.add(group);
    return {
      group,
      update(elapsed: number, delta: number, distance: number, arrival: number) {
        buildings.update(elapsed);
        signs.update(elapsed);
        street.update(elapsed, delta, -(distance - leg.startDistance));
        steam?.update(elapsed);
        falls?.update(elapsed, delta, arrival);
      },
    };
  }

  // --- Landmarks -------------------------------------------------------

  function createLandmark(gate: CityGate, index: number) {
    const leg = route.legs[index];
    const corner = route.corners[index];
    const group = new THREE.Group();
    group.position.set(corner.x, 0, corner.z);
    group.rotation.y = leg.rotationY;

    const builder = new CityBuilder(random, true);
    const { accent, secondary } = buildLandmark(builder, index, leg.turnAtEnd);
    const buildings = builder.createMesh(palette);
    const signs = createSigns(builder.anchors, atlases, palette, random);
    group.add(buildings.mesh, signs.group);

    // Lobby floor.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(H * 2, H * 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.35) }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.05;
    group.add(floor);

    // Name over the entrance.
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20 * (160 / 1024)),
      new THREE.MeshBasicMaterial({
        map: entranceLabel(`${gate.number} // ${gate.label.toUpperCase()}`, neonCss[accent], fonts.display),
        transparent: true,
        depthWrite: false,
      }),
    );
    label.position.set(0, P + 3.4, H + 0.6);
    group.add(label);

    // The wall facing you as you drive in.
    if (leg.turnAtEnd !== 0) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(13, 6.5),
        new THREE.MeshBasicMaterial({
          map: lobbySign(gate, leg.turnAtEnd, neonCss[accent], neonCss[secondary], palette, fonts.display),
        }),
      );
      wall.position.set(0, 5.4, -W + 0.2);
      group.add(wall);
    }

    // Faint holographic curtain across the entrance, also the click target.
    const hitArea = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2, P),
      new THREE.MeshBasicMaterial({
        color: neonCss[accent],
        transparent: true,
        opacity: 0.02,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    hitArea.position.set(0, P / 2, H + 0.3);
    group.add(hitArea);

    scene.add(group);
    return {
      group,
      label,
      hitArea,
      href: gate.href,
      update(elapsed: number) {
        buildings.update(elapsed);
        signs.update(elapsed);
      },
    };
  }

  const legObjects = route.legs.map(createLeg);
  const landmarks = gates.map(createLandmark);
  type Landmark = (typeof landmarks)[number];

  // --- Far skyline: big towers out in the haze, beyond the built-up streets ---
  const skyline = new CityBuilder(random, false);
  const xs = route.corners.map((corner) => corner.x).concat(0);
  const routeMinX = Math.min(...xs);
  const routeMaxX = Math.max(...xs);
  for (let index = 0; index < density.farSkyline; index++) {
    const z = lerp(cliffWorldZ + 90, 430, random());
    const behindStart = z > 300;
    const offset = 190 + random() * 260;
    const x = behindStart
      ? lerp(routeMinX - 300, routeMaxX + 300, random())
      : random() < 0.5
        ? routeMinX - offset
        : routeMaxX + offset;
    skyline.farTower(x, z, 28 + random() * 34, 110 + random() * 230);
  }
  const skylineMesh = skyline.createMesh(palette);
  scene.add(skylineMesh.mesh);

  // --- Sky traffic, weather --------------------------------------------
  const air = createAir({
    palette,
    random,
    landmarks: route.corners,
    blimps: route.legs
      .filter((leg) => leg.dirZ === -1)
      .filter((_, index) => index % 2 === 0)
      .map((leg, index) => ({
        x: leg.startX + (index % 2 === 0 ? 46 : -46),
        z: leg.startZ - leg.length / 2,
        heading: 0,
      })),
    flyersPerLandmark: density.flyersPerLandmark,
    atlases,
  });
  scene.add(air.group);

  const weather: ReturnType<typeof createWrappedPoints>[] = [];
  if (CITY_CONFIG.effects.rain) {
    weather.push(
      createWrappedPoints(random, {
        count: density.rain,
        box: [120, 60, 120],
        velocity: [0, -38, 0],
        size: 0.09,
        color: palette.muted,
        opacity: 0.4,
        soft: false,
      }),
    );
  }
  if (CITY_CONFIG.effects.mist) {
    weather.push(
      createWrappedPoints(random, {
        count: density.mist,
        box: [150, 9, 150],
        velocity: [1.2, 0, 0.7],
        size: 16,
        color: new THREE.Color(palette.hot).lerp(new THREE.Color(palette.foreground), 0.45),
        opacity: 0.035,
        soft: true,
        additive: true,
      }),
    );
  }
  for (const layer of weather) scene.add(layer.points);

  // --- Rendering -------------------------------------------------------
  const bufferSize = new THREE.Vector2();
  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    pipeline.composer.setSize(width, height);
    camera.aspect = width / height;
    // Wider field of view in portrait so the entrances still fit.
    const portrait = camera.aspect < 1;
    camera.fov = portrait ? CITY_CONFIG.camera.fovPortrait : CITY_CONFIG.camera.fovLandscape;
    if (portrait) camera.setViewOffset(width, height, 0, height * CITY_CONFIG.camera.portraitLift, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(bufferSize);
    pointScale.value = bufferSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }
  const pipeline = createPipeline(
    renderer,
    scene,
    camera,
    lockTier ?? (lowPower ? CITY_CONFIG.quality.reducedStartTier : 0),
    () => resize(),
    lockTier !== undefined,
  );
  resize();
  window.addEventListener("resize", resize);

  // Pointer: parallax everywhere, hover/click on entrances over the canvas.
  const pointer = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  let pointerOverCanvas = false;
  let hovered: Landmark | null = null;
  const raycaster = new THREE.Raycaster();

  function onPointerMove(event: PointerEvent) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    pointerOverCanvas = event.target === canvas;
  }

  function landmarkUnderPointer(): Landmark | null {
    if (!pointerOverCanvas) return null;
    raycaster.setFromCamera(pointer, camera);
    for (const landmark of landmarks) {
      if (!landmark.group.visible) continue;
      const hit = raycaster.intersectObject(landmark.hitArea, false)[0];
      if (hit && hit.distance < 140) return landmark;
    }
    return null;
  }

  function onClick() {
    const landmark = landmarkUnderPointer();
    if (landmark) onNavigate(landmark.href);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("click", onClick);

  // Render loop.
  const timer = new THREE.Timer();
  let smoothedProgress = getProgress();
  let animationFrame = 0;
  let statsClock = 0;
  const lookTarget = new THREE.Vector3();
  const { camera: view } = CITY_CONFIG;

  function frame(timestamp: number) {
    animationFrame = requestAnimationFrame(frame);
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();

    // Ease toward the scroll position so the drive feels weighty, not jumpy.
    smoothedProgress += (getProgress() - smoothedProgress) * (1 - Math.exp(-delta * view.easing));
    parallax.lerp(pointer, 1 - Math.exp(-delta * 3));

    // Every stage covers the same distance, so progress maps straight onto it.
    const distance = smoothedProgress * route.totalLength;
    // Over the last stage the camera rises and tilts down over the cliff edge.
    const arrival = smoothstep((route.stops - 1) / route.stops, 1, smoothedProgress);
    const position = route.pointAt(distance);
    // Looking at a point further along the route is what swings the camera through turns.
    const ahead = route.pointAt(distance + view.lookAhead);
    camera.position.set(position.x, lerp(view.streetEye, view.cliffEye, arrival), position.z);
    // Heading comes from the route; pitch from a target a fixed distance out,
    // so the tilt stays gentle however close the look-ahead point is.
    const headingLength = Math.hypot(ahead.x - position.x, ahead.z - position.z) || 1;
    lookTarget.set(
      position.x + ((ahead.x - position.x) / headingLength) * view.gazeDistance,
      lerp(view.streetEye + 2, view.cliffLook, arrival),
      position.z + ((ahead.z - position.z) / headingLength) * view.gazeDistance,
    );
    camera.lookAt(lookTarget);
    // Pointer parallax, applied in the camera's own frame.
    camera.translateX(parallax.x * 1.8);
    camera.translateY(parallax.y * 1);
    camera.rotateY(-parallax.x * 0.05);
    camera.rotateX(parallax.y * 0.03);
    fog.density = lerp(CITY_CONFIG.fog.street, CITY_CONFIG.fog.cliff, arrival);

    // Draw only the streets and landmarks around the camera.
    const current = route.legIndexAt(distance + SWITCH_AHEAD);
    legObjects.forEach((leg, index) => {
      leg.group.visible = Math.abs(index - current) <= VIEW_LEGS;
      if (leg.group.visible) leg.update(elapsed, delta, distance, arrival);
    });
    landmarks.forEach((landmark, index) => {
      // Landmark i stands at the end of street i.
      landmark.group.visible = index >= current - 1 && index <= current + VIEW_LEGS;
      if (landmark.group.visible) landmark.update(elapsed);
    });

    sky.update(elapsed, camera.position);
    skylineMesh.update(elapsed);
    air.update(elapsed);
    for (const layer of weather) layer.update(elapsed, camera.position);

    // Entrance hover: brighten the curtain and lift the label.
    const under = landmarkUnderPointer();
    if (under !== hovered) {
      hovered?.label.scale.setScalar(1);
      under?.label.scale.setScalar(1.1);
      hovered = under;
      canvas.style.cursor = under ? "pointer" : "";
    }
    for (const landmark of landmarks) {
      (landmark.hitArea.material as THREE.MeshBasicMaterial).opacity =
        landmark === hovered ? 0.09 : 0.02 + 0.012 * Math.sin(elapsed * 2 + landmark.group.position.z);
    }

    pipeline.render(delta, elapsed);

    statsClock += delta;
    if (onStats && statsClock > 1) {
      statsClock = 0;
      onStats(pipeline.fps, pipeline.tier);
    }
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
      atlases.dispose();
      pipeline.dispose();
      renderer.dispose();
    },
  };
}
