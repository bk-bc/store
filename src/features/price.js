// --- 價格頁面 ---
let currentPriceItemIndex = null;

function getMissingPriceItems() {
    return db
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => normalizePrice(item.Price) === '0');
}

function renderPrice() {
    const statsDiv = document.getElementById('priceStats');
    const resDiv = document.getElementById('priceResult');
    const missingItems = getMissingPriceItems();

    if (!statsDiv || !resDiv) return;
    statsDiv.innerText = `尚未建價格：${missingItems.length} 筆`;

    if (missingItems.length === 0) {
        currentPriceItemIndex = null;
        resDiv.innerHTML = '<div class="card">目前沒有 Price 為 0 的項目。</div>';
        return;
    }

    const pick = missingItems[Math.floor(Math.random() * missingItems.length)];
    currentPriceItemIndex = pick.idx;
    const item = pick.item;

    resDiv.innerHTML = `
        <div class="card">
            <div class="card-title">${item.Name}</div>
            <div class="card-sub">分類: ${item.C1} | 目前價格: ${normalizePrice(item.Price)}</div>
            <div class="barcode-wrapper"><svg id="priceBarcode" class="barcode"></svg></div>
            <input type="text" id="priceInput" inputmode="decimal" placeholder="輸入價格" autocomplete="off">
            <button class="btn-primary" onclick="updatePrice()" style="width:100%;">修正</button>
        </div>
    `;
    renderBarcode('priceBarcode', item.ID, item.Type);
    document.getElementById('priceInput').focus();
}

function updatePrice() {
    const input = document.getElementById('priceInput');
    const item = db[currentPriceItemIndex];
    if (!input || !item) return;

    const value = input.value.trim();
    if (!value) return alert('請輸入價格');

    item.Price = value;
    saveData();
    renderPrice();
}
