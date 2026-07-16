// --- 5. 分類頁面 ---
function renderClassify() {
    const c1s = [...new Set(db.map(i=>i.C1).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-TW'));
    const sel = document.getElementById('classifySelect');
    sel.innerHTML = `<option value="">選擇分類</option><option value="NEW_CATEGORY">-- 新增分類 --</option>`;
    c1s.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
    document.getElementById('newCategoryInput').style.display = 'none';
    const res = document.getElementById('classifyResult');
    let unclass = db.filter(i => i.C1 === '未分類').slice(0, 50);
    let html = '';
    unclass.forEach(item => {
        html += `<div class="card flex-row">
                    <input type="checkbox" class="class-chk" value="${item.ID}" style="flex:0; width:20px; height:20px;">
                    <span style="flex:1">${item.Name}</span>
                 </div>`;
    });
    res.innerHTML = html;
}

function handleClassifySelect() {
    if(document.getElementById('classifySelect').value === 'NEW_CATEGORY') {
        document.getElementById('newCategoryInput').style.display = 'block';
    } else {
        document.getElementById('newCategoryInput').style.display = 'none';
    }
}

function applyClassification() {
    let targetC1 = document.getElementById('classifySelect').value;
    if (targetC1 === 'NEW_CATEGORY') targetC1 = document.getElementById('newCategoryInput').value.trim();
    if (!targetC1) return alert("請輸入或選擇分類");
    const checkedIds = Array.from(document.querySelectorAll('.class-chk:checked')).map(cb => cb.value);
    if(!checkedIds.length) return alert("請勾選項目");
    db.forEach(item => { if(checkedIds.includes(item.ID)) item.C1 = targetC1; });
    saveData(); renderClassify();
}
