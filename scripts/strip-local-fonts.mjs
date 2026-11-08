#!/usr/bin/env node
/**
 * Post-build guard: removes desktop-licensed fonts (public/fonts/local/) from
 * the static export, so a locally built out/ can never publish them.
 */
import { rmSync } from "node:fs";

rmSync("out/fonts/local", { recursive: true, force: true });
