// --- 2. 搜尋功能 ---
function populateSearchDropdowns() {
    const c1Set = new Set(), eventSet = new Set();
    db.forEach(item => {
        if(item.C1) c1Set.add(item.C1);
        if(item.Event) {
            item.Event.split('/').forEach(e => { 
                if(e) {
                    const cleanEvent = e.replace(/_\d{3}$/, '');
                    eventSet.add(cleanEvent); 
                }
            });
        }
    });
    let c1Html = `<option value="">C1: 全部搜尋</option>`;
    [...c1Set].sort((a, b) => a.localeCompare(b, 'zh-TW')).forEach(c => c1Html += `<option value="${c}">${c}</option>`);
    document.getElementById('searchC1').innerHTML = c1Html;
    let evHtml = `<option value="">Event: 全部搜尋</option>`;
    [...eventSet].sort((a, b) => a.localeCompare(b, 'zh-TW')).forEach(e => evHtml += `<option value="${e}">${e}</option>`);
    document.getElementById('searchEvent').innerHTML = evHtml;
}

function clearOrder() {
    db.forEach(item => {
        if(item.Event.includes('待訂貨')) {
            item.Event = item.Event.split('/').filter(e => e !== '待訂貨').join('/');
        }
    });
    saveData();
    renderSearch();
}

