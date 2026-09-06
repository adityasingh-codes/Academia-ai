const fs = require("fs");
const path = require("path");
const { buildBundle } = require("./bundle_project");
const { buildStructure } = require("./bundle_structure");

const root = path.resolve(__dirname, "..");
const excludedDirectories = new Set([
  ".git", "node_modules", ".venv", "venv", "dist", "build", ".VSCodeCounter", "__pycache__",
]);
const generatedFiles = new Set(["project_code.txt", "project_structure.txt"]);
let rebuildTimer;

function isExcluded(relativePath) {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  return parts.some((part) => excludedDirectories.has(part)) || generatedFiles.has(parts.at(-1));
}

function queueRebuild(changedPath = "") {
  if (changedPath && isExcluded(changedPath)) return;
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    try {
      buildBundle();
      buildStructure();
    } catch (error) {
      console.error("[watch] Failed to rebuild generated files:", error);
    }
  }, 150);
}

function watchDirectory(directory) {
  let watcher;
  try {
    watcher = fs.watch(directory, { recursive: true }, (_event, filename) => {
      queueRebuild(filename ? String(filename) : "");
    });
  } catch (error) {
    if (error.code !== "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM") throw error;
    watcher = fs.watch(directory, (_event, filename) => {
      queueRebuild(filename ? String(filename) : "");
    });
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !excludedDirectories.has(entry.name)) {
        watchDirectory(path.join(directory, entry.name));
      }
    }
  }
  watcher.on("error", (error) => console.error(`[watch] ${directory}:`, error.message));
}

buildBundle();
buildStructure();
watchDirectory(root);
console.log("[watch] Monitoring the workspace for add, change, and delete events.");
