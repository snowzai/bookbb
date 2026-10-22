// 比價頁與右側面板共用的畫面工具
export const $ = (id) => document.getElementById(id);

export const h = (tag, props, ...children) => {
  const el = document.createElement(tag);
  Object.assign(el, props);
  for (const c of children) if (c != null && c !== false) el.append(c);
  return el;
};

export const price = (n) => (n != null ? '$' + n.toLocaleString() : '—');
export const FORMAT_CLASS = { 紙本: 'paper', 電子書: 'ebook', 有聲書: 'audio', 二手書: 'used' };

export const formatDate = (t) => {
  const d = new Date(t);
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
};

/* 線條圖示（24×24），樣式由 CSS 的 svg 規則決定 */
const ICONS = {
  bookmark: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  pencil: '<path d="M17 3l4 4L8 20H4v-4z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};
export const icon = (name, className = '') => {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstChild;
};

/* 沒有封面或圖片載入失敗時，換成灰底佔位 */
export const renderCover = (src) => {
  const placeholder = () => h('span', { className: 'cover-ph', textContent: '無封面' });
  if (!src) return placeholder();
  const img = h('img', { src, loading: 'lazy', alt: '', referrerPolicy: 'no-referrer' });
  img.onerror = () => img.replaceWith(placeholder());
  return img;
};

/* 畫面下方短暫顯示的提示 */
let toastTimer;
export const toast = (message, duration = 2600) => {
  let el = document.getElementById('toast');
  if (!el) document.body.append(el = h('div', { id: 'toast', className: 'toast', role: 'status' }));
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
};
