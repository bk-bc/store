// --- 4. 品保頁面 ---
function switchQAMode(mode) {
    const isAdd = mode === 'add';
    const isBatch = mode === 'batch';
    document.getElementById('qaAddPanel').style.display = isAdd ? 'block' : 'none';
    document.getElementById('qaBatchPanel').style.display = isBatch ? 'block' : 'none';
    document.getElementById('qaListToolbar').style.display = (isAdd || isBatch) ? 'none' : 'flex';
    document.getElementById('qaResultWrapper').style.display = (isAdd || isBatch) ? 'none' : 'block';
    document.getElementById('qaModeAdd').classList.toggle('active', isAdd);
    document.getElementById('qaModeBatch').classList.toggle('active', isBatch);
    document.getElementById('qaModeList').classList.toggle('active', !isAdd && !isBatch);

    if (isAdd) {
        initQAAddDate();
        renderQAAddSelected();
        renderQAAddDateButtons();
        renderQAAddQtyButtons();
        renderQAAddSearch();
        document.getElementById('qaAddSearchInput').focus();
    } else if (isBatch) {
        initQABatchDate();
        renderQABatchSelected();
        renderQABatchDateButtons();
        renderQABatchQtyButtons();
        document.getElementById('qaBatchInput').focus();
    } else {
        renderQA();
    }
}

function initQAAddDate() {
    const now = new Date();
    if (!qaAddDate.year) qaAddDate.year = now.getFullYear();
    if (!qaAddDate.month) qaAddDate.month = now.getMonth() + 1;
    if (!qaAddDate.day) qaAddDate.day = now.getDate();
    const maxDay = getDaysInMonth(qaAddDate.year, qaAddDate.month);
    if (qaAddDate.day > maxDay) qaAddDate.day = maxDay;
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function pad2(num) {
    return String(num).padStart(2, '0');
}

function renderQAAddSearch() {
    const input = document.getElementById('qaAddSearchInput');
    const resDiv = document.getElementById('qaAddSearchResult');
    const keyword = input.value.trim().toLowerCase();
    document.getElementById('qaAddStatus').innerText = '';

    if (keyword.length === 0) {
        resDiv.innerHTML = '';
        return;
    }
    if (keyword.length < 3) {
        resDiv.innerHTML = '<div class="header-stats">請輸入至少三個字再搜尋。</div>';
        return;
    }

    const matches = db
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) =>
            (item.ID && item.ID.toLowerCase().includes(keyword)) ||
            (item.Name && item.Name.toLowerCase().includes(keyword))
        );

    if (matches.length === 0) {
        resDiv.innerHTML = '<div class="header-stats">沒有找到符合資料。</div>';
        return;
    }

    resDiv.innerHTML = matches.map(({ item, idx }) => `
        <button type="button" onclick="selectQAAddItem(${idx})">
            <span class="qa-result-id">${item.ID}</span>
            <span>${item.Name}</span>
        </button>
    `).join('');
}

function selectQAAddItem(dbIdx) {
    qaAddSelectedIndex = dbIdx;
    document.getElementById('qaAddSearchInput').value = '';
    document.getElementById('qaAddSearchResult').innerHTML = '';
    document.getElementById('qaAddStatus').innerText = '';
    document.getElementById('qaAddDatePanel').style.display = 'block';
    initQAAddDate();
    renderQAAddSelected();
    renderQAAddDateButtons();
    renderQAAddQtyButtons();
}

function renderQAAddSelected() {
    const selectedDiv = document.getElementById('qaAddSelected');
    const item = db[qaAddSelectedIndex];
    if (!item) {
        selectedDiv.style.display = 'none';
        document.getElementById('qaAddDatePanel').style.display = 'none';
        return;
    }
    selectedDiv.style.display = 'block';
    selectedDiv.innerHTML = `<strong>已選擇</strong><br>${item.ID}<br>${item.Name}`;
}

