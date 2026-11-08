import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/**
 * The home page city: a neon avenue at sunrise that the camera drives down
 * as the page scrolls, with one gate per site section. The road ends at a
 * cliff facing an endless horseshoe waterfall, ringed by megatowers rising
 * out of the abyss.
 *
 * Framework-free on purpose: React only mounts the canvas and passes in
 * callbacks. Everything is generated procedurally (no models, no textures to
 * download) and seeded, so the city is identical on every visit. All colours
 * come from the CSS design tokens via `palette`.
 */

export type CityGate = {
  number: string;
  label: string;
  href: string;
};

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

export type CitySceneOptions = {
  canvas: HTMLCanvasElement;
  gates: readonly CityGate[];
  palette: CityPalette;
  /** CSS font-family for the gate labels. */
  fontFamily: string;
  /** Fewer buildings, no bloom, lower resolution. */
  lowPower: boolean;
  /** Scroll progress, 0 at the top of the city to 1 at the last gate. */
  getProgress: () => number;
  onNavigate: (href: string) => void;
};

export type CityScene = {
  dispose: () => void;
};

// Layout, in world units. The journey has gates + 1 stops: one per gate,
// then the falls. Gate i (1-based) sits GATE_AHEAD units in front of where
// the camera is at stop i, so each gate is framed when its section is on
// screen, and scrolling on drives through it. The last stop is the cliff.
const SPACING = 64;
const START_Z = 30;
const GATE_AHEAD = 38;
const ROAD_HALF_WIDTH = 12;
const GATE_HEIGHT = 17;
const STREET_EYE_HEIGHT = 5.5;
/** Camera height and upward gaze at the cliff edge, to take in the falls. */
const CLIFF_EYE_HEIGHT = 14;
/** Negative: at the edge the camera looks down into the falls. */
const CLIFF_LOOK_HEIGHT = 1;
/** Distance from the camera's final position to the cliff edge. */
const CLIFF_GAP = 14;
/** Direction of the rising sun: straight down the avenue, just above the horizon. */
const SUN_DIRECTION = new THREE.Vector3(0, 0.045, -1).normalize();

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Small deterministic PRNG (mulberry32). */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Sky: night overhead, ultraviolet dusk, pink horizon, striped rising sun.
// ---------------------------------------------------------------------------

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uDusk;
  uniform vec3 uHorizon;
  uniform vec3 uHot;
  uniform vec3 uSun;
  uniform vec3 uSunDirection;
  uniform float uTime;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = direction.y;

    vec3 color = mix(uHorizon, uDusk, smoothstep(0.0, 0.2, height));
    color = mix(color, uZenith, smoothstep(0.2, 0.6, height));
    // Below the horizon: dark haze.
    color = mix(color, uDusk * 0.5, 1.0 - smoothstep(-0.12, 0.0, height));

    // Glow around the sun.
    float towardSun = max(dot(direction, uSunDirection), 0.0);
    color += uHot * pow(towardSun, 4.0) * 0.35;
    color += uSun * pow(towardSun, 40.0) * 0.3;

    // Sun disc, lit from amber (top) to hot pink (bottom), with retro
    // horizontal bands cut into its lower half that drift slowly upward.
    vec2 local = vec2(direction.x, direction.y - uSunDirection.y);
    float radius = 0.14;
    float inside = 1.0 - smoothstep(radius - 0.004, radius, length(local));
    float vertical = local.y / radius; // -1 bottom .. 1 top
    float band = fract(vertical * 7.0 + uTime * 0.15);
    float gap = clamp(-vertical, 0.0, 1.0) * 0.55;
    float cut = vertical < 0.1 ? step(gap, band) : 1.0;
    vec3 sunColor = mix(uHot, uSun, smoothstep(-0.9, 0.7, vertical)) * 1.15;
    color = mix(color, sunColor, inside * cut * step(direction.z, 0.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createSky(palette: CityPalette) {
  const material = new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(palette.skyZenith) },
      uDusk: { value: new THREE.Color(palette.skyDusk) },
      uHorizon: { value: new THREE.Color(palette.skyHorizon).multiplyScalar(0.8) },
      uHot: { value: new THREE.Color(palette.hot) },
      uSun: { value: new THREE.Color(palette.sun) },
      uSunDirection: { value: SUN_DIRECTION },
      uTime: { value: 0 },
    },
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), material);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return { sky, material };
}

// ---------------------------------------------------------------------------
// Buildings: one instanced mesh, windows and neon edges drawn in the shader.
// ---------------------------------------------------------------------------

