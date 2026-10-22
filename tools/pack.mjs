// 打包上架用的 zip：dist/bookbb-<版本>.zip，最上層直接是 manifest.json
// 只收擴充功能執行時需要的檔案（白名單），開發用的 .claude/、tools/、store/、README 不會進去
// 只用 Node 內建模組；用法：node tools/pack.mjs
import { deflateRawSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { crc32 } from './crc32.mjs';

const ROOT = new URL('../', import.meta.url);
const FILES = ['manifest.json', 'background.js', 'compare.html', 'compare.css', 'compare.js'];
const DIRS = { stores: /\.js$/, icons: /\.png$/ };

const listFiles = async () => {
  const files = [...FILES];
  for (const [dir, pattern] of Object.entries(DIRS)) {
    const names = (await readdir(new URL(dir + '/', ROOT))).filter((n) => pattern.test(n)).sort();
    files.push(...names.map((n) => dir + '/' + n));
  }
  return files;
};

/* 檢查 manifest 裡引用的檔案都有打包到 */
const checkManifest = (manifest, files) => {
  const refs = [
    manifest.background?.service_worker,
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {}),
  ].filter(Boolean);
  const missing = refs.filter((f) => !files.includes(f));
  if (missing.length) throw new Error('manifest 引用的檔案沒有打包：' + missing.join(', '));
};

/* ---------- ZIP（deflate，UTF-8 檔名） ---------- */
const dosTime = (d) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

const buildZip = (entries) => {
  const { time, date } = dosTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); /* 需要的版本 2.0 */
    local.writeUInt16LE(0x0800, 6); /* 檔名是 UTF-8 */
    local.writeUInt16LE(8, 8); /* deflate */
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
};

const files = await listFiles();
const manifest = JSON.parse(await readFile(new URL('manifest.json', ROOT), 'utf8'));
checkManifest(manifest, files);
const entries = await Promise.all(files.map(async (name) => ({ name, data: await readFile(new URL(name, ROOT)) })));
const zip = buildZip(entries);

await mkdir(new URL('dist/', ROOT), { recursive: true });
const out = `dist/bookbb-${manifest.version}.zip`;
await writeFile(new URL(out, ROOT), zip);
console.log(`${out}（${files.length} 個檔案，${(zip.length / 1024).toFixed(1)} KB）`);
for (const f of files) console.log('  ' + f);
