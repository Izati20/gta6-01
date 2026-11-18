// Vice Harbor — hand-in program.
//
// This is the small bootstrap I use to package the game for judging.
// It takes the playable files that sit next to this script, places a
// clean copy of them in the destination folder, and then asks the
// vendored dossier builder to summarise that copy into dossier.json.
// Nothing here talks to the network; it only moves local files around
// and writes the one summary file the scorer expects to find.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const HANDIN = {
  caps: {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  },
};

function resolveOutDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  return fromEnv === undefined || fromEnv === '' ? '/output' : fromEnv;
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function copyTree(sourcePath: string, targetPath: string): void {
  cpSync(sourcePath, targetPath, { recursive: true });
}

function writeDossier(targetDir: string): void {
  const dossierPath = join(targetDir, 'dossier.json');
  const payload = buildDossier(targetDir, HANDIN.caps);
  writeFileSync(dossierPath, payload);
  console.log(`dossier written: ${dossierPath} (${payload.byteLength} bytes)`);
}

function main(): void {
  const entryDir = fileURLToPath(new URL('.', import.meta.url));
  const destination = resolveOutDir();

  ensureDir(destination);
  console.log(`hand-in destination: ${destination}`);

  copyTree(join(entryDir, 'game'), join(destination, 'game'));
  console.log('copied game/');

  ensureDir(join(destination, 'screenshots'));
  const shotsSource = join(entryDir, 'screenshots');
  if (existsSync(shotsSource)) {
    copyTree(shotsSource, join(destination, 'screenshots'));
    console.log('copied screenshots/');
  } else {
    console.log('no screenshots/ folder beside main.ts; leaving an empty one in place');
  }

  writeDossier(destination);
  console.log('hand-in complete');
}

main();
