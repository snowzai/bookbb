// 產生擴充功能圖示 icons/icon-{16,32,48,128}.png：藍色圓角方塊 + 白色價格標籤（與比價頁左上角相同造型）
// 只用 Node 內建模組；用法：node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { crc32 } from './crc32.mjs';

const BLUE = [0x25, 0x63, 0xeb];
const WHITE = [0xff, 0xff, 0xff];
const SAMPLES = 4; /* 每個像素取 4×4 個樣本做反鋸齒 */

/* 標籤外框：24×24 座標系的凸五邊形（左上直角、右下尖端），頂點依順時針 */
const TAG = [[2, 2], [12, 2], [23, 13], [13, 23], [2, 12]];

/* 小尺寸圖示線條要粗一點、標籤要大一點才看得清楚 */
const STYLE = {
  16: { glyph: 0.78, stroke: 3.2, ring: false },
  32: { glyph: 0.72, stroke: 2.6, ring: false },
  48: { glyph: 0.66, stroke: 2.2, ring: true },
  128: { glyph: 0.62, stroke: 2, ring: true },
};

/* 點到凸多邊形的有號距離（外正內負） */
const sdPolygon = (px, py, pts) => {
  let d = Infinity;
  let inside = true;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const ex = bx - ax, ey = by - ay;
    const wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
    if (ex * wy - ey * wx < 0) inside = false;
  }
  return inside ? -d : d;
};

/* 把凸多邊形每條邊往內推 r，再求相鄰邊的交點 → 圓角的「骨架」 */
const inset = (pts, r) => {
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len; /* 順時針（y 向下）時的內側法線 */
    return { px: a[0] + nx * r, py: a[1] + ny * r, dx: b[0] - a[0], dy: b[1] - a[1] };
  });
  return lines.map((l1, i) => {
    const l2 = lines[(i + lines.length - 1) % lines.length];
    const den = l2.dx * l1.dy - l2.dy * l1.dx;
    const t = ((l1.px - l2.px) * l1.dy - (l1.py - l2.py) * l1.dx) / den;
    return [l2.px + l2.dx * t, l2.py + l2.dy * t];
  });
};

/* 圓角方塊的有號距離（座標 0..1，圓角半徑 rr） */
const sdRoundRect = (x, y, rr) => {
  const qx = Math.abs(x - 0.5) - (0.5 - rr), qy = Math.abs(y - 0.5) - (0.5 - rr);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
};

const render = (size) => {
  const { glyph, stroke, ring } = STYLE[size];
  const corner = 2.2; /* 標籤轉角圓角半徑（24 座標系） */
  const core = inset(TAG, corner);
  const half = stroke / 2;
  const unit = (size * glyph) / 21; /* 標籤寬約 21 單位 */
  const cx = 12.5, cy = 12.5; /* 標籤的視覺中心 */
  const px = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const fx = x + (sx + 0.5) / SAMPLES, fy = y + (sy + 0.5) / SAMPLES;
          if (sdRoundRect(fx / size, fy / size, 0.22) > 0) continue;
          bg++;
          const gx = cx + (fx - size / 2) / unit, gy = cy + (fy - size / 2) / unit;
          const onOutline = Math.abs(sdPolygon(gx, gy, core) - corner) <= half;
          const dHole = Math.hypot(gx - 7.5, gy - 7.5);
          const onHole = ring ? Math.abs(dHole - 1.5) <= half : dHole <= 1.9;
          if (onOutline || onHole) fg++;
        }
      }
      const n = SAMPLES * SAMPLES;
      const a = fg / Math.max(bg, 1);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(BLUE[c] + (WHITE[c] - BLUE[c]) * a);
      px[i + 3] = Math.round((bg / n) * 255);
    }
  }
  return encodePng(size, size, px);
};

/* ---------- PNG 編碼（RGBA 8-bit、不做濾波） ---------- */
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePng = (w, h, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; /* 8-bit RGBA */
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
};

const outDir = new URL('../icons/', import.meta.url);
await mkdir(outDir, { recursive: true });
for (const size of Object.keys(STYLE).map(Number)) {
  await writeFile(new URL(`icon-${size}.png`, outDir), render(size));
  console.log(`icons/icon-${size}.png`);
}
