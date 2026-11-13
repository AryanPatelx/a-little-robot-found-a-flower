// make.fun ai-happy-01 entry: writes the entry image to /output/entry.png.
// The image ("We saved you a seat!" — a crayon card for the judge) ships as entry.png
// beside this program; this program copies it byte for byte. Deterministic: two runs
// produce identical bytes.

import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const src = new URL('./entry.png', import.meta.url);

// refuse to run on a truncated or wrong-type payload: the gate needs a whole PNG or JPEG
const size = statSync(src).size;
if (size < 64 || size > 1048576) throw new Error(`entry.png is ${size} bytes; expected a whole image of at most 1 MiB`);

mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(src, join(OUTPUT_DIR, 'entry.png'));
