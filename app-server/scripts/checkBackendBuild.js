const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const targets = [
  "app.js",
  "server.js",
  "config",
  "controllers",
  "middleware",
  "models",
  "routes",
  "scripts",
  "services",
  "utils",
  "workers"
];

const collectJavaScriptFiles = (relativeTarget) => {
  const absoluteTarget = path.join(rootDir, relativeTarget);

  if (!fs.existsSync(absoluteTarget)) {
    return [];
  }

  const stats = fs.statSync(absoluteTarget);
  if (stats.isFile()) {
    return path.extname(absoluteTarget) === ".js" ? [absoluteTarget] : [];
  }

  return fs
    .readdirSync(absoluteTarget, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) =>
      collectJavaScriptFiles(path.join(relativeTarget, entry.name))
    );
};

const filesToCheck = targets.flatMap(collectJavaScriptFiles);

if (!filesToCheck.length) {
  console.error("No backend JavaScript files were found to verify.");
  process.exit(1);
}

let hasFailures = false;

filesToCheck.forEach((filePath) => {
  const relativeFilePath = path.relative(rootDir, filePath);
  const result = spawnSync(process.execPath, ["--check", filePath], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    hasFailures = true;
    console.error(`Syntax check failed for ${relativeFilePath}`);
    if (result.stdout) {
      console.error(result.stdout.trim());
    }
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
  }
});

if (hasFailures) {
  process.exit(1);
}

console.log(`Backend build verification passed for ${filesToCheck.length} files.`);
