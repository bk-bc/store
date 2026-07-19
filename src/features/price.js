// --- 價格頁面 ---
let currentPriceItemIndex = null;
let currentBatchPriceItemIndex = null;
let completedBatchPriceIndexes = new Set();

function getMissingPriceItems() {
    return db
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => normalizePrice(item.Price) === '0');
}

function renderPrice() {
    switchPriceMode('random');
}

function switchPriceMode(mode) {
    const isBatch = mode === 'batch';
    document.getElementById('priceRandomPanel').style.display = isBatch ? 'none' : 'block';
    document.getElementById('priceBatchPanel').style.display = isBatch ? 'block' : 'none';
    document.getElementById('priceModeRandom').classList.toggle('active', !isBatch);
    document.getElementById('priceModeBatch').classList.toggle('active', isBatch);

    if (isBatch) {
        renderPriceBatchSelected();
        document.getElementById('priceBatchInput').focus();
    } else {
        renderRandomPrice();
    }
}

function renderRandomPrice() {
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
    renderRandomPrice();
}

function renderPriceBatchSearch(resetCompleted = false) {
    const input = document.getElementById('priceBatchInput');
    const resDiv = document.getElementById('priceBatchSearchResult');
    const lines = input.value.split('\n').map(line => line.trim()).filter(Boolean);
    document.getElementById('priceBatchStatus').innerText = '';
    if (resetCompleted) completedBatchPriceIndexes = new Set();

    currentBatchPriceItemIndex = null;
    renderPriceBatchSelected();

    if (lines.length === 0) {
        resDiv.innerHTML = '<div class="header-stats">請先輸入 ID 或 Name。</div>';
        return;
    }

    const seenIndexes = new Set();
    const matches = [];
    const missing = [];

    lines.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        const foundItems = db
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) =>
                (item.ID && item.ID.toLowerCase().includes(lowerKeyword)) ||
                (item.Name && item.Name.toLowerCase().includes(lowerKeyword))
            );

        if (foundItems.length > 0) {
            foundItems.forEach(({ item, idx }) => {
                if (!seenIndexes.has(idx) && !completedBatchPriceIndexes.has(idx)) {
                    seenIndexes.add(idx);
                    matches.push({ item, idx });
                }
            });
        } else {
            missing.push(keyword);
        }
    });

    let html = '';
    if (matches.length > 0) {
        html += matches.map(({ item, idx }) => `
            <button type="button" onclick="selectPriceBatchItem(${idx})">
                <span>${item.Name}</span>
                <span>價格: $${normalizePrice(item.Price)}</span>
            </button>
        `).join('');
    }
    if (missing.length > 0) {
        html += `<div class="header-stats">未找到：${missing.join('、')}</div>`;
    }
    resDiv.innerHTML = html || '<div class="header-stats">沒有找到符合資料。</div>';
}

function selectPriceBatchItem(dbIdx) {
    currentBatchPriceItemIndex = dbIdx;
    document.getElementById('priceBatchStatus').innerText = '';
    document.getElementById('priceBatchEditPanel').style.display = 'block';
    renderPriceBatchSelected();
}

function renderPriceBatchSelected() {
    const selectedDiv = document.getElementById('priceBatchSelected');
    const editPanel = document.getElementById('priceBatchEditPanel');
    const input = document.getElementById('priceBatchPriceInput');
    const item = db[currentBatchPriceItemIndex];

    if (!selectedDiv || !editPanel) return;
    if (!item) {
        selectedDiv.style.display = 'none';
        editPanel.style.display = 'none';
        return;
    }

    selectedDiv.style.display = 'block';
    selectedDiv.innerHTML = `<strong>已選擇</strong><br>${item.ID}<br>${item.Name}<br>目前價格：$${normalizePrice(item.Price)}`;
    if (input) {
        input.value = normalizePrice(item.Price) === '0' ? '' : normalizePrice(item.Price);
        input.focus();
    }
}

function updateBatchPrice() {
    const input = document.getElementById('priceBatchPriceInput');
    const item = db[currentBatchPriceItemIndex];
    if (!input || !item) return;

    const value = input.value.trim();
    if (!value) return alert('請輸入價格');

    const updatedText = `已更新：${item.ID} $${value}`;
    item.Price = value;
    completedBatchPriceIndexes.add(currentBatchPriceItemIndex);
    saveData();
    renderPriceBatchSearch();
    document.getElementById('priceBatchStatus').innerText = updatedText;
}
