// 三民網路書店：解析搜尋結果頁 HTML，紙本在前、電子書在後
import { absUrl, fetchDoc, textOf, toNumber } from './common.js';

const BASE = 'https://www.sanmin.com.tw/';

export const parse = (doc) => [...doc.querySelectorAll('.sProduct')].map((p) => {
  const link = p.querySelector('.Title a');
  const pack = textOf(p.querySelector('.Pack')).replace(/^裝訂：/, '');
  /* 紙本有「優惠價」（.Disc 折數、.Price 價格）；電子書只有「定價：322 元」 */
  const sale = textOf(p.querySelector('.SalePrice .Price'));
  const img = p.querySelector('.CoverBox img');
  return {
    title: textOf(p.querySelector('.Title h3')) || textOf(link),
    author: [...p.querySelectorAll('.Author a')].map(textOf).join('、'),
    price: toNumber(sale || textOf(p.querySelector('.PriceCart')).match(/([\d,]+)\s*元/)?.[1]),
    listPrice: null,
    discount: sale ? textOf(p.querySelector('.SalePrice .Disc')) : '',
    format: /電子書/.test(pack) ? '電子書' : '紙本',
    url: absUrl(link?.getAttribute('href'), BASE),
    cover: absUrl(img?.getAttribute('data-src') || img?.getAttribute('src'), BASE),
    note: '',
  };
}).filter((x) => x.title && x.url);

export default {
  id: 'sanmin',
  name: '三民',
  /* ct=k 是「全部」欄位 */
  searchUrl: (q) => BASE + 'search?' + new URLSearchParams({ ct: 'k', qu: q }),
  async search(q, signal) {
    return parse(await fetchDoc(this.searchUrl(q), signal));
  },
};
