// 保存的查詢與收藏：存在 chrome.storage.sync（登入同一個 Google 帳號並開啟同步的 Chrome 會同步）
// 每筆各存成一個項目（q_<id>、f_<id>），避開單一項目 8 KB 的上限；沒有 chrome.storage 時（本機預覽）改用 localStorage
const sync = globalThis.chrome?.storage?.sync;
const FALLBACK_KEY = 'bookbb-saved';
export const QUOTA = sync?.QUOTA_BYTES ?? 102400;
export const MAX_ITEMS = sync?.MAX_ITEMS ?? 512;
/* 用量（容量或項目數，取比例高的）到這個比例就提醒清理 */
export const WARN_RATIO = 0.8;

/* 同一個分頁寫入 localStorage 不會觸發 storage 事件，所以自己發一個 */
const LOCAL_EVENT = 'bookbb-saved-change';
const local = {
  read() { try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '{}'); } catch { return {}; } },
  write(all) {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(all));
    dispatchEvent(new Event(LOCAL_EVENT));
  },
};

const area = sync
  ? {
      get: () => sync.get(null),
      set: (obj) => sync.set(obj),
      remove: (keys) => sync.remove(keys),
      bytes: () => sync.getBytesInUse(null),
    }
  : {
      get: async () => local.read(),
      set: async (obj) => local.write({ ...local.read(), ...obj }),
      remove: async (keys) => {
        const all = local.read();
        for (const k of [].concat(keys)) delete all[k];
        local.write(all);
      },
      bytes: async () => new Blob([localStorage.getItem(FALLBACK_KEY) || '']).size,
    };

/* 比對用：全形轉半形、去空白與標點（判斷「同一個查詢」、書名配對都用這個） */
export const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* 欄位用短名稱省同步空間：
   查詢 { id, q, label, f: 版本篩選, t: 保存時間, s: { storeId: [紙本價, 電子書價] } }
   收藏 { id, st: storeId, ti: 書名, fm: 版本, p: 價格, u: 連結, c: 封面, t: 保存時間 } */
export const load = async () => {
  const all = await area.get();
  const byTime = (a, b) => b.t - a.t;
  return {
    queries: Object.entries(all).filter(([k]) => k.startsWith('q_')).map(([, v]) => v).sort(byTime),
    favs: Object.entries(all).filter(([k]) => k.startsWith('f_')).map(([, v]) => v).sort(byTime),
  };
};

/* 同一個關鍵字只保存一筆：已存在就更新價格快照與版本，保留原本的名稱 */
export const saveQuery = async ({ q, f, s }) => {
  const { queries } = await load();
  const old = queries.find((e) => norm(e.q) === norm(q));
  const entry = { id: old?.id || newId(), q, label: old?.label || '', f, t: Date.now(), s };
  await area.set({ ['q_' + entry.id]: entry });
  return entry;
};

export const renameQuery = async (entry, label) => area.set({ ['q_' + entry.id]: { ...entry, label: label.trim() } });

export const removeQuery = (id) => area.remove('q_' + id);

/* 同一個連結只收藏一次：已收藏就取消 */
export const toggleFav = async (item, storeId) => {
  const { favs } = await load();
  const old = favs.find((f) => f.u === item.url);
  if (old) {
    await area.remove('f_' + old.id);
    return false;
  }
  const fav = { id: newId(), st: storeId, ti: item.title, fm: item.format, p: item.price, u: item.url, c: item.cover || '', t: Date.now() };
  await area.set({ ['f_' + fav.id]: fav });
  return true;
};

export const removeFav = (id) => area.remove('f_' + id);

/* 刪除最舊的 count 筆（kind: 'queries' | 'favs'），一次 remove 只算一次寫入 */
export const removeOldest = async (kind, count) => {
  const data = await load();
  const prefix = kind === 'queries' ? 'q_' : 'f_';
  const keys = data[kind].slice(-count).map((e) => prefix + e.id); /* 清單是新到舊排序 */
  if (keys.length) await area.remove(keys);
  return keys.length;
};

/* 同步空間有兩種上限：總容量與項目數，ratio 取兩者中比例較高的 */
export const usage = async () => {
  const [bytes, all] = await Promise.all([area.bytes(), area.get()]);
  const items = Object.keys(all).length;
  return { bytes, items, ratio: Math.max(bytes / QUOTA, items / MAX_ITEMS) };
};

/* chrome.storage.sync 的錯誤訊息是「<上限名稱> quota exceeded」，轉成看得懂的說明 */
export const describeError = (err) => {
  const message = String(err?.message || err);
  if (/WRITE_OPERATIONS_PER_MINUTE/.test(message)) return '操作太頻繁，請等一分鐘再試';
  if (/WRITE_OPERATIONS_PER_HOUR/.test(message)) return '這一小時內的操作次數太多，請稍後再試';
  if (/QUOTA_BYTES_PER_ITEM/.test(message)) return '這一筆資料太大，無法保存';
  if (/QUOTA_BYTES|MAX_ITEMS|QuotaExceeded|exceeded the quota/i.test(message)) return '同步空間已滿，請到「已保存」刪除最舊的項目';
  return '儲存失敗：' + message;
};

/* 其他分頁或其他電腦同步過來的變動 */
export const onChange = (callback) => {
  if (sync) chrome.storage.onChanged.addListener((_, name) => { if (name === 'sync') callback(); });
  else {
    addEventListener('storage', (e) => { if (e.key === FALLBACK_KEY) callback(); });
    addEventListener(LOCAL_EVENT, callback);
  }
};
