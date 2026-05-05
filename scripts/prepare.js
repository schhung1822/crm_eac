"use strict";

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const gitDirectory = path.join(process.cwd(), ".git");

if (!fs.existsSync(gitDirectory)) {
  process.exit(0);
}

execSync("husky", { stdio: "inherit" });
