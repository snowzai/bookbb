// 商店截圖用：把 compare.html 的內容搬進來，書店請求改回傳示範資料（取自 2026-10 實測的搜尋結果），不會連線到書店
const ESLITE_IMG = '/upload/product/o/2681759319001/ec1760858.jpg';

const FIXTURES = [
  ['search.books.com.tw', `
    <div class="table-td" id="prod-itemlist-0010822522"><img data-src="https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/001/082/25/0010822522.jpg&w=187&h=187"><h4><a title="原子習慣：細微改變帶來巨大成就的實證法則"></a></h4><div class="type"><p>中文書</p></div><p class="author"><a>詹姆斯‧克利爾</a><a>蔡世偉</a></p><ul class="price"><li>優惠價: 79 折, 260 元</li></ul></div>
    <div class="table-td" id="prod-itemlist-E050045330"><img data-src="https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/E05/004/53/E050045330.jpg&w=187&h=187"><h4><a title="原子習慣：細微改變帶來巨大成就的實證法則 (電子書)"></a></h4><div class="type"><p>中文電子書</p></div><p class="author"><a>詹姆斯‧克利爾</a></p><ul class="price"><li>優惠價: 88 折, 203 元</li></ul></div>
    <div class="table-td" id="prod-itemlist-0011045903"><img data-src="https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/001/104/59/0011045903.jpg&w=187&h=187"><h4><a title="原子習慣WORKBOOK【實踐本‧附練習別冊】"></a></h4><div class="type"><p>中文書</p></div><p class="author"><a>詹姆斯‧克利爾</a></p><ul class="price"><li>優惠價: 79 折, 363 元</li></ul></div>
    <div class="table-td" id="prod-itemlist-E070010299"><img data-src="https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/E07/001/02/E070010299.jpg&w=187&h=187"><h4><a title="原子習慣 (有聲書)"></a></h4><div class="type"><p>有聲書</p></div><p class="author"><a>詹姆斯‧克利爾</a></p><ul class="price"><li>優惠價: 330 元</li></ul></div>`],
  ['athena.eslite.com', JSON.stringify({ hits: { hit: [
    { fields: { name: '原子習慣: 細微改變帶來巨大成就的實證法則', author: ['詹姆斯．克利爾'], final_price: '260', mprice: '330', is_ebook: false, url: 'https://www.eslite.com/product/1001112702764163', product_photo_url: ESLITE_IMG, status: 'add_to_shopping_cart' } },
    { fields: { name: '原子習慣：細微改變帶來巨大成就的實證法則 (電子書)', author: ['詹姆斯‧克利爾（James Clear）'], final_price: '219', mprice: '231', is_ebook: true, url: 'https://www.eslite.com/product/10072302132682687908008', product_photo_url: '/b2b/newItem/ebook_init/main1_161787.jpg', status: 'add_to_shopping_cart' } },
  ] } })],
  ['www.kingstone.com.tw', `
    <div class="division1"><div class="coverbox"><picture><img src="https://assets.kingstone.com.tw/prodassets/fd32b_93ca7c8c3d13cdb081d91cee42dcdcm.jpg"></picture></div><div class="classbox"><span>中文書</span></div><h3 class="pdnamebox"><a href="/basic/2011760319040/">原子習慣：細微改變帶來巨大成就的實證法則</a></h3><span class="author"><a>詹姆斯．克利爾</a></span><div class="buymixbox">79折特價260元</div></div>
    <div class="division1"><div class="coverbox"><picture><img src="https://assets.kingstone.com.tw/book/images/product/20117/2011760319040/2011760319040m.jpg"></picture></div><div class="classbox"><span>電子書</span></div><h3 class="pdnamebox"><a href="/basic/2800000104593/">【電子書】原子習慣：細微改變帶來巨大成就的實證法則</a></h3><span class="author"><a>詹姆斯．克利爾</a></span><div class="buymixbox">特價231元</div></div>`],
  ['www.sanmin.com.tw', `
    <div class="sProduct"><div class="CoverBox"><img data-src="https://cdnec.sanmin.com.tw/product_images/986/986175526.jpg"></div><div class="Title"><a href="/product/index/007221735"><h3>原子習慣：細微改變帶來巨大成就的實證法則</h3></a></div><span class="Author"><a>詹姆斯‧克利爾</a></span><span class="Pack">裝訂：平裝</span><div class="PriceCart"><span class="SalePrice"><span class="Disc">79</span><span class="Price">260</span></span></div></div>
    <div class="sProduct"><div class="CoverBox"><img data-src="https://cdnec.sanmin.com.tw/product_images/222/222126774.jpg"></div><div class="Title"><a href="/product/index/013311447"><h3>原子習慣：細微改變帶來巨大成就的實證法則(電子書)</h3></a></div><span class="Author"><a>詹姆斯.克利爾</a></span><span class="Pack">裝訂：電子書</span><div class="PriceCart">定價：231 元</div></div>`],
  ['www.taaze.tw', `
    <div class="media" rel="11100876604" data-title_main="原子習慣：細微改變帶來巨大成就的實證法則" data-listprice_28="330" data-saleprice_28="260" data-saledisc_28="79" data-bindingtype="平裝"><div class="cover_frame" data-bg_url="//media.taaze.tw/showLargeImage.html?sc=11100876604&width=172&height=230"></div><h4><a href="https://www.taaze.tw/products/11100876604.html"></a></h4><div class="author"><a>詹姆斯．克利爾</a></div></div>
    <div class="media" rel="14100044327" data-title_main="原子習慣：細微改變帶來巨大成就的實證法則 (電子書)" data-listprice_28="330" data-saleprice_28="196" data-saledisc_28="59" data-bindingtype="ePub"><div class="cover_frame" data-bg_url="//media.taaze.tw/showLargeImage.html?sc=14100044327&width=172&height=230"></div><h4><a href="https://www.taaze.tw/products/14100044327.html"></a></h4><div class="author"><a>詹姆斯．克利爾</a></div></div>
    <div class="media" rel="11310687791" data-title_main="原子習慣：細微改變帶來巨大成就的實證法則 (二手書)" data-listprice_28="330" data-min_sale_price="166" data-bindingtype="平裝"><div class="cover_frame" data-bg_url="//media.taaze.tw/showLargeImage.html?sc=11100876604&width=172&height=230"></div><h4><a href="https://www.taaze.tw/usedList.html?oid=11100876604"></a></h4><div class="author"><a>詹姆斯．克利爾</a></div></div>`],
  /* 讀書共和國沒有賣這本書 */
  ['www.bookrep.com.tw', '<ul id="re_list"></ul>'],
  ['readmoo.com', `
    <div class="listItem-box"><img data-lazy-original="https://cdn.readmoo.com/cover/fg/8einmi9_210x315.jpg"><div class="caption"><h4><a href="https://readmoo.com/book/210109063000101" title="原子習慣：細微改變帶來巨大成就的實證法則"></a></h4><div class="contributor-info"><a>詹姆斯．克利爾</a></div><span class="our-price" aria-label="電子書 203 元"></span></div></div>
    <div class="listItem-box"><img data-lazy-original="https://cdn.readmoo.com/cover/qh/kmzpvjz_210x315.jpg"><div class="caption"><h4><a href="https://readmoo.com/book/290483166000101" title="原子習慣【有聲書】：細微改變帶來巨大成就的實證法則"></a></h4><div class="contributor-info"><a>詹姆斯．克利爾</a></div><span class="our-price" aria-label="有聲書 290 元"></span></div></div>`],
];

