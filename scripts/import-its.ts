import { readFile, writeFile, rename, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { importItsExport } from "../lib/import-cameras.ts";
async function main() {
  const args = process.argv.slice(2);
  const [inputPath, flag] = args;
  if (!inputPath || args.length > 2 || (flag && flag !== "--write")) {
    throw new Error("Usage: pnpm import:its public-export.json [--write] (default: validate only)");
  }
  if ((await stat(inputPath)).size > 10 * 1024 * 1024) throw new Error("Export exceeds 10 MB");
  const cameras = importItsExport(JSON.parse(await readFile(inputPath, "utf8")));
  console.log("Validated " + cameras.length + " public ITS records.");
  if (flag === "--write") {
    const output = fileURLToPath(new URL("../data/its-cameras.json", import.meta.url));
    const temporary = output + "." + process.pid + ".tmp";
    await writeFile(temporary, JSON.stringify(cameras, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, output);
    console.log("Saved data/its-cameras.json. Review the diff and source evidence before committing.");
  } else {
    console.log("Dry run: no files changed. Use --write to replace the ITS dataset after source review.");
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Import failed");
  process.exitCode = 1;
});
