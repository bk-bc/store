// --- 核心資料狀態 ---
let db = []; 
let stats = { imported: 0, merged: 0 };
let qaAddSelectedIndex = null;
let qaAddDate = { year: null, month: null, day: null };
let qaAddQty = 1;
let qaBatchSelectedIndex = null;
let qaBatchDate = { year: null, month: null, day: null };
let qaBatchQty = 0;

// --- 初始化 ---
function renderMainNav() {
    const nav = document.getElementById('mainNav');
    if (!nav || !window.RETAIL_FEATURES) return;
    nav.innerHTML = window.RETAIL_FEATURES.map(feature =>
        `<button onclick="switchTab('${feature.id}')" id="btn-${feature.id}" class="${feature.id === 'search' ? 'active' : ''}">${feature.label}</button>`
    ).join('');
}

async function loadFeatureAssets() {
    const container = document.getElementById('featureContainer');
    const features = window.RETAIL_FEATURES || [];
    const htmlParts = await Promise.all(features.map(async feature => {
        const response = await fetch(feature.html);
        if (!response.ok) throw new Error(`Cannot load ${feature.html}`);
        return response.text();
    }));
    container.innerHTML = htmlParts.join('\n');

    for (const feature of features) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = feature.script;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Cannot load ${feature.script}`));
            document.body.appendChild(script);
        });
    }
}

window.onload = async () => {
    renderMainNav();
    try {
        await loadFeatureAssets();
    } catch (error) {
        document.getElementById('featureContainer').innerHTML = '<div class="card">功能檔案載入失敗。請用本機伺服器或 GitHub Pages 開啟這個網站。</div>';
        console.error(error);
        return;
    }
    const stored = localStorage.getItem('retailDB');
    if (stored) {
        let rawData = JSON.parse(stored);
        rawData.forEach(item => {
            if (item.Locked === undefined || item.Locked === 'undefined' || item.Locked === null || item.Locked === '') {
                item.Locked = 'False';
            }
            item.Down = normalizeBool(item.Down ?? item.down);
            item.Price = normalizePrice(item.Price);
            normalizeBigEventFields(item);
            if (!item.C1) item.C1 = '未分類';
            item.Expiry = cleanArrayStr(item.Expiry, true);
            item.Event = cleanArrayStr(item.Event, false, item.Name, item.ID);
        });
        db = []; 
        rawData.forEach(item => { upsertItem(item); });
        saveData();
    }
    renderAddType();
    updateStatsUI();
    populateSearchDropdowns();
    renderSearch();
};

function saveData() {
    localStorage.setItem('retailDB', JSON.stringify(db));
    updateStatsUI();
}

function switchTab(tabId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-buttons button').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`btn-${tabId}`).classList.add('active');
    
    if(tabId === 'add') switchAddMode('normal');
    if(tabId === 'search') {
        const keyword1 = document.getElementById('searchKeyword1');
        document.getElementById('searchKeyword1').value='';
        document.getElementById('searchKeyword2').value='';
        populateSearchDropdowns();
        renderSearch();
        setTimeout(() => keyword1?.focus(), 0);
    }
    if(tabId === 'error') renderError();
    if(tabId === 'qa') switchQAMode('list');
    if(tabId === 'price') renderPrice();
    if(tabId === 'bigEvent') renderBigEvent();
    if(tabId === 'classify') renderClassify();
    if(tabId === 'activity') renderActivity();
}

// --- 共用工具 ---
function cleanArrayStr(str, isDate = false, itemName = '', itemID = '') {
    if (!str) return '';
    let arr = str.split('/').map(s => s.trim()).filter(Boolean);
    if (isDate) {
        // 允許純日期 20260501、帶數量 20260501_3 或 10+ 標記 20260501_10+
        arr = arr.filter(d => /^20\d{6}(_\d+\+?)?$/.test(d));
        arr.sort((a, b) => a.substring(0, 8).localeCompare(b.substring(0, 8)));
    } else {
        const today = new Date();
        const expirationDays = 30;
        arr = arr.filter(e => {
            const exactMatchRegex = new RegExp(`^(${escapeRegExp(itemName)}|${escapeRegExp(itemID)})$`, 'i');
            if (exactMatchRegex.test(e)) return false;
            const dateMatch = e.match(/^(\d{8})_/);
            if (dateMatch) {
                const eventDateStr = dateMatch[1];
                if (eventDateStr.substring(0, 2) === "20") {
                    const year = parseInt(eventDateStr.substring(0, 4));
                    const month = parseInt(eventDateStr.substring(4, 6)) - 1;
                    const day = parseInt(eventDateStr.substring(6, 8));
                    const eventDate = new Date(year, month, day);
                    if (!isNaN(eventDate.getTime())) {
                        const diffTime = today - eventDate;
                        const diffDays = diffTime / (1000 * 60 * 60 * 24);
                        if (diffDays > expirationDays) return false;
                    }
                }
            }
            return true;
        });
    }
    return [...new Set(arr)].join('/');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBool(value) {
    return String(value).toLowerCase() === 'true' ? 'True' : 'False';
}

function normalizePrice(value) {
    if (value === undefined || value === null || value === '') return '0';
    return String(value).trim() || '0';
}

function normalizeTextField(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function normalizeBigEventFields(item) {
    item.Event_S = normalizeTextField(item.Event_S);
    item.Event_P = normalizeTextField(item.Event_P);
    item.Event_M = normalizeTextField(item.Event_M);
    item.Event_N = normalizeTextField(item.Event_N);
}

function mergeSupplementalFields(target, source) {
    if (normalizePrice(target.Price) === '0' && normalizePrice(source.Price) !== '0') {
        target.Price = normalizePrice(source.Price);
    }
    ['Event_S', 'Event_P', 'Event_M', 'Event_N'].forEach(field => {
        if (!normalizeTextField(target[field]) && normalizeTextField(source[field])) {
            target[field] = normalizeTextField(source[field]);
        }
    });
}

function updateStatsUI() {
    document.getElementById('headerStats').innerText = `資料統計：總導入 ${stats.imported} | 合併數 ${stats.merged} | 總筆數 ${db.length}`;
    const unclassifiedCount = db.filter(i => i.C1 === '未分類').length;
    const conflictCount = getConflictStats().conflicts.length;
    const missingPriceCount = db.filter(i => normalizePrice(i.Price) === '0').length;
    const classifyButton = document.getElementById('btn-classify');
    const errorButton = document.getElementById('btn-error');
    const priceButton = document.getElementById('btn-price');
    if (classifyButton) {
        classifyButton.innerText = '分類';
        classifyButton.classList.toggle('needs-attention', unclassifiedCount > 0);
    }
    if (errorButton) {
        errorButton.innerText = '勘誤';
        errorButton.classList.toggle('needs-attention', conflictCount > 0);
    }
    if (priceButton) {
        priceButton.innerText = '價格';
        priceButton.classList.toggle('needs-attention', missingPriceCount > 0);
    }
}

function getConflictStats() {
    const idGroups = {};
    db.forEach(item => {
        if(!idGroups[item.ID]) idGroups[item.ID] = [];
        idGroups[item.ID].push(item);
    });
    const conflicts = [];
    let totalDupItems = 0; let totalDupBatches = 0;
    for (const [id, group] of Object.entries(idGroups)) {
        if (group.length > 1) {
            totalDupItems += group.length; totalDupBatches++;
            const types = [...new Set(group.map(i=>i.Type))];
            const names = [...new Set(group.map(i=>i.Name))];
            const c1s = [...new Set(group.map(i=>i.C1))];
            if(types.length > 1 || names.length > 1 || c1s.length > 1 || group.some(i=>i.Locked!=='True')) {
                conflicts.push({id, group, types, names, c1s});
            }
        }
    }
    return { conflicts, totalDupItems, totalDupBatches };
}

function getJulian(addDays = 0) {
    let d = new Date(); d.setDate(d.getDate() + addDays);
    let start = new Date(d.getFullYear(), 0, 0);
    let diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    let oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay).toString().padStart(3, '0');
}

function renderBarcode(targetId, value, format) {
    try {
        let fmt;
        if (format === 'EAN13') {
            fmt = 'EAN13';
        } else if (format === 'EAN8') {
            fmt = 'EAN8';
        } else if (format === 'UPCA') {
            fmt = 'UPC';        // JsBarcode 的 UPC-A 格式名稱是 'UPC'
        } else if (format === 'UPCE') {
            fmt = 'UPCE';       // JsBarcode 支援 UPCE
        } else if (format === 'I35' || format === 'I24') {
            fmt = 'EAN8';
        } else if (format === 'CODE39') {
            fmt = 'CODE39';
        } else {
            fmt = 'CODE128';
        }
        JsBarcode(`#${targetId}`, value, {
            format: fmt,
            displayValue: true, height: 35, margin: 0, width: 1.5
        });
    } catch (e) {
        console.error("Barcode error:", e);
    }
}

