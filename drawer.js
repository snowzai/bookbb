// 右側面板：已保存的查詢、我的收藏
import { $, h, icon, price, formatDate, FORMAT_CLASS, renderCover, toast } from './ui.js';
import { describeError, MAX_ITEMS, QUOTA, removeFav, removeOldest, removeQuery, renameQuery, usage, WARN_RATIO } from './saved.js';

const FORMAT_LABEL = { all: '全部', 紙本: '紙本', 電子書: '電子書' };

/* 快照裡某個版本（0 紙本、1 電子書）的最低價 */
const lowestOf = (snapshot, i) => {
  const prices = Object.values(snapshot || {}).map((p) => p[i]).filter((p) => p != null);
  return prices.length ? Math.min(...prices) : null;
};

const iconButton = (name, title, action) => h('button', {
  type: 'button', className: 'icon-btn', title, ariaLabel: title,
  onclick: async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { await action(); } catch (err) { toast(describeError(err), 5000); }
  },
}, icon(name));

export const initDrawer = ({ stores, onOpenQuery }) => {
  const storeName = (id) => stores.find((s) => s.id === id)?.name || id;
  const drawer = $('drawer');
  const backdrop = $('backdrop');
  let tab = 'queries';
  let data = { queries: [], favs: [] };
  /* 清理工具列按「刪除…」後等待確認的筆數；null 表示沒有在確認 */
  let confirming = null;

  const setOpen = (open) => {
    drawer.hidden = !open;
    backdrop.hidden = !open;
    $('savedBtn').setAttribute('aria-expanded', String(open));
    if (open) render();
  };

  const startRename = (entry, row) => {
    let finished = false;
    const input = h('input', { className: 'rename', value: entry.label || entry.q, maxLength: 60, ariaLabel: '查詢名稱' });
    const finish = async (save) => {
      if (finished) return;
      finished = true;
      const label = input.value.trim();
      /* 名稱改回關鍵字本身就不另外存 */
      if (save && label) await renameQuery(entry, label === entry.q ? '' : label).catch((err) => toast(describeError(err), 5000));
      render();
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    };
    input.onblur = () => finish(true);
    row.replaceChildren(input);
    input.focus();
    input.select();
  };

  const queryRow = (entry) => {
    const paper = lowestOf(entry.s, 0);
    const ebook = lowestOf(entry.s, 1);
    const meta = [entry.label ? '關鍵字：' + entry.q : '', FORMAT_LABEL[entry.f] || '全部', '保存於 ' + formatDate(entry.t)];
    const row = h('div', { className: 'saved-row' },
      h('button', { type: 'button', className: 'row-main', title: '用最新價格重新查詢', onclick: () => { setOpen(false); onOpenQuery(entry); } },
        h('div', {},
          h('div', { className: 'row-title', textContent: entry.label || entry.q }),
          h('div', { className: 'row-meta', textContent: meta.filter(Boolean).join(' · ') }),
          h('div', { className: 'row-prices' },
            paper != null && h('span', {}, '紙本最低 ', h('b', { textContent: price(paper) })),
            ebook != null && h('span', {}, '電子書最低 ', h('b', { textContent: price(ebook) }))))),
      h('div', { className: 'row-actions' },
        iconButton('pencil', '重新命名', () => startRename(entry, row)),
        iconButton('trash', '刪除', () => removeQuery(entry.id))));
    return row;
  };

  const favRow = (fav) => h('div', { className: 'saved-row fav' },
    h('a', { className: 'row-main', href: fav.u, target: '_blank', rel: 'noopener' },
      renderCover(fav.c),
      h('div', {},
        h('div', { className: 'row-title', title: fav.ti, textContent: fav.ti }),
        h('div', { className: 'row-meta' },
          h('span', { className: 'tag ' + (FORMAT_CLASS[fav.fm] || ''), textContent: fav.fm }),
          ' ' + storeName(fav.st) + ' · ' + formatDate(fav.t)),
        h('div', { className: 'row-prices' }, '收藏時 ', h('b', { textContent: price(fav.p) })))),
    h('div', { className: 'row-actions' }, iconButton('trash', '取消收藏', () => removeFav(fav.id))));

  /* 清理工具列：刪除目前分頁最舊的 N 筆，先在面板內確認 */
  const cleanupBar = (list, ratio) => {
    const noun = tab === 'queries' ? '查詢' : '收藏';
    if (confirming) {
      const n = Math.min(confirming, list.length);
      return h('div', { className: 'cleanup confirm' },
        h('div', { textContent: '確定刪除最舊的 ' + n + ' 筆' + noun + '？刪除後無法復原。' }),
        h('div', { className: 'cleanup-row' },
          h('button', { type: 'button', className: 'btn danger', onclick: async () => {
            confirming = null;
            try { toast('已刪除 ' + (await removeOldest(tab, n)) + ' 筆' + noun); } catch (err) { toast(describeError(err), 5000); }
            render();
          } }, '確定刪除'),
          h('button', { type: 'button', className: 'btn', onclick: () => { confirming = null; render(); } }, '取消')));
    }
    const near = ratio >= WARN_RATIO;
    const select = h('select', { className: 'clean-count', ariaLabel: '要刪除的筆數' },
      ...[10, 20, 50].filter((n) => n < list.length).map((n) => h('option', { value: String(n), textContent: n + ' 筆' })),
      h('option', { value: String(list.length), textContent: '全部 ' + list.length + ' 筆' }));
    return h('div', { className: 'cleanup' + (near ? ' warn' : '') },
      near && h('div', { className: 'cleanup-warn', textContent: '同步空間已使用 ' + Math.round(ratio * 100) + '%，快滿了，建議清理舊的項目。' }),
      h('div', { className: 'cleanup-row' },
        '刪除最舊的', select, noun,
        h('button', { type: 'button', className: 'btn', onclick: () => { confirming = Number(select.value); render(); } }, '刪除…')));
  };

  const render = async () => {
    const count = (n) => (n ? String(n) : '');
    $('queryCount').textContent = count(data.queries.length);
    $('favCount').textContent = count(data.favs.length);
    $('savedCount').textContent = count(data.queries.length + data.favs.length);
    for (const btn of drawer.querySelectorAll('[data-tab]')) btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));

    /* 面板關著也要更新標題列按鈕的警示 */
    const { bytes, items, ratio } = await usage();
    const level = ratio >= 0.95 ? 'danger' : ratio >= WARN_RATIO ? 'warn' : '';
    $('savedBtn').classList.toggle('warn', Boolean(level));
    $('savedBtn').title = level ? '同步空間已使用 ' + Math.round(ratio * 100) + '%，建議清理' : '';
    if (drawer.hidden) return;

    const list = tab === 'queries' ? data.queries : data.favs;
    $('drawerBody').replaceChildren(...(list.length
      ? [cleanupBar(list, ratio), ...list.map(tab === 'queries' ? queryRow : favRow)]
      : [h('div', { className: 'empty', textContent: tab === 'queries'
        ? '還沒有保存的查詢。查詢後按「保存這次查詢」，就會出現在這裡。'
        : '還沒有收藏。在下方搜尋結果按星號，就會出現在這裡。' })]));

    $('drawerFoot').replaceChildren(
      h('div', { className: 'quota ' + level, title: '同步空間用量' }, h('span', { style: 'width:' + Math.min(100, ratio * 100) + '%' })),
      h('div', { textContent: '同步空間已使用 ' + Math.round(ratio * 100) + '%（' + (bytes / 1024).toFixed(1) + ' KB / ' + QUOTA / 1024 + ' KB、' + items + ' / ' + MAX_ITEMS + ' 筆）' }),
      h('div', { className: 'muted', textContent: '登入 Chrome 並開啟同步時，會同步到同一個 Google 帳號的其他電腦。' }));
  };

  $('savedBtn').onclick = () => setOpen(drawer.hidden);
  $('drawerClose').onclick = () => setOpen(false);
  backdrop.onclick = () => setOpen(false);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) setOpen(false); });
  for (const btn of drawer.querySelectorAll('[data-tab]')) btn.onclick = () => { tab = btn.dataset.tab; confirming = null; render(); };

  return {
    refresh(next) {
      data = next;
      render();
    },
  };
};
