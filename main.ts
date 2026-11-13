// make.fun ai-happy-01 entry: renders one happy image to /output/entry.png.
// Scene: a small round robot holds up a flower it just found, eyes closed in delight,
// while a cat curls against its foot in warm evening light.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, rgb, mix, type RGB } from './art.ts';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const W = 760, H = 760;

// ---- palette: warm evening ----
const skyTop = rgb(255, 214, 165);    // soft peach
const skyMid = rgb(255, 170, 140);    // coral
const skyLow = rgb(255, 140, 150);    // rose
const sun = rgb(255, 236, 190);
const hillBack = rgb(255, 138, 122);  // distant warm hill
const hillFront = rgb(76, 148, 124);  // teal-green ground
const hillShade = rgb(60, 126, 104);
const robotBody = rgb(255, 246, 236); // warm cream
const robotShade = rgb(235, 220, 210);
const robotTrim = rgb(255, 138, 92);  // orange accents
const visorDark = rgb(58, 48, 66);    // deep plum visor
const catBody = rgb(255, 168, 96);    // orange cat
const catStripe = rgb(232, 128, 66);
const flowerStem = rgb(64, 132, 92);
const flowerPetal = rgb(255, 118, 118);
const flowerCore = rgb(255, 214, 110);
const blush = rgb(255, 172, 160);
const sparkleCol = rgb(255, 244, 214);