const realFetch = window.fetch.bind(window);
window.fetch = async (url) => {
  const hit = FIXTURES.find(([host]) => String(url).includes(host));
  if (!hit) throw new Error('沒有示範資料：' + url);
  return new Response(hit[1]);
};

/* 版本切換：compare.js 載入時會從 localStorage 讀 */
const params = new URLSearchParams(location.search);
try { localStorage.setItem('bookstore-format', params.get('format') || 'all'); } catch { /* 忽略 */ }

const doc = new DOMParser().parseFromString(await realFetch('../compare.html').then((r) => r.text()), 'text/html');
for (const link of doc.querySelectorAll('link')) {
  document.head.append(Object.assign(document.createElement('link'), { rel: link.rel, href: '../' + link.getAttribute('href') }));
}
document.body.innerHTML = doc.body.innerHTML;

/* 誠品的圖片主機會擋無頭瀏覽器的 User-Agent（一般 Chrome 正常），截圖時改用博客來同一本書、同一版本的封面圖 */
const ESLITE_COVER = {
  [ESLITE_IMG]: 'https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/001/082/25/0010822522.jpg&w=187&h=187',
  '/b2b/newItem/ebook_init/main1_161787.jpg': 'https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/E05/004/53/E050045330.jpg&w=187&h=187',
};
new MutationObserver(() => {
  for (const img of document.querySelectorAll('img[src*="eslite.com"]')) {
    const path = Object.keys(ESLITE_COVER).find((p) => img.src.endsWith(p));
    if (path) img.src = ESLITE_COVER[path];
  }
}).observe(document.body, { childList: true, subtree: true });

await import('../compare.js');
