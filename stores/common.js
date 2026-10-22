// 各書店共用的抓取與解析工具

// 書店回 Cloudflare 驗證頁時丟這個，畫面會改顯示「開啟書店完成驗證」
export class ChallengeError extends Error {
  constructor() {
    super('需要先通過書店的安全驗證');
    this.name = 'ChallengeError';
  }
}

const isChallenge = (res, body) =>
  res.headers.get('cf-mitigated') === 'challenge' ||
  ((res.status === 403 || res.status === 503) && /challenges\.cloudflare\.com|cdn-cgi\/challenge-platform/.test(body));

// 帶著使用者在該書店的 cookie 送出請求（Cloudflare 驗證通過的紀錄也在 cookie 裡）
export const fetchText = async (url, signal) => {
  const res = await fetch(url, { credentials: 'include', signal });
  const body = await res.text();
  if (isChallenge(res, body)) throw new ChallengeError();
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return body;
};

export const fetchJson = async (url, signal) => JSON.parse(await fetchText(url, signal));

export const fetchDoc = async (url, signal) =>
  new DOMParser().parseFromString(await fetchText(url, signal), 'text/html');

// "NT$ 1,203" / "優惠價: 79 折, 260 元" 這類字串取第一個數字；取不到回 null
export const toNumber = (s) => {
  const m = String(s ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

// DOMParser 產生的文件沒有網址，相對路徑要自己對書店網址展開
export const absUrl = (href, base) => {
  if (!href) return '';
  try { return new URL(href, base).href; } catch { return ''; }
};
