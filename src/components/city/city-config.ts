/**
 * Every tunable of the home page city, in one place: glow, fog, effects,
 * density, and the quality ladder.
 *
 * Two things live elsewhere on purpose:
 *  - Colours and fonts are CSS design tokens in src/app/globals.css, shared
 *    with the rest of the site. The scene reads them at runtime.
 *  - The route's shape (stage length, turns) is in ./route.ts, shared with
 *    the minimap.
 */

export type CityDensity = {
  /** Blocks of buildings back from each side of a street. */
  columns: number;
  rain: number;
  mist: number;
  carsPerLeg: number;
  figuresPerLeg: number;
  /** Vending machines, crates, parked vehicles per street. */
  propsPerLeg: number;
  cablesPerLeg: number;
  steamVentsPerLeg: number;
  flyersPerLandmark: number;
  farSkyline: number;
  megatowers: number;
  spray: number;
  depthRings: number;
};

export type QualityTier = {
  /** Upper bound on the device pixel ratio. */
  pixelRatio: number;
  bloom: boolean;
  /** Grain, vignette, chromatic aberration. */
  post: boolean;
};

export const CITY_CONFIG = {
  camera: {
    streetEye: 5.5,
    /** Height and gaze at the cliff edge, to take in the falls. */
    cliffEye: 14,
    cliffLook: 1,
    /** How far ahead on the route the camera looks; this is what turns it. */
    lookAhead: 18,
    /** Distance to the point the camera aims at; sets how steeply it tilts. */
    gazeDistance: 60,
    fovLandscape: 60,
    fovPortrait: 78,
    /** On portrait screens, shift the picture up by this share of its height so panels at the bottom do not cover the entrance. */
    portraitLift: 0.17,
    /** Higher follows the scroll position more tightly. */
    easing: 4.5,
  },

  fog: {
    street: 0.0068,
    /** Thinner at the cliff so the falls and megatowers read from the edge. */
    cliff: 0.0021,
  },

  /** Emissive intensities, 0..1 against the palette colour. */
  glow: {
    bloomStrength: 0.6,
    bloomRadius: 0.5,
    bloomThreshold: 0.42,
    neonTubes: 0.75,
    signs: 0.85,
    /** Soft halo a sign throws onto the wall behind it. */
    signHalo: 0.26,
    /** Pools of coloured light on the pavement under signs and lamps. */
    groundPools: 0.3,
    /** Street neon washing up the lower floors of facades. */
    facadeSpill: 0.1,
    /** Coloured streaks reflected in the wet road. */
    roadReflections: 0.4,
  },

  /** Set a strength to 0 (or a flag to false) to switch an effect off. */
  effects: {
    godRays: 0.5,
    chromaticAberration: 0.0005,
    vignette: 0.4,
    grain: 0.014,
    /** The page already draws CSS scanlines over everything; keep this at 0 unless that is removed. */
    scanlines: 0,
    rain: true,
    mist: true,
    steam: true,
  },

  density: {
    full: {
      columns: 7,
      rain: 2600,
      mist: 160,
      carsPerLeg: 12,
      figuresPerLeg: 18,
      propsPerLeg: 14,
      cablesPerLeg: 7,
      steamVentsPerLeg: 4,
      flyersPerLandmark: 3,
      farSkyline: 90,
      megatowers: 46,
      spray: 1600,
      depthRings: 9,
    } satisfies CityDensity,
    /** Small screens and low-core devices. */
    reduced: {
      columns: 4,
      rain: 900,
      mist: 60,
      carsPerLeg: 6,
      figuresPerLeg: 8,
      propsPerLeg: 6,
      cablesPerLeg: 3,
      steamVentsPerLeg: 2,
      flyersPerLandmark: 1,
      farSkyline: 40,
      megatowers: 22,
      spray: 500,
      depthRings: 5,
    } satisfies CityDensity,
  },

  /**
   * Adaptive quality. The scene starts on a tier and steps down (never up)
   * whenever the average frame rate over `sampleFrames` drops below `fpsFloor`.
   */
  quality: {
    fpsFloor: 40,
    sampleFrames: 80,
    tiers: [
      { pixelRatio: 1.5, bloom: true, post: true },
      { pixelRatio: 1.25, bloom: true, post: true },
      { pixelRatio: 1, bloom: false, post: true },
      { pixelRatio: 1, bloom: false, post: false },
    ] satisfies QualityTier[],
    /** Tier that reduced-density devices start on. */
    reducedStartTier: 2,
  },
};
