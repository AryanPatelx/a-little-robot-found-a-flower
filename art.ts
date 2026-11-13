// A tiny flat-design PNG renderer: shapes into a supersampled RGB buffer, written as a PNG.
// Standard library only. Coordinates are in FINAL pixels; rendering happens at scale x resolution.

import { deflateSync } from 'node:zlib';

export interface RGB { r: number; g: number; b: number }
export const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b });

export function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

export class Canvas {
  readonly w: number;
  readonly h: number;
  readonly scale: number;
  private buf: Float64Array; // RGB triples per supersampled pixel
  constructor(w: number, h: number, scale = 2) {
    this.w = w; this.h = h; this.scale = scale;
    this.buf = new Float64Array(w * scale * h * scale * 3);
  }

  // Fill a supersampled pixel (sx, sy) with color blended by alpha.
  private blend(sx: number, sy: number, c: RGB, alpha: number) {
    const i = (sy * this.w * this.scale + sx) * 3;
    const a = alpha;
    this.buf[i] += (c.r - this.buf[i]) * a;
    this.buf[i + 1] += (c.g - this.buf[i + 1]) * a;
    this.buf[i + 2] += (c.b - this.buf[i + 2]) * a;
  }

  private fillMask(x0: number, y0: number, x1: number, y1: number,
    inside: (fx: number, fy: number) => number, color: (fx: number, fy: number) => RGB) {
    const s = this.scale;
    const px0 = Math.max(0, Math.floor(x0 * s)), px1 = Math.min(this.w * s - 1, Math.ceil(x1 * s));
    const py0 = Math.max(0, Math.floor(y0 * s)), py1 = Math.min(this.h * s - 1, Math.ceil(y1 * s));
    for (let py = py0; py <= py1; py++) {
      const fy = (py + 0.5) / s;
      for (let px = px0; px <= px1; px++) {
        const fx = (px + 0.5) / s;
        const a = inside(fx, fy);
        if (a > 0) this.blend(px, py, color(fx, fy), Math.min(1, a));
      }
    }
  }

  circle(cx: number, cy: number, r: number, color: RGB | ((fx: number, fy: number) => RGB), alpha = 1) {
    this.fillMask(cx - r, cy - r, cx + r, cy + r,
      (fx, fy) => {
        const d = r - Math.hypot(fx - cx, fy - cy);
        return d <= -1 / this.scale ? 0 : Math.min(1, Math.max(0, d * this.scale + 0.5));
      },
      typeof color === 'function' ? color : () => color);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: RGB | ((fx: number, fy: number) => RGB), alpha = 1, rot = 0) {
    const cosr = Math.cos(rot), sinr = Math.sin(rot);
    this.fillMask(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1,
      (fx, fy) => {
        const dx = fx - cx, dy = fy - cy;
        const u = (dx * cosr + dy * sinr) / rx, v = (-dx * sinr + dy * cosr) / ry;
        const d = 1 - Math.hypot(u, v);
        return d <= -1.5 / this.scale ? 0 : Math.min(1, Math.max(0, d * this.scale + 0.5));
      },
      typeof color === 'function' ? color : () => color);
  }

  // Axis-aligned rounded rectangle (r = corner radius).
  rrect(x: number, y: number, w: number, h: number, r: number, color: RGB | ((fx: number, fy: number) => RGB), alpha = 1) {
    this.fillMask(x, y, x + w, y + h,
      (fx, fy) => {
        const cx = Math.max(x + r, Math.min(fx, x + w - r));
        const cy = Math.max(y + r, Math.min(fy, y + h - r));
        const d = r - Math.hypot(fx - cx, fy - cy);
        const inCore = fx >= x && fx <= x + w && fy >= y && fy <= y + h;
        if (inCore && (fx >= x + r && fx <= x + w - r || fy >= y + r && fy <= y + h - r)) return 1;
        return d <= -1.5 / this.scale ? 0 : Math.min(1, Math.max(0, d * this.scale + 0.5));
      },
      typeof color === 'function' ? color : () => color);
  }

