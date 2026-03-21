const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Bun workspaces hoist deps into node_modules/.bun/ which Metro/Babel can't resolve.
// Tell Metro to also look in the mobile package's own node_modules first.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

module.exports = withNativeWind(config, { input: "./global.css" });
