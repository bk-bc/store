// --- 1. 新增功能 ---
let currentAddFileIndex = null;
let currentAddFileType = 'EAN8';
let currentAddItemFileIndex = null;
let currentAddItemFileType = 'EAN8';
let currentAddItemFileConflict = null;

function renderAddType() {
    switchAddMode('normal');
}

function switchAddMode(mode) {
    const panels = {
        normal: 'addNormalPanel',
        price: 'addPricePanel',
        barcode: 'addBarcodePanel',
        file: 'addFilePanel',
        itemCode: 'addItemCodePanel',
        itemFile: 'addItemFilePanel',
    };
    Object.entries(panels).forEach(([key, id]) => {
        document.getElementById(id).style.display = key === mode ? 'block' : 'none';
    });
    document.getElementById('addModeNormal').classList.toggle('active', mode === 'normal');
    document.getElementById('addModePrice').classList.toggle('active', mode === 'price');
    document.getElementById('addModeBarcode').classList.toggle('active', mode === 'barcode');
    document.getElementById('addModeFile').classList.toggle('active', mode === 'file');
    document.getElementById('addModeItemCode').classList.toggle('active', mode === 'itemCode');
    document.getElementById('addModeItemFile').classList.toggle('active', mode === 'itemFile');
    if (mode === 'file') renderAddFile();
    if (mode === 'itemFile') {
        renderAddItemFile();
        focusAddItemFileIdInput();
    }
}

