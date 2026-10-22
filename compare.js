// 比價頁：同時查詢各書店，上方摘要表列出每家最符合的一筆，下方按書店分欄列出搜尋結果
// 查詢可以保存（含當時的價格快照，重新查詢時標出漲跌），每一筆結果可以收藏
import STORES from './stores/index.js';
import { ChallengeError } from './stores/common.js';
import { $, h, icon, price, formatDate, FORMAT_CLASS, renderCover, toast } from './ui.js';
import { describeError, load, norm, onChange, saveQuery, toggleFav, usage, WARN_RATIO } from './saved.js';
import { initDrawer } from './drawer.js';

const MAX_ITEMS = 12;
const FORMAT_KEY = 'bookstore-format';
const SUMMARY_FORMATS = ['紙本', '電子書'];

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, v); } catch { /* 無痕模式等情況忽略 */ } },
};

const isIsbn = (q) => /^(97[89])?\d{9}[\dx]$/i.test(q.replace(/[\s-]/g, ''));

/* 每家書店、每種版本挑一筆「最符合」：ISBN 查詢取第一筆；書名查詢優先取書名開頭相同、其次包含查詢字的 */
const bestMatch = (items, format, q) => {
  const list = items.filter((i) => i.format === format && i.price != null);
  if (isIsbn(q)) return list[0];
  const nq = norm(q);
  return list.find((i) => norm(i.title).startsWith(nq)) || list.find((i) => norm(i.title).includes(nq));
};

/* 保存成功後，同步空間用量超過警示比例就順便提醒清理 */
const toastSaved = async (message) => {
  const { ratio } = await usage();
  if (ratio < WARN_RATIO) return toast(message);
  toast(message + '。同步空間已用 ' + Math.round(ratio * 100) + '%，建議到「已保存」清理舊的項目', 5000);
};

let query = '';
let format = storage.get(FORMAT_KEY) || 'all';
/* storeId → { status: 'loading' | 'ok' | 'challenge' | 'error', items, error } */
const results = new Map();
const controllers = new Map();
let saved = { queries: [], favs: [] };
let favUrls = new Set();

/* 目前查詢對應的已保存項目（同一個關鍵字），用來比較價格 */
const baseline = () => saved.queries.find((e) => norm(e.q) === norm(query));
const allDone = () => STORES.every((s) => results.get(s.id) && results.get(s.id).status !== 'loading');

/* 價格快照：每家書店 [紙本最符合的價格, 電子書最符合的價格]，查詢失敗的書店不記 */
const snapshot = () => Object.fromEntries(STORES
  .filter((s) => results.get(s.id)?.status === 'ok')
  .map((s) => [s.id, SUMMARY_FORMATS.map((f) => bestMatch(results.get(s.id).items, f, query)?.price ?? null)]));

const runStore = async (store) => {
  controllers.get(store.id)?.abort();
  const ctrl = new AbortController();
  controllers.set(store.id, ctrl);
  results.set(store.id, { status: 'loading', items: [] });
  render();
  try {
    const items = await store.search(query, ctrl.signal);
    results.set(store.id, { status: 'ok', items });
  } catch (err) {
    if (ctrl.signal.aborted) return;
    results.set(store.id, err instanceof ChallengeError
      ? { status: 'challenge', items: [] }
      : { status: 'error', items: [], error: err.message });
  }
  render();
};

const search = (q) => {
  query = q.trim();
  if (!query) return;
  document.title = query + ' - 書比比';
  const url = new URL(location.href);
  url.searchParams.set('q', query);
  history.replaceState(null, '', url);
  STORES.forEach(runStore);
};

const setFormat = (value) => {
  format = value;
  storage.set(FORMAT_KEY, format);
  for (const radio of document.querySelectorAll('input[name="format"]')) radio.checked = radio.value === format;
};

const saveCurrent = async () => {
  const updating = Boolean(baseline());
  try {
    await saveQuery({ q: query, f: format, s: snapshot() });
    await toastSaved(updating ? '已更新保存的價格' : '已保存「' + query + '」');
  } catch (err) {
    toast(describeError(err), 5000);
  }
};

const toggleFavorite = async (item, store) => {
  try {
    if (await toggleFav(item, store.id)) await toastSaved('已加入收藏');
    else toast('已取消收藏');
  } catch (err) {
    toast(describeError(err), 5000);
  }
};

/* ---------- 畫面 ---------- */
const renderSummaryHead = () => {
  const entry = baseline();
  const done = allDone();
  const button = (label, iconName, onclick) => h('button', {
    type: 'button', className: 'btn', disabled: !done, title: done ? '' : '等所有書店查詢完成', onclick,
  }, iconName && icon(iconName), label);
  return h('div', { className: 'summary-head' },
    h('h2', { textContent: '最符合「' + query + '」的一筆' }),
    h('div', { className: 'summary-actions' },
      ...(entry
        ? [h('span', { className: 'saved-mark' }, icon('bookmark', 'filled'), '已保存'), button('更新保存的價格', null, saveCurrent)]
        : [button('保存這次查詢', 'bookmark', saveCurrent)])));
};

/* 跟保存時的價格比較：↓ 變便宜（綠）、↑ 變貴（紅） */
const renderDelta = (store, f, item) => {
  const base = baseline()?.s?.[store.id]?.[SUMMARY_FORMATS.indexOf(f)];
  if (base == null || item.price === base) return null;
  const diff = item.price - base;
  return h('span', { className: 'delta ' + (diff < 0 ? 'down' : 'up'), title: '保存時 ' + price(base),
    textContent: (diff < 0 ? '↓' : '↑') + price(Math.abs(diff)) });
};