  // Polygon with optional quadratic smoothing at the corners (bevel factor 0..0.5).
  poly(pts: [number, number][], color: RGB | ((fx: number, fy: number) => RGB), alpha = 1) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of pts) { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); }
    this.fillMask(minX - 1, minY - 1, maxX + 1, maxY + 1,
      (fx, fy) => {
        // even-odd crossing count
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > fy) !== (yj > fy) && fx < ((xj - xi) * (fy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside ? 1 : 0;
      },
      typeof color === 'function' ? color : () => color);
  }

  // Thick line segment with round caps.
  capsule(x1: number, y1: number, x2: number, y2: number, r: number, color: RGB | ((fx: number, fy: number) => RGB), alpha = 1) {
    const minX = Math.min(x1, x2) - r, maxX = Math.max(x1, x2) + r;
    const minY = Math.min(y1, y2) - r, maxY = Math.max(y1, y2) + r;
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1e-9;
    this.fillMask(minX, minY, maxX, maxY,
      (fx, fy) => {
        const t = Math.max(0, Math.min(1, ((fx - x1) * dx + (fy - y1) * dy) / len2));
        const d = r - Math.hypot(fx - (x1 + t * dx), fy - (y1 + t * dy));
        return d <= -1.5 / this.scale ? 0 : Math.min(1, Math.max(0, d * this.scale + 0.5));
      },
      typeof color === 'function' ? color : () => color);
  }

  // Four-point sparkle (diamond star) centered at (cx, cy).
  sparkle(cx: number, cy: number, r: number, color: RGB, alpha = 1) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r : r * 0.28;
      pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
    }
    this.poly(pts, color, alpha);
  }

  // Vertical linear gradient helper.
  static vGrad(y0: number, y1: number, c0: RGB, c1: RGB) {
    return (fx: number, fy: number) => mix(c0, c1, Math.max(0, Math.min(1, (fy - y0) / (y1 - y0))));
  }

  static radial(cx: number, cy: number, r: number, c0: RGB, c1: RGB) {
    return (fx: number, fy: number) => mix(c0, c1, Math.max(0, Math.min(1, Math.hypot(fx - cx, fy - cy) / r)));
  }

  // Composite another canvas into this one, scaled to the destination rect (box-sampled).
  blit(src: Canvas, dx: number, dy: number, dw: number, dh: number) {
    const s = this.scale;
    const px0 = Math.max(0, Math.round(dx * s)), py0 = Math.max(0, Math.round(dy * s));
    const px1 = Math.min(this.w * s, Math.round((dx + dw) * s));
    const py1 = Math.min(this.h * s, Math.round((dy + dh) * s));
    for (let py = py0; py < py1; py++) {
      const fy = (py + 0.5) / s;
      const sy0 = Math.min(src.h * src.scale, Math.max(0, ((fy - dy) / dh) * src.h * src.scale));
      for (let px = px0; px < px1; px++) {
        const fx = (px + 0.5) / s;
        const sx0 = Math.min(src.w * src.scale, Math.max(0, ((fx - dx) / dw) * src.w * src.scale));
        // box-sample the source's supersampled buffer around (sx0, sy0)
        const ss = Math.max(1, Math.round(src.scale * (dw / this.w)));
        let r = 0, g = 0, b = 0, n = 0;
        for (let oy = 0; oy < ss; oy++) for (let ox = 0; ox < ss; ox++) {
          const sx = Math.min(src.w * src.scale - 1, Math.floor(sx0) + ox);
          const sy = Math.min(src.h * src.scale - 1, Math.floor(sy0) + oy);
          const i = (sy * src.w * src.scale + sx) * 3;
          r += src.buf[i]; g += src.buf[i + 1]; b += src.buf[i + 2]; n++;
        }
        this.blend(px, py, { r: r / n, g: g / n, b: b / n }, 1);
      }
    }
  }

  toPNG(): Buffer {
    const w = this.w, h = this.h, s = this.scale;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w * 3 + 1)] = 0; // filter: none
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;
        for (let sy = 0; sy < s; sy++) for (let sx = 0; sx < s; sx++) {
          const i = ((y * s + sy) * w * s + (x * s + sx)) * 3;
          r += this.buf[i]; g += this.buf[i + 1]; b += this.buf[i + 2];
        }
        const n = s * s, o = y * (w * 3 + 1) + 1 + x * 3;
        raw[o] = Math.max(0, Math.min(255, Math.round(r / n)));
        raw[o + 1] = Math.max(0, Math.min(255, Math.round(g / n)));
        raw[o + 2] = Math.max(0, Math.min(255, Math.round(b / n)));
      }
    }
    return encodePNG(raw, w, h);
  }
}

// ---- PNG encoding (8-bit RGB, filter 0) ----
const crcTable: number[] = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(raw: Buffer, w: number, h: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
