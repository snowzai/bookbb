// 按工具列圖示 → 開比價頁；選取文字後按右鍵 → 用選取的文字比價
const MENU_ID = 'compare-selection';

const openCompare = (q) => {
  const url = chrome.runtime.getURL('compare.html') + (q ? '?q=' + encodeURIComponent(q.trim()) : '');
  return chrome.tabs.create({ url });
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: '用「%s」比價', contexts: ['selection'] });
});

chrome.action.onClicked.addListener(() => openCompare(''));

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_ID) openCompare(info.selectionText || '');
});
