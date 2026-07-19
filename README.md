# 智慧零售管理系統拆分版

這個版本把原本單一 `index.html` 拆成網站外殼、共用程式、功能清單，以及每個功能自己的畫面與程式檔。結構適合放到 GitHub Pages。

## 結構

- `index.html`：網站外殼，只保留 header、導覽位置與功能載入容器。
- `src/styles.css`：原本的全部樣式。
- `src/app.js`：共用資料狀態、匯入匯出、切換頁籤、條碼與合併工具。
- `src/data/features.js`：功能清單，控制導覽順序、功能畫面檔與功能程式檔。
- `src/features/add.html` / `add.js`：新增，包含一般新增與加價格。
- `src/features/search.html` / `search.js`：搜尋，畫面結果會顯示價格，列印時隱藏價格。
- `src/features/error.html` / `error.js`：勘誤。
- `src/features/qa.html` / `qa.js`：品保。
- `src/features/price.html` / `price.js`：價格，包含隨機補價與批量搜尋更新。
- `src/features/big-event.html` / `big-event.js`：大檔活動，包含建檔、折扣、訂單、精算與清除；`Event_S` 數字為一般活動，`A-Z` 為加購品，精算會混搭必買品並用勾選加購品補滿額。
- `src/features/classify.html` / `classify.js`：分類。
- `src/features/activity.html` / `activity.js`：活動。

## 新增功能的做法

1. 新增 `src/features/新功能ID.html`，放該功能的畫面。
2. 新增 `src/features/新功能ID.js`，放該功能自己的函式。
3. 在 `src/data/features.js` 加一筆：

```js
{ id: '新功能ID', label: '顯示名稱', html: 'src/features/新功能ID.html', script: 'src/features/新功能ID.js' }
```

4. 如果切到該頁需要自動刷新，在 `src/app.js` 的 `switchTab` 補一行初始化呼叫。

## 本機預覽

因為外殼會載入獨立的功能檔案，建議用本機伺服器或 GitHub Pages 開啟，不要直接雙擊 `index.html`。
