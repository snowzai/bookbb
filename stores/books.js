// 博客來：解析搜尋結果頁 HTML，紙本、電子書、有聲書都在同一頁
import { absUrl, fetchDoc, textOf, toNumber } from './common.js';

const BASE = 'https://search.books.com.tw/';

/* 「中文書」「外文書」「雜誌」「中文電子書」「電子雜誌」「有聲書」「影音.課程」… */
const formatOf = (type) => {
  if (/電子/.test(type)) return '電子書';
  if (/有聲書/.test(type)) return '有聲書';
  if (/書|雜誌/.test(type)) return '紙本';
  return '其他';
};

export const parse = (doc) => [...doc.querySelectorAll('div.table-td[id^="prod-itemlist-"]')].map((td) => {
  const id = td.id.replace('prod-itemlist-', '');
  const link = td.querySelector('h4 a');
  /* 例如「優惠價: 79 折, 260 元」或「優惠價: 338 元」 */
  const priceText = textOf(td.querySelector('ul.price'));
  const img = td.querySelector('img');
  return {
    title: link?.getAttribute('title') || textOf(link),
    author: [...td.querySelectorAll('.author a')].map(textOf).join('、'),
    price: toNumber(priceText.match(/([\d,]+)\s*元/)?.[1]),
    listPrice: null,
    discount: priceText.match(/(\d+)\s*折/)?.[1] || '',
    format: formatOf(textOf(td.querySelector('.type p'))),
    url: 'https://www.books.com.tw/products/' + id,
    cover: absUrl(img?.getAttribute('data-src') || img?.getAttribute('src'), BASE),
    note: '',
  };
}).filter((x) => x.title);

export default {
  id: 'books',
  name: '博客來',
  searchUrl: (q) => BASE + 'search/query/key/' + encodeURIComponent(q) + '/cat/all',
  async search(q, signal) {
    return parse(await fetchDoc(this.searchUrl(q), signal));
  },
};
