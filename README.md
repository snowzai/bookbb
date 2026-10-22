# 書比比 BookBB（Chrome 擴充功能）

輸入書名、作者或 ISBN，一次查詢多家書店，上方列出每家最符合的一筆（紙本／電子書分開比），下方按書店分欄列出搜尋結果。

| 書店 | 狀態 | 版本 |
|---|---|---|
| 博客來 | ✅ | 紙本、電子書、有聲書 |
| 誠品 | ✅ | 紙本、電子書 |
| 金石堂 | ✅ | 紙本、電子書、有聲書 |
| 三民 | ✅ | 紙本、電子書 |
| TAAZE 讀冊生活 | ✅ | 紙本、電子書、二手書 |
| 讀書共和國 | ✅ | 紙本（只有集團旗下出版社的書） |
| 讀墨 | ✅ | 電子書、有聲書 |
| Kobo | 暫緩 | — |
| HyRead | 暫緩 | — |

> Kobo、HyRead 的搜尋頁需要先通過 Cloudflare 驗證，暫不支援。之後要加：先用一般 Chrome 確認搜尋頁會不會被擋，再照「新增書店」的步驟加，`manifest.json` 要補 `https://www.kobo.com/*`、`https://ebook.hyread.com.tw/*`。

## 安裝
- **Chrome 線上應用程式商店**：審查中，上架後會補上連結
- **從原始碼安裝**：
  1. 下載或 clone 這個 repo
  2. Chrome 開啟 `chrome://extensions`，右上角打開「開發人員模式」
  3. 按「載入未封裝項目」，選 repo 資料夾（有 `manifest.json` 的那一層）
  4. 建議把「書比比」釘選到工具列（拼圖圖示 → 圖釘）

## 使用
- 按工具列的「書比比」圖示 → 開啟比價頁 → 輸入關鍵字 → Enter
- 在任何網頁選取書名 → 按右鍵 →「用「…」比價」
- 比價頁網址帶 `?q=關鍵字`，可以直接加書籤或分享給自己
- 「全部／紙本／電子書」切換只影響顯示，不會重新查詢；會記住上次的選擇

## 注意
- 摘要表是自動挑的：ISBN 查詢取第一筆；書名查詢優先取「書名開頭相同」、其次「書名包含查詢字」的第一筆，不一定是同一本書，請點進去確認
- 實體書和電子書的 ISBN 不同，用 ISBN 查不一定查得到電子書，用書名查比較完整
- 價格是搜尋結果上的售價，不含點數、折價券、會員折扣
- 書店出現 Cloudflare 驗證時，該欄會顯示「開啟書店」按鈕：開啟後完成驗證，再按「重新查詢」
- 本擴充功能為個人開發的工具，與各書店無合作或隸屬關係

## 隱私
- 不蒐集任何資料、沒有自己的伺服器、不使用分析或追蹤服務
- 查詢關鍵字只會由你的瀏覽器直接送到各書店網站
- 完整內容：[隱私權政策](store/privacy-policy.md)

## 檔案
| 檔案 | 用途 |
|---|---|
| `manifest.json` | 擴充功能設定、權限 |
| `background.js` | 工具列圖示、右鍵選單 |
| `compare.html` / `compare.js` / `compare.css` | 比價頁 |
| `stores/index.js` | 書店清單與顯示順序 |
| `stores/<書店>.js` | 各書店的查詢與解析，每家一個檔 |
| `stores/common.js` | 共用：抓取、Cloudflare 驗證偵測、數字解析 |
| `icons/icon-{16,32,48,128}.png` | 擴充功能圖示（工具列、擴充功能清單、比價頁分頁圖示） |
| `tools/make-icons.mjs` | 產生上面的圖示：`node tools/make-icons.mjs`（只用 Node 內建模組，會覆蓋 `icons/` 裡的檔案） |
| `tools/pack.mjs` | 打包上架用的 zip：先調高 `manifest.json` 的 `version`，再執行 `node tools/pack.mjs` → `dist/bookbb-<版本>.zip` |
| `tools/shot.html` / `tools/shot.js` | 商店截圖用的示範頁：載入真正的比價頁，書店請求改用示範資料 |
| `tools/promo.html` | 商店小型宣傳圖（440×280）的版面 |
| `store/privacy-policy.md` | 隱私權政策（商店頁連結到這裡） |
| `dist/` | 打包產生的 zip（不進版控，可隨時重新產生） |

## 修改
- 不需要 build，改完到 `chrome://extensions` 按擴充功能上的重新載入圖示即可
- 只調樣式時可以不用載入擴充功能：在 repo 資料夾執行 `python -m http.server 8765`，開 `http://localhost:8765/compare.html` 看版面（一般網頁沒有跨站權限，除了誠品以外的書店都會查詢失敗）；`http://localhost:8765/tools/shot.html?q=原子習慣` 則會用示範資料顯示完整畫面
- 書店改版導致某一欄壞掉，只要改那家的 `stores/<書店>.js`
- 新增書店：在 `stores/` 加檔案（匯出 `id`、`name`、`searchUrl(q)`、`search(q, signal)`）→ 在 `stores/index.js` 登記 → `manifest.json` 加 `host_permissions`
- `search()` 回傳的每筆：`{ title, author, price, listPrice, discount?, format: '紙本'|'電子書'|'有聲書'|'二手書'|'其他', url, cover, note }`
- 摘要表只比「紙本」「電子書」；有聲書、二手書只出現在下方各書店的欄位（「全部」模式）

## 授權
[MIT License](LICENSE)
