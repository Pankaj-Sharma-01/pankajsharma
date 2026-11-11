import * as THREE from "three";

import { pick, type Random } from "@/lib/random";

import { CITY_CONFIG } from "../city-config";
import type { SignAnchor, SignKind } from "./buildings";
import { ROAD_HALF_WIDTH, createGlowTexture, neonColors, type CityPalette } from "./shared";

/**
 * Signage: advertising screens, vertical blade signs, shop-front strips, and
 * scrolling LED tickers, plus the light they throw (a halo on the wall
 * behind, a pool on the pavement below).
 *
 * All artwork is drawn at runtime onto canvas atlases: original designs with
 * invented names, in the site palette. Atlases are built once and shared by
 * every street; each street's signs are instances of one mesh per kind.
 */

const SCREEN_GRID = 5; // 5 x 5 designs
const POSTER_CELLS = 5; // the last cells of the screen atlas are "watched" posters
const TICKER_ASPECT = 32; // ticker atlas rows are 32:1

const WORDS = [
  "NOVA", "KAIRO", "SYNTH", "BYTE", "PULSE", "ORBIT", "ZEN-9", "NEURAL", "ARCADE", "RAMEN",
  "24H", "VOLT", "HALO", "ECHO", "FLUX", "DRIFT", "ONYX", "LUMEN", "CIPHER", "VANTA",
] as const;
const CAPTIONS = [
  "OPEN 24H", "LEVEL 9", "NIGHT MARKET", "DATA BAR", "SECTOR 7", "NOODLE HOUSE", "UPGRADES", "REPAIRS",
] as const;
const DESTINATIONS = ["METRO", "SKYPORT", "MARKET", "DOCKS", "OLD TOWN"] as const;
const BLADE_WORDS = [
  "BAR", "HOTEL", "RAMEN", "ARCADE", "TATTOO", "NOODLE", "CYBER", "24H", "CLINIC", "PAWN", "SYNTH", "TEA",
] as const;
const SHOPS = [
  "NOVA NOODLE", "KAIRO PHARMACY", "BYTE REPAIR", "ZEN-9 CAPSULE", "PULSE ARCADE",
  "ORBIT TEA HOUSE", "HALO CLINIC", "VOLT MOTORS", "ECHO RECORDS", "FLUX TATTOO",
] as const;
/** "You are being watched", in the languages of a big city. English always comes first. */
const WATCHED = [
  "YOU ARE BEING WATCHED",
  "あなたは見られている",
  "VOUS ÊTES SURVEILLÉ",
  "你正在被监视",
  "TE ESTÁN OBSERVANDO",
  "आप पर नज़र रखी जा रही है",
  "DU WIRST BEOBACHTET",
  "당신은 감시당하고 있다",
  "ЗА ВАМИ НАБЛЮДАЮТ",
  "أنت مراقَب",
  "VOCÊ ESTÁ SENDO OBSERVADO",
] as const;
const TICKERS = [
  null, // filled with WATCHED at runtime
  "NOVA NOODLE HOUSE  ///  OPEN 24H  ///  SECTOR 7 NIGHT MARKET  ///  KAIRO PHARMACY  ///  UPGRADES WHILE YOU WAIT",
  null,
  "TRANSIT  ///  LINE 9 RUNNING LATE  ///  RAIN UNTIL DAWN  ///  SKYPORT GATES OPEN  ///  KEEP TO THE LIGHT",
] as const;

export type SignFonts = { display: string; mono: string };

