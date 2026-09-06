const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoots = ["apps/frontend", "apps/backend"];
const outputPath = path.join(root, "project_code.txt");
const includedExtensions = new Set([
  ".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json",
  ".md", ".yml", ".yaml", ".toml", ".sql", ".bat", ".ps1",
]);
const excludedDirectories = new Set([
  ".git", "node_modules", ".venv", "venv", "dist", "build",
]);

function shouldInclude(filePath) {
  return includedExtensions.has(path.extname(filePath).toLowerCase());
}

function collectFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, files);
    } else if (entry.isFile() && shouldInclude(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function buildBundle() {
  const files = sourceRoots
    .flatMap((sourceRoot) => collectFiles(path.join(root, sourceRoot)))
    .sort((left, right) => left.localeCompare(right));

  const sections = files.map((filePath) => {
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    const content = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
    return `=== FILE: ${relativePath} ===\n${content.replace(/\n?$/, "\n")}`;
  });

  const bundle = sections.length > 0 ? `${sections.join("\n")}\n` : "";
  fs.writeFileSync(outputPath, bundle, "utf8");
  console.log(`[bundle] Wrote ${files.length} files to ${path.relative(root, outputPath)}`);
}

if (require.main === module) buildBundle();

module.exports = { buildBundle };