function renderSearch() {
    const isFresh = document.getElementById('freshFoodCheck').checked;
    const c1 = document.getElementById('searchC1').value;
    const ev = document.getElementById('searchEvent').value;
    const kw1 = document.getElementById('searchKeyword1').value.trim().toLowerCase();
    const kw2 = document.getElementById('searchKeyword2').value.trim().toLowerCase();
    const resDiv = document.getElementById('searchResult');
    const searchFilters = document.getElementById('searchFilters');
    const showShortcuts = document.getElementById('shortcutToggle').checked;
    
    resDiv.innerHTML = '';
    
    if (isFresh) {
        document.getElementById('searchC1').style.display = 'none';
        document.getElementById('searchEvent').style.display = 'none';
        document.getElementById('searchKeyword2').style.display = 'none';
        searchFilters.style.display = 'block';
        if (kw1.length < 1) {
            document.getElementById('searchCount').innerText = '請輸入鮮食名稱進行搜尋...';
            return;
        }
    } else {
        document.getElementById('searchC1').style.display = 'block';
        document.getElementById('searchEvent').style.display = 'block';
        document.getElementById('searchKeyword2').style.display = 'block';
        searchFilters.style.display = 'block';
        if (kw1.length < 1 && kw2.length < 1 && !c1 && !ev) {
            document.getElementById('searchCount').innerText = '輸入關鍵字或選擇篩選項目...';
            return;
        }
    }

    let filtered = db.filter(item => {
        if (isFresh) {
            if (item.Type !== 'I24' && item.Type !== 'I35') return false;
            const match1 = kw1 ? item.Name.toLowerCase().includes(kw1) : true;
            const match2 = kw2 ? item.Name.toLowerCase().includes(kw2) : true;
            return (kw1 || kw2) && match1 && match2;
        } else {
            if (c1 && item.C1 !== c1) return false;
            if (ev && !item.Event.split('/').some(e => e.replace(/_\d{3}$/, '') === ev)) return false;
            let textMatch = (kw1 === '' || item.ID.toLowerCase().includes(kw1) || item.Name.toLowerCase().includes(kw1)) &&
                            (kw2 === '' || item.ID.toLowerCase().includes(kw2) || item.Name.toLowerCase().includes(kw2));
            return textMatch;
        }
    });

    if (ev && !isFresh) {
        filtered.sort((a, b) => {
            const evA = a.Event.split('/').find(e => e.replace(/_\d{3}$/, '') === ev) || '';
            const evB = b.Event.split('/').find(e => e.replace(/_\d{3}$/, '') === ev) || '';
            const seqA = evA.match(/_(\d{3})$/) ? parseInt(evA.match(/_(\d{3})$/)[1], 10) : 999;
            const seqB = evB.match(/_(\d{3})$/) ? parseInt(evB.match(/_(\d{3})$/)[1], 10) : 999;
            return seqA - seqB;
        });
    }

    document.getElementById('searchCount').innerText = `剩餘筆數: ${filtered.length > 60 ? '60+' : filtered.length} (顯示上限60筆)`;
    filtered = filtered.slice(0, 60);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'search-grid-container';
    resDiv.appendChild(gridContainer);

    // 分成五組，每組12個
    for (let i = 0; i < 5; i++) {
        const chunk = filtered.slice(i * 12, (i + 1) * 12);
        if (chunk.length === 0 && i > 0) break;

        const columnDiv = document.createElement('div');
        columnDiv.className = 'search-column';
        gridContainer.appendChild(columnDiv);

        chunk.forEach((item, chunkIdx) => {
            const globalIdx = (i * 12) + chunkIdx;
            const dbIdx = db.indexOf(item);
            const isDown = normalizeBool(item.Down ?? item.down) === 'True';
            const downLabel = isDown ? '<div class="down-label">已下架</div>' : '';
            const card = document.createElement('div');
            card.className = isDown ? 'card card-down' : 'card';
            
            if (isFresh) {
                if (item.Type === 'I35') {
                    card.innerHTML = `
                        ${downLabel}
                        <div class="card-title">${item.Name} (${item.Type})</div>
                        <div class="card-actions no-print">
                            <button class="btn-warning"  onclick="showI35Barcode('${item.ID}', 0, 3, 'bc_${globalIdx}')">3</button>
                            <button class="btn-warning"  onclick="showI35Barcode('${item.ID}', 0, 5, 'bc_${globalIdx}')">5</button>
                            <button class="btn-primary"  onclick="showI35Barcode('${item.ID}', 1, 3, 'bc_${globalIdx}')">3+</button>
                            <button class="btn-primary"  onclick="showI35Barcode('${item.ID}', 1, 5, 'bc_${globalIdx}')">5+</button>
                        </div>
                        <div class="barcode-wrapper"><svg id="bc_${globalIdx}" class="barcode"></svg></div>
                    `;
                } else {
                    // I24：直接顯示今日+明日兩條 EAN13 條碼，不顯示按鈕
                    card.innerHTML = `
                        ${downLabel}
                        <div class="card-title">${item.Name} (${item.Type})</div>
                        <div class="barcode-wrapper"><svg id="bc_${globalIdx}_0" class="barcode"></svg></div>
                        <div class="barcode-wrapper"><svg id="bc_${globalIdx}_1" class="barcode"></svg></div>
                    `;
                }
            } else {
                const hideNormalShortcuts = !isFresh && !showShortcuts;
                card.innerHTML = `
                    ${downLabel}
                    <div class="card-title">${item.Name}</div>
                    <div class="card-sub">${item.C1} | ${item.Event}</div>
                    <div class="barcode-wrapper"><svg id="bc_${globalIdx}" class="barcode"></svg></div>
                    <div class="card-actions no-print" style="display: ${hideNormalShortcuts ? 'none' : 'flex'};">
                        <button class="btn-yellow" onclick="actionCard('${item.ID}', 'reclassify')">✋分類</button>
                        <button class="btn-primary" onclick="actionCard('${item.ID}', 'order')">🛒訂貨</button>
                        <button class="btn-danger" onclick="actionCard('${item.ID}', 'delete')">🗑️刪除</button>
                        <button class="btn-lightblue" onclick="actionCard('${item.ID}', 'lock')">${item.Locked === 'True' ? '🔓解鎖' : '🔒鎖定'}</button>
                        <button class="btn-warning" onclick="toggleDown(${dbIdx})">${isDown ? '上架' : '下架'}</button>
                    </div>
                `;
            }
            columnDiv.appendChild(card);
            if (!isFresh) {
                renderBarcode(`bc_${globalIdx}`, item.ID, item.Type);
            } else if (item.Type === 'I24') {
                // 掛上 DOM 後立即渲染今日與明日兩條 EAN13
                renderI24Barcode(item.ID, 0, `bc_${globalIdx}_0`);
                renderI24Barcode(item.ID, 1, `bc_${globalIdx}_1`);
            }
        });
    }
}

