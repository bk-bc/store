// --- 3. 勘誤頁面 ---
function renderError() {
    const { conflicts, totalDupItems, totalDupBatches } = getConflictStats();
    document.getElementById('errorStats').innerText = `總重複筆數: ${totalDupItems} | 總批數: ${totalDupBatches}`;
    const res = document.getElementById('errorResult');
    res.innerHTML = '';
    conflicts.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';
        let html = `<div class="card-title">ID: ${c.id}</div>`;
        ['types', 'names', 'c1s'].forEach((cat, idx) => {
            let colorClass = idx === 0 ? 'btn-pink' : (idx === 1 ? 'btn-yellow' : 'btn-lightblue');
            html += `<div class="card-actions">`;
            c[cat].forEach(val => {
                html += `<button class="${colorClass}" onclick="resolveConflict('${c.id}', '${cat}', '${val}')">${val}</button>`;
            });
            html += `</div>`;
        });
        if (c.types.length === 1 && c.names.length === 1 && c.c1s.length === 1) {
            html += `<div class="card-actions" style="margin-top:15px;"><button class="btn-primary" style="width:100%" onclick="mergeConflict('${c.id}')">🔒鎖定合併</button></div>`;
        }
        card.innerHTML = html;
        res.appendChild(card);
    });
}

function resolveConflict(id, category, value) {
    db.filter(i => i.ID === id).forEach(item => {
        if(category === 'types') item.Type = value;
        if(category === 'names') item.Name = value;
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
