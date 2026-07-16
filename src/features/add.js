// --- 1. 新增功能 ---
function renderAddType() { }
function addItems() {
    const type = document.getElementById('addType').value;
    const text = document.getElementById('addInput').value;
    const lines = text.split('\n').filter(l => l.trim());
    let processed = 0; let added = 0; let merged = 0;
    lines.forEach(line => {
        const [ID, Name] = line.split('/');
        if (ID && Name) {
            processed++;
            let newItem = { Type: type, ID: ID.trim(), Name: Name.trim(), C1: '未分類', Expiry: '', Event: '', Locked: 'False', Down: 'False', Price: '0' };
            let res = upsertItem(newItem);
            added += res.imported;
            merged += res.merged;
        }
    });
    stats.imported += processed;
    stats.merged += merged;
    saveData();
    document.getElementById('addInput').value = '';
    alert(`成功處理 ${processed} 筆資料\n(新增或衝突 ${added} 筆，成功合併 ${merged} 筆)`);
}