// ── EAN13 第13碼計算 ──
function calcEAN13Check(digits12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return ((10 - (sum % 10)) % 10).toString();
}

// ── I35 按鈕觸發：ID(8碼) + Julian日(3碼) + 份數(1碼) → 12碼 → EAN13 ──
function showI35Barcode(id, julianOffset, copies, svgId) {
    const julian = getJulian(julianOffset);
    const raw12  = id + julian + copies;
    console.log(`I35 條碼組合：ID=${id}(${id.length}碼) + Julian=${julian}(${julian.length}碼) + 份數=${copies} → raw12=${raw12}(${raw12.length}碼)`);
    if (raw12.length !== 12 || isNaN(Number(raw12))) {
        alert(`條碼位數錯誤！\nID=${id}（${id.length}碼）\nJulian=${julian}（${julian.length}碼）\n份數=${copies}（1碼）\n合計=${raw12}（${raw12.length}碼，需恰好12碼且全為數字）`);
        return;
    }
    const ean13 = raw12 + calcEAN13Check(raw12);
    try {
        JsBarcode(`#${svgId}`, ean13, {
            format: 'EAN13', displayValue: true, height: 40, margin: 2, width: 1.8
        });
    } catch(e) { console.error('I35 barcode error:', e, ean13); }
}

// ── I24 自動渲染：ID(8碼) + Julian日(3碼) + 1(1碼) → 12碼 → EAN13 ──
function renderI24Barcode(id, julianOffset, svgId) {
    const julian = getJulian(julianOffset);
    const raw12  = id + julian + '1';
    console.log(`I24 條碼組合：ID=${id}(${id.length}碼) + Julian=${julian}(${julian.length}碼) + 1 → raw12=${raw12}(${raw12.length}碼)`);
    if (raw12.length !== 12 || isNaN(Number(raw12))) {
        console.warn(`I24 條碼位數錯誤：${raw12}（${raw12.length}碼）`);
        return;
    }
    const ean13 = raw12 + calcEAN13Check(raw12);
    try {
        JsBarcode(`#${svgId}`, ean13, {
            format: 'EAN13', displayValue: true, height: 40, margin: 2, width: 1.8
        });
    } catch(e) { console.error('I24 barcode error:', e, ean13); }
}

function actionCard(id, action) {
    let item = db.find(i => i.ID === id);
    if (!item) return;
    if (action === 'delete') {
        if (confirm(`確定刪除 ${item.Name}？`)) {
            db = db.filter(i => i.ID !== id);
            saveData(); renderSearch();
        }
    } else if (action === 'lock') {
        item.Locked = item.Locked === 'True' ? 'False' : 'True';
        saveData(); renderSearch();
    } else if (action === 'order') {
        let evArr = item.Event ? item.Event.split('/').filter(Boolean) : [];
        if (!evArr.includes('待訂貨')) evArr.push('待訂貨');
        item.Event = evArr.join('/');
        saveData(); renderSearch();
    } else if (action === 'reclassify') {
        const c1s = [...new Set(db.map(i=>i.C1).filter(Boolean))].sort((a,b) => a.localeCompare(b,'zh-TW'));
        let opts = c1s.map(c => `<option value="${c}">${c}</option>`).join('');
        let newC1 = prompt(`目前分類：${item.C1}\n輸入新分類名稱，或留空選擇現有分類`);
        if (newC1 !== null) {
            item.C1 = newC1.trim() || item.C1;
            saveData(); renderSearch();
        }
    }
}

function toggleDown(dbIdx) {
    const item = db[dbIdx];
    if (!item) return;
    item.Down = normalizeBool(item.Down ?? item.down) === 'True' ? 'False' : 'True';
    saveData();
    renderSearch();
}