function renderQAAddDateButtons() {
    initQAAddDate();
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    if (!years.includes(qaAddDate.year)) qaAddDate.year = currentYear;

    document.getElementById('qaYearButtons').innerHTML = years.map(year => `
        <button type="button" class="${qaAddDate.year === year ? 'active' : ''}" onclick="selectQAAddDate('year', ${year})">${year}</button>
    `).join('');

    document.getElementById('qaMonthButtons').innerHTML = Array.from({ length: 12 }, (_, i) => i + 1).map(month => `
        <button type="button" class="${qaAddDate.month === month ? 'active' : ''}" onclick="selectQAAddDate('month', ${month})">${month}月</button>
    `).join('');

    const maxDay = getDaysInMonth(qaAddDate.year, qaAddDate.month);
    if (qaAddDate.day > maxDay) qaAddDate.day = maxDay;
    document.getElementById('qaDayButtons').innerHTML = Array.from({ length: maxDay }, (_, i) => i + 1).map(day => `
        <button type="button" class="${qaAddDate.day === day ? 'active' : ''}" onclick="selectQAAddDate('day', ${day})">${day}</button>
    `).join('');
}

function renderQAAddQtyButtons() {
    const qtyOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '10+'];
    document.getElementById('qaQtyButtons').innerHTML = qtyOptions.map(qty => `
        <button type="button" class="${qaAddQty === qty ? 'active' : ''}" onclick="selectQAAddQty('${qty}')">${qty}</button>
    `).join('');
}

function selectQAAddDate(type, value) {
    qaAddDate[type] = value;
    const maxDay = getDaysInMonth(qaAddDate.year, qaAddDate.month);
    if (qaAddDate.day > maxDay) qaAddDate.day = maxDay;
    document.getElementById('qaAddStatus').innerText = '';
    renderQAAddDateButtons();
}

function selectQAAddQty(value) {
    qaAddQty = value === '10+' ? '10+' : parseInt(value, 10);
    document.getElementById('qaAddStatus').innerText = '';
    renderQAAddQtyButtons();
}

function formatQAAddExpiry(dateStr) {
    return qaAddQty === '10+' ? `${dateStr}_10+` : `${dateStr}_${qaAddQty}`;
}

function createQAExpiry() {
    const item = db[qaAddSelectedIndex];
    if (!item) return alert('請先選擇商品');
    initQAAddDate();
    const dateStr = `${qaAddDate.year}${pad2(qaAddDate.month)}${pad2(qaAddDate.day)}`;
    let expArr = item.Expiry ? item.Expiry.split('/').filter(Boolean) : [];
    const existingIdx = expArr.findIndex(d => d === dateStr || d.startsWith(dateStr + '_'));
    const expiryEntry = formatQAAddExpiry(dateStr);
    if (existingIdx >= 0) expArr[existingIdx] = expiryEntry;
    else expArr.push(expiryEntry);
    item.Expiry = cleanArrayStr(expArr.join('/'), true);
    saveData();
    document.getElementById('qaAddStatus').innerText = `已建檔：${item.ID} ${expiryEntry}`;
}

function initQABatchDate() {
    const now = new Date();
    if (!qaBatchDate.year) qaBatchDate.year = now.getFullYear();
    if (!qaBatchDate.month) qaBatchDate.month = now.getMonth() + 1;
    if (!qaBatchDate.day) qaBatchDate.day = now.getDate();
    const maxDay = getDaysInMonth(qaBatchDate.year, qaBatchDate.month);
    if (qaBatchDate.day > maxDay) qaBatchDate.day = maxDay;
}

