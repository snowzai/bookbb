// TAAZE 讀冊生活：解析搜尋結果頁 HTML，新書、電子書、二手書混在一起
import { absUrl, fetchDoc, textOf, toNumber } from './common.js';

const BASE = 'https://www.taaze.tw/';

/* saledisc 是兩位數，例如 "79"、"70"；"70" 顯示成「7 折」 */
const discountOf = (d) => (/^\d0$/.test(d) ? d[0] : /^\d{2}$/.test(d) && d !== '100' ? d : '');

/* 每筆的價格、書名都在 .media 的 data-* 屬性上 */
export const parse = (doc) => [...doc.querySelectorAll('.media[rel]')].map((m) => {
  const d = m.dataset;
  const link = m.querySelector('h4 a');
  const url = absUrl(link?.getAttribute('href'), BASE);
  const used = /usedList/.test(url) || /UsedCondition/.test(m.querySelector('[itemprop="itemCondition"]')?.getAttribute('content') || '');
  const ebook = /epub|pdf/i.test(d.bindingtype || '') || (m.getAttribute('rel') || '').startsWith('14');
  return {
    title: d.title_main || textOf(link),
    author: [...m.querySelectorAll('.author a')].map(textOf).join('、'),
    /* 二手書顯示最低二手價；沒有二手書時是 "nodata" → null，下面會濾掉 */
    price: toNumber(used ? d.min_sale_price : d.saleprice_28),
    listPrice: toNumber(d.listprice_28),
    discount: used ? '' : discountOf(d.saledisc_28 || ''),
    format: used ? '二手書' : ebook ? '電子書' : '紙本',
    url,
    cover: absUrl(m.querySelector('.cover_frame')?.getAttribute('data-bg_url'), BASE),
    note: used ? '最低二手價' : '',
  };
}).filter((x) => x.title && x.url && x.price != null);

export default {
  id: 'taaze',
  name: 'TAAZE',
  searchUrl: (q) => BASE + 'rwd_searchResult.html?' + new URLSearchParams({ 'keyType[]': '0', 'keyword[]': q }),
  async search(q, signal) {
    return parse(await fetchDoc(this.searchUrl(q), signal));
  },
};
