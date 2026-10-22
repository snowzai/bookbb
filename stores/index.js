// 比價頁依這個順序顯示；新增書店：在 stores/ 加一個檔案、在這裡登記、manifest.json 加 host_permissions
import books from './books.js';
import eslite from './eslite.js';
import kingstone from './kingstone.js';
import sanmin from './sanmin.js';
import taaze from './taaze.js';
import bookrep from './bookrep.js';
import readmoo from './readmoo.js';

export default [books, eslite, kingstone, sanmin, taaze, bookrep, readmoo];