const renderSummary = () => {
  const formats = format === 'all' ? SUMMARY_FORMATS : [format];
  const cells = STORES.map((store) => {
    const r = results.get(store.id);
    return formats.map((f) => (r?.status === 'ok' ? bestMatch(r.items, f, query) : null));
  });
  const lowest = formats.map((_, i) => Math.min(...cells.map((row) => row[i]?.price ?? Infinity)));
  const entry = baseline();

  const cell = (store, item, i) => {
    const r = results.get(store.id);
    if (!r || r.status === 'loading') return h('td', { className: 'muted', textContent: '查詢中…' });
    if (r.status === 'challenge') return h('td', { className: 'muted', textContent: '需要驗證' });
    if (r.status === 'error') return h('td', { className: 'muted', textContent: '查詢失敗' });
    if (!item) return h('td', { className: 'muted', textContent: '—' });
    return h('td', { className: item.price === lowest[i] ? 'best' : '' },
      h('a', { href: item.url, target: '_blank', rel: 'noopener', title: item.title },
        h('span', { className: 'p', textContent: price(item.price) }),
        renderDelta(store, formats[i], item),
        h('span', { className: 't', textContent: item.title })));
  };

  $('summary').replaceChildren(
    renderSummaryHead(),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', { textContent: '書店' }), ...formats.map((f) => h('th', { textContent: f })))),
      h('tbody', {}, ...STORES.map((store, s) => h('tr', {},
        h('th', { textContent: store.name }),
        ...cells[s].map((item, i) => cell(store, item, i)))))),
    h('p', { className: 'hint', textContent: (entry ? '↓↑ 是跟 ' + formatDate(entry.t) + ' 保存時的價格比較。' : '')
      + '自動挑出的不一定是同一本書，請點進去確認版本；售價不含點數、折價券與會員折扣。' }));
};

const renderItem = (item, store) => {
  const faved = favUrls.has(item.url);
  return h('div', { className: 'item-row' },
    h('a', { className: 'item', href: item.url, target: '_blank', rel: 'noopener' },
      renderCover(item.cover),
      h('div', {},
        h('div', { className: 'name', title: item.title, textContent: item.title }),
        item.author && h('div', { className: 'meta', textContent: item.author }),
        h('div', { className: 'price' },
          h('span', { className: 'tag ' + (FORMAT_CLASS[item.format] || ''), textContent: item.format }),
          h('b', { textContent: price(item.price) }),
          item.listPrice && item.listPrice !== item.price && h('s', { textContent: price(item.listPrice) }),
          item.discount && h('span', { className: 'off', textContent: item.discount + ' 折' }),
          item.note && h('span', { className: 'note', textContent: item.note })))),
    h('button', {
      type: 'button', className: 'star' + (faved ? ' on' : ''), title: faved ? '取消收藏' : '收藏',
      ariaLabel: faved ? '取消收藏' : '收藏', ariaPressed: String(faved), onclick: () => toggleFavorite(item, store),
    }, icon('star', faved ? 'filled' : '')));
};

const renderColumn = (store) => {
  const r = results.get(store.id) || { status: 'loading', items: [] };
  const list = r.items.filter((i) => format === 'all' || i.format === format);
  const body = [];
  if (r.status === 'loading') body.push(h('div', { className: 'status loading', textContent: '查詢中…' }));
  if (r.status === 'error') body.push(h('div', { className: 'status err', textContent: '查詢失敗：' + r.error }));
  if (r.status === 'challenge') {
    body.push(h('div', { className: 'status err' },
      store.name + ' 要求先通過安全驗證。開啟書店頁面完成驗證後，再按「重新查詢」。',
      h('div', {},
        h('button', { type: 'button', textContent: '開啟' + store.name, onclick: () => window.open(store.searchUrl(query), '_blank') }),
        h('button', { type: 'button', textContent: '重新查詢', onclick: () => runStore(store) }))));
  }
  if (r.status === 'ok') {
    body.push(list.length
      ? h('div', { className: 'status', textContent: '共 ' + list.length + ' 筆' + (list.length > MAX_ITEMS ? '，顯示前 ' + MAX_ITEMS + ' 筆' : '') })
      : h('div', { className: 'status', textContent: '沒有符合的結果' }));
    body.push(...list.slice(0, MAX_ITEMS).map((item) => renderItem(item, store)));
  }
  return h('div', { className: 'col' },
    h('h2', {}, store.name, h('a', { href: store.searchUrl(query), target: '_blank', rel: 'noopener', textContent: '到書店看全部 ↗' })),
    ...body);
};

const render = () => {
  if (!query) return;
  renderSummary();
  $('columns').replaceChildren(...STORES.map(renderColumn));
};

/* ---------- 初始化 ---------- */
const drawer = initDrawer({
  stores: STORES,
  onOpenQuery: (entry) => {
    setFormat(entry.f || 'all');
    $('q').value = entry.q;
    search(entry.q);
  },
});

const refreshSaved = async () => {
  saved = await load();
  favUrls = new Set(saved.favs.map((f) => f.u));
  drawer.refresh(saved);
  render();
};
onChange(refreshSaved);
refreshSaved();

for (const radio of document.querySelectorAll('input[name="format"]')) {
  radio.checked = radio.value === format;
  radio.onchange = () => {
    setFormat(radio.value);
    render();
  };
}

$('form').onsubmit = (e) => {
  e.preventDefault();
  search($('q').value);
};

const initial = new URLSearchParams(location.search).get('q') || '';
$('q').value = initial;
if (initial) search(initial);