function addItems() {
    const type = document.getElementById('addType').value;
    const text = document.getElementById('addInput').value;
    const lines = text.split('\n').filter(l => l.trim());
    let processed = 0; let added = 0; let merged = 0;
    lines.forEach(line => {
        const [ID, Name] = line.split('/');
        if (ID && Name) {
            processed++;
            let newItem = { Type: type, ID: ID.trim(), Name: Name.trim(), C1: '未分類', Expiry: '', Event: '', Locked: 'False', Down: 'False', Price: '0', Event_S: '', Event_P: '', Event_M: '', Event_N: '' };
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

function addItemsWithPrice() {
    const type = document.getElementById('addPriceType').value;
    const text = document.getElementById('addPriceInput').value;
    const lines = text.split('\n').filter(l => l.trim());
    let processed = 0; let added = 0; let merged = 0;
    lines.forEach(line => {
        const [ID, Name, Price] = line.split('/');
        if (ID && Name && Price !== undefined) {
            processed++;
            let newItem = { Type: type, ID: ID.trim(), Name: Name.trim(), C1: '未分類', Expiry: '', Event: '', Locked: 'False', Down: 'False', Price: normalizePrice(Price), Event_S: '', Event_P: '', Event_M: '', Event_N: '' };
            let res = upsertItem(newItem);
            added += res.imported;
            merged += res.merged;
        }
    });
    stats.imported += processed;
    stats.merged += merged;
    saveData();
    document.getElementById('addPriceInput').value = '';
    alert(`成功處理 ${processed} 筆資料\n(新增或衝突 ${added} 筆，成功合併 ${merged} 筆)`);
}

function createEmptyRetailItem(type, id, name, price = '0') {
    return { Type: type, ID: id, Name: name, C1: '未分類', Expiry: '', Event: '', Locked: 'False', Down: 'False', Price: normalizePrice(price), Event_S: '', Event_P: '', Event_M: '', Event_N: '' };
}

function addNewBarcodes() {
    const text = document.getElementById('addBarcodeInput').value;
    const ids = text.split('\n').map(line => line.trim()).filter(Boolean);
    let skipped = 0;
    let added = 0;
    ids.forEach(id => {
        if (db.some(item => item.ID === id)) {
            skipped++;
            return;
        }
        const res = upsertItem(createEmptyRetailItem('', id, '000000'));
        added += res.imported;
    });
    stats.imported += added;
    saveData();
    document.getElementById('addBarcodeInput').value = '';
    document.getElementById('addBarcodeStatus').innerText = `新增 ${added} 筆，略過已存在 ${skipped} 筆`;
}

function getPendingAddFileItems() {
    return db
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.Name === '000000');
}

function renderAddFile() {
    const result = document.getElementById('addFileResult');
    const pending = getPendingAddFileItems();
    if (!result) return;
    if (pending.length === 0) {
        currentAddFileIndex = null;
        result.innerHTML = '<div class="card">目前沒有 Name 為 000000 的待建檔項目。</div>';
        return;
    }
    const pick = pending[Math.floor(Math.random() * pending.length)];
    currentAddFileIndex = pick.idx;
    currentAddFileType = pick.item.Type || 'EAN8';
    result.innerHTML = `
        <div class="card">
            <div class="card-title">${pick.item.ID}</div>
            <div class="nav-buttons" style="margin-bottom: 10px;">
                <button onclick="selectAddFileType('EAN8')" id="addFileTypeEAN8">EAN8</button>
                <button onclick="selectAddFileType('EAN13')" id="addFileTypeEAN13">EAN13</button>
                <button onclick="selectAddFileType('UPCA')" id="addFileTypeUPCA">UPCA</button>
                <button onclick="selectAddFileType('UPCE')" id="addFileTypeUPCE">UPCE</button>
            </div>
            <div class="barcode-wrapper"><svg id="addFileBarcode" class="barcode"></svg></div>
            <input type="text" id="addFileNameInput" placeholder="輸入 Name">
            <button class="btn-primary" onclick="saveAddFileItem()" style="width:100%;">建檔</button>
            <div id="addFileStatus" class="qa-add-status"></div>
        </div>
    `;
    selectAddFileType(currentAddFileType);
}

function selectAddFileType(type) {
    currentAddFileType = type;
    ['EAN8', 'EAN13', 'UPCA', 'UPCE'].forEach(option => {
        const btn = document.getElementById(`addFileType${option}`);
        if (btn) btn.classList.toggle('active', option === type);
    });
    const item = db[currentAddFileIndex];
    if (item) renderBarcode('addFileBarcode', item.ID, type);
}

function saveAddFileItem() {
    const item = db[currentAddFileIndex];
    const input = document.getElementById('addFileNameInput');
    if (!item || !input) return;
    const name = input.value.trim();
    if (!name) return alert('請輸入 Name');
    item.Type = currentAddFileType;
    item.Name = name;
    saveData();
    renderAddFile();
}

function addNewItemCodes() {
    const text = document.getElementById('addItemCodeInput').value;
    const names = text.split('\n').map(line => line.trim()).filter(Boolean);
    let skipped = 0;
    let added = 0;
    let invalid = 0;
    names.forEach(name => {
        if (db.some(item => item.Name === name)) {
            skipped++;
            return;
        }
        if (!/^\d{6}/.test(name.substring(0, 6))) {
            invalid++;
            return;
        }
        db.push(createEmptyRetailItem('', '00000000000000', name));
        added++;
    });
    stats.imported += added;
    saveData();
    document.getElementById('addItemCodeInput').value = '';
    document.getElementById('addItemCodeStatus').innerText = `新增 ${added} 筆，略過已存在 ${skipped} 筆，格式不符 ${invalid} 筆`;
}

function getPendingAddItemFileItems() {
    return db
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.ID === '00000000000000');
}

function renderAddItemFile() {
    const result = document.getElementById('addItemFileResult');
    const pending = getPendingAddItemFileItems();
    if (!result) return;
    if (pending.length === 0) {
        currentAddItemFileIndex = null;
        result.innerHTML = '<div class="card">目前沒有 ID 為 00000000000000 的待建檔項目。</div>';
        return;
    }
    const pick = pending[Math.floor(Math.random() * pending.length)];
    currentAddItemFileIndex = pick.idx;
    currentAddItemFileType = pick.item.Type || 'EAN8';
    currentAddItemFileConflict = null;
    result.innerHTML = `
        <div class="card">
            <div class="card-title">${pick.item.Name}</div>
            <div class="barcode-wrapper"><svg id="addItemFileNameBarcode" class="barcode"></svg></div>
            <input type="text" id="addItemFileIdInput" placeholder="輸入 ID" oninput="handleAddItemFileIdInput()">
            <div class="nav-buttons" style="margin-bottom: 10px;">
                <button onclick="selectAddItemFileType('EAN8')" id="addItemFileTypeEAN8">EAN8</button>
                <button onclick="selectAddItemFileType('EAN13')" id="addItemFileTypeEAN13">EAN13</button>
                <button onclick="selectAddItemFileType('UPCA')" id="addItemFileTypeUPCA">UPCA</button>
                <button onclick="selectAddItemFileType('UPCE')" id="addItemFileTypeUPCE">UPCE</button>
                <button onclick="selectAddItemFileType('I35')" id="addItemFileTypeI35">I35</button>
                <button onclick="selectAddItemFileType('I24')" id="addItemFileTypeI24">I24</button>
            </div>
            <div class="barcode-wrapper"><svg id="addItemFileBarcode" class="barcode"></svg></div>
            <div id="addItemFileConflict"></div>
            <button class="btn-primary" onclick="saveAddItemFileItem()" style="width:100%;">建檔</button>
            <div id="addItemFileStatus" class="qa-add-status"></div>
        </div>
    `;
    renderAddItemFileNameBarcode();
    selectAddItemFileType(currentAddItemFileType);
}

function renderAddItemFileNameBarcode() {
    const item = db[currentAddItemFileIndex];
    const svg = document.getElementById('addItemFileNameBarcode');
    if (!item || !svg) return;
    const prefix = item.Name.substring(0, 6);
    svg.innerHTML = '';
    if (!prefix) return;
    renderBarcode('addItemFileNameBarcode', prefix, 'CODE39');
}

function focusAddItemFileIdInput() {
    setTimeout(() => document.getElementById('addItemFileIdInput')?.focus(), 0);
}

function selectAddItemFileType(type) {
    currentAddItemFileType = type;
    ['EAN8', 'EAN13', 'UPCA', 'UPCE', 'I35', 'I24'].forEach(option => {
        const btn = document.getElementById(`addItemFileType${option}`);
        if (btn) btn.classList.toggle('active', option === type);
    });
    if (type === 'I35' || type === 'I24') {
        fillAddItemFileFreshId();
    }
    renderAddItemFileBarcode();
}

function handleAddItemFileIdInput() {
    const input = document.getElementById('addItemFileIdInput');
    const id = input ? input.value.trim() : '';
    currentAddItemFileConflict = null;
    renderAddItemFileConflict();
    if (/^\d{12}$/.test(id)) {
        selectAddItemFileType('UPCA');
        return;
    }
    if (/^\d{13}$/.test(id)) {
        selectAddItemFileType('EAN13');
        return;
    }
    renderAddItemFileBarcode();
}

function fillAddItemFileFreshId() {
    const item = db[currentAddItemFileIndex];
    const input = document.getElementById('addItemFileIdInput');
    const status = document.getElementById('addItemFileStatus');
    if (!item || !input) return;
    const prefix = item.Name.substring(0, 6);
    if (!/^\d{6}$/.test(prefix)) {
        if (status) status.innerText = 'Name 前六字需為數字，無法自動產生 ID';
        return;
    }
    const digits7 = `2${prefix}`;
    input.value = `${digits7}${calcEAN8Check(digits7)}`;
    if (status) status.innerText = '';
}

function renderAddItemFileConflict() {
    const target = document.getElementById('addItemFileConflict');
    if (!target) return;
    if (!currentAddItemFileConflict) {
        target.innerHTML = '';
        return;
    }
    const { existingItem, pendingItem, selectedName } = currentAddItemFileConflict;
    target.innerHTML = `
        <div class="qa-add-status">此 ID 已存在，請選擇要保留的 Name 後再按建檔。</div>
        <div class="nav-buttons" style="margin-bottom: 10px;">
            <button onclick="selectAddItemFileConflictName('existing')" id="addItemFileConflictExisting" class="${selectedName === existingItem.Name ? 'active' : ''}">${existingItem.Name}</button>
            <button onclick="selectAddItemFileConflictName('pending')" id="addItemFileConflictPending" class="${selectedName === pendingItem.Name ? 'active' : ''}">${pendingItem.Name}</button>
        </div>
    `;
}

function selectAddItemFileConflictName(source) {
    if (!currentAddItemFileConflict) return;
    const selectedItem = source === 'existing'
        ? currentAddItemFileConflict.existingItem
        : currentAddItemFileConflict.pendingItem;
    currentAddItemFileConflict.selectedSource = source;
    currentAddItemFileConflict.selectedName = selectedItem.Name;
    renderAddItemFileConflict();
    focusAddItemFileIdInput();
}

function renderAddItemFileBarcode() {
    const input = document.getElementById('addItemFileIdInput');
    const svg = document.getElementById('addItemFileBarcode');
    if (!input || !svg) return;
    const id = input.value.trim();
    svg.innerHTML = '';
    if (!id) return;
    renderBarcode('addItemFileBarcode', id, currentAddItemFileType);
}

function saveAddItemFileItem() {
    const item = db[currentAddItemFileIndex];
    const input = document.getElementById('addItemFileIdInput');
    if (!item || !input) return;
    const id = input.value.trim();
    if (!id) return alert('請輸入 ID');
    const duplicateIndex = db.findIndex((row, idx) => idx !== currentAddItemFileIndex && row.ID === id);
    if (duplicateIndex !== -1 && (!currentAddItemFileConflict || currentAddItemFileConflict.id !== id)) {
        currentAddItemFileConflict = {
            id,
            existingItem: db[duplicateIndex],
            pendingItem: item,
            selectedSource: null,
            selectedName: '',
        };
        renderAddItemFileConflict();
        focusAddItemFileIdInput();
        return;
    }
    if (currentAddItemFileConflict && currentAddItemFileConflict.id === id) {
        if (!currentAddItemFileConflict.selectedName) return alert('請先選擇要保留的 Name');
        const selectedItem = currentAddItemFileConflict.selectedSource === 'existing'
            ? currentAddItemFileConflict.existingItem
            : currentAddItemFileConflict.pendingItem;
        const newItem = { ...selectedItem, Type: currentAddItemFileType, ID: id, Name: currentAddItemFileConflict.selectedName };
        db = db.filter(row => row !== currentAddItemFileConflict.existingItem && row !== currentAddItemFileConflict.pendingItem);
        db.push(newItem);
        currentAddItemFileConflict = null;
        saveData();
        renderAddItemFile();
        focusAddItemFileIdInput();
        return;
    }
    item.Type = currentAddItemFileType;
    item.ID = id;
    saveData();
    renderAddItemFile();
    focusAddItemFileIdInput();
}

function calcEAN8Check(digits7) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
        sum += parseInt(digits7[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    return ((10 - (sum % 10)) % 10).toString();
}
