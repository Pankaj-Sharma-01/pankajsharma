import * as THREE from "three";

import { pick, type Random } from "@/lib/random";

import type { SignAnchor } from "./buildings";
import type { CityPalette } from "./shared";

/**
 * Advertising screens and blade signs. The artwork is drawn at runtime onto
 * two canvas atlases (original designs with invented names, in the site
 * palette), and every sign is an instance of one of two meshes.
 */

const SCREEN_COLUMNS = 4;
const SCREEN_ROWS = 4;
const BLADE_COLUMNS = 8;

const WORDS = [
  "NOVA", "KAIRO", "SYNTH", "BYTE", "PULSE", "ORBIT", "ZEN-9", "NEURAL",
  "ARCADE", "RAMEN", "24H", "VOLT", "HALO", "ECHO", "FLUX", "DRIFT",
] as const;
const CAPTIONS = [
  "OPEN 24H", "LEVEL 9", "NIGHT MARKET", "DATA BAR", "SECTOR 7", "NOODLE HOUSE", "UPGRADES", "REPAIRS",
] as const;
const BLADE_WORDS = ["BAR", "HOTEL", "RAMEN", "ARCADE", "TATTOO", "NOODLE", "CYBER", "24H"] as const;

function drawScreen(
  context: CanvasRenderingContext2D,
  index: number,
  size: number,
  palette: CityPalette,
  fontFamily: string,
  random: Random,
) {
  const neons = [palette.accent, palette.hot, palette.sun, palette.ultra];
  const primary = neons[index % neons.length];
  const secondary = neons[(index + 1 + Math.floor(random() * 2)) % neons.length];
  const word = WORDS[index % WORDS.length];

  context.save();
  context.beginPath();
  context.rect(0, 0, size, size);
  context.clip();

  // Backdrop.
  const backdrop = context.createLinearGradient(0, 0, size, size);
  backdrop.addColorStop(0, palette.background);
  backdrop.addColorStop(1, palette.border);
  context.fillStyle = backdrop;
  context.fillRect(0, 0, size, size);

  context.lineWidth = 6;
  context.strokeStyle = primary;
  context.fillStyle = primary;
  const design = index % 4;
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
  } else {
    // Abstract mark: triangle, circle, bars.
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
  }

  // Wordmark and caption.
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = primary;
  context.shadowBlur = 14;
  context.fillStyle = palette.foreground;
  const wordSize = Math.min(size * 0.26, (size * 1.25) / word.length);
  context.font = `700 ${wordSize}px ${fontFamily}`;
  context.fillText(word, size / 2, size * 0.72, size * 0.9);
  context.shadowBlur = 0;
  context.fillStyle = secondary;
  context.font = `700 ${size * 0.075}px ${fontFamily}`;
  context.fillText(pick(random, CAPTIONS), size / 2, size * 0.89, size * 0.9);

  // Frame.
  context.strokeStyle = primary;
  context.lineWidth = 8;
  context.strokeRect(6, 6, size - 12, size - 12);
  context.restore();
}

function createScreenAtlas(palette: CityPalette, fontFamily: string, random: Random) {
  const cell = 256;
  const canvas = document.createElement("canvas");
  canvas.width = cell * SCREEN_COLUMNS;
  canvas.height = cell * SCREEN_ROWS;
  const context = canvas.getContext("2d");
  if (context) {
    for (let index = 0; index < SCREEN_COLUMNS * SCREEN_ROWS; index++) {
      context.save();
      context.translate((index % SCREEN_COLUMNS) * cell, Math.floor(index / SCREEN_COLUMNS) * cell);
      drawScreen(context, index, cell, palette, fontFamily, random);
      context.restore();
    }
  }
  return toTexture(canvas);
}

function createBladeAtlas(palette: CityPalette, fontFamily: string) {
  const width = 128;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width * BLADE_COLUMNS;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    const neons = [palette.hot, palette.accent, palette.sun];
    context.textAlign = "center";
    context.textBaseline = "middle";
    BLADE_WORDS.forEach((word, index) => {
      const color = neons[index % neons.length];
      const x = index * width;
      context.fillStyle = palette.background;
      context.fillRect(x, 0, width, height);
      context.strokeStyle = color;
      context.lineWidth = 8;
      context.strokeRect(x + 8, 8, width - 16, height - 16);
      // Letters stacked top to bottom.
      const step = (height - 60) / word.length;
      context.font = `700 ${Math.min(84, step * 0.92)}px ${fontFamily}`;
      context.shadowColor = color;
      context.shadowBlur = 16;
      context.fillStyle = color;
      [...word].forEach((letter, position) => {
        context.fillText(letter, x + width / 2, 30 + step * (position + 0.5));
      });
      context.shadowBlur = 0;
    });
  }
  return toTexture(canvas);
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const vertexShader = /* glsl */ `
  attribute vec4 aRect; // atlas offset.xy, size.zw
  attribute float aSeed;
  varying vec2 vUv;
  varying vec2 vAtlas;
  varying float vSeed;
  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    vAtlas = aRect.xy + uv * aRect.zw;
    vSeed = aSeed;
    vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
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

  void main() {
    vec3 color = texture2D(uMap, vAtlas).rgb;
    // Rolling scanlines, and a faulty tube on some signs.
    float scan = 0.82 + 0.18 * sin(vUv.y * 90.0 - uTime * 3.0);
    float tick = floor(uTime * 10.0 + vSeed * 100.0);
    float flicker = vSeed > 0.75 ? mix(0.45, 1.0, step(0.18, fract(sin(tick * 12.9898) * 43758.5453))) : 1.0;
    gl_FragColor = vec4(color * scan * flicker * uBrightness, 1.0);
    #include <fog_fragment>
  }
`;

function createSignMesh(
  anchors: readonly SignAnchor[],
  texture: THREE.Texture,
  columns: number,
  rows: number,
  random: Random,
) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const rects = new Float32Array(anchors.length * 4);
  const seeds = new Float32Array(anchors.length);
  // Inset a little so neighbouring atlas cells never bleed in.
  const inset = 0.004;
  anchors.forEach((_, index) => {
    const cell = Math.floor(random() * columns * rows);
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    rects.set(
      [column / columns + inset, 1 - (row + 1) / rows + inset, 1 / columns - inset * 2, 1 / rows - inset * 2],
      index * 4,
    );
    seeds[index] = random();
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
      { uMap: { value: null }, uTime: { value: 0 }, uBrightness: { value: 0.85 } },
    ]),
  });
  material.uniforms.uMap.value = texture;

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
  return { mesh, material };
}

export function createSigns(
  anchors: readonly SignAnchor[],
  palette: CityPalette,
  fontFamily: string,
  random: Random,
) {
  const screens = createSignMesh(
    anchors.filter((anchor) => anchor.kind === "screen"),
    createScreenAtlas(palette, fontFamily, random),
    SCREEN_COLUMNS,
    SCREEN_ROWS,
    random,
  );
  const blades = createSignMesh(
    anchors.filter((anchor) => anchor.kind === "blade"),
    createBladeAtlas(palette, fontFamily),
    BLADE_COLUMNS,
    1,
    random,
  );

  const group = new THREE.Group();
  group.add(screens.mesh, blades.mesh);

  return {
    group,
    update(elapsed: number) {
      screens.material.uniforms.uTime.value = elapsed;
      blades.material.uniforms.uTime.value = elapsed;
    },
    dispose() {
      screens.material.uniforms.uMap.value.dispose();
      blades.material.uniforms.uMap.value.dispose();
    },
  };
}
