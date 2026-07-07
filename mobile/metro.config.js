// Metro configuration for the monorepo.
// `@productivity/shared` lives outside the mobile app, so Metro must watch that
// folder and be allowed to resolve modules from the mobile app's node_modules.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'packages', 'shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders || []), sharedRoot];

config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.unstable_enableSymlinks = true;

// The shared package is symlinked, so `require('axios')` resolves against the
// hoisted (web) copy and Metro picks axios's Node build, which depends on Node
// core modules unavailable in React Native. Force the React Native-safe browser
// build instead.
const axiosBrowserBuild = path.resolve(
  projectRoot,
  'node_modules',
  'axios',
  'dist',
  'browser',
  'axios.cjs'
);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return { type: 'sourceFile', filePath: axiosBrowserBuild };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
