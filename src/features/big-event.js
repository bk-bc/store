// --- 大檔活動 ---
let currentBigEventMode = 'create';
let currentBigEventDiscountIndex = null;
let currentBigEventMultiplier = '';

function renderBigEvent() {
    switchBigEventMode('create');
}

function switchBigEventMode(mode) {
    currentBigEventMode = mode;
    const panels = {
        create: 'bigEventCreatePanel',
        discount: 'bigEventDiscountPanel',
        order: 'bigEventOrderPanel',
        settlement: 'bigEventSettlementPanel',
    };
    Object.entries(panels).forEach(([key, id]) => {
        document.getElementById(id).style.display = key === mode ? 'block' : 'none';
    });
    document.getElementById('bigEventModeCreate').classList.toggle('active', mode === 'create');
    document.getElementById('bigEventModeDiscount').classList.toggle('active', mode === 'discount');
    document.getElementById('bigEventModeOrder').classList.toggle('active', mode === 'order');
    document.getElementById('bigEventModeSettlement').classList.toggle('active', mode === 'settlement');

    if (mode === 'create') {
        switchBigEventCreateMode('search');
        populateBigEventActivitySelect();
    }
    if (mode === 'discount') renderBigEventDiscount();
    if (mode === 'order') renderBigEventOrder();
    if (mode === 'settlement') renderBigEventSettlementReady();
}

function switchBigEventCreateMode(mode) {
    const isActivity = mode === 'activity';
    const isAddon = mode === 'addon';
    document.getElementById('bigEventSearchCreatePanel').style.display = (!isActivity && !isAddon) ? 'block' : 'none';
    document.getElementById('bigEventActivityCreatePanel').style.display = isActivity ? 'block' : 'none';
    document.getElementById('bigEventAddonCreatePanel').style.display = isAddon ? 'block' : 'none';
    document.getElementById('bigEventCreateSearchMode').classList.toggle('active', !isActivity && !isAddon);
    document.getElementById('bigEventCreateActivityMode').classList.toggle('active', isActivity);
    document.getElementById('bigEventCreateAddonMode').classList.toggle('active', isAddon);
    document.getElementById('bigEventCreateStatus').innerText = '';
    if (isActivity) populateBigEventActivitySelect();
}

function getNextBigEventSeq() {
    const nums = db
        .map(item => parseInt(normalizeTextField(item.Event_S), 10))
        .filter(num => Number.isInteger(num) && num >= 0);
    return nums.length ? Math.max(...nums) + 1 : 0;
}

function assignBigEventSequence(items) {
    let seq = getNextBigEventSeq();
    let added = 0;
    items.forEach(item => {
        normalizeBigEventFields(item);
        if (item.Event_S) return;
        item.Event_S = String(seq).padStart(4, '0');
        seq++;
        added++;
    });
    if (added > 0) saveData();
    return added;
}

function getNextBigEventAddonSeq() {
    const used = new Set(db.map(item => normalizeTextField(item.Event_S)).filter(value => /^[A-Z]$/.test(value)));
    for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code);
        if (!used.has(letter)) return letter;
    }
    return null;
}

function assignBigEventAddonSequence(items) {
    let added = 0;
    items.forEach(item => {
        normalizeBigEventFields(item);
        if (item.Event_S) return;
        const seq = getNextBigEventAddonSeq();
        if (!seq) return;
        item.Event_S = seq;
        item.Event_N = '';
        added++;
    });
    if (added > 0) saveData();
    return added;
}

function findBigEventItemsByLines(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const seen = new Set();
    const matches = [];
    const missing = [];

    lines.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        const foundItems = db.filter(item =>
            (item.ID && item.ID.toLowerCase().includes(lowerKeyword)) ||
            (item.Name && item.Name.toLowerCase().includes(lowerKeyword))
        );
        if (foundItems.length === 0) {
            missing.push(keyword);
            return;
        }
        foundItems.forEach(item => {
            const idx = db.indexOf(item);
            if (!seen.has(idx)) {
                seen.add(idx);
                matches.push(item);
            }
        });
    });

    return { matches, missing, lineCount: lines.length };
}

