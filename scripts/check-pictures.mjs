#!/usr/bin/env node
/**
 * Pre-build guard for src/assets/pictures/.
 *
 * Fails the build if a picture:
 *   - contains GPS coordinates in its EXIF metadata (phone photos usually do,
 *     and the site serves original files, so the location would be public), or
 *   - is in a format browsers can't display (HEIC/HEIF).
 * Warns when a file is large enough to slow the page down.
 *
 * Dependency-free: it scans each file for an EXIF/TIFF header and checks
 * IFD0 for the GPS pointer tag (0x8825). This covers JPEG, PNG, WebP and AVIF,
 * which all embed EXIF as a TIFF structure.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const PICTURES_DIR = path.join(process.cwd(), "src", "assets", "pictures");
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const UNSUPPORTED = new Set([".heic", ".heif"]);
const WARN_BYTES = 1.5 * 1024 * 1024;
const GPS_IFD_TAG = 0x8825;

function containsGps(buffer) {
  for (let i = 0; i + 8 <= buffer.length; i++) {
    const little = buffer[i] === 0x49 && buffer[i + 1] === 0x49 && buffer[i + 2] === 0x2a && buffer[i + 3] === 0x00;
    const big = buffer[i] === 0x4d && buffer[i + 1] === 0x4d && buffer[i + 2] === 0x00 && buffer[i + 3] === 0x2a;
    if (!little && !big) continue;

    const u16 = (offset) => (little ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset));
    const u32 = (offset) => (little ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset));

    const ifd = i + u32(i + 4);
    if (ifd + 2 > buffer.length) continue;
    const entries = u16(ifd);
    // A plausible IFD0 has a handful of entries that fit in the file;
    // anything else is a coincidental byte match in image data.
    if (entries === 0 || entries > 512 || ifd + 2 + entries * 12 > buffer.length) continue;

    for (let entry = 0; entry < entries; entry++) {
      if (u16(ifd + 2 + entry * 12) === GPS_IFD_TAG) return true;
    }
  }
  return false;
}

async function listFiles() {
  try {
    return await readdir(PICTURES_DIR);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const errors = [];
const warnings = [];

for (const name of await listFiles()) {
  const extension = path.extname(name).toLowerCase();
  const relative = path.join("src/assets/pictures", name);

  if (UNSUPPORTED.has(extension)) {
    errors.push(`${relative}: HEIC/HEIF isn't supported by most browsers. Convert it to JPEG.`);
    continue;
  }
  if (!SUPPORTED.has(extension)) continue;

  const buffer = await readFile(path.join(PICTURES_DIR, name));
  if (containsGps(buffer)) {
    errors.push(`${relative}: contains GPS location data. Remove it before publishing.`);
  }
  if (buffer.length > WARN_BYTES) {
    const megabytes = (buffer.length / 1024 / 1024).toFixed(1);
    warnings.push(`${relative}: ${megabytes} MB. Consider resizing to ~2000px on the long side.`);
  }
}

for (const warning of warnings) console.warn(`⚠ ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`✖ ${error}`);
  console.error("\nSee README → \"Adding pictures\" for how to fix these.");
  process.exit(1);
}
