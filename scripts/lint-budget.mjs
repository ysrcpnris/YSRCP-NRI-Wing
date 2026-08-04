#!/usr/bin/env node
/**
 * Fail on NEW lint problems, tolerate the inherited ones.
 *
 * Same shape as typecheck-budget.mjs and for the same reason: the repo
 * carries 291 pre-existing problems, so a blocking `npm run lint` in CI
 * would fail every deploy on day one and be switched off within a week.
 * A gate nobody can pass is not a gate.
 *
 * ESLint itself was unusable until now — eslint 9.39 against
 * typescript-eslint 8.8 crashed loading a rule, so "lint passes" had
 * never been true either way.
 *
 * USAGE
 *   npm run lint:ci             fail on any problem not in the baseline
 *   npm run lint:ci -- --save   record the current set as the baseline
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = join(root, "lint-baseline.json");

function runEslint() {
  let raw = "";
  try {
    raw = execFileSync("npx", ["eslint", ".", "-f", "json"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    // eslint exits non-zero when it finds problems; the JSON is still
    // on stdout. A genuine crash leaves stdout empty, which we surface.
    raw = err.stdout ?? "";
    if (!raw.trim()) {
      console.error("ESLint failed to run:\n" + (err.stderr ?? err.message));
      process.exit(2);
    }
  }
  const results = JSON.parse(raw);
  const out = [];
  for (const file of results) {
    const rel = relative(root, file.filePath);
    for (const m of file.messages) {
      // Fingerprint on file + rule + message, NOT line/column, so
      // unrelated edits that shift code do not look like new problems.
      out.push({
        key: `${rel}::${m.ruleId ?? "syntax"}::${m.message}`,
        text: `${rel}:${m.line}:${m.column}  ${m.ruleId ?? "syntax"}  ${m.message}`,
      });
    }
  }
  return out;
}

const problems = runEslint();

if (process.argv.includes("--save")) {
  writeFileSync(
    baselineFile,
    `${JSON.stringify(
      { total: problems.length, fingerprints: [...new Set(problems.map((p) => p.key))].sort() },
      null,
      2
    )}\n`
  );
  console.log(`lint baseline saved: ${problems.length} problems`);
  process.exit(0);
}

if (!existsSync(baselineFile)) {
  console.error("No lint-baseline.json. Run: npm run lint:ci -- --save");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
const known = new Set(baseline.fingerprints ?? []);
const fresh = problems.filter((p) => !known.has(p.key));

if (fresh.length > 0) {
  console.error(
    `${fresh.length} NEW lint problem${fresh.length === 1 ? "" : "s"} ` +
      `(total ${problems.length}, baseline ${baseline.total}):\n`
  );
  for (const p of fresh.slice(0, 40)) console.error(`  ${p.text}`);
  if (fresh.length > 40) console.error(`  … and ${fresh.length - 40} more`);
  console.error(`\nFix them, or re-baseline with: npm run lint:ci -- --save`);
  process.exit(1);
}

console.log(
  problems.length < baseline.total
    ? `${problems.length} lint problems, down from ${baseline.total}. ` +
      `Lower the baseline with: npm run lint:ci -- --save`
    : `${problems.length} lint problems, none new.`
);