function addBigEventBySearch() {
    const result = findBigEventItemsByLines(document.getElementById('bigEventSearchInput').value);
    if (result.lineCount === 0) return alert('請先輸入 ID 或 Name');
    const added = assignBigEventSequence(result.matches);
    document.getElementById('bigEventCreateStatus').innerText = `搜尋新增完成：建檔 ${added} 筆${result.missing.length ? `，未找到 ${result.missing.length} 筆` : ''}`;
}

function addBigEventAddons() {
    const result = findBigEventItemsByLines(document.getElementById('bigEventAddonInput').value);
    if (result.lineCount === 0) return alert('請先輸入 ID 或 Name');
    const added = assignBigEventAddonSequence(result.matches);
    document.getElementById('bigEventCreateStatus').innerText = `加購新增完成：建檔 ${added} 筆${result.missing.length ? `，未找到 ${result.missing.length} 筆` : ''}`;
}

function getCleanEventName(eventName) {
    return eventName.replace(/_\d{3}$/, '');
}

function getBigEventNames() {
    const events = new Set();
    db.forEach(item => {
        if (!item.Event) return;
        item.Event.split('/').forEach(eventName => {
            if (eventName) events.add(getCleanEventName(eventName));
        });
    });
    return [...events].sort((a, b) => a.localeCompare(b, 'zh-TW'));
}

function populateBigEventActivitySelect() {
    const select = document.getElementById('bigEventActivitySelect');
    if (!select) return;
    const events = getBigEventNames();
    let html = '<option value="">選擇活動</option>';
    events.forEach(eventName => html += `<option value="${eventName}">${eventName}</option>`);
    select.innerHTML = html;
}

function addBigEventByActivity() {
    const eventName = document.getElementById('bigEventActivitySelect').value;
    if (!eventName) return alert('請先選擇活動');
    const items = db.filter(item =>
        item.Event && item.Event.split('/').some(eventItem => getCleanEventName(eventItem) === eventName)
    ).sort((a, b) => getBigEventSourceEventSeq(a, eventName) - getBigEventSourceEventSeq(b, eventName));
    const added = assignBigEventSequence(items);
    document.getElementById('bigEventCreateStatus').innerText = `活動新增完成：建檔 ${added} 筆`;
}

function getBigEventSourceEventSeq(item, eventName) {
    const eventItem = item.Event.split('/').find(value => getCleanEventName(value) === eventName) || '';
    const match = eventItem.match(/_(\d{3})$/);
    return match ? parseInt(match[1], 10) : 999;
}

function getBigEventItems() {
    return db
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => normalizeTextField(item.Event_S))
        .sort((a, b) => normalizeTextField(a.item.Event_S).localeCompare(normalizeTextField(b.item.Event_S)));
}

function isBigEventAddon(item) {
    return /^[A-Z]$/.test(normalizeTextField(item.Event_S));
}

function getBigEventRequiredItems() {
    return getBigEventItems().filter(({ item }) => !isBigEventAddon(item));
}

function getBigEventAddonItems() {
    return getBigEventItems().filter(({ item }) => isBigEventAddon(item));
}

function renderBigEventDiscount() {
    currentBigEventDiscountIndex = null;
    currentBigEventMultiplier = '';
    renderBigEventDiscountSelected();
    const targetItems = getBigEventItems().filter(({ item }) =>
        !normalizeTextField(item.Event_P) && !normalizeTextField(item.Event_M)
    );
    document.getElementById('bigEventDiscountStats').innerText = `待建立折扣：${targetItems.length} 筆`;
    const result = document.getElementById('bigEventDiscountResult');
    result.innerHTML = targetItems.map(({ item, idx }) => `
        <button type="button" onclick="selectBigEventDiscountItem(${idx})">
            <span>${item.Event_S} ${item.Name}</span>
            <span>$${normalizePrice(item.Price)}</span>
        </button>
    `).join('') || '<div class="header-stats">沒有待建立折扣的項目。</div>';
}

function selectBigEventDiscountItem(dbIdx) {
    currentBigEventDiscountIndex = dbIdx;
    currentBigEventMultiplier = normalizeTextField(db[dbIdx].Event_M);
    document.getElementById('bigEventDiscountStatus').innerText = '';
    renderBigEventDiscountSelected();
}

