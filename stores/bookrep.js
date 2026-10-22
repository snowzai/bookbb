// 讀書共和國：解析搜尋結果頁 HTML（只賣集團旗下出版社的紙本書，電子書頁面是連到其他書店；一頁 10 筆）
import { absUrl, fetchDoc, textOf, toNumber } from './common.js';

const BASE = 'https://www.bookrep.com.tw/';

export const parse = (doc) => [...doc.querySelectorAll('#re_list > li.list_li')].map((li) => {
  const link = li.querySelector('h3 a');
  /* 「定價：NT$ 650」「優惠價：NT$ 585」 */
  const price = toNumber(textOf(li.querySelector('.red')));
  const listPrice = toNumber(textOf(li.querySelector('.del')).replace(/^定價：NT\$\s*/, ''));
  return {
    title: textOf(link),
    author: textOf(li.querySelector('.author_n')),
    price: price ?? listPrice,
    listPrice,
    format: '紙本',
    url: absUrl(link?.getAttribute('href'), BASE),
    cover: absUrl(li.querySelector('.re_left img')?.getAttribute('src'), BASE),
    note: '',
  };
}).filter((x) => x.title && x.url);

export default {
  id: 'bookrep',
  name: '讀書共和國',
  searchUrl: (q) => BASE + '?' + new URLSearchParams({ md: 'gwindex', cl: 'book', at: 'search', query: q, search_select: '' }),
  async search(q, signal) {
    return parse(await fetchDoc(this.searchUrl(q), signal));
  },
};
