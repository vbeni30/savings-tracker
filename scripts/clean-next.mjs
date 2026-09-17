import fs from "fs";
import path from "path";

const root = process.cwd();
const targets = [".next"];

for (const target of targets) {
  const fullPath = path.join(root, target);
  try {
    fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    console.log(`Removed ${target}`);
  } catch {
    console.warn(`Could not remove ${target} — stop other dev servers and retry.`);
    process.exitCode = 1;
  }
}