function renderBigEventDiscountSelected() {
    const selected = document.getElementById('bigEventDiscountSelected');
    const panel = document.getElementById('bigEventDiscountEditPanel');
    const item = db[currentBigEventDiscountIndex];
    if (!selected || !panel) return;
    if (!item) {
        selected.style.display = 'none';
        panel.style.display = 'none';
        return;
    }
    selected.style.display = 'block';
    panel.style.display = 'block';
    selected.innerHTML = `<strong>已選擇</strong><br>${item.Event_S} ${item.ID}<br>${item.Name}<br>目前價格：$${normalizePrice(item.Price)}`;
    document.getElementById('bigEventDiscountPriceInput').value = normalizeTextField(item.Event_P);
    renderBigEventMultiplierButtons();
    document.getElementById('bigEventDiscountPriceInput').focus();
}

function renderBigEventMultiplierButtons() {
    document.getElementById('bigEventMultiplierButtons').innerHTML = Array.from({ length: 9 }, (_, i) => i + 1).map(num => `
        <button type="button" class="${String(num) === currentBigEventMultiplier ? 'active' : ''}" onclick="selectBigEventMultiplier('${num}')">${num}</button>
    `).join('');
}

function selectBigEventMultiplier(value) {
    currentBigEventMultiplier = value;
    renderBigEventMultiplierButtons();
}

function createBigEventDiscount() {
    const item = db[currentBigEventDiscountIndex];
    const input = document.getElementById('bigEventDiscountPriceInput');
    if (!item || !input) return;
    const eventP = input.value.trim();
    if (!eventP) return alert('請輸入折扣數字');
    if (!currentBigEventMultiplier) return alert('請選擇 1~9');
    item.Event_P = eventP;
    item.Event_M = currentBigEventMultiplier;
    saveData();
    document.getElementById('bigEventDiscountStatus').innerText = `已建立：${item.Event_S}`;
    renderBigEventDiscount();
}

function renderBigEventOrder() {
    const requiredItems = getBigEventRequiredItems();
    const addonItems = getBigEventAddonItems();
    document.getElementById('bigEventOrderStats').innerText = `訂單項目：${requiredItems.length} 筆 | 加購品：${addonItems.length} 筆`;
    const result = document.getElementById('bigEventOrderResult');
    const requiredHtml = requiredItems.map(({ item, idx }) => {
        const multiplier = parseFloat(normalizeTextField(item.Event_M)) || 0;
        const savedOrder = normalizeTextField(item.Event_N);
        const initialCalc = savedOrder ? (parseFloat(savedOrder) || 0) * multiplier : 0;
        return `
            <div class="card big-event-order-card">
                <div class="big-event-order-info">
                    <div class="big-event-order-title">${item.Event_S} ${item.Name}</div>
                    <div class="big-event-order-meta">折扣 ${normalizeTextField(item.Event_P) || '未建'} | 倍數 ${normalizeTextField(item.Event_M) || '未建'} | 已訂 ${savedOrder || '未建'}</div>
                </div>
                <div class="big-event-order-controls">
                    <input type="number" min="0" step="1" class="big-event-order-input" data-idx="${idx}" value="${savedOrder}" oninput="updateBigEventOrderCalc(${idx})" placeholder="數量">
                    <div class="big-event-order-calc">= <span id="bigEventOrderCalc_${idx}">${initialCalc}</span></div>
                </div>
            </div>
        `;
    }).join('');
    const addonHtml = addonItems.map(({ item, idx }) => {
        const checked = normalizeTextField(item.Event_N) === 'Y' ? 'checked' : '';
        return `
            <label class="card big-event-order-card big-event-addon-card">
                <div class="big-event-order-info">
                    <div class="big-event-order-title">${item.Event_S} ${item.Name}</div>
                    <div class="big-event-order-meta">加購 | 單組 ${normalizeTextField(item.Event_M) || '未建'} 件 | $${normalizeTextField(item.Event_P) || normalizePrice(item.Price)}</div>
                </div>
                <input type="checkbox" class="big-event-addon-checkbox" data-idx="${idx}" ${checked}>
            </label>
        `;
    }).join('');
    result.innerHTML = `
        ${requiredHtml || '<div class="card">目前沒有一般大檔訂單項目。</div>'}
        ${addonHtml ? '<div class="header-stats">可用加購品</div>' + addonHtml : ''}
    `;
}

