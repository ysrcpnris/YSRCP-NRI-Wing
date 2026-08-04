#!/usr/bin/env node
/**
 * Fail on NEW type errors, tolerate the inherited ones.
 *
 * WHY THIS EXISTS
 *   `vite build` does not typecheck — it strips types and bundles.
 *   Demonstrated on this repo: a component using <AbroadConnect /> with
 *   no import produced a clean build and would have shipped a white
 *   screen. Deleting an import from LocalConnect.tsx also built fine.
 *
 *   The obvious fix — make `build` run tsc first — breaks every deploy,
 *   because the project carries 117 pre-existing errors (unused imports,
 *   HeaderProps mismatches) that predate this work and are not ours to
 *   fix mid-slice.
 *
 *   So the gate is a budget: the count may not RISE. Inherited errors
 *   stay tolerated, a newly introduced one fails the check, and fixing
 *   old ones lowers the baseline.
 *
 * USAGE
 *   npm run typecheck:ci            fail if the count exceeds baseline
 *   npm run typecheck:ci -- --save  record the current count as baseline
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = join(root, "typecheck-baseline.json");

function runTsc() {
  try {
    execFileSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.app.json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return [];
  } catch (err) {
    // tsc exits non-zero when it reports errors; the report is on stdout.
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    return out
      .split("\n")
      .filter((l) => /error TS\d+/.test(l))
      .map((l) => l.trim());
  }
}

const errors = runTsc();
const byFile = new Map();
for (const line of errors) {
  const file = line.split("(")[0];
  byFile.set(file, (byFile.get(file) ?? 0) + 1);
}

/* The message text without the line/column, so an error keeps its
   identity when unrelated edits shift it up or down the file. That is
   what lets the report show only what is genuinely new instead of every
   pre-existing error in a file that happened to grow. */
const fingerprint = (line) => {
  const file = line.split("(")[0];
  const msg = line.slice(line.indexOf("error TS"));
  return `${file}::${msg}`;
};

if (process.argv.includes("--save")) {
  writeFileSync(
    baselineFile,
    `${JSON.stringify(
      {
        total: errors.length,
        files: Object.fromEntries(byFile),
        fingerprints: errors.map(fingerprint).sort(),
      },
      null,
      2
    )}\n`
  );
  console.log(`baseline saved: ${errors.length} errors across ${byFile.size} files`);
  process.exit(0);
}

if (!existsSync(baselineFile)) {
  console.error(
    "No typecheck-baseline.json. Run: npm run typecheck:ci -- --save"
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));

if (errors.length <= baseline.total) {
  if (errors.length < baseline.total) {
    console.log(
      `${errors.length} type errors, down from ${baseline.total}. ` +
        `Lower the baseline with: npm run typecheck:ci -- --save`
    );
  } else {
    console.log(`${errors.length} type errors, unchanged from baseline.`);
  }
  process.exit(0);
}

// Over budget. Show ONLY the errors that are not in the baseline —
// listing every error in a file that grew buries the new one among the
// inherited noise, and a report nobody can read gets ignored.
console.error(`Type errors rose from ${baseline.total} to ${errors.length}.\n`);

const known = new Set(baseline.fingerprints ?? []);
const fresh = known.size
  ? errors.filter((l) => !known.has(fingerprint(l)))
  : [];

if (fresh.length > 0) {
  console.error("New errors:\n");
  for (const line of fresh) console.error(`  ${line}`);
} else {
  // No fingerprints recorded (an older baseline), so fall back to
  // reporting the files whose counts went up.
  for (const [file, count] of byFile) {
    const was = baseline.files?.[file] ?? 0;
    if (count > was) console.error(`  ${file}: ${was} -> ${count}`);
  }
}

console.error(
  `\nFix the new errors, or if they are genuinely pre-existing, ` +
    `re-baseline with: npm run typecheck:ci -- --save`
);
process.exit(1);
