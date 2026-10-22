// 比價頁：同時查詢各書店，上方摘要表列出每家最符合的一筆，下方按書店分欄列出搜尋結果
import STORES from './stores/index.js';
import { ChallengeError } from './stores/common.js';

const MAX_ITEMS = 12;
const FORMAT_KEY = 'bookstore-format';
const SUMMARY_FORMATS = ['紙本', '電子書'];

const $ = (id) => document.getElementById(id);
const h = (tag, props, ...children) => {
  const el = document.createElement(tag);
  Object.assign(el, props);
  for (const c of children) if (c != null && c !== false) el.append(c);
  return el;
};

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, v); } catch { /* 無痕模式等情況忽略 */ } },
};

const price = (n) => (n != null ? '$' + n.toLocaleString() : '—');
const FORMAT_CLASS = { 紙本: 'paper', 電子書: 'ebook', 有聲書: 'audio', 二手書: 'used' };

/* 比對用：全形轉半形、去空白與標點 */
const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const isIsbn = (q) => /^(97[89])?\d{9}[\dx]$/i.test(q.replace(/[\s-]/g, ''));

/* 每家書店、每種版本挑一筆「最符合」：ISBN 查詢取第一筆；書名查詢優先取書名開頭相同、其次包含查詢字的 */
const bestMatch = (items, format, q) => {
  const list = items.filter((i) => i.format === format && i.price != null);
  if (isIsbn(q)) return list[0];
  const nq = norm(q);
  return list.find((i) => norm(i.title).startsWith(nq)) || list.find((i) => norm(i.title).includes(nq));
};

let query = '';
let format = storage.get(FORMAT_KEY) || 'all';
/* storeId → { status: 'loading' | 'ok' | 'challenge' | 'error', items, error } */
const results = new Map();
const controllers = new Map();

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

/* ---------- 畫面 ---------- */
const renderSummary = () => {
  const formats = format === 'all' ? SUMMARY_FORMATS : [format];
  const cells = STORES.map((store) => {
    const r = results.get(store.id);
    return formats.map((f) => (r?.status === 'ok' ? bestMatch(r.items, f, query) : null));
  });
  const lowest = formats.map((_, i) => Math.min(...cells.map((row) => row[i]?.price ?? Infinity)));

  const cell = (store, item, i) => {
    const r = results.get(store.id);
    if (!r || r.status === 'loading') return h('td', { className: 'muted', textContent: '查詢中…' });
    if (r.status === 'challenge') return h('td', { className: 'muted', textContent: '需要驗證' });
    if (r.status === 'error') return h('td', { className: 'muted', textContent: '查詢失敗' });
    if (!item) return h('td', { className: 'muted', textContent: '—' });
    return h('td', { className: item.price === lowest[i] ? 'best' : '' },
      h('a', { href: item.url, target: '_blank', rel: 'noopener', title: item.title },
        h('span', { className: 'p', textContent: price(item.price) }),
        h('span', { className: 't', textContent: item.title })));
  };

  $('summary').replaceChildren(
    h('table', {},
      h('caption', { textContent: '最符合「' + query + '」的一筆' }),
      h('thead', {}, h('tr', {}, h('th', { textContent: '書店' }), ...formats.map((f) => h('th', { textContent: f })))),
      h('tbody', {}, ...STORES.map((store, s) => h('tr', {},
        h('th', { textContent: store.name }),
        ...cells[s].map((item, i) => cell(store, item, i)))))),
    h('p', { className: 'hint', textContent: '自動挑出的不一定是同一本書，請點進去確認版本；售價不含點數、折價券與會員折扣。' }));
};

/* 沒有封面或圖片載入失敗時，換成灰底佔位 */
const renderCover = (src) => {
  const placeholder = () => h('span', { className: 'cover-ph', textContent: '無封面' });
  if (!src) return placeholder();
  const img = h('img', { src, loading: 'lazy', alt: '', referrerPolicy: 'no-referrer' });
  img.onerror = () => img.replaceWith(placeholder());
  return img;
};

const renderItem = (item) => h('a', { className: 'item', href: item.url, target: '_blank', rel: 'noopener' },
  renderCover(item.cover),
  h('div', {},
    h('div', { className: 'name', title: item.title, textContent: item.title }),
    item.author && h('div', { className: 'meta', textContent: item.author }),
    h('div', { className: 'price' },
      h('span', { className: 'tag ' + (FORMAT_CLASS[item.format] || ''), textContent: item.format }),
      h('b', { textContent: price(item.price) }),
      item.listPrice && item.listPrice !== item.price && h('s', { textContent: price(item.listPrice) }),
      item.discount && h('span', { className: 'off', textContent: item.discount + ' 折' }),
      item.note && h('span', { className: 'note', textContent: item.note }))));

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
    body.push(...list.slice(0, MAX_ITEMS).map(renderItem));
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
for (const radio of document.querySelectorAll('input[name="format"]')) {
  radio.checked = radio.value === format;
  radio.onchange = () => {
    format = radio.value;
    storage.set(FORMAT_KEY, format);
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