function renderQABatchSearch() {
    const input = document.getElementById('qaBatchInput');
    const resDiv = document.getElementById('qaBatchSearchResult');
    const lines = input.value.split('\n').map(line => line.trim()).filter(Boolean);
    document.getElementById('qaBatchStatus').innerText = '';

    qaBatchSelectedIndex = null;
    renderQABatchSelected();

    if (lines.length === 0) {
        resDiv.innerHTML = '<div class="header-stats">請先輸入 ID。</div>';
        return;
    }

    const seenIds = new Set();
    const seenIndexes = new Set();
    const matches = [];
    const missing = [];
    lines.forEach(id => {
        const lowerId = id.toLowerCase();
        const foundItems = db
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.ID && item.ID.toLowerCase() === lowerId);
        if (foundItems.length > 0) {
            foundItems.forEach(({ item, idx }) => {
                if (!seenIndexes.has(idx)) {
                    seenIndexes.add(idx);
                    matches.push({ item, idx });
                }
            });
            if (!seenIds.has(lowerId)) {
                seenIds.add(lowerId);
            }
        } else {
            missing.push(id);
        }
    });

    let html = '';
    if (matches.length > 0) {
        html += matches.map(({ item, idx }) => `
            <button type="button" onclick="selectQABatchItem(${idx})">
                <span>${item.Name}</span>
                <span>Expiry: ${item.Expiry || '無'}</span>
            </button>
        `).join('');
    }
    if (missing.length > 0) {
        html += `<div class="header-stats">未找到 ID：${missing.join('、')}</div>`;
    }
    resDiv.innerHTML = html || '<div class="header-stats">沒有找到符合資料。</div>';
}

function selectQABatchItem(dbIdx) {
    qaBatchSelectedIndex = dbIdx;
    document.getElementById('qaBatchStatus').innerText = '';
    document.getElementById('qaBatchDatePanel').style.display = 'block';
    initQABatchDate();
    renderQABatchSelected();
    renderQABatchDateButtons();
    renderQABatchQtyButtons();
}

function renderQABatchSelected() {
    const selectedDiv = document.getElementById('qaBatchSelected');
    const item = db[qaBatchSelectedIndex];
    if (!item) {
        selectedDiv.style.display = 'none';
        document.getElementById('qaBatchDatePanel').style.display = 'none';
        return;
    }
    selectedDiv.style.display = 'block';
    selectedDiv.innerHTML = `<strong>已選擇</strong><br>${item.ID}<br>${item.Name}`;
}

function renderQABatchDateButtons() {
    initQABatchDate();
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    if (!years.includes(qaBatchDate.year)) qaBatchDate.year = currentYear;

    document.getElementById('qaBatchYearButtons').innerHTML = years.map(year => `
        <button type="button" class="${qaBatchDate.year === year ? 'active' : ''}" onclick="selectQABatchDate('year', ${year})">${year}</button>
    `).join('');

    document.getElementById('qaBatchMonthButtons').innerHTML = Array.from({ length: 12 }, (_, i) => i + 1).map(month => `
        <button type="button" class="${qaBatchDate.month === month ? 'active' : ''}" onclick="selectQABatchDate('month', ${month})">${month}月</button>
    `).join('');

    const maxDay = getDaysInMonth(qaBatchDate.year, qaBatchDate.month);
    if (qaBatchDate.day > maxDay) qaBatchDate.day = maxDay;
    document.getElementById('qaBatchDayButtons').innerHTML = Array.from({ length: maxDay }, (_, i) => i + 1).map(day => `
        <button type="button" class="${qaBatchDate.day === day ? 'active' : ''}" onclick="selectQABatchDate('day', ${day})">${day}</button>
    `).join('');
}

function renderQABatchQtyButtons() {
    const display = document.getElementById('qaBatchQtyDisplay');
    if (display) display.innerText = qaBatchQty;
    const qtyOptions = [-10, -3, -1, 1, 3, 10];
    document.getElementById('qaBatchQtyButtons').innerHTML = qtyOptions.map(delta => `
        <button type="button" onclick="updateQABatchQty(${delta})">${delta > 0 ? '+' : ''}${delta}</button>
    `).join('');
}