function draw(c: Canvas) {
  // sky gradient
  c.rrect(0, 0, W, H, 0, (fx, fy) => {
    const t = fy / H;
    return t < 0.55 ? mix(skyTop, skyMid, t / 0.55) : mix(skyMid, skyLow, (t - 0.55) / 0.45);
  });

  // sun glow + sun disc, low on the horizon
  c.circle(W * 0.72, H * 0.52, 190, Canvas.radial(W * 0.72, H * 0.52, 190, mix(sun, skyMid, 0.55), mix(sun, skyMid, 0.9)), 0.5);
  c.circle(W * 0.72, H * 0.52, 96, sun);

  // distant hills
  c.poly([[0, H * 0.62], [W * 0.22, H * 0.55], [W * 0.48, H * 0.60], [W * 0.75, H * 0.53], [W, H * 0.60], [W, H], [0, H]], hillBack, 0.75);

  // front ground: big rounded hill
  c.ellipse(W * 0.5, H * 0.86, W * 0.75, H * 0.30, hillFront);
  c.ellipse(W * 0.12, H * 0.985, W * 0.30, H * 0.09, hillShade, 0.55);

  // ground shadow under the robot
  c.ellipse(W * 0.44, H * 0.845, 150, 26, rgb(46, 96, 82), 0.45);

  // ---- cat: a content loaf curled against the robot's foot ----
  const catX = W * 0.585, catY = H * 0.815;
  const catW = 118, catH = 66;
  // tail curling around the front from the right
  c.capsule(catX + catW / 2 - 10, catY - 18, catX + catW / 2 + 12, catY + 4, 10, catBody);
  c.capsule(catX + catW / 2 + 12, catY + 4, catX + 18, catY + catH / 2 - 4, 10, catBody);
  c.circle(catX + 16, catY + catH / 2 - 4, 8, catStripe);
  // loaf body
  c.rrect(catX - catW / 2, catY - catH / 2, catW, catH, 30, catBody);
  // ears
  c.poly([[catX - 40, catY - catH / 2 + 4], [catX - 30, catY - catH / 2 - 14], [catX - 20, catY - catH / 2 + 4]], catBody);
  c.poly([[catX + 20, catY - catH / 2 + 4], [catX + 30, catY - catH / 2 - 14], [catX + 40, catY - catH / 2 + 4]], catBody);
  // stripes on the back
  c.capsule(catX - 16, catY - catH / 2 + 6, catX - 12, catY - 14, 5, catStripe);
  c.capsule(catX + 2, catY - catH / 2 + 6, catX + 6, catY - 14, 5, catStripe);
  c.capsule(catX + 20, catY - catH / 2 + 6, catX + 24, catY - 14, 5, catStripe);
  // closed happy eyes (∩ arcs) + tiny mouth
  c.capsule(catX - 26, catY - 1, catX - 20, catY - 7, 2.8, visorDark);
  c.capsule(catX - 20, catY - 7, catX - 14, catY - 3, 2.8, visorDark);
  c.capsule(catX + 14, catY - 3, catX + 20, catY - 7, 2.8, visorDark);
  c.capsule(catX + 20, catY - 7, catX + 26, catY - 1, 2.8, visorDark);
  c.capsule(catX - 4, catY + 6, catX + 4, catY + 6, 2.4, visorDark);
  // blush
  c.ellipse(catX - 30, catY + 4, 6, 3.5, blush, 0.9);
  c.ellipse(catX + 30, catY + 4, 6, 3.5, blush, 0.9);

  // ---- robot ----
  const bx = W * 0.42, by = H * 0.66; // body centre
  const bw = 168, bh = 190;           // body size
  // antenna
  c.capsule(bx, by - bh / 2 - 30, bx, by - bh / 2 - 6, 6, robotTrim);
  c.circle(bx, by - bh / 2 - 36, 12, rgb(255, 200, 90));

  // legs + feet
  c.rrect(bx - 52, by + bh / 2 - 8, 24, 52, 12, robotTrim);
  c.rrect(bx + 28, by + bh / 2 - 8, 24, 52, 12, robotTrim);
  c.rrect(bx - 62, by + bh / 2 + 40, 46, 20, 10, robotShade);
  c.rrect(bx + 16, by + bh / 2 + 40, 46, 20, 10, robotShade);

  // body: rounded capsule-ish
  c.rrect(bx - bw / 2, by - bh / 2, bw, bh, 62, robotBody);
  // soft shading on the lower body (kept inside the silhouette)
  c.ellipse(bx, by + bh / 2 - 26, bw / 2 - 34, 16, robotShade, 0.30);
  // small heart on the chest
  const heartY = by + 22;
  c.circle(bx - 14, heartY - 6, 14, robotTrim);
  c.circle(bx + 14, heartY - 6, 14, robotTrim);
  c.poly([[bx - 27, heartY - 2], [bx + 27, heartY - 2], [bx, heartY + 24]], robotTrim);

  // arms: left raised high holding the flower, right out in a wave
  c.capsule(bx - bw / 2 + 6, by - 40, bx - bw / 2 - 34, by - 96, 17, robotBody);
  c.circle(bx - bw / 2 - 34, by - 96, 19, robotShade); // left mitt
  c.capsule(bx + bw / 2 - 6, by - 30, bx + bw / 2 + 44, by - 78, 17, robotBody);
  c.circle(bx + bw / 2 + 44, by - 78, 19, robotShade); // right mitt

  // ---- flower held up in the left mitt ----
  const fx = bx - bw / 2 - 34, fy = by - 138;
  c.capsule(fx + 2, fy + 10, fx - 4, by - 96, 5, flowerStem);
  // leaf
  c.ellipse(fx + 16, fy + 38, 16, 8, flowerStem, 1, -0.5);
  // petals: six around the core
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    c.ellipse(fx + Math.cos(a) * 17, fy + Math.sin(a) * 17, 13, 15, flowerPetal, 1, a);
  }
  c.circle(fx, fy, 13, flowerCore);
  // two tiny hearts drifting up from the flower
  const heart = (hx0: number, hy0: number, s: number, col: RGB) => {
    c.circle(hx0 - s * 0.5, hy0 - s * 0.2, s * 0.5, col);
    c.circle(hx0 + s * 0.5, hy0 - s * 0.2, s * 0.5, col);
    c.poly([[hx0 - s, hy0 - s * 0.1], [hx0 + s, hy0 - s * 0.1], [hx0, hy0 + s * 0.9]], col);
  };
  heart(fx + 34, fy - 26, 11, flowerPetal);
  heart(fx + 52, fy - 2, 8, flowerPetal);

  // ---- head ----
  const hx = bx, hy = by - bh / 2 - 58;
  c.rrect(hx - 66, hy - 52, 132, 104, 46, robotBody);
  // visor
  c.rrect(hx - 52, hy - 36, 104, 72, 34, visorDark);
  // happy closed eyes: two capsules per eye forming a small arc
  const eyeCol = rgb(255, 240, 250);
  c.capsule(hx - 34, hy - 2, hx - 19, hy - 16, 4.5, eyeCol);
  c.capsule(hx - 19, hy - 16, hx - 6, hy - 6, 4.5, eyeCol);
  c.capsule(hx + 6, hy - 6, hx + 19, hy - 16, 4.5, eyeCol);
  c.capsule(hx + 19, hy - 16, hx + 34, hy - 2, 4.5, eyeCol);
  // open smile
  c.circle(hx, hy + 14, 13, eyeCol);
  c.rrect(hx - 13, hy + 2, 26, 12, 0, visorDark);
  // blush
  c.ellipse(hx - 44, hy + 12, 10, 6, blush, 0.85);
  c.ellipse(hx + 44, hy + 12, 10, 6, blush, 0.85);
  // side ears
  c.rrect(hx - 76, hy - 16, 14, 32, 7, robotTrim);
  c.rrect(hx + 62, hy - 16, 14, 32, 7, robotTrim);

  // sparkles in the air
  c.sparkle(W * 0.24, H * 0.30, 13, sparkleCol, 0.95);
  c.sparkle(W * 0.83, H * 0.34, 10, sparkleCol, 0.9);
  c.sparkle(W * 0.63, H * 0.20, 9, sparkleCol, 0.85);
  c.sparkle(W * 0.14, H * 0.46, 8, sparkleCol, 0.8);
  c.sparkle(W * 0.90, H * 0.55, 7, sparkleCol, 0.75);
}

const canvas = new Canvas(W, H, 3);
draw(canvas);
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'entry.png'), canvas.toPNG());
