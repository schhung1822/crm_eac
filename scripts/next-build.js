"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DIST_MANIFEST = path.join(process.cwd(), ".next-build-manifest.json");

process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true";
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = "true";
process.env.NEXT_SKIP_TYPECHECK = "1";

if (!process.env.NEXT_DIST_DIR) {
  const runId = `${Date.now()}-${process.pid}`;
  process.env.NEXT_DIST_DIR = `.next-build-runs/${runId}`;
}

const SUPPRESSED_PATTERNS = [
  /^\[baseline-browser-mapping]/,
  /^Each child in a list should have a unique "key" prop\./,
  /^Check the top-level render call using .*react\.dev\/link\/warning-keys/,
];

function shouldSuppressLine(line) {
  const normalized = line.trim();
  if (!normalized) {
    return false;
  }

  return SUPPRESSED_PATTERNS.some((pattern) => pattern.test(normalized));
}

function installFilteredWriter(stream) {
  const originalWrite = stream.write.bind(stream);
  let buffer = "";

  stream.write = (chunk, encoding, callback) => {
    const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    buffer += text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (!shouldSuppressLine(line)) {
        originalWrite(`${line}\n`);
      }

      newlineIndex = buffer.indexOf("\n");
    }

    if (typeof callback === "function") {
      callback();
    }

    return true;
  };

  return () => {
    if (buffer && !shouldSuppressLine(buffer)) {
      originalWrite(buffer);
    }
    buffer = "";
    stream.write = originalWrite;
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetriableFsError(error) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    ["EBUSY", "ENOTEMPTY", "EPERM"].includes(error.code)
  );
}

async function moveExistingBuildDir() {
  const nextDir = path.join(process.cwd(), process.env.NEXT_DIST_DIR);
  const buildDir = path.join(nextDir, "build");

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await fs.access(buildDir);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return;
      }

      throw error;
    }

    const archivedDir = path.join(nextDir, `build-stale-${Date.now()}-${process.pid}-${attempt}`);

    try {
      await fs.rename(buildDir, archivedDir);
      void fs.rm(archivedDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
      return;
    } catch (error) {
      if (!isRetriableFsError(error) || attempt === 5) {
        throw error;
      }

      await sleep(250 * attempt);
    }
  }
}

async function writeDistManifest() {
  await fs.writeFile(
    DIST_MANIFEST,
    JSON.stringify(
      {
        distDir: process.env.NEXT_DIST_DIR,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

function runStandaloneTypeCheck() {
  const result = spawnSync(
    process.execPath,
    [require.resolve("typescript/bin/tsc"), "--noEmit", "--incremental", "false", "--pretty", "false"],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    const error = new Error(`TypeScript validation failed with exit code ${result.status ?? "unknown"}`);
    error.cause = result.error;
    throw error;
  }
}

const restoreStdout = installFilteredWriter(process.stdout);
const restoreStderr = installFilteredWriter(process.stderr);

process.on("exit", () => {
  restoreStdout();
  restoreStderr();
});

void (async () => {
  process.argv = [process.execPath, require.resolve("next/dist/bin/next"), "build", "--webpack"];

  try {
    await writeDistManifest();
    await moveExistingBuildDir();
    runStandaloneTypeCheck();
    require("next/dist/bin/next");
  } catch (error) {
    restoreStdout();
    restoreStderr();
    throw error;
  }
})();