function selectQABatchDate(type, value) {
    qaBatchDate[type] = value;
    const maxDay = getDaysInMonth(qaBatchDate.year, qaBatchDate.month);
    if (qaBatchDate.day > maxDay) qaBatchDate.day = maxDay;
    document.getElementById('qaBatchStatus').innerText = '';
    renderQABatchDateButtons();
}

function updateQABatchQty(delta) {
    qaBatchQty = Math.max(0, qaBatchQty + delta);
    document.getElementById('qaBatchStatus').innerText = '';
    renderQABatchQtyButtons();
}

function formatQABatchExpiry(dateStr) {
    return qaBatchQty > 0 ? `${dateStr}_${qaBatchQty}` : dateStr;
}

function createQABatchExpiry() {
    const item = db[qaBatchSelectedIndex];
    if (!item) return alert('請先選擇商品');
    initQABatchDate();
    const dateStr = `${qaBatchDate.year}${pad2(qaBatchDate.month)}${pad2(qaBatchDate.day)}`;
    let expArr = item.Expiry ? item.Expiry.split('/').filter(Boolean) : [];
    const existingIdx = expArr.findIndex(d => d === dateStr || d.startsWith(dateStr + '_'));
    const expiryEntry = formatQABatchExpiry(dateStr);
    if (existingIdx >= 0) expArr[existingIdx] = expiryEntry;
    else expArr.push(expiryEntry);
    item.Expiry = cleanArrayStr(expArr.join('/'), true);
    saveData();
    document.getElementById('qaBatchStatus').innerText = `已建檔：${item.ID} ${expiryEntry}`;
}

