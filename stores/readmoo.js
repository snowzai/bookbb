// 讀墨：解析搜尋結果頁 HTML（只有電子書與有聲書）
import { absUrl, fetchDoc, textOf, toNumber } from './common.js';

const BASE = 'https://readmoo.com/';

export const parse = (doc) => [...doc.querySelectorAll('.listItem-box')].map((box) => {
  const link = box.querySelector('.caption h4 a');
  /* aria-label 例如「電子書 203 元」「有聲書 330 元」 */
  const label = box.querySelector('.our-price')?.getAttribute('aria-label') || '';
  const img = box.querySelector('img');
  return {
    title: link?.getAttribute('title') || textOf(link),
    author: [...box.querySelectorAll('.contributor-info a')].map(textOf).join('、'),
    price: toNumber(label),
    listPrice: null,
    format: label.startsWith('有聲書') ? '有聲書' : '電子書',
    url: absUrl(link?.getAttribute('href'), BASE),
    cover: img?.getAttribute('data-lazy-original') || '',
    note: '',
  };
}).filter((x) => x.url);

export default {
  id: 'readmoo',
  name: '讀墨',
  searchUrl: (q) => BASE + 'search/keyword?q=' + encodeURIComponent(q),
  async search(q, signal) {
    return parse(await fetchDoc(this.searchUrl(q), signal));
  },
};