function updateBigEventOrderCalc(dbIdx) {
    const input = document.querySelector(`.big-event-order-input[data-idx="${dbIdx}"]`);
    const calc = document.getElementById(`bigEventOrderCalc_${dbIdx}`);
    const item = db[dbIdx];
    if (!input || !calc || !item) return;
    const orderValue = parseFloat(input.value) || 0;
    const multiplier = parseFloat(normalizeTextField(item.Event_M)) || 0;
    calc.innerText = orderValue * multiplier;
}

function saveBigEventOrders() {
    let saved = 0;
    document.querySelectorAll('.big-event-order-input').forEach(input => {
        const item = db[parseInt(input.dataset.idx, 10)];
        if (!item) return;
        item.Event_N = normalizeTextField(input.value);
        saved++;
    });
    document.querySelectorAll('.big-event-addon-checkbox').forEach(input => {
        const item = db[parseInt(input.dataset.idx, 10)];
        if (!item) return;
        item.Event_N = input.checked ? 'Y' : '';
        saved++;
    });
    saveData();
    document.getElementById('bigEventOrderStatus').innerText = `已更新訂單：${saved} 筆`;
    renderBigEventOrder();
}

function renderBigEventSettlementReady() {
    document.getElementById('bigEventSettlementSummary').innerText = '';
    document.getElementById('bigEventSettlementResult').innerHTML = '';
}

function getBigEventSettlementRows() {
    return getBigEventRequiredItems().map(({ item, idx }) => ({
        idx,
        item,
        seq: normalizeTextField(item.Event_S),
        name: item.Name,
        packPrice: Math.round(parseFloat(normalizeTextField(item.Event_P)) || parseFloat(normalizePrice(item.Price)) || 0),
        packQty: parseFloat(normalizeTextField(item.Event_M)) || 1,
        demandPacks: parseInt(normalizeTextField(item.Event_N), 10) || 0,
    })).filter(row => row.demandPacks > 0);
}

function getBigEventSettlementAddons() {
    return getBigEventAddonItems().map(({ item, idx }) => ({
        idx,
        item,
        seq: normalizeTextField(item.Event_S),
        name: item.Name,
        packPrice: Math.round(parseFloat(normalizeTextField(item.Event_P)) || parseFloat(normalizePrice(item.Price)) || 0),
        packQty: parseFloat(normalizeTextField(item.Event_M)) || 1,
        enabled: normalizeTextField(item.Event_N) === 'Y',
    })).filter(row => row.enabled && row.packPrice > 0);
}

function calculateBigEventSettlement() {
    const threshold = Math.round(parseFloat(document.getElementById('bigEventThresholdInput').value));
    const targetOrders = parseInt(document.getElementById('bigEventTargetOrdersInput').value, 10);
    const summary = document.getElementById('bigEventSettlementSummary');
    const result = document.getElementById('bigEventSettlementResult');
    if (!threshold || threshold <= 0) return alert('請輸入有效滿額門檻');
    if (!targetOrders || targetOrders <= 0) return alert('請輸入有效滿額訂單數');

    const rows = getBigEventSettlementRows();
    const addons = getBigEventSettlementAddons();
    if (rows.length === 0) {
        summary.innerText = '沒有可精算的訂單需求。請先在訂單頁更新 Event_N。';
        result.innerHTML = '';
        return;
    }

    const orders = Array.from({ length: targetOrders }, (_, index) => ({
        title: `滿額訂單 ${index + 1}`,
        lines: [],
        total: 0,
        gift: true,
    }));
    const remainder = { title: '未滿額剩餘訂單', lines: [], total: 0, gift: false };
    let currentOrder = 0;

    rows.forEach(row => {
        let remaining = row.demandPacks;
        while (remaining > 0) {
            const order = currentOrder < targetOrders ? orders[currentOrder] : remainder;
            const room = currentOrder < targetOrders ? Math.max(0, threshold - order.total) : Infinity;
            let usePacks = currentOrder < targetOrders ? Math.min(remaining, Math.max(1, Math.floor(room / row.packPrice))) : remaining;
            if (currentOrder < targetOrders && order.total + (usePacks * row.packPrice) < threshold && usePacks < remaining) {
                usePacks++;
            }
            addBigEventSettlementLine(order, row, usePacks, false);
            remaining -= usePacks;
            if (currentOrder < targetOrders && order.total >= threshold) currentOrder++;
        }
    });

    orders.forEach(order => {
        if (order.total >= threshold) return;
        const addonResult = fillBigEventOrderWithAddons(order, threshold, addons);
        addonResult.forEach(line => order.lines.push(line));
        order.total = order.lines.reduce((sum, line) => sum + line.amount, 0);
    });

    const fullOrders = orders.filter(order => order.total >= threshold).length;
    const extraAmount = orders.reduce((sum, order) => sum + order.lines.filter(line => line.addon).reduce((lineSum, line) => lineSum + line.amount, 0), 0);
    const overAmount = orders.reduce((sum, order) => sum + Math.max(0, order.total - threshold), 0);
    const requiredAmount = rows.reduce((sum, row) => sum + (row.packPrice * row.demandPacks), 0);

    summary.innerText = `滿額 ${fullOrders}/${targetOrders} 筆 | 必買 $${requiredAmount} | 加購 $${extraAmount} | 超額 $${overAmount}`;
    result.innerHTML = [...orders, remainder].filter(order => order.lines.length > 0).map(order => renderBigEventSettlementOrder(order, threshold)).join('');
}