function renderQA() {
    const showBc = document.getElementById('qaBarcodeToggle').checked;
    const resDiv = document.getElementById('qaResult');
    resDiv.innerHTML = '';

    const now = new Date();
    const currentYearMonth = now.getFullYear() * 100 + (now.getMonth() + 1);
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextYearMonth = nextMonthDate.getFullYear() * 100 + (nextMonthDate.getMonth() + 1);

    const expMap = {};
    db.forEach(item => {
        if(item.Expiry) {
            item.Expiry.split('/').forEach(d => {
                if(d) {
                    // 只取前8碼純日期作為key，忽略_數量後綴
                    const pureDate = d.substring(0, 8);
                    if(!expMap[pureDate]) expMap[pureDate] = [];
                    // 避免同一商品重複加入
                    if (!expMap[pureDate].find(i => i.ID === item.ID)) {
                        expMap[pureDate].push(item);
                    }
                }
            });
        }
    });
    const sortedDates = Object.keys(expMap).sort();
    if(sortedDates.length === 0) return;

    // ── 建立所有群組 DOM ──
    function makeGroupEl(date, dateIdx) {
        const items = expMap[date];
        const ym = parseInt(date.substring(0, 6));
        let bgClass = '';
        if (ym <= currentYearMonth)    bgClass = 'bg-month-current';
        else if (ym === nextYearMonth) bgClass = 'bg-month-next';
        else                            bgClass = 'bg-month-future';

        const groupDiv = document.createElement('div');
        groupDiv.className = `qa-group ${bgClass}`;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'qa-group-title';
        titleDiv.innerHTML = `
            <span>到期日: ${date}</span>
            <button class="btn-danger no-print" style="float:right; padding:1px 6px; font-size:11px; margin-top:-2px;" onclick="removeQA('${date}')">全批下架</button>
        `;
        groupDiv.appendChild(titleDiv);

        const itemsRow = document.createElement('div');
        itemsRow.className = 'qa-items-row';

        // 改為單欄，每張卡片內左右並排
        items.forEach((item, idx) => {
            const svgId = `qa_${dateIdx}_${idx}`;

            const expiryEntry = item.Expiry.split('/').find(e => e === date || e.startsWith(date + '_'));
            const parsed = expiryEntry ? parseExpiry(expiryEntry) : null;
            const qty = parsed ? parsed.qty : 0;
            const qtyText = parsed && parsed.plus ? `${qty}+` : qty;
            const qtyDisplay = qty > 0 ? `<span class="qa-qty-badge">*${qtyText}</span>` : '';

            const card = document.createElement('div');
            card.className = 'qa-item-card';
            card.innerHTML = `
                <div class="qa-item-inner">
                    <div class="qa-item-left">
                        <div class="qa-item-actions no-print">
                            <button class="qa-qty-btn" onclick="updateExpiryQty('${item.ID}', '${date}', -1)">－</button>
                            <span class="qa-qty-num">${qtyText}</span>
                            <button class="qa-qty-btn" onclick="updateExpiryQty('${item.ID}', '${date}', 1)">＋</button>
                            <button class="btn-warning" style="padding:1px 6px; font-size:11px; margin-left:4px;" onclick="removeQA('${date}', '${item.ID}')">下架</button>
                            <button class="btn-primary" style="padding:1px 6px; font-size:11px;" onclick="addQAToBatchInput('${item.ID}')">更新</button>
                        </div>
                        <div class="qa-item-title">${item.Name}${qtyDisplay}</div>
                    </div>
                    ${showBc ? `<div class="qa-item-right"><svg id="${svgId}" class="barcode"></svg></div>` : ''}
                </div>
            `;
            itemsRow.appendChild(card);
        });

        groupDiv.appendChild(itemsRow);
        // 渲染條碼（DOM掛上後）
        return { groupDiv, date, dateIdx, items };
    }

    // ── 步驟1：建立測量盒，寬度固定為A4單欄寬 ──
    // A4可用寬730px，兩欄各362px（含gap）
    const PRINT_COL_WIDTH = 362;
    const measureBox = document.createElement('div');
    measureBox.style.cssText = `position:fixed; visibility:hidden; pointer-events:none; width:${PRINT_COL_WIDTH}px; left:-9999px; top:0; z-index:-1; overflow:hidden;`;
    document.body.appendChild(measureBox);

    // ── 步驟2：把每個群組放進測量盒量真實高度（不用clone）──
    const groupEls = sortedDates.map((date, dateIdx) => makeGroupEl(date, dateIdx));

    const heights = groupEls.map(({ groupDiv }) => {
        measureBox.innerHTML = '';
        measureBox.appendChild(groupDiv);          // 放入原始節點
        const h = groupDiv.offsetHeight + 6;       // +6 gap
        return h;
    });

    // 量完後清空測量盒，節點稍後再放進正式容器
    measureBox.innerHTML = '';
    document.body.removeChild(measureBox);

    // ── 步驟3：pageH 固定 1000px（對應測量盒 362px 寬的實際渲染高度）──
    const pageH = 1600;

    // 貪心分配：左欄先填，滿了換右欄，右欄滿了換下一頁左欄
    const pages = []; // 每頁 = { left: [idx,...], right: [idx,...] }
    let curPage = { left: [], right: [] };
    let leftH = 0, rightH = 0;
    let fillingLeft = true;

    groupEls.forEach((_, i) => {
        const h = heights[i];
        if (fillingLeft) {
            if (leftH + h <= pageH) {
                curPage.left.push(i);
                leftH += h;
            } else {
                // 左欄滿，切換到右欄
                fillingLeft = false;
                curPage.right.push(i);
                rightH += h;
            }
        } else {
            if (rightH + h <= pageH) {
                curPage.right.push(i);
                rightH += h;
            } else {
                // 右欄也滿，換新頁
                pages.push(curPage);
                curPage = { left: [i], right: [] };
                leftH = h;
                rightH = 0;
                fillingLeft = true;
            }
        }
    });
    pages.push(curPage); // 最後一頁

    // ── 步驟4：渲染到畫面 ──
    // qaResult 設為 flex-column，每頁一個 qa-page-row
    pages.forEach((page, pageIdx) => {
        // 每頁前（除第一頁）插入強制換頁 div
        if (pageIdx > 0) {
            const breakDiv = document.createElement('div');
            breakDiv.className = 'qa-page-break';
            resDiv.appendChild(breakDiv);
        }

        const pageDiv = document.createElement('div');
        pageDiv.className = 'qa-page-row';

        const leftCol  = document.createElement('div');
        leftCol.className  = 'qa-col';
        const rightCol = document.createElement('div');
        rightCol.className = 'qa-col';

        page.left.forEach(i  => leftCol.appendChild(groupEls[i].groupDiv));
        page.right.forEach(i => rightCol.appendChild(groupEls[i].groupDiv));

        pageDiv.appendChild(leftCol);
        pageDiv.appendChild(rightCol);
        resDiv.appendChild(pageDiv);
    });

    // ── 步驟5：渲染條碼（DOM 已掛上）──
    if(showBc) {
        groupEls.forEach(({ dateIdx, items }) => {
            items.forEach((item, idx) => {
                try { renderBarcode(`qa_${dateIdx}_${idx}`, item.ID, item.Type); } catch(e) {}
            });
        });
    }

    // ── 步驟6：計算scale，讓730px內容縮放適應螢幕寬度 ──
    function applyScale() {
        const wrapper = document.getElementById('qaResultWrapper');
        const wrapperW = wrapper.offsetWidth || window.innerWidth - 20;
        const scale = Math.min(1, wrapperW / 730);
        resDiv.style.transform = `scale(${scale})`;
        // 縮放後調整外層高度，避免留白
        wrapper.style.height = (resDiv.scrollHeight * scale) + 'px';
    }
    applyScale();
    window.addEventListener('resize', applyScale);

    // 列印時移除scale，讓內容以原始大小輸出
    const printHandler = () => { resDiv.style.transform = 'none'; };
    const afterHandler = () => { applyScale(); };
    window.removeEventListener('beforeprint', window._qaPrintHandler);
    window.removeEventListener('afterprint',  window._qaAfterHandler);
    window._qaPrintHandler = printHandler;
    window._qaAfterHandler = afterHandler;
    window.addEventListener('beforeprint', printHandler);
    window.addEventListener('afterprint',  afterHandler);
}

