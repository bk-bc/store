// --- 6. 活動頁面 ---
function renderActivity() {
    const events = new Set();
    db.forEach(i => i.Event.split('/').forEach(e => { 
        if(e) events.add(e.replace(/_\d{3}$/, '')); 
    }));
    const tagsDiv = document.getElementById('activityTags');
    tagsDiv.innerHTML = '';
    events.forEach(cleanName => {
        const btn = document.createElement('button');
        btn.innerText = `✖ ${cleanName}`;
        btn.onclick = () => {
            if(confirm(`清除所有「${cleanName}」活動標籤？`)) {
                db.forEach(item => {
                    item.Event = item.Event.split('/').filter(ev => ev.replace(/_\d{3}$/, '') !== cleanName).join('/');
                });
                saveData(); renderActivity();
            }
        };
        tagsDiv.appendChild(btn);
    });
}

function searchActivity() {
    const inputElement = document.getElementById('activitySearch');
    const resDiv = document.getElementById('activitySearchResult');
    if (!inputElement || !resDiv) return;
    const inputText = inputElement.value.trim();
    if (!inputText) { resDiv.innerHTML = ''; return; }
    const lines = inputText.split('\n').map(line => line.trim()).filter(Boolean);
    let foundItems = [], missingItems = [];
    lines.forEach(keyword => {
        let match = findActivityMatchesNameFirst(keyword)[0];
        if (match) foundItems.push(match);
        else missingItems.push(keyword);
    });
    resDiv.innerHTML = '';
    if (foundItems.length > 0) {
        const foundTitle = document.createElement('div');
        foundTitle.style.fontWeight = 'bold';
        foundTitle.style.color = '#28a745';
        foundTitle.style.marginTop = '10px';
        foundTitle.innerText = `✅ 已找到 (${foundItems.length} 筆)：`;
        resDiv.appendChild(foundTitle);
        foundItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.padding = '5px';
            itemDiv.style.borderBottom = '1px solid #eee';
            itemDiv.innerText = `${item.ID} - ${item.Name} (${item.C1})`;
            resDiv.appendChild(itemDiv);
        });
    }
    if (missingItems.length > 0) {
        const missingContainer = document.createElement('div');
        missingContainer.style.marginTop = '15px';
        missingContainer.style.padding = '10px';
        missingContainer.style.border = '1px solid #ff4d4f';
        missingContainer.style.borderRadius = '4px';
        missingContainer.style.backgroundColor = '#fff1f0';
        missingContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #ff4d4f; font-weight: bold;">❌ 未搜尋到 (${missingItems.length} 筆)：</span>
                <button onclick="copyMissingToClipboard()" style="font-size: 12px; padding: 2px 8px; cursor: pointer;">一鍵複製</button>
            </div>
            <textarea id="missingItemsTextarea" readonly style="width: 100%; height: 100px; font-size: 12px; border: 1px solid #ffa39e; padding: 5px;">${missingItems.join('\n')}</textarea>
        `;
        resDiv.appendChild(missingContainer);
    }
}

function findActivityMatchesNameFirst(keyword) {
    const lowerKW = keyword.trim().toLowerCase();
    const nameMatches = db.filter(item =>
        item.Name && item.Name.toLowerCase().includes(lowerKW)
    );
    if (nameMatches.length > 0) return nameMatches;
    return db.filter(item =>
        item.ID && item.ID.toLowerCase().includes(lowerKW)
    );
}

function copyMissingToClipboard() {
    const textArea = document.getElementById('missingItemsTextarea');
    if (textArea) { textArea.select(); document.execCommand('copy'); alert('未找到名單已複製！'); }
}

function addActivity() {
    const evName = document.getElementById('activityInput').value.trim();
    if(!evName) return alert('請輸入活動名稱');
    const text = document.getElementById('activitySearch').value;
    const keywords = text.split('\n').filter(k => k.trim());
    let added = 0;
    let seq = 1;
    keywords.forEach(kw => {
        let matches = findActivityMatchesNameFirst(kw);
        matches.forEach(item => {
            item.Event = item.Event.split('/').filter(e => e.replace(/_\d{3}$/, '') !== evName).join('/');
            let seqStr = seq.toString().padStart(3, '0');
            let newEv = `${evName}_${seqStr}`;
            item.Event = cleanArrayStr(`${item.Event}/${newEv}`, false, item.Name, item.ID);
            added++;
        });
        if (matches.length > 0) seq++; 
    });
    saveData();
    alert(`已成功加入 ${added} 筆活動標籤`);
    renderActivity();
}