function upsertItem(newItem) {
    newItem.Down = normalizeBool(newItem.Down ?? newItem.down);
    newItem.Price = normalizePrice(newItem.Price);
    normalizeBigEventFields(newItem);
    const namePrefix = newItem.Name.substring(0, 6);
    const isSixDigits = /^\d{6}$/.test(namePrefix);
    if (!isSixDigits) {
        console.warn(`過濾無效資料：ID ${newItem.ID} 的 Name "${newItem.Name}" 不符合 6 位數字開頭規則。`);
        return { imported: 0, merged: 0 }; 
    }
    let existing = db.filter(i => i.ID === newItem.ID);
    if (existing.length === 0) {
        newItem.Expiry = cleanArrayStr(newItem.Expiry, true);
        newItem.Event = cleanArrayStr(newItem.Event, false, newItem.Name, newItem.ID);
        db.push(newItem);
        return { imported: 1, merged: 0 };
    }
    const finalDown = [newItem, ...existing].some(i => normalizeBool(i.Down ?? i.down) === 'True') ? 'True' : 'False';
    let allExp = newItem.Expiry || "";
    let allEv = newItem.Event || "";
    existing.forEach(e => {
        allExp += "/" + (e.Expiry || "");
        allEv += "/" + (e.Event || "");
    });
    let finalPooledExpiry = cleanArrayStr(allExp, true);
    newItem.Expiry = finalPooledExpiry;
    newItem.Event = cleanArrayStr(allEv, false, newItem.Name, newItem.ID);
    newItem.Down = finalDown;
    existing.forEach(e => {
        e.Expiry = finalPooledExpiry;
        e.Event = cleanArrayStr(allEv, false, e.Name, e.ID);
        e.Down = finalDown;
    });
    let perfectMatch = existing.find(e => e.Name === newItem.Name && e.Type === newItem.Type && e.C1 === newItem.C1);
    if (perfectMatch) {
        if (newItem.Locked === 'True') perfectMatch.Locked = 'True';
        mergeSupplementalFields(perfectMatch, newItem);
        return { imported: 0, merged: 1 };
    }
    let lockedExisting = existing.filter(e => e.Locked === 'True');
    let totalLocks = lockedExisting.length + (newItem.Locked === 'True' ? 1 : 0);
    if (totalLocks === 0) {
        db.push(newItem); 
        return { imported: 1, merged: 0 };
    } else if (totalLocks === 1) {
        if (newItem.Locked === 'True') {
            db = db.filter(i => i.ID !== newItem.ID);
            db.push(newItem);
            return { imported: 1, merged: existing.length };
        } else {
            return { imported: 0, merged: 1 };
        }
    } else {
        existing.forEach(e => { if(e.Locked === 'True') e.Locked = 'False'; });
        newItem.Locked = 'False';
        db.push(newItem);
        return { imported: 1, merged: 0 };
    }
}

function importCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return alert('請選擇CSV檔案');
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        let processedCount = 0; let newMergeCount = 0; let newAddCount = 0;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
            if (parts.length < 7) continue;
            let [Type, ID, Name, C1, Expiry, Event, Locked, Down, Price, Event_S, Event_P, Event_M, Event_N] = parts;
            Type = Type.toUpperCase();
            Locked = (Locked === 'True') ? 'True' : 'False';
            Down = normalizeBool(Down);
            Price = normalizePrice(Price);
            processedCount++;
            let newItem = {Type, ID, Name, C1, Expiry, Event, Locked, Down, Price, Event_S, Event_P, Event_M, Event_N};
            let res = upsertItem(newItem);
            newAddCount += res.imported;
            newMergeCount += res.merged;
        }
        stats.imported += processedCount;
        stats.merged += newMergeCount;
        saveData();
        alert(`匯入完成！共掃描 ${processedCount} 筆資料。\n(新增或衝突 ${newAddCount} 筆，成功合併 ${newMergeCount} 筆)`);
        if (document.getElementById('search').classList.contains('active')) renderSearch();
        if (document.getElementById('error').classList.contains('active')) renderError();
        if (document.getElementById('price').classList.contains('active')) renderPrice();
        if (document.getElementById('bigEvent').classList.contains('active')) renderBigEvent();
    };
    reader.readAsText(file);
}

function exportCSV() {
    let csv = "Type,ID,Name,C1,Expiry,Event,Locked,down,Price,Event_S,Event_P,Event_M,Event_N\n";
    db.forEach(row => {
        const downValue = normalizeBool(row.Down ?? row.down) === 'True' ? 'true' : 'false';
        normalizeBigEventFields(row);
        csv += `"${row.Type}","${row.ID}","${row.Name}","${row.C1}","${row.Expiry}","${row.Event}","${row.Locked}","${downValue}","${normalizePrice(row.Price)}","${row.Event_S}","${row.Event_P}","${row.Event_M}","${row.Event_N}"\n`;
    });
    downloadCSV(csv, `零售資料庫_${new Date().toISOString().slice(0,10)}.csv`);
}

function exportViewCSV() {
    let csv = "Type,ID,Name,Event\n";
    db.forEach(row => {
        csv += `"${row.Type}","${row.ID}","${row.Name}","${row.Event}"\n`;
    });
    downloadCSV(csv, `零售資料庫_檢視版_${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadCSV(csv, filename) {
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
