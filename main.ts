// Viceframe entry program (Node 22, standard library only).
//
// The app itself is the static site under app/: index.html plus its ES modules,
// styles and sample photos, all loaded from local files so the page works fully
// offline in a desktop browser. This program's one job is to hand that app in:
// it copies app/ and screenshots/ from beside this file into the output folder
// and writes dossier.json there with the vendored make.fun library, exactly the
// bytes the scorer rebuilds and compares.
//
// Try the app locally with `node serve.ts` (http://localhost:8080).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json): they make this
// program refuse an entry the scorer would refuse — too many screenshots or
// app files, an oversized file, or a dossier over its text budget.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