/** Whether the device has glyphs for a phrase (otherwise it would draw as empty boxes). */
function canRender(context: CanvasRenderingContext2D, text: string) {
  const missing = context.measureText("￿".repeat([...text].length)).width;
  return Math.abs(context.measureText(text).width - missing) > 1;
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawEye(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, iris: string) {
  context.beginPath();
  context.moveTo(x - size, y);
  context.quadraticCurveTo(x, y - size * 0.75, x + size, y);
  context.quadraticCurveTo(x, y + size * 0.75, x - size, y);
  context.closePath();
  context.lineWidth = size * 0.12;
  context.strokeStyle = color;
  context.stroke();
  context.beginPath();
  context.arc(x, y, size * 0.34, 0, Math.PI * 2);
  context.fillStyle = iris;
  context.fill();
  context.beginPath();
  context.arc(x, y, size * 0.13, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function drawArrow(context: CanvasRenderingContext2D, x: number, y: number, size: number, quarterTurns: number) {
  context.save();
  context.translate(x, y);
  context.rotate((quarterTurns * Math.PI) / 2);
  context.beginPath();
  context.moveTo(-size, -size * 0.28);
  context.lineTo(size * 0.2, -size * 0.28);
  context.lineTo(size * 0.2, -size * 0.7);
  context.lineTo(size, 0);
  context.lineTo(size * 0.2, size * 0.7);
  context.lineTo(size * 0.2, size * 0.28);
  context.lineTo(-size, size * 0.28);
  context.closePath();
  context.fill();
  context.restore();
}

function drawIcon(context: CanvasRenderingContext2D, kind: number, x: number, y: number, size: number) {
  context.beginPath();
  if (kind === 0) {
    // Lightning bolt.
    context.moveTo(x + size * 0.15, y - size);
    context.lineTo(x - size * 0.55, y + size * 0.1);
    context.lineTo(x - size * 0.05, y + size * 0.1);
    context.lineTo(x - size * 0.2, y + size);
    context.lineTo(x + size * 0.55, y - size * 0.2);
    context.lineTo(x + size * 0.05, y - size * 0.2);
    context.closePath();
    context.fill();
  } else if (kind === 1) {
    // Steaming bowl.
    context.arc(x, y, size * 0.8, 0, Math.PI);
    context.closePath();
    context.fill();
    context.lineWidth = size * 0.1;
    for (const offset of [-0.35, 0, 0.35]) {
      context.beginPath();
      context.moveTo(x + offset * size, y - size * 0.2);
      context.quadraticCurveTo(x + (offset + 0.15) * size, y - size * 0.55, x + offset * size, y - size * 0.9);
      context.stroke();
    }
  } else if (kind === 2) {
    // Heartbeat line.
    context.lineWidth = size * 0.14;
    context.moveTo(x - size, y);
    context.lineTo(x - size * 0.4, y);
    context.lineTo(x - size * 0.15, y - size * 0.8);
    context.lineTo(x + size * 0.15, y + size * 0.7);
    context.lineTo(x + size * 0.4, y);
    context.lineTo(x + size, y);
    context.stroke();
  } else {
    // Hexagon.
    for (let corner = 0; corner < 6; corner++) {
      const angle = (corner * Math.PI) / 3;
      context.lineTo(x + Math.cos(angle) * size * 0.85, y + Math.sin(angle) * size * 0.85);
    }
    context.closePath();
    context.lineWidth = size * 0.14;
    context.stroke();
  }
}

function drawScreen(
  context: CanvasRenderingContext2D,
  index: number,
  size: number,
  palette: CityPalette,
  fonts: SignFonts,
  random: Random,
  poster: string | null,
) {
  const neons = [palette.accent, palette.hot, palette.sun, palette.ultra];
  // Cell index % 4 is the sign's dominant colour; createSigns relies on this.
  const primary = neons[index % 4];
  const secondary = neons[(index + 1 + Math.floor(random() * 2)) % 4];
  const word = WORDS[index % WORDS.length];

  context.save();
  context.beginPath();
  context.rect(0, 0, size, size);
  context.clip();

  const backdrop = context.createLinearGradient(0, 0, size, size);
  backdrop.addColorStop(0, palette.background);
  backdrop.addColorStop(1, palette.border);
  context.fillStyle = backdrop;
  context.fillRect(0, 0, size, size);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 6;
  context.strokeStyle = primary;
  context.fillStyle = primary;

  if (poster) {
    // Surveillance notice: an eye, the warning, and a hazard bar.
    drawEye(context, size / 2, size * 0.34, size * 0.3, primary, palette.foreground);
    context.fillStyle = palette.foreground;
    const words = poster.split(" ");
    const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [poster];
    context.font = `700 ${size * 0.105}px ${fonts.display}`;
    lines.forEach((line, row) => context.fillText(line, size / 2, size * (0.66 + row * 0.13), size * 0.86));
    context.fillStyle = primary;
    for (let stripe = 0; stripe < 12; stripe += 2) context.fillRect(size * 0.08 + stripe * size * 0.07, size * 0.9, size * 0.07, size * 0.035);
  } else {
    const design = index % 6;
    if (design === 0) {
      // Rising sun over a horizon line.
      context.beginPath();
      context.arc(size / 2, size * 0.5, size * 0.26, Math.PI, 0);
      context.fillStyle = secondary;
      context.fill();
      context.fillStyle = palette.background;
      for (let band = 0; band < 4; band++) context.fillRect(0, size * (0.36 + band * 0.045), size, 5);
      context.fillStyle = primary;
      context.fillRect(size * 0.12, size * 0.5, size * 0.76, 6);
    } else if (design === 1) {
      // Target rings.
      for (let ring = 1; ring <= 4; ring++) {
        context.beginPath();
        context.arc(size / 2, size * 0.36, ring * size * 0.07, 0, Math.PI * 2);
        context.strokeStyle = ring % 2 ? primary : secondary;
        context.stroke();
      }
    } else if (design === 2) {
      // Hazard stripes.
      context.fillStyle = secondary;
      for (let stripe = -4; stripe < 12; stripe++) {
        context.beginPath();
        context.moveTo(stripe * 40, size * 0.56);
        context.lineTo(stripe * 40 + 20, size * 0.56);
        context.lineTo(stripe * 40 + 20 + size * 0.42, size * 0.14);
        context.lineTo(stripe * 40 + size * 0.42, size * 0.14);
        context.fill();
      }
    } else if (design === 3) {
      // Abstract mark: triangle and disc.
      context.beginPath();
      context.moveTo(size * 0.2, size * 0.54);
      context.lineTo(size * 0.36, size * 0.16);
      context.lineTo(size * 0.52, size * 0.54);
      context.closePath();
      context.stroke();
      context.beginPath();
      context.arc(size * 0.68, size * 0.36, size * 0.13, 0, Math.PI * 2);
      context.fillStyle = secondary;
      context.fill();
    } else if (design === 4) {
      // Wayfinding arrow.
      context.fillStyle = secondary;
      drawArrow(context, size / 2, size * 0.36, size * 0.22, pick(random, [0, 2, 3]));
    } else {
      context.fillStyle = secondary;
      context.strokeStyle = secondary;
      drawIcon(context, Math.floor(random() * 4), size / 2, size * 0.36, size * 0.2);
    }

    const title = design === 4 ? pick(random, DESTINATIONS) : word;
    context.shadowColor = primary;
    context.shadowBlur = 14;
    context.fillStyle = palette.foreground;
    context.font = `700 ${Math.min(size * 0.26, (size * 1.25) / title.length)}px ${fonts.display}`;
    context.fillText(title, size / 2, size * 0.72, size * 0.9);
    context.shadowBlur = 0;
    context.fillStyle = secondary;
    context.font = `700 ${size * 0.075}px ${fonts.display}`;
    context.fillText(pick(random, CAPTIONS), size / 2, size * 0.89, size * 0.9);
  }

  context.strokeStyle = primary;
  context.lineWidth = 8;
  context.strokeRect(6, 6, size - 12, size - 12);
  context.restore();
}

function createScreenAtlas(palette: CityPalette, fonts: SignFonts, random: Random) {
  const cell = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = cell * SCREEN_GRID;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `700 26px ${fonts.display}`;
    const phrases = WATCHED.filter((phrase) => canRender(context, phrase));
    const cells = SCREEN_GRID * SCREEN_GRID;
    for (let index = 0; index < cells; index++) {
      const posterIndex = index - (cells - POSTER_CELLS);
      // First poster is English; the rest rotate through the other languages.
      const poster = posterIndex < 0 ? null : phrases[posterIndex === 0 ? 0 : 1 + ((posterIndex - 1) % Math.max(1, phrases.length - 1))];
      context.save();
      context.translate((index % SCREEN_GRID) * cell, Math.floor(index / SCREEN_GRID) * cell);
      drawScreen(context, index, cell, palette, fonts, random, poster ?? null);
      context.restore();
    }
  }
  return toTexture(canvas);
}

function createBladeAtlas(palette: CityPalette, fonts: SignFonts) {
  const width = 128;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width * BLADE_WORDS.length;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    const neons = [palette.hot, palette.accent, palette.sun];
    context.textAlign = "center";
    context.textBaseline = "middle";
    BLADE_WORDS.forEach((word, index) => {
      const color = neons[index % 3];
      const x = index * width;
      context.fillStyle = palette.background;
      context.fillRect(x, 0, width, height);
      context.strokeStyle = color;
      context.lineWidth = 8;
      context.strokeRect(x + 8, 8, width - 16, height - 16);
      // Letters stacked top to bottom.
      const step = (height - 60) / word.length;
      context.font = `700 ${Math.min(84, step * 0.92)}px ${fonts.display}`;
      context.shadowColor = color;
      context.shadowBlur = 16;
      context.fillStyle = color;
      [...word].forEach((letter, position) => context.fillText(letter, x + width / 2, 30 + step * (position + 0.5)));
      context.shadowBlur = 0;
    });
  }
  return toTexture(canvas);
}

function createStripAtlas(palette: CityPalette, fonts: SignFonts) {
  const width = 512;
  const height = 64;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height * SHOPS.length;
  const context = canvas.getContext("2d");
  if (context) {
    const neons = [palette.hot, palette.accent, palette.sun];
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `700 34px ${fonts.display}`;
    SHOPS.forEach((name, index) => {
      const color = neons[index % 3];
      const y = index * height;
      context.fillStyle = palette.background;
      context.fillRect(0, y, width, height);
      context.strokeStyle = color;
      context.lineWidth = 4;
      context.strokeRect(4, y + 4, width - 8, height - 8);
      context.shadowColor = color;
      context.shadowBlur = 10;
      context.fillStyle = index % 2 ? palette.foreground : color;
      context.fillText(name, width / 2, y + height / 2 + 2, width - 40);
      context.shadowBlur = 0;
    });
  }
  return toTexture(canvas);
}

function createTickerAtlas(palette: CityPalette, fonts: SignFonts) {
  const width = 2048;
  const height = 64;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height * TICKERS.length;
  const context = canvas.getContext("2d");
  if (context) {
    const colors = [palette.hot, palette.sun, palette.accent, palette.hot];
    context.textBaseline = "middle";
    context.font = `700 38px ${fonts.mono}`;
    const phrases = WATCHED.filter((phrase) => canRender(context, phrase));
    TICKERS.forEach((fixed, row) => {
      // Rows 0 and 2 carry the warning, starting from different languages.
      const rotated = [...phrases.slice(row), ...phrases.slice(0, row)];
      const text = `${fixed ?? rotated.join("  ///  ")}  ///  `;
      const y = row * height;
      context.fillStyle = palette.background;
      context.fillRect(0, y, width, height);
      // Squeeze a whole number of repeats into the row so it scrolls seamlessly.
      const measured = context.measureText(text).width;
      const repeats = Math.max(1, Math.round(width / measured));
      context.save();
      context.translate(0, y + height / 2 + 2);
      context.scale(width / (measured * repeats), 1);
      context.fillStyle = colors[row];
      context.shadowColor = colors[row];
      context.shadowBlur = 8;
      for (let repeat = 0; repeat < repeats; repeat++) context.fillText(text, repeat * measured, 0);
      context.restore();
    });
  }
  const texture = toTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export type SignAtlases = {
  textures: Record<SignKind, THREE.Texture>;
  glow: THREE.Texture;
  dispose: () => void;
};

/** Draws every atlas. Call once and share the result between streets. */
export function createSignAtlases(palette: CityPalette, fonts: SignFonts, random: Random): SignAtlases {
  const textures = {
    screen: createScreenAtlas(palette, fonts, random),
    blade: createBladeAtlas(palette, fonts),
    strip: createStripAtlas(palette, fonts),
    ticker: createTickerAtlas(palette, fonts),
  };
  const glow = createGlowTexture();
  return {
    textures,
    glow,
    dispose() {
      for (const texture of Object.values(textures)) texture.dispose();
      glow.dispose();
    },
  };
}

/** How each kind of sign maps onto its atlas. `tone` is the neon index of a cell's main colour. */
const LAYOUTS: Record<SignKind, { columns: number; rows: number; scroll: number; tone: (cell: number) => number }> = {
  screen: { columns: SCREEN_GRID, rows: SCREEN_GRID, scroll: 0, tone: (cell) => cell % 4 },
  blade: { columns: BLADE_WORDS.length, rows: 1, scroll: 0, tone: (cell) => [1, 0, 2][cell % 3] },
  strip: { columns: 1, rows: SHOPS.length, scroll: 0, tone: (cell) => [1, 0, 2][cell % 3] },
  ticker: { columns: 1, rows: TICKERS.length, scroll: 0.035, tone: (cell) => [1, 2, 0, 1][cell % 4] },
};

const vertexShader = /* glsl */ `
  attribute vec4 aRect; // atlas offset.xy, size.zw
  attribute float aSeed;
  uniform float uTime;
  uniform float uScroll;
  varying vec2 vUv;
  varying vec2 vAtlas;
  varying float vSeed;
  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    vAtlas = aRect.xy + uv * aRect.zw + vec2(uTime * uScroll, 0.0);
    vSeed = aSeed;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uBrightness;
  varying vec2 vUv;
  varying vec2 vAtlas;
  varying float vSeed;
  #include <fog_pars_fragment>

  float flick(float rate) {
    float tick = floor(uTime * rate + vSeed * 100.0);
    return fract(sin(tick * 12.9898) * 43758.5453);
  }

  void main() {
    vec3 color = texture2D(uMap, vAtlas).rgb;
    // Rolling scanlines.
    color *= 0.82 + 0.18 * sin(vUv.y * 90.0 - uTime * 3.0);
    // A faulty power supply: the whole sign stutters.
    if (vSeed > 0.78) color *= mix(0.45, 1.0, step(0.18, flick(10.0)));
    // A broken tube: one band of the sign is nearly dead and sputters.
    if (vSeed > 0.5 && vSeed < 0.64) {
      float start = fract(vSeed * 37.0) * 0.8;
      float band = step(start, vUv.x) * step(vUv.x, start + 0.2);
      color *= mix(1.0, 0.12 + 0.5 * step(0.7, flick(14.0)), band);
    }
    gl_FragColor = vec4(color * uBrightness, 1.0);
    #include <fog_fragment>
  }
`;

/** Unit vector a sign faces, from its rotation about y. */
function facing(anchor: SignAnchor) {
  return { x: Math.sin(anchor.rotationY), z: Math.cos(anchor.rotationY) };
}

function createSignMesh(kind: SignKind, anchors: readonly SignAnchor[], atlases: SignAtlases, random: Random) {
  const layout = LAYOUTS[kind];
  const geometry = new THREE.PlaneGeometry(1, 1);
  const rects = new Float32Array(anchors.length * 4);
  const seeds = new Float32Array(anchors.length);
  const tones: number[] = [];
  // Inset a little so neighbouring atlas cells never bleed in.
  const inset = kind === "ticker" ? 0 : 0.004;
  const cells = layout.columns * layout.rows;

  anchors.forEach((anchor, index) => {
    const cell = Math.floor(random() * cells);
    const column = cell % layout.columns;
    const row = Math.floor(cell / layout.columns);
    // A ticker shows only as much of its row as its shape allows, so the text is never stretched.
    const width = kind === "ticker" ? anchor.width / anchor.height / TICKER_ASPECT : 1 / layout.columns - inset * 2;
    const left = kind === "ticker" ? random() : column / layout.columns + inset;
    rects.set([left, 1 - (row + 1) / layout.rows + inset, width, 1 / layout.rows - inset * 2], index * 4);
    seeds[index] = random();
    tones.push(layout.tone(cell));
  });
  geometry.setAttribute("aRect", new THREE.InstancedBufferAttribute(rects, 4));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    side: THREE.DoubleSide,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uMap: { value: null },
        uTime: { value: 0 },
        uScroll: { value: layout.scroll },
        uBrightness: { value: CITY_CONFIG.glow.signs },
      },
    ]),
  });
  material.uniforms.uMap.value = atlases.textures[kind];

  const mesh = new THREE.InstancedMesh(geometry, material, anchors.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  anchors.forEach((anchor, index) => {
    position.set(anchor.x, anchor.y, anchor.z);
    rotation.setFromAxisAngle(up, anchor.rotationY);
    scale.set(anchor.width, anchor.height, 1);
    mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return { mesh, material, tones };
}

/** Additive glow sprites, tinted per instance: wall halos and pavement pools. */
function createGlows(
  items: readonly { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3; color: THREE.Color }[],
  texture: THREE.Texture,
) {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // Fog would wash an additive sprite out to a pale rectangle.
      fog: false,
    }),
    items.length,
  );
  const matrix = new THREE.Matrix4();
  items.forEach((item, index) => {
    mesh.setMatrixAt(index, matrix.compose(item.position, item.rotation, item.scale));
    mesh.setColorAt(index, item.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Builds the signs for one group (a street, a landmark, a blimp) from its anchors. */
export function createSigns(anchors: readonly SignAnchor[], atlases: SignAtlases, palette: CityPalette, random: Random) {
  const group = new THREE.Group();
  const materials: THREE.ShaderMaterial[] = [];
  const neons = neonColors(palette);
  const up = new THREE.Vector3(0, 1, 0);
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const halos: Parameters<typeof createGlows>[0][number][] = [];
  const pools: Parameters<typeof createGlows>[0][number][] = [];

  for (const kind of ["screen", "blade", "strip", "ticker"] as const) {
    const ofKind = anchors.filter((anchor) => anchor.kind === kind);
    if (ofKind.length === 0) continue;
    const { mesh, material, tones } = createSignMesh(kind, ofKind, atlases, random);
    group.add(mesh);
    materials.push(material);
    if (kind === "ticker") continue;

    ofKind.forEach((anchor, index) => {
      const normal = facing(anchor);
      const color = neons[tones[index]];
      // Light spilling onto the wall around the sign.
      halos.push({
        position: new THREE.Vector3(anchor.x - normal.x * 0.14, anchor.y, anchor.z - normal.z * 0.14),
        rotation: new THREE.Quaternion().setFromAxisAngle(up, anchor.rotationY),
        scale: new THREE.Vector3(anchor.width * 1.9 + 2, anchor.height * 1.9 + 2, 1),
        color: color.clone().multiplyScalar(CITY_CONFIG.glow.signHalo),
      });
      // And onto the pavement, for signs near street level.
      if (anchor.y - anchor.height / 2 < 12 && Math.abs(anchor.x) > ROAD_HALF_WIDTH) {
        pools.push({
          position: new THREE.Vector3(Math.sign(anchor.x) * (ROAD_HALF_WIDTH + 1.5), 0.34, anchor.z),
          rotation: flat,
          scale: new THREE.Vector3(12, 12, 1),
          color: color.clone().multiplyScalar(CITY_CONFIG.glow.groundPools),
        });
      }
    });
  }
  if (halos.length > 0) group.add(createGlows(halos, atlases.glow));
  if (pools.length > 0) group.add(createGlows(pools, atlases.glow));

  return {
    group,
    update(elapsed: number) {
      for (const material of materials) material.uniforms.uTime.value = elapsed;
    },
  };
}
