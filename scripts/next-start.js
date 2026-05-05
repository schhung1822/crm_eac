"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DIST_MANIFEST = path.join(process.cwd(), ".next-build-manifest.json");

process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";

if (!process.env.NEXT_DIST_DIR && fs.existsSync(DIST_MANIFEST)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(DIST_MANIFEST, "utf8"));
    if (typeof manifest.distDir === "string" && manifest.distDir) {
      process.env.NEXT_DIST_DIR = manifest.distDir;
    }
  } catch {
    // Ignore manifest parse errors and let Next.js use its default dist dir.
  }
}

process.argv = [process.execPath, require.resolve("next/dist/bin/next"), "start"];

require("next/dist/bin/next");
