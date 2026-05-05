const { execSync } = require("child_process");
const fs = require("node:fs");
const path = require("node:path");

const SRX_SCHEMA_PATH = path.join("prisma", "schema2.prisma");

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
  console.log("Prisma clients generated successfully");
} catch (error) {
  console.error("Failed to generate Prisma clients:", error.message);
  process.exit(1);
}
