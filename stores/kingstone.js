// 金石堂：解析搜尋結果頁 HTML，紙本與電子書一起回傳（電子書書名前面有「【電子書】」）
import { absUrl, fetchDoc, textOf, toNumber } from './common.js';

const BASE = 'https://www.kingstone.com.tw/';

/* 分類標籤：「中文書」「英文書」「電子書」「雜誌」… */
const formatOf = (type, title) => {
  if (/電子/.test(type)) return /有聲書/.test(title) ? '有聲書' : '電子書';
  if (/書|雜誌/.test(type)) return '紙本';
  return '其他';
};

export const parse = (doc) => [...doc.querySelectorAll('.division1')].map((row) => {
  const link = row.querySelector('.pdnamebox a');
  const title = textOf(link).replace(/^【電子書】/, '');
  /* 例如「79折特價260元 加入購物車」或「特價330元 電子書」 */
  const buy = textOf(row.querySelector('.buymixbox'));
  const img = row.querySelector('.coverbox picture img') || row.querySelector('.coverbox img');
  return {
    title,
    author: [...row.querySelectorAll('.author a')].map(textOf).join('、'),
    price: toNumber(buy.match(/特價\s*([\d,]+)\s*元/)?.[1]),
    listPrice: null,
    discount: buy.match(/(\d+)\s*折/)?.[1] || '',
    format: formatOf(textOf(row.querySelector('.classbox span')), title),
    url: absUrl(link?.getAttribute('href'), BASE),
    cover: absUrl(img?.getAttribute('src'), BASE),
    note: '',
  };
}).filter((x) => x.title && x.url);

export default {
  id: 'kingstone',
  name: '金石堂',
  searchUrl: (q) => BASE + 'search/key/' + encodeURIComponent(q),
  async search(q, signal) {
    return parse(await fetchDoc(this.searchUrl(q), signal));
  },
};
