const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "project_structure.txt");
const excludedDirectoryNames = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "dist",
  "build",
  "__pycache__",
  ".VSCodeCounter",
]);
const excludedFileNames = new Set([
  "project_code.txt",
  "project_structure.txt",
]);

function shouldSkip(entry) {
  return entry.isDirectory()
    ? excludedDirectoryNames.has(entry.name)
    : excludedFileNames.has(entry.name);
}

function walkDirectory(directory, prefix = "") {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !shouldSkip(entry))
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

  return entries.flatMap((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? "└── " : "├── ";
    const entryPath = path.join(directory, entry.name);
    const lines = [`${prefix}${branch}${entry.name}${entry.isDirectory() ? "/" : ""}`];

    if (entry.isDirectory()) {
      const childPrefix = `${prefix}${isLast ? "    " : "│   "}`;
      lines.push(...walkDirectory(entryPath, childPrefix));
    }
    return lines;
  });
}

function buildStructure() {
  const lines = [path.basename(projectRoot) + "/", ...walkDirectory(projectRoot)];
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`[structure] Wrote ${lines.length - 1} entries to ${path.relative(projectRoot, outputPath)}`);
}

if (require.main === module) buildStructure();

module.exports = { buildStructure };
