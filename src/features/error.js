// --- 3. 勘誤頁面 ---
let currentErrorMode = 'id';

function switchErrorMode(mode) {
    currentErrorMode = mode;
    document.getElementById('errorModeId').classList.toggle('active', mode === 'id');
    document.getElementById('errorModeNamePrefix').classList.toggle('active', mode === 'namePrefix');
    renderError();
}

function renderError() {
    if (currentErrorMode === 'namePrefix') {
        renderNamePrefixError();
    } else {
        renderIdError();
    }
}

function renderIdError() {
    const { conflicts, totalDupItems, totalDupBatches } = getConflictStats();
    document.getElementById('errorStats').innerText = `同ID不同品名 | 總重複筆數: ${totalDupItems} | 總批數: ${totalDupBatches}`;
    const res = document.getElementById('errorResult');
    res.innerHTML = '';
    conflicts.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';
        let html = `<div class="card-title">ID: ${escapeHtml(c.id)}</div>`;
        [
            { key: 'types', label: 'Type', colorClass: 'btn-pink' },
            { key: 'names', label: 'Name', colorClass: 'btn-yellow' },
            { key: 'c1s', label: 'C1', colorClass: 'btn-lightblue' },
        ].forEach(cat => {
            html += `<div class="card-sub">${cat.label}</div><div class="card-actions">`;
            c[cat.key].forEach(val => {
                html += `<button class="${cat.colorClass}" onclick="resolveConflict(${jsString(c.id)}, ${jsString(cat.key)}, ${jsString(val)})">${escapeHtml(val)}</button>`;
            });
            html += `</div>`;
        });
        if (c.types.length === 1 && c.names.length === 1 && c.c1s.length === 1) {
            html += `<div class="card-actions" style="margin-top:15px;"><button class="btn-primary" style="width:100%" onclick="mergeConflict(${jsString(c.id)})">🔒鎖定合併</button></div>`;
        }
        card.innerHTML = html;
        res.appendChild(card);
    });
}

function renderNamePrefixError() {
    const { conflicts, totalItems, totalBatches } = getNamePrefixConflictStats();
    document.getElementById('errorStats').innerText = `同品號不同ID | 總筆數: ${totalItems} | 總批數: ${totalBatches}`;
    const res = document.getElementById('errorResult');
    res.innerHTML = '';
    conflicts.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';
        let html = `<div class="card-title">Name前六碼: ${escapeHtml(c.prefix)}</div>`;
        [
            { key: 'names', label: 'Name', colorClass: 'btn-yellow' },
            { key: 'ids', label: 'ID', colorClass: 'btn-primary' },
            { key: 'types', label: 'Type', colorClass: 'btn-pink' },
            { key: 'c1s', label: 'C1', colorClass: 'btn-lightblue' },
        ].forEach(cat => {
            html += `<div class="card-sub">${cat.label}</div><div class="card-actions">`;
            c[cat.key].forEach(val => {
                html += `<button class="${cat.colorClass}" onclick="resolveNamePrefixConflict(${jsString(c.prefix)}, ${jsString(cat.key)}, ${jsString(val)})">${escapeHtml(val)}</button>`;
            });
            html += `</div>`;
        });
        card.innerHTML = html;
        res.appendChild(card);
    });
}

function getNamePrefixConflictStats() {
    const groups = {};
    db.forEach(item => {
        const prefix = String(item.Name || '').substring(0, 6);
        if (!prefix) return;
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(item);
    });

    const conflicts = [];
    let totalItems = 0;
    let totalBatches = 0;
    for (const [prefix, group] of Object.entries(groups)) {
        if (group.length <= 1) continue;
        const names = uniqueValues(group.map(i => i.Name));
        const ids = uniqueValues(group.map(i => i.ID));
        const types = uniqueValues(group.map(i => i.Type));
        const c1s = uniqueValues(group.map(i => i.C1));
        if (ids.length > 1 || names.length > 1 || types.length > 1 || c1s.length > 1) {
            totalItems += group.length;
            totalBatches++;
            conflicts.push({ prefix, group, names, ids, types, c1s });
        }
    }

    conflicts.sort((a, b) => a.prefix.localeCompare(b.prefix));
    return { conflicts, totalItems, totalBatches };
}

function uniqueValues(values) {
    return [...new Set(values.map(value => value || ''))];
}

function resolveConflict(id, category, value) {
    db.filter(i => i.ID === id).forEach(item => {
        if(category === 'types') item.Type = value;
        if(category === 'names') item.Name = value;
        if(category === 'c1s') item.C1 = value;
    });
    saveData(); renderError();
}

function resolveNamePrefixConflict(prefix, category, value) {
    db.filter(item => String(item.Name || '').substring(0, 6) === prefix).forEach(item => {
        if(category === 'names') item.Name = value;
        if(category === 'ids') item.ID = value;
        if(category === 'types') item.Type = value;
        if(category === 'c1s') item.C1 = value;
    });
    saveData(); renderError();
}

function mergeConflict(id) {
    let group = db.filter(i => i.ID === id);
    let master = group[0];
    let allExpiry = group.map(i => i.Expiry).join('/');
    let allEvent = group.map(i => i.Event).join('/');
    master.Expiry = cleanArrayStr(allExpiry, true);
    master.Event = cleanArrayStr(allEvent, false, master.Name, master.ID);
    master.Locked = 'True';
    db = db.filter(i => i.ID !== id);
    db.push(master);
    saveData(); renderError();
}

function jsString(value) {
    return JSON.stringify(String(value ?? ''));
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));
}
