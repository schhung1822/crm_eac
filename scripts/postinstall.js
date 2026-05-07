const { execSync } = require("child_process");
const fs = require("node:fs");
const path = require("node:path");

const SRX_SCHEMA_PATH = path.join("prisma", "schema2.prisma");
const LEGACY_CLIENT_OUTPUT_PATH = path.join("prisma", "generated", "legacy-client");
const SRX_CLIENT_OUTPUT_PATH = path.join("prisma", "generated", "srx-app-client");

function hasLocalQueryEngine(outputDir) {
  if (!fs.existsSync(outputDir)) {
    return false;
  }

  return fs.readdirSync(outputDir).some((fileName) => {
    return (
      /query_engine.*\.(dll\.node|so\.node|dylib\.node)$/i.test(fileName) ||
      /libquery_engine.*\.(so\.node|dylib\.node)$/i.test(fileName)
    );
  });
}

function normalizeGeneratedClientCopyEngine(outputDir) {
  if (!hasLocalQueryEngine(outputDir)) {
    return;
  }

  const clientEntryPath = path.join(outputDir, "index.js");

  if (!fs.existsSync(clientEntryPath)) {
    return;
  }

  const currentSource = fs.readFileSync(clientEntryPath, "utf8");

  if (!currentSource.includes('"copyEngine": false')) {
    return;
  }

  const nextSource = currentSource.replace('"copyEngine": false', '"copyEngine": true');
  fs.writeFileSync(clientEntryPath, nextSource, "utf8");
  console.log(`Normalized Prisma client engine config at ${clientEntryPath}`);
}

function ensureEnvVar(name) {
  if (!process.env[name]) {
    process.env[name] = "mysql://dummy:dummy@localhost:3306/dummy";
    console.log(`No ${name} found, using dummy URL for client generation`);
  }
}

console.log("Generating Prisma clients...");

try {
  ensureEnvVar("DATABASE_URL");
  ensureEnvVar("DATABASE_URL2");

  if (!fs.existsSync(SRX_SCHEMA_PATH)) {
    throw new Error(`Missing Prisma schema: ${SRX_SCHEMA_PATH}`);
  }

  execSync("prisma generate", { stdio: "inherit" });
  execSync(`prisma generate --schema ${SRX_SCHEMA_PATH}`, { stdio: "inherit" });
  normalizeGeneratedClientCopyEngine(LEGACY_CLIENT_OUTPUT_PATH);
  normalizeGeneratedClientCopyEngine(SRX_CLIENT_OUTPUT_PATH);
  console.log("Prisma clients generated successfully");
} catch (error) {
  console.error("Failed to generate Prisma clients:", error.message);
  process.exit(1);
}
