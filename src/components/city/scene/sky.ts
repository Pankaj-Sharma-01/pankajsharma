import * as THREE from "three";

import { CITY_CONFIG } from "../city-config";
import { noiseChunk, type CityPalette } from "./shared";

/** Direction of the rising sun: straight down the avenue, just above the horizon. */
export const SUN_DIRECTION = new THREE.Vector3(0, 0.045, -1).normalize();

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uDusk;
  uniform vec3 uHorizon;
  uniform vec3 uHot;
  uniform vec3 uSun;
  uniform vec3 uStar;
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform float uGodRays;
  varying vec3 vDirection;
  ${noiseChunk}

  void main() {
    vec3 direction = normalize(vDirection);
    float height = direction.y;

    vec3 color = mix(uHorizon, uDusk, smoothstep(0.0, 0.2, height));
    color = mix(color, uZenith, smoothstep(0.2, 0.6, height));
    // Below the horizon: dark haze.
    color = mix(color, uDusk * 0.5, 1.0 - smoothstep(-0.12, 0.0, height));

    // Last stars fading overhead.
    vec2 starCell = direction.xz / (height + 0.35) * 70.0;
    float star = step(0.9965, hash(floor(starCell))) * smoothstep(0.28, 0.65, height);
    color += uStar * star * 0.7;

    // Thin dawn clouds catching the light near the horizon.
    float cloud = fbm(vec2(direction.x * 3.0 + uTime * 0.004, height * 24.0));
    cloud = smoothstep(0.52, 0.8, cloud) * smoothstep(0.03, 0.1, height) * (1.0 - smoothstep(0.2, 0.38, height));
    color = mix(color, uHot * 0.9 + uSun * 0.35, cloud * 0.4);

    // Glow around the sun.
    float towardSun = max(dot(direction, uSunDirection), 0.0);
    color += uHot * pow(towardSun, 4.0) * 0.35;
    color += uSun * pow(towardSun, 40.0) * 0.3;

    // Shafts of light fanning out through the haze around the sun.
    vec2 fromSun = vec2(direction.x, direction.y - uSunDirection.y);
    float shafts = fbm(vec2(atan(fromSun.y, fromSun.x) * 7.0, uTime * 0.03));
    color += uSun * smoothstep(0.42, 0.8, shafts) * exp(-length(fromSun) * 3.2) * step(direction.z, 0.0) * uGodRays;

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

/** Night overhead, ultraviolet dusk, pink horizon, striped rising sun. */
export function createSky(palette: CityPalette) {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(palette.skyZenith) },
      uDusk: { value: new THREE.Color(palette.skyDusk) },
      uHorizon: { value: new THREE.Color(palette.skyHorizon).multiplyScalar(0.8) },
      uHot: { value: new THREE.Color(palette.hot) },
      uSun: { value: new THREE.Color(palette.sun) },
      uStar: { value: new THREE.Color(palette.foreground) },
      uSunDirection: { value: SUN_DIRECTION },
      uGodRays: { value: CITY_CONFIG.effects.godRays },
      uTime: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), material);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;

  return {
    mesh,
    update(elapsed: number, cameraPosition: THREE.Vector3) {
      mesh.position.copy(cameraPosition);
      material.uniforms.uTime.value = elapsed;
    },
  };
}
