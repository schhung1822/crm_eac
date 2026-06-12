process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node",
});

require("dotenv/config");
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

require("./srx-social-scheduler.ts");