const buildingVertexShader = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vSeed;
  #include <fog_pars_vertex>

  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normal;
    vUv = uv;
    vSeed = aSeed;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const buildingFragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uHot;
  uniform vec3 uSun;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vSeed;
  #include <fog_pars_fragment>

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 color = uBase;
    // Sunrise catching the upper floors.
    color += uSun * 0.1 * smoothstep(25.0, 110.0, vWorld.y);

    // Window grid on the walls, in world units so it never stretches.
    if (abs(vNormal.y) < 0.5) {
      float u = abs(vNormal.x) > 0.5 ? vWorld.z : vWorld.x;
      vec2 grid = vec2(u / 1.7, vWorld.y / 2.4);
      vec2 cell = floor(grid);
      vec2 f = fract(grid);
      float pane = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.78);
      float r = hash(cell + vSeed * 31.0);
      float lit = step(0.8, r);
      float flicker = mix(1.0, 0.55 + 0.45 * sin(uTime * (2.0 + r * 6.0) + r * 40.0), step(0.97, r));
      float pick = hash(cell * 1.31 + vSeed);
      vec3 tint = pick < 0.45 ? uSun : (pick < 0.75 ? uAccent : uHot);
      color += pane * lit * flicker * tint * (0.2 + 0.5 * r);
    }

    // Neon outline in cyan or pink: constant on-screen width at any size.
    vec2 edgeDistance = min(vUv, 1.0 - vUv);
    float distanceToEdge = min(edgeDistance.x, edgeDistance.y);
    float edge = 1.0 - smoothstep(0.0, fwidth(distanceToEdge) * 1.6, distanceToEdge);
    vec3 neon = vSeed < 0.6 ? uAccent : uHot;
    color = mix(color, neon, edge * 0.5);

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

type BuildingPlacement = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  /** Ground level of the building; negative for towers rising from the abyss. */
  baseY: number;
};

/** City blocks lining the avenue, from zFrom down to zTo. */
function streetPlacements(random: () => number, zFrom: number, zTo: number, lowPower: boolean) {
  const cell = 14;
  const columns = lowPower ? 4 : 7;
  const placements: BuildingPlacement[] = [];
  for (let z = zFrom; z > zTo; z -= cell) {
    for (const side of [-1, 1]) {
      for (let column = 0; column < columns; column++) {
        if (random() < 0.12) continue;
        const width = 6 + random() * 6;
        const depth = 6 + random() * 6;
        // Taller further from the avenue: the skyline rises behind the street.
        const height = 6 + random() * (18 + (column / columns) * 75) + (random() < 0.06 ? 60 : 0);
        const x = side * (ROAD_HALF_WIDTH + 7 + column * cell + cell / 2 + (random() - 0.5) * 3);
        placements.push({ x, z: Math.max(z + (random() - 0.5) * 3, zTo + depth / 2), width, depth, height, baseY: 0 });
      }
    }
  }
  return placements;
}

/**
 * Megatowers around the chasm: standing in the lake beyond the rim, and a
 * few rising out of the depths inside the falls. Kept off the road's side.
 */
function abyssPlacements(random: () => number, cliffZ: number, lowPower: boolean) {
  const { centerZ, radius } = chasmFor(cliffZ);
  const placements: BuildingPlacement[] = [];
  const depth = FALL_DEPTH;

  const ring = lowPower ? 22 : 46;
  for (let index = 0; index < ring; index++) {
    const angle = random() * Math.PI * 2;
    const distance = radius + 130 + random() * 420;
    const x = Math.sin(angle) * distance;
    const z = centerZ + Math.cos(angle) * distance;
    // Off the road's side, and out of the line of sight to the sunrise.
    if (z > cliffZ - 25 || Math.abs(x) < 150) continue;
    placements.push({
      x,
      z,
      width: 12 + random() * 24,
      depth: 12 + random() * 24,
      height: depth + 50 + random() * 280,
      baseY: -depth,
    });
  }

  // A few slender spires rising out of the depths, flanking the view.
  const inside = lowPower ? 3 : 6;
  for (let index = 0; index < inside; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const angle = Math.PI + side * (0.7 + random() * 0.9);
    const distance = radius * (0.5 + random() * 0.3);
    placements.push({
      x: Math.sin(angle) * distance,
      z: centerZ + Math.cos(angle) * distance,
      width: 5 + random() * 6,
      depth: 5 + random() * 6,
      height: depth - 30 + random() * 90,
      baseY: -depth,
    });
  }
  return placements;
}