function addBigEventSettlementLine(order, row, packs, addon) {
    if (packs <= 0) return;
    const amount = row.packPrice * packs;
    order.lines.push({
        seq: row.seq,
        name: row.name,
        packs,
        qty: row.packQty * packs,
        amount,
        addon,
    });
    order.total += amount;
}

function fillBigEventOrderWithAddons(order, threshold, addons) {
    const deficit = threshold - order.total;
    if (deficit <= 0 || addons.length === 0) return [];
    const maxPrice = Math.max(...addons.map(addon => addon.packPrice));
    const limit = Math.ceil((deficit + maxPrice) * 2);
    const dp = Array.from({ length: limit + 1 }, () => null);
    dp[0] = [];
    for (let amount = 0; amount <= limit; amount++) {
        if (!dp[amount]) continue;
        addons.forEach(addon => {
            const next = amount + addon.packPrice;
            if (next <= limit && !dp[next]) {
                dp[next] = [...dp[amount], addon];
            }
        });
    }
    for (let amount = Math.ceil(deficit); amount <= limit; amount++) {
        if (!dp[amount]) continue;
        return mergeBigEventAddonLines(dp[amount]);
    }
    return [];
}

function mergeBigEventAddonLines(addonList) {
    const map = new Map();
    addonList.forEach(addon => {
        if (!map.has(addon.seq)) map.set(addon.seq, { ...addon, packs: 0, qty: 0, amount: 0, addon: true });
        const line = map.get(addon.seq);
        line.packs++;
        line.qty += addon.packQty;
        line.amount += addon.packPrice;
    });
    return [...map.values()];
}

function renderBigEventSettlementOrder(order, threshold) {
    const diff = order.total - threshold;
    return `
        <div class="card">
            <div class="card-title">${order.title} ${order.gift && order.total >= threshold ? '｜取得贈品' : ''}</div>
            <div class="card-sub">總額 $${order.total} ${order.gift ? (diff >= 0 ? `｜超額 $${diff}` : `｜差 $${Math.abs(diff)}`) : '｜不計入贈品'}</div>
            ${order.lines.map(line => `
                <div class="big-event-settlement-line">
                    <span>${line.seq} ${line.name}${line.addon ? '（加購）' : ''}</span>
                    <span>${line.qty} 件 / ${line.packs} 組 / $${line.amount}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function clearBigEventFields() {
    if (!confirm('確定清除所有 Event_S、Event_P、Event_M、Event_N 資料？')) return;
    db.forEach(item => {
        item.Event_S = '';
        item.Event_P = '';
        item.Event_M = '';
        item.Event_N = '';
    });
    saveData();
    if (currentBigEventMode === 'create') {
        document.getElementById('bigEventCreateStatus').innerText = '已清除大檔活動資料';
    }
    if (currentBigEventMode === 'discount') renderBigEventDiscount();
    if (currentBigEventMode === 'order') renderBigEventOrder();
}
