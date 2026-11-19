// Neon Coast Cover Studio — handover program for the gta6-cover-art-01 bounty.
//
// What this program is: the delivery driver for a static, offline cover-art
// studio that lives in app/ (plain HTML/CSS/JS, no build step, no network).
// When the grader runs it, the job is deliberately boring and strict:
//
//   1. audit the repository copy of app/ and screenshots/ against the gate's
//      published caps before anything is copied anywhere;
//   2. copy both trees into the output directory (MAKEFUN_OUTPUT_DIR when set,
//      /output inside the grading container otherwise);
//   3. ask the vendored make.fun library to summarise the copied trees into
//      dossier.json, then read the dossier back and sanity-check its shape;
//   4. print a short manifest so a human can see exactly what was handed in.
//
// The audit in step 1 is mine, not the library's: the library would happily
// summarise an oversized tree and let the sealed scorer reject it later, so
// this entrypoint fails loudly and early instead. Every limit below mirrors
// reference/gate.json for this competition; if the gate ever moves, this file
// is the one place that has to move with it.

import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// --- Neon Coast delivery limits -------------------------------------------

const LIMITS = Object.freeze({
  dossierTextBytes: 163_840, // dossier.json source-text cap (160 KiB)
  dossierTotalBytes: 1_572_864, // dossier.json whole-file cap (1.5 MiB)
  screenshotMax: 4,
  screenshotMaxBytes: 262_144, // 256 KiB each
  appMaxEntries: 993, // files + directories under app/
  appMaxBytes: 50_331_648, // 48 MiB under app/
  appPathMaxBytes: 1_000, // per path, UTF-8 bytes
  indexMaxBytes: 1_048_576, // app/index.html cap (1 MiB)
});

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Small filesystem helpers ----------------------------------------------

/** Every entry under dir (files and directories), repo-relative, sorted. */
function listTree(dir) {
  const found = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      found.push(full);
      if (statSync(full).isDirectory()) walk(full);
    }
  };
  walk(dir);
  return found;
}

function totalBytes(paths) {
  let sum = 0;
  for (const p of paths) if (statSync(p).isFile()) sum += statSync(p).size;
  return sum;
}

function fail(message) {
  console.error(`neon-coast: refusing to hand in — ${message}`);
  process.exit(1);
}

// --- Preflight audit ---------------------------------------------------------

function auditAppTree() {
  const appDir = join(repoRoot, 'app');
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
  const entries = listTree(appDir);
  if (entries.length > LIMITS.appMaxEntries) {
    fail(`app/ holds ${entries.length} entries, over the ${LIMITS.appMaxEntries} cap`);
  }
  for (const entry of entries) {
    const rel = relative(repoRoot, entry).split(sep).join('/');
    if (Buffer.byteLength(rel, 'utf8') > LIMITS.appPathMaxBytes) {
      fail(`path ${rel} exceeds ${LIMITS.appPathMaxBytes} UTF-8 bytes`);
    }
    if (statSync(entry).isSymbolicLink?.() ?? false) fail(`${rel} is a symlink`);
  }
  const bytes = totalBytes(entries);
  if (bytes > LIMITS.appMaxBytes) fail(`app/ is ${bytes} bytes, over the cap`);
  const indexBytes = statSync(join(appDir, 'index.html')).size;
  if (indexBytes > LIMITS.indexMaxBytes) fail('app/index.html is over 1 MiB');
  return { entries: entries.length, bytes };
}

function auditScreenshots() {
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (shots.length < 3 || shots.length > LIMITS.screenshotMax) {
    fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > LIMITS.screenshotMaxBytes) {
      fail(`screenshots/${name} is ${size} bytes, over 256 KiB`);
    }
  }
  return shots;
}

// --- Handover -----------------------------------------------------------------

const appStats = auditAppTree();
const shotNames = auditScreenshots();

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), {
  recursive: true,
});

const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outputDir, {
    text_max_bytes: LIMITS.dossierTextBytes,
    screenshots: { max: LIMITS.screenshotMax, max_bytes: LIMITS.screenshotMaxBytes },
    app_max_files: LIMITS.appMaxEntries,
    app_max_bytes: LIMITS.appMaxBytes,
    app_path_max_bytes: LIMITS.appPathMaxBytes,
  }),
);

// Read the dossier back: a truncated or malformed summary must never leave
// this program unnoticed, because the scorer compares it byte for byte.
const dossierBytes = readFileSync(dossierPath);
if (dossierBytes.length > LIMITS.dossierTotalBytes) {
  fail(`dossier.json is ${dossierBytes.length} bytes, over the 1.5 MiB cap`);
}
const dossier = JSON.parse(dossierBytes.toString('utf8'));
if (typeof dossier !== 'object' || dossier === null) {
  fail('dossier.json did not parse back into an object');
}

console.log(
  [
    'neon-coast: handed in Neon Coast Cover Studio',
    `  app/         ${appStats.entries} entries, ${appStats.bytes} bytes`,
    `  screenshots/ ${shotNames.length} images (${shotNames.join(', ')})`,
    `  dossier.json ${dossierBytes.length} bytes`,
    `  output       ${outputDir}`,
  ].join('\n'),
);
