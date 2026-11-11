import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { CITY_CONFIG, type QualityTier } from "../city-config";

/**
 * Post-processing and adaptive quality.
 *
 * Bloom makes the neon and the sun glow. One further pass does lens effects
 * (chromatic aberration, vignette, film grain, optional scanlines) in a
 * single cheap shader. Quality starts on a tier and steps down whenever the
 * frame rate stays below the floor; it never steps back up, so it cannot
 * oscillate.
 */

const lensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: CITY_CONFIG.effects.chromaticAberration },
    uVignette: { value: CITY_CONFIG.effects.vignette },
    uGrain: { value: CITY_CONFIG.effects.grain },
    uScanlines: { value: CITY_CONFIG.effects.scanlines },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uScanlines;
    varying vec2 vUv;

    void main() {
      vec2 centred = vUv - 0.5;
      float radius = dot(centred, centred);
      // Colour fringing grows toward the corners and is absent at the centre.
      vec2 fringe = centred * radius * uAberration * 40.0;
      vec3 color = vec3(
        texture2D(tDiffuse, vUv + fringe).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - fringe).b
      );
      color *= 1.0 - uVignette * smoothstep(0.1, 0.55, radius);
      float noise = fract(sin(dot(gl_FragCoord.xy + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
      color += (noise - 0.5) * uGrain;
      color *= 1.0 - uScanlines * step(0.5, fract(gl_FragCoord.y / 3.0));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function createPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  startTier: number,
  /** Called after a tier change alters the pixel ratio. */
  onResize: () => void,
  /** Stay on `startTier` whatever the frame rate (for debugging). */
  locked = false,
) {
  const { glow, quality } = CITY_CONFIG;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), glow.bloomStrength, glow.bloomRadius, glow.bloomThreshold);
  composer.addPass(bloom);
  const lens = new ShaderPass(lensShader);
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  let tierIndex = Math.min(startTier, quality.tiers.length - 1);
  let frames = 0;
  let time = 0;
  let fps = 60;

  function applyTier(notify: boolean) {
    const tier: QualityTier = quality.tiers[tierIndex];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio));
    composer.setPixelRatio(renderer.getPixelRatio());
    bloom.enabled = tier.bloom;
    lens.enabled = tier.post;
    // The pixel ratio changed, so buffers need resizing.
    if (notify) onResize();
  }
  applyTier(false);

  return {
    composer,
    get tier() {
      return tierIndex;
    },
    get fps() {
      return fps;
    },
    render(delta: number, elapsed: number) {
      lens.uniforms.uTime.value = elapsed;
      composer.render(delta);

      // Average over a window, then decide whether to step down.
      frames++;
      time += delta;
      if (frames >= quality.sampleFrames) {
        fps = frames / time;
        frames = 0;
        time = 0;
        // Ignore the first windows while shaders compile and textures upload.
        if (!locked && elapsed > 4 && fps < quality.fpsFloor && tierIndex < quality.tiers.length - 1) {
          tierIndex++;
          applyTier(true);
        }
      }
    },
    dispose() {
      composer.dispose();
    },
  };
}
