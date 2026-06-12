process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node",
});

const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function loadWithServerOnlyShim(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }

  return originalLoad.call(this, request, parent, isMain);
};

require("dotenv/config");
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

require("./srx-social-scheduler.ts");
