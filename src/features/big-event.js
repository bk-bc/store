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
}

function switchBigEventCreateMode(mode) {
    const isActivity = mode === 'activity';
    document.getElementById('bigEventSearchCreatePanel').style.display = isActivity ? 'none' : 'block';
    document.getElementById('bigEventActivityCreatePanel').style.display = isActivity ? 'block' : 'none';
    document.getElementById('bigEventCreateSearchMode').classList.toggle('active', !isActivity);
    document.getElementById('bigEventCreateActivityMode').classList.toggle('active', isActivity);
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
    const items = getBigEventItems();
    document.getElementById('bigEventOrderStats').innerText = `大檔活動項目：${items.length} 筆`;
    const result = document.getElementById('bigEventOrderResult');
    result.innerHTML = items.map(({ item, idx }) => {
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
    }).join('') || '<div class="card">目前沒有 Event_S 已建檔項目。</div>';
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
    saveData();
    document.getElementById('bigEventOrderStatus').innerText = `已加入訂單：${saved} 筆`;
    renderBigEventOrder();
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
