const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "project_structure.txt");
const excludedDirectories = new Set([
  ".git", "node_modules", ".venv", "venv", "dist", "build", ".VSCodeCounter", "__pycache__",
]);
const excludedFiles = new Set(["project_code.txt", "project_structure.txt"]);

function collectTree(directory, prefix = "") {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => {
      if (entry.isDirectory()) return !excludedDirectories.has(entry.name);
      return !excludedFiles.has(entry.name);
    })
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
      return left.name.localeCompare(right.name);
    });

  const lines = [];
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? "`-- " : "|-- ";
    const entryPath = path.join(directory, entry.name);
    lines.push(`${prefix}${branch}${entry.name}${entry.isDirectory() ? "/" : ""}`);
    if (entry.isDirectory()) {
      lines.push(...collectTree(entryPath, `${prefix}${isLast ? "    " : "|   "}`));
    }
  });
  return lines;
}

function buildStructure() {
  const content = [path.basename(root) + "/", ...collectTree(root)].join("\n") + "\n";
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`[structure] Wrote project tree to ${path.relative(root, outputPath)}`);
}

if (require.main === module) buildStructure();

module.exports = { buildStructure };
