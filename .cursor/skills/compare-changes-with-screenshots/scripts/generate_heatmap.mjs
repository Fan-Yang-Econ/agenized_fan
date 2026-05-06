#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");

function usage() {
  console.error(`Usage:
  node scripts/generate_heatmap.mjs --before <before.png> --after <after.png> --out <diff.png> [--summary-out <summary.json>] [--threshold 0.1]

Outputs a pixelmatch heatmap PNG and prints JSON summary to stdout.`);
}

function parseArgs(argv) {
  const args = {
    threshold: 0.1,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];

    if (key === "--help" || key === "-h") {
      usage();
      process.exit(0);
    }

    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Invalid argument near "${key}"`);
    }

    if (key === "--before") args.before = value;
    else if (key === "--after") args.after = value;
    else if (key === "--out") args.out = value;
    else if (key === "--summary-out") args.summaryOut = value;
    else if (key === "--threshold") args.threshold = Number(value);
    else throw new Error(`Unknown argument "${key}"`);

    i += 1;
  }

  if (!args.before || !args.after || !args.out) {
    throw new Error("Missing required --before, --after, or --out argument");
  }
  if (!Number.isFinite(args.threshold) || args.threshold < 0 || args.threshold > 1) {
    throw new Error("--threshold must be a number from 0 to 1");
  }

  return args;
}

async function loadDependencies() {
  try {
    const pixelmatchModule = await import("pixelmatch");
    const pngjsModule = await import("pngjs");
    return {
      pixelmatch: pixelmatchModule.default,
      PNG: pngjsModule.PNG,
    };
  } catch (error) {
    console.error("pixelmatch/pngjs not installed for this skill; installing now...");
    const install = spawnSync("npm", ["install", "--no-audit", "--no-fund", "--silent"], {
      cwd: skillDir,
      stdio: "inherit",
    });

    if (install.status !== 0) {
      throw new Error(`npm install failed with exit code ${install.status}`);
    }

    const pixelmatchModule = await import("pixelmatch");
    const pngjsModule = await import("pngjs");
    return {
      pixelmatch: pixelmatchModule.default,
      PNG: pngjsModule.PNG,
    };
  }
}

function readPng(PNG, filePath) {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`File does not exist: ${absolutePath}`);
  }
  if (!absolutePath.toLowerCase().endsWith(".png")) {
    throw new Error(`Only PNG inputs are supported: ${absolutePath}`);
  }
  return {
    absolutePath,
    image: PNG.sync.read(readFileSync(absolutePath)),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { pixelmatch, PNG } = await loadDependencies();

  const before = readPng(PNG, args.before);
  const after = readPng(PNG, args.after);

  if (before.image.width !== after.image.width || before.image.height !== after.image.height) {
    throw new Error(
      `Image dimensions differ: before=${before.image.width}x${before.image.height}, after=${after.image.width}x${after.image.height}. Capture both screenshots with the same viewport before generating a heatmap.`
    );
  }

  const { width, height } = before.image;
  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(before.image.data, after.image.data, diff.data, width, height, {
    threshold: args.threshold,
  });
  const totalPixels = width * height;
  const mismatchRatio = totalPixels === 0 ? 0 : changedPixels / totalPixels;

  const outPath = resolve(args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, PNG.sync.write(diff));

  const summary = {
    before: before.absolutePath,
    after: after.absolutePath,
    diff: outPath,
    width,
    height,
    changedPixels,
    totalPixels,
    mismatchRatio,
    mismatchPercent: Number((mismatchRatio * 100).toFixed(4)),
    threshold: args.threshold,
  };

  if (args.summaryOut) {
    const summaryPath = resolve(args.summaryOut);
    mkdirSync(dirname(summaryPath), { recursive: true });
    writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  usage();
  process.exit(1);
});