function createBuildingMesh(placements: readonly BuildingPlacement[], random: () => number, palette: CityPalette) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  const seeds = new Float32Array(placements.length);
  placements.forEach((_, index) => (seeds[index] = random()));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: buildingVertexShader,
    fragmentShader: buildingFragmentShader,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uBase: { value: new THREE.Color(palette.background).lerp(new THREE.Color(palette.border), 0.3) },
        uAccent: { value: new THREE.Color(palette.accent) },
        uHot: { value: new THREE.Color(palette.hot) },
        uSun: { value: new THREE.Color(palette.sun) },
        uTime: { value: 0 },
      },
    ]),
  });

  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  placements.forEach((placement, index) => {
    matrix.makeScale(placement.width, placement.height, placement.depth);
    matrix.setPosition(placement.x, placement.baseY, placement.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, material };
}

// ---------------------------------------------------------------------------
// Gates: neon arches over the avenue, labelled with the section name.
// ---------------------------------------------------------------------------

function createLabelTexture(text: string, color: string, fontFamily: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `700 64px ${fontFamily}`;
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
// The falls: past the cliff, the land is a lake whose water pours over the
// rim of a vast circular chasm and falls away forever. Everything is at or
// below ground level, so it stays hidden until the road ends.
// ---------------------------------------------------------------------------

/** Chasm geometry, relative to the cliff edge at the end of the road. */
const CHASM_RADIUS = 200;
/** How far the chasm circle reaches back under the road's end. */
const CHASM_OVERLAP = 30;
const FALL_DEPTH = 760;

type Chasm = { centerZ: number; radius: number };

function chasmFor(cliffZ: number): Chasm {
  return { centerZ: cliffZ - CHASM_RADIUS + CHASM_OVERLAP, radius: CHASM_RADIUS };
}

const noiseChunk = /* glsl */ `
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

const uvVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lakeVertexShader = /* glsl */ `
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
    color += uSun * pow(detail, 8.0) * 0.8;       // sunrise glints
    color = mix(color, uFoam, smoothstep(0.985, 1.0, vUv.y) * 0.5);  // foam at the lip

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

const depthGlowFragmentShader = /* glsl */ `
  uniform float uReveal;
  uniform vec3 uInner;
  uniform vec3 uOuter;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(clamp(1.0 - d, 0.0, 1.0), 2.2);
    gl_FragColor = vec4(mix(uOuter, uInner, glow), glow * 0.7 * uReveal);
  }
`;

/** The lake: everything past the cliff at ground level, minus the chasm. */
function lakeShape(cliffZ: number, chasm: Chasm) {
  // Shape space is (x, -z) because the shape is rotated flat onto the ground.
  // Where the chasm's rim meets the straight cliff edge, either side of the road.
  const halfChord = Math.sqrt(chasm.radius ** 2 - (chasm.radius - CHASM_OVERLAP) ** 2);
  const startAngle = Math.atan2(-halfChord, cliffZ - chasm.centerZ); // left end of the rim
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

function createFalls(palette: CityPalette, cliffZ: number, lowPower: boolean) {
  const group = new THREE.Group();
  const time = { value: 0 };
  // 0 until the final stretch of the road: the falls are a surprise at the end.
  const reveal = { value: 0 };
  const chasm = chasmFor(cliffZ);
  const foam = new THREE.Color(palette.foreground).lerp(new THREE.Color(palette.accent), 0.25);

  // The lake, flowing to the rim.
  const lake = new THREE.Mesh(
    new THREE.ShapeGeometry(lakeShape(cliffZ, chasm), 1),
    new THREE.ShaderMaterial({
      vertexShader: lakeVertexShader,
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
    }),
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.y = 0.01;
  group.add(lake);
  const lakeMaterial = lake.material as THREE.ShaderMaterial;

  // The curtain: the chasm wall, minus the arc under the road's end.
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

  // Mist layers drifting down in the chasm.
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

  // A faint light at the bottom of the fall, too far down to ever reach.
  const depthGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(chasm.radius * 2, chasm.radius * 2),
    new THREE.ShaderMaterial({
      vertexShader: uvVertexShader,
      fragmentShader: depthGlowFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uReveal: reveal,
        uInner: { value: new THREE.Color(palette.accent) },
        uOuter: { value: new THREE.Color(palette.ultra) },
      },
    }),
  );
  depthGlow.rotation.x = -Math.PI / 2;
  depthGlow.position.set(0, -FALL_DEPTH * 0.8, chasm.centerZ);
  group.add(depthGlow);

  // Railing along the cliff edge where the road ends.
  const railWidth = 2 * (ROAD_HALF_WIDTH + 7 + 7 * 14 + 20);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(railWidth, 0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: palette.accent }),
  );
  rail.position.set(0, 1.1, cliffZ + 0.5);
  group.add(rail);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(railWidth, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: palette.hot }),
  );
  edge.position.set(0, 0.02, cliffZ);
  group.add(edge);

  return {
    group,
    /** `arrival`: 0 before the last stretch of road, 1 at the cliff. */
    update(elapsed: number, arrival: number) {
      time.value = elapsed;
      reveal.value = arrival;
      lakeMaterial.uniforms.uTime.value = elapsed;
    },
  };
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

  const { sky, material: skyMaterial } = createSky(palette);
  scene.add(sky);

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

  // Avenue: cyan edges, amber centre line.
  const roadLength = START_Z + 120 - cliffZ;
  const roadCenterZ = (START_Z + 120 + cliffZ) / 2;
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: palette.accent });
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, roadLength), edgeMaterial);
    edge.position.set(side * ROAD_HALF_WIDTH, 0.05, roadCenterZ);
    scene.add(edge);
  }
  const dashCount = Math.floor(roadLength / 8);
  const dashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.18, 0.05, 3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.sun).multiplyScalar(0.6) }),
    dashCount,
  );
  const dashMatrix = new THREE.Matrix4();
  for (let index = 0; index < dashCount; index++) {
    dashMatrix.makeTranslation(0, 0.05, START_Z + 120 - index * 8);
    dashes.setMatrixAt(index, dashMatrix);
  }
  scene.add(dashes);

  // Buildings: the street up to the cliff, megatowers out in the abyss.
  const streetBuildings = streetPlacements(random, START_Z + 140, cliffZ + 4, lowPower);
  const buildings = createBuildingMesh(
    [...streetBuildings, ...abyssPlacements(random, cliffZ, lowPower)],
    random,
    palette,
  );
  scene.add(buildings.mesh);

  const falls = createFalls(palette, cliffZ, lowPower);
  scene.add(falls.group);

  // Holographic billboards on building fronts facing the avenue.
  const billboardMaterials = [palette.accent, palette.hot, palette.ultra, palette.sun].map(
    (color) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
  );
  const billboardGeometry = new THREE.PlaneGeometry(1, 1);
  const frontRow = streetBuildings.filter(
    (placement) => Math.abs(placement.x) < ROAD_HALF_WIDTH + 7 + 14 && placement.height > 16,
  );
  for (const placement of frontRow) {
    if (random() > 0.35) continue;
    const material = billboardMaterials[Math.floor(random() * billboardMaterials.length)];
    const billboard = new THREE.Mesh(billboardGeometry, material);
    billboard.scale.set(3 + random() * 5, 2 + random() * 6, 1);
    const face = placement.x - Math.sign(placement.x) * (placement.width / 2 + 0.3);
    billboard.position.set(face, 8 + random() * (placement.height - 12), placement.z);
    billboard.rotation.y = Math.PI / 2;
    scene.add(billboard);
  }

  // Gates alternate cyan and pink.
  const gateObjects = gates.map((gate, index) =>
    createGate(
      gate,
      START_Z - (index + 1) * SPACING - GATE_AHEAD,
      index % 2 === 0 ? palette.accent : palette.hot,
      fontFamily,
    ),
  );
  for (const gate of gateObjects) scene.add(gate.group);

  // Traffic: white headlights coming toward you, pink tail lights driving away.
  const carCount = lowPower ? 18 : 48;
  const cars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.3, 0.18, 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    carCount,
  );
  const lanes = [-8.5, -4, 4, 8.5];
  const carState = Array.from({ length: carCount }, (_, index) => {
    const lane = lanes[index % lanes.length];
    return {
      x: lane,
      z: START_Z - random() * (START_Z - cliffZ),
      speed: (lane < 0 ? 1 : -1) * (22 + random() * 26),
    };
  });
  const headlight = new THREE.Color(palette.foreground).multiplyScalar(0.6);
  const taillight = new THREE.Color(palette.hot).multiplyScalar(0.8);
  carState.forEach((car, index) => cars.setColorAt(index, car.speed > 0 ? headlight : taillight));
  scene.add(cars);

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
  const carMatrix = new THREE.Matrix4();

  function frame(timestamp: number) {
    animationFrame = requestAnimationFrame(frame);
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();

    // Ease toward the scroll position so the flight feels weighty, not jumpy.
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

    sky.position.copy(camera.position);
    skyMaterial.uniforms.uTime.value = elapsed;
    buildings.material.uniforms.uTime.value = elapsed;
    falls.update(elapsed, arrival);

    // Traffic.
    const nearZ = cameraZ + 40;
    // Traffic never drives off the cliff.
    const farZ = Math.max(cameraZ - 320, cliffZ + 4);
    carState.forEach((car, index) => {
      car.z += car.speed * delta;
      if (car.z > nearZ) car.z = farZ;
      if (car.z < farZ) car.z = nearZ;
      carMatrix.makeTranslation(car.x, 0.35, car.z);
      cars.setMatrixAt(index, carMatrix);
    });
    cars.instanceMatrix.needsUpdate = true;

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
      composer.dispose();
      renderer.dispose();
    },
  };
}