// ── Expiry 數量工具 ──
// 從 "20260501_3" 或 "20260501_10+" 解析出日期和數量
function parseExpiry(entry) {
    const m = entry.match(/^(20\d{6})(?:_(\d+)(\+)?)?$/);
    if (!m) return null;
    return { date: m[1], qty: m[2] ? parseInt(m[2]) : 0, plus: m[3] === '+' };
}
// 組合回字串：qty=0 → "20260501"，qty>0 → "20260501_3"
function formatExpiry(date, qty) {
    return qty > 0 ? `${date}_${qty}` : date;
}
// 更新某筆商品某個日期的數量
function updateExpiryQty(itemId, date, delta) {
    db.forEach(item => {
        if (item.ID !== itemId) return;
        let arr = item.Expiry ? item.Expiry.split('/').filter(Boolean) : [];
        const idx = arr.findIndex(e => e === date || e.startsWith(date + '_'));
        if (idx === -1) return;
        const parsed = parseExpiry(arr[idx]);
        if (!parsed) return;
        const newQty = Math.max(0, parsed.qty + delta);
        arr[idx] = formatExpiry(date, newQty);
        item.Expiry = arr.join('/');
    });
    saveData();
    renderQA();
}

function addQAToBatchInput(itemId) {
    const input = document.getElementById('qaBatchInput');
    if (!input) return;
    const current = input.value.trimEnd();
    input.value = current ? `${current}\n${itemId}` : itemId;
}

function removeQA(date, itemId = null) {
    db.forEach(item => {
        if (!itemId || item.ID === itemId) {
            item.Expiry = item.Expiry.split('/').filter(d => {
                // 過濾掉純日期或帶數量的同一天
                return d !== date && !d.startsWith(date + '_');
            }).join('/');
        }
    });
    saveData(); renderQA();
}
