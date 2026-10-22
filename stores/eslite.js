// 誠品：官網前端用的搜尋 API，回 JSON，紙本與電子書一起回傳
import { fetchJson, toNumber } from './common.js';

const API = 'https://athena.eslite.com/api/v2/search';
const IMG = 'https://s2.eslite.com/unsafe/fit-in/x240/filters:format(webp)/s.eslite.com';

export const parse = (json) => (json.hits?.hit || []).map(({ fields: f }) => ({
  title: f.name,
  author: (f.author || []).join('、'),
  price: toNumber(f.final_price),
  listPrice: toNumber(f.mprice),
  format: f.is_ebook ? '電子書' : '紙本',
  url: f.url,
  cover: f.product_photo_url ? IMG + f.product_photo_url : '',
  note: f.status === 'add_to_shopping_cart' ? '' : '目前無法購買',
}));

export default {
  id: 'eslite',
  name: '誠品',
  searchUrl: (q) => 'https://www.eslite.com/Search?keyword=' + encodeURIComponent(q),
  async search(q, signal) {
    const params = new URLSearchParams({ q, size: '20', start: '0' });
    return parse(await fetchJson(API + '?' + params, signal));
  },
};
