// FIREBASE ANAHTARI VE BAĞLANTISI
const firebaseConfig = {
    apiKey: "AIzaSyAeRhRQfjUB84XP0zg8CM9I1XNE-gtuaWM",
    authDomain: "panzico-dc5a8.firebaseapp.com",
    projectId: "panzico-dc5a8",
    storageBucket: "panzico-dc5a8.firebasestorage.app",
    messagingSenderId: "860245412317",
    appId: "1:860245412317:web:101501d355caec828b4e34",
    measurementId: "G-LPWD7SBMMT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let state = {
    catalog: [], stocks: [], sales: [], partners: [], tahsilatlar: []
};

let editingSaleId = null;
let currentActiveSaleId = null; 

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initEventListeners();
    setDefaultDates(); // Sayfa açılırken tüm takvimleri "Bugün" yapar
    listenToCloudData();
});

// --- YARDIMCI FONKSİYONLAR (TARİH) ---
// Takvim formuna verilecek YYYY-MM-DD formatı
function getTodayForInput() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Tablolarda gösterilecek GG.AA.YYYY formatı
function formatDateForDisplay(dateStr) {
    if(!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; 
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy}`;
}

// Tüm form tarihlerini bugüne ayarlar
function setDefaultDates() {
    const today = getTodayForInput();
    if(document.getElementById("stockDate")) document.getElementById("stockDate").value = today;
    if(document.getElementById("quickExpenseDate")) document.getElementById("quickExpenseDate").value = today;
    if(document.getElementById("saleDate")) document.getElementById("saleDate").value = today;
    if(document.getElementById("partDate")) document.getElementById("partDate").value = today;
}


function listenToCloudData() {
    db.collection("catalog").onSnapshot((snapshot) => {
        state.catalog = [];
        snapshot.forEach((doc) => state.catalog.push({ id: doc.id, ...doc.data() }));
        renderCatalogDropdowns();
    });

    db.collection("stocks").onSnapshot((snapshot) => {
        state.stocks = [];
        snapshot.forEach((doc) => state.stocks.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    db.collection("sales").onSnapshot((snapshot) => {
        state.sales = [];
        snapshot.forEach((doc) => state.sales.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    db.collection("partners").onSnapshot((snapshot) => {
        state.partners = [];
        snapshot.forEach((doc) => state.partners.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    db.collection("tahsilatlar").onSnapshot((snapshot) => {
        state.tahsilatlar = [];
        snapshot.forEach((doc) => state.tahsilatlar.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });
}

function initTabs() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            navButtons.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
        });
    });
}

function initEventListeners() {
    document.getElementById("calcForm").addEventListener("submit", (e) => { e.preventDefault(); calculateTuftingCost(); });
    document.getElementById("catalogForm").addEventListener("submit", (e) => { e.preventDefault(); addCatalogItem(); });
    document.getElementById("stockForm").addEventListener("submit", (e) => { e.preventDefault(); addStockAndExpense(); });
    document.getElementById("quickExpenseForm").addEventListener("submit", (e) => { e.preventDefault(); addQuickExpense(); });
    document.getElementById("saleForm").addEventListener("submit", (e) => { e.preventDefault(); saveSaleRecord(); });
    document.getElementById("partnerForm").addEventListener("submit", (e) => { e.preventDefault(); addPartnerTransaction(); });
    document.getElementById("modalTahsilatForm").addEventListener("submit", (e) => { e.preventDefault(); submitTahsilatModal(); });
}

// --- 1. KATALOG ---
function addCatalogItem() {
    db.collection("catalog").add({
        category: document.getElementById("catalogCategory").value,
        name: document.getElementById("catalogName").value,
        unit: document.getElementById("catalogUnit").value || ""
    });
    document.getElementById("catalogForm").reset();
}

function renderCatalogDropdowns() {
    const stockSelect = document.getElementById("stockItemSelect");
    const quickSelect = document.getElementById("quickExpenseItem");
    
    let html = `<option value="">Seçim Yapın...</option>`;
    state.catalog.forEach(c => {
        html += `<option value="${c.id}">${c.name} (${c.category})</option>`;
    });
    
    stockSelect.innerHTML = html;
    quickSelect.innerHTML = html;
}

// --- 2. STOK / GİDER YÖNETİMİ ---
function addStockAndExpense() {
    const catalogItem = state.catalog.find(c => c.id === document.getElementById("stockItemSelect").value);
    if (!catalogItem) { alert("Lütfen katalogdan bir kalem seçin!"); return; }

    db.collection("stocks").add({ 
        catalogId: catalogItem.id, 
        category: catalogItem.category, 
        name: catalogItem.name, 
        qty: parseFloat(document.getElementById("stockQty").value), 
        unit: catalogItem.unit, 
        threshold: parseFloat(document.getElementById("stockThreshold").value) || 0, 
        cost: parseFloat(document.getElementById("stockTotalCost").value), 
        payer: document.getElementById("stockPayer").value,
        date: document.getElementById("stockDate").value
    });
    
    document.getElementById("stockForm").reset();
    setDefaultDates(); // Form temizlenince takvimi tekrar bugüne kur
}

function addQuickExpense() {
    const catalogItem = state.catalog.find(c => c.id === document.getElementById("quickExpenseItem").value);
    if (!catalogItem) { alert("Lütfen katalogdan bir kalem seçin!"); return; }

    db.collection("stocks").add({ 
        catalogId: catalogItem.id, 
        category: catalogItem.category, 
        name: catalogItem.name, 
        qty: 0, 
        unit: catalogItem.unit, 
        threshold: 0, 
        cost: parseFloat(document.getElementById("quickExpenseAmount").value), 
        payer: document.getElementById("quickExpensePayer").value,
        date: document.getElementById("quickExpenseDate").value
    });
    
    document.getElementById("quickExpenseForm").reset();
    setDefaultDates();
}

function renderStockTable() {
    const tbody = document.getElementById("stockTableBody");
    tbody.innerHTML = "";
    
    let stockSummary = {};
    state.stocks.forEach(s => {
        if (!stockSummary[s.name]) {
            stockSummary[s.name] = { ...s };
        } else {
            stockSummary[s.name].qty += s.qty;
        }
    });

    Object.values(stockSummary).forEach(s => {
        if (s.qty === 0 && s.threshold === 0) return; 
        
        const isCritical = s.qty <= s.threshold;
        const unitText = s.unit ? ` ${s.unit}` : "";
        
        tbody.innerHTML += `
            <tr>
                <td>${s.category}</td>
                <td>${s.name}</td>
                <td style="font-weight:bold; color:${isCritical ? '#e74c3c' : '#fff'}">${s.qty}${unitText}</td>
                <td>${s.threshold}${unitText}</td>
                <td><button class="delete-btn" onclick="deleteDocument('stocks', '${s.id}')">Sil</button></td>
            </tr>`;
    });
}

// --- 3. SATIŞ SİSTEMİ & GELİŞMİŞ TAHSİLAT ---
function saveSaleRecord() {
    const saleData = {
        customer: document.getElementById("saleCustomer").value,
        model: document.getElementById("saleModel").value,
        price: parseFloat(document.getElementById("salePrice").value),
        paid: parseFloat(document.getElementById("salePaid").value),
        date: document.getElementById("saleDate").value
    };

    if (editingSaleId) {
        db.collection("sales").doc(editingSaleId).update(saleData);
        editingSaleId = null;
        document.querySelector("#saleForm button").innerText = "Satışı Kaydet";
        document.querySelector("#saleForm button").style.backgroundColor = "";
    } else {
        db.collection("sales").add(saleData);
    }
    document.getElementById("saleForm").reset();
    setDefaultDates();
}

function editSale(id) {
    const sale = state.sales.find(s => s.id === id);
    
    // Geçmiş verilerde saat varsa ayırarak sadece tarihi alır
    const parsedDate = sale.date ? sale.date.substring(0,10) : getTodayForInput();

    document.getElementById("saleCustomer").value = sale.customer;
    document.getElementById("saleModel").value = sale.model;
    document.getElementById("salePrice").value = sale.price;
    document.getElementById("salePaid").value = sale.paid;
    document.getElementById("saleDate").value = parsedDate;
    
    editingSaleId = id;
    const submitBtn = document.querySelector("#saleForm button");
    submitBtn.innerText = "Satışı Güncelle";
    submitBtn.style.backgroundColor = "#f39c12";
    
    document.getElementById("saleForm").scrollIntoView({ behavior: 'smooth' });
}

function receivePayment(id) {
    const sale = state.sales.find(s => s.id === id);
    if (!sale) return;

    currentActiveSaleId = id;
    const remaining = sale.price - sale.paid;

    document.getElementById("modalCustomerInfo").innerHTML = `
        <strong>Müşteri:</strong> ${sale.customer}<br>
        <strong>Model/Ölçü:</strong> ${sale.model}<br>
        <strong>Kalan Toplam Borç:</strong> <span style="color:#f1c40f; font-weight:bold;">${formatCurrency(remaining)}</span>
    `;
    
    document.getElementById("modalAmount").value = remaining;
    document.getElementById("modalAmount").max = remaining;
    document.getElementById("modalDate").value = getTodayForInput(); // Modalı açarken tarihi bugüne kur
    document.getElementById("tahsilatModal").style.display = "flex";
}

function closeTahsilatModal() {
    document.getElementById("tahsilatModal").style.display = "none";
    document.getElementById("modalTahsilatForm").reset();
    currentActiveSaleId = null;
}

function submitTahsilatModal() {
    const sale = state.sales.find(s => s.id === currentActiveSaleId);
    if (!sale) return;

    const amount = parseFloat(document.getElementById("modalAmount").value);
    const collector = document.getElementById("modalCollector").value;
    const tDate = document.getElementById("modalDate").value;
    const remaining = sale.price - sale.paid;

    if (isNaN(amount) || amount <= 0 || amount > remaining) {
        alert("Lütfen kalan borç tutarını aşmayacak geçerli bir miktar girin!");
        return;
    }

    db.collection("tahsilatlar").add({
        saleId: currentActiveSaleId,
        customer: sale.customer,
        model: sale.model,
        amount: amount,
        collector: collector,
        date: tDate
    })
    .then(() => {
        const updatedPaid = sale.paid + amount;
        return db.collection("sales").doc(currentActiveSaleId).update({ paid: updatedPaid });
    })
    .then(() => {
        alert(`Tahsilat başarıyla ${collector} cari hesabına işlendi!`);
        closeTahsilatModal();
    })
    .catch(err => {
        alert("Hata oluştu: " + err);
    });
}

function renderSalesTable() {
    const tbody = document.getElementById("salesTableBody");
    tbody.innerHTML = "";
    
    state.sales.forEach(s => {
        const remaining = s.price - s.paid;
        tbody.innerHTML += `
            <tr>
                <td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(s.date)}</td>
                <td>${s.customer}</td>
                <td>${s.model}</td>
                <td>${formatCurrency(s.price)}</td>
                <td style="color:#2ecc71">${formatCurrency(s.paid)}</td>
                <td style="font-weight:bold; color:${remaining > 0 ? '#f1c40f' : '#aaa'}">${formatCurrency(remaining)}</td>
                <td style="display: flex; gap: 10px;">
                    ${remaining > 0 ? `<button style="background:none; border:none; color:#2ecc71; font-weight:bold; cursor:pointer;" onclick="receivePayment('${s.id}')">Tahsilat Al</button>` : ''}
                    <button style="background:none; border:none; color:#3498db; cursor:pointer;" onclick="editSale('${s.id}')">Düzenle</button>
                    <button class="delete-btn" onclick="deleteDocument('sales', '${s.id}')">Sil</button>
                </td>
            </tr>`;
    });
}

function renderDashboardDebtors() {
    const tbody = document.getElementById("dashDebtorsTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    let hasDebtor = false;

    state.sales.forEach(s => {
        const remaining = s.price - s.paid;
        if (remaining > 0) {
            hasDebtor = true;
            tbody.innerHTML += `
                <tr>
                    <td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(s.date)}</td>
                    <td style="font-weight:bold;">${s.customer}</td>
                    <td>${s.model}</td>
                    <td>${formatCurrency(s.price)}</td>
                    <td style="color:#2ecc71">${formatCurrency(s.paid)}</td>
                    <td style="color:#f1c40f; font-weight:bold;">${formatCurrency(remaining)}</td>
                    <td>
                        <button style="background:#2ecc71; border:none; color:#000; padding:4px 8px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:12px;" onclick="receivePayment('${s.id}')">💰 Tahsilat Yap</button>
                    </td>
                </tr>`;
        }
    });

    if (!hasDebtor) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:#2ecc71; text-align:center;">Harika! Bekleyen herhangi bir müşteri alacağı yok.</td></tr>`;
    }
}

// --- 4. ORTAKLIK CARİ ---
function addPartnerTransaction() {
    db.collection("partners").add({
        type: document.getElementById("partType").value,
        amount: parseFloat(document.getElementById("partAmount").value),
        note: document.getElementById("partNote").value,
        date: document.getElementById("partDate").value
    });
    document.getElementById("partnerForm").reset();
    setDefaultDates();
}

function renderPartnerTable() {
    const tbody = document.getElementById("partnerTableBody");
    tbody.innerHTML = "";
    
    state.partners.forEach(p => {
        let islemMetni = "";
        let renk = "#e74c3c"; 
        
        if (p.type === "cekim_semih") islemMetni = "Semih (Kâr Çekimi)";
        else if (p.type === "cekim_ekrem") islemMetni = "Ekrem (Kâr Çekimi)";
        else if (p.type === "odeme_ekrem_semihe") { islemMetni = "Ekrem ➔ Semih'e (Borç Ödedi)"; renk = "#3498db"; }
        else if (p.type === "odeme_semih_ekreme") { islemMetni = "Semih ➔ Ekrem'e (Borç Ödedi)"; renk = "#3498db"; }

        tbody.innerHTML += `
            <tr>
                <td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(p.date)}</td>
                <td style="font-weight:bold">${islemMetni}</td>
                <td style="font-weight:bold; color:${renk}">${formatCurrency(p.amount)}</td>
                <td style="color:#8a99ad; font-size:13px">${p.note}</td>
                <td><button class="delete-btn" onclick="deleteDocument('partners', '${p.id}')">Sil</button></td>
            </tr>`;
    });
}

function deleteDocument(collectionName, docId) {
    if (confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) {
        db.collection(collectionName).doc(docId).delete();
    }
}

// --- 5. GELİŞMİŞ FİNANSAL MOTOR (BEYİN) ---
function calculateFinancials() {
    let totalSales = 0, totalExpenses = 0, totalReceivables = 0;
    
    let semihHarcama = 0, ekremHarcama = 0;
    let semihTahsilat = 0, ekremTahsilat = 0;
    
    let semihTransferBakiye = 0, ekremTransferBakiye = 0;

    state.stocks.forEach(s => {
        if (s.cost) {
            totalExpenses += s.cost;
            if (s.payer === "Semih") semihHarcama += s.cost;
            if (s.payer === "Ekrem") ekremHarcama += s.cost;
        }
    });

    state.sales.forEach(s => {
        totalSales += s.price;
        totalReceivables += (s.price - s.paid);
    });

    state.tahsilatlar.forEach(t => {
        if (t.collector === "Semih") semihTahsilat += t.amount;
        if (t.collector === "Ekrem") ekremTahsilat += t.amount;
    });

    state.partners.forEach(p => {
        if (p.type === "cekim_semih") semihTransferBakiye -= p.amount;
        if (p.type === "cekim_ekrem") ekremTransferBakiye -= p.amount;
        if (p.type === "odeme_ekrem_semihe") { 
            ekremTransferBakiye += p.amount; 
            semihTransferBakiye -= p.amount; 
        }
        if (p.type === "odeme_semih_ekreme") { 
            semihTransferBakiye += p.amount; 
            ekremTransferBakiye -= p.amount; 
        }
    });

    const netProfit = totalSales - totalExpenses;

    let semihNetYatirim = semihHarcama - semihTahsilat + semihTransferBakiye;
    let ekremNetYatirim = ekremHarcama - ekremTahsilat + ekremTransferBakiye;

    let mutabakatMetni = "Hesaplar Eşit";
    let mutabakatRenk = "#2ecc71";

    if (semihNetYatirim > ekremNetYatirim) {
        let borc = (semihNetYatirim - ekremNetYatirim) / 2;
        mutabakatMetni = `Ekrem, Semih'e <br><strong style="font-size:22px">${formatCurrency(borc)}</strong> ödemeli.`;
    } else if (ekremNetYatirim > semihNetYatirim) {
        let borc = (ekremNetYatirim - semihNetYatirim) / 2;
        mutabakatMetni = `Semih, Ekrem'e <br><strong style="font-size:22px">${formatCurrency(borc)}</strong> ödemeli.`;
    }

    return { 
        netProfit, totalSales, totalReceivables, totalExpenses, 
        semihHarcama, ekremHarcama, semihTahsilat, ekremTahsilat, 
        mutabakatMetni, mutabakatRenk 
    };
}

// Verileri render etmeden önce en yeniler en üstte görünecek şekilde tarihe göre sırala
function sortDataByDate() {
    const sorter = (a, b) => new Date(b.date || 0) - new Date(a.date || 0);
    state.stocks.sort(sorter);
    state.sales.sort(sorter);
    state.partners.sort(sorter);
    state.tahsilatlar.sort(sorter);
}

function renderAll() {
    sortDataByDate(); // Tablolar listelenmeden önce sıralamayı yap
    const fin = calculateFinancials();
    
    document.getElementById("dashNetProfit").innerText = formatCurrency(fin.netProfit);
    document.getElementById("dashNetProfit").style.color = fin.netProfit < 0 ? "#e74c3c" : "#2ecc71";
    document.getElementById("dashIncome").innerText = formatCurrency(fin.totalSales);
    document.getElementById("dashReceivables").innerText = formatCurrency(fin.totalReceivables);
    document.getElementById("dashExpenses").innerText = formatCurrency(fin.totalExpenses);
    
    document.getElementById("dashSemih").innerText = `Atölye Harcaması: ${formatCurrency(fin.semihHarcama)}`;
    document.getElementById("dashSemihTahsilat").innerText = `Cebine Giren Tahsilat: ${formatCurrency(fin.semihTahsilat)}`;
    document.getElementById("dashEkrem").innerText = `Atölye Harcaması: ${formatCurrency(fin.ekremHarcama)}`;
    document.getElementById("dashEkremTahsilat").innerText = `Cebine Giren Tahsilat: ${formatCurrency(fin.ekremTahsilat)}`;

    const mutabakatEl = document.getElementById("dashMutabakat");
    mutabakatEl.innerHTML = fin.mutabakatMetni;
    mutabakatEl.style.color = fin.mutabakatRenk;

    renderStockTable();
    renderSalesTable();
    renderPartnerTable();
    renderDashboardAlerts();
    renderDashboardDebtors(); 
}

function formatCurrency(val) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

// --- 6. MODAL DETAY GÖRÜNÜM (EKSTRELER) SİSTEMİ ---
function showDetails(type) {
    document.getElementById("detailModal").style.display = "flex";
    const title = document.getElementById("detailModalTitle");
    const thead = document.getElementById("detailModalThead");
    const tbody = document.getElementById("detailModalTbody");
    
    tbody.innerHTML = "";

    if (type === 'giderler') {
        title.innerText = "Tüm Gider ve Harcamalar";
        thead.innerHTML = `<tr><th>Tarih</th><th>Kalem/Ürün</th><th>Kategori</th><th>Tutar</th><th>Ödeyen</th></tr>`;
        state.stocks.forEach(s => {
            if (s.cost) {
                tbody.innerHTML += `<tr><td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(s.date)}</td><td>${s.name}</td><td>${s.category}</td><td style="color:#e74c3c; font-weight:bold;">${formatCurrency(s.cost)}</td><td>${s.payer}</td></tr>`;
            }
        });
    } else if (type === 'gelirler') {
        title.innerText = "Tüm Satışlar (Ciro)";
        thead.innerHTML = `<tr><th>Tarih</th><th>Müşteri</th><th>Model</th><th>Satış Tutarı</th><th>Tahsil Edilen</th></tr>`;
        state.sales.forEach(s => {
            tbody.innerHTML += `<tr><td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(s.date)}</td><td>${s.customer}</td><td>${s.model}</td><td style="color:#2ecc71; font-weight:bold;">${formatCurrency(s.price)}</td><td style="color:#3498db;">${formatCurrency(s.paid)}</td></tr>`;
        });
    } else if (type === 'alacaklar') {
        title.innerText = "Bekleyen Müşteri Alacakları";
        thead.innerHTML = `<tr><th>Tarih</th><th>Müşteri</th><th>Model</th><th>Kalan Borç</th></tr>`;
        state.sales.forEach(s => {
            const rem = s.price - s.paid;
            if (rem > 0) {
                tbody.innerHTML += `<tr><td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(s.date)}</td><td>${s.customer}</td><td>${s.model}</td><td style="color:#f1c40f; font-weight:bold;">${formatCurrency(rem)}</td></tr>`;
            }
        });
    }
}

function showPartnerDetails(partnerName) {
    document.getElementById("detailModal").style.display = "flex";
    document.getElementById("detailModalTitle").innerText = `${partnerName} Cari Ekstresi (Hesap Hareketleri)`;
    
    const thead = document.getElementById("detailModalThead");
    const tbody = document.getElementById("detailModalTbody");
    
    thead.innerHTML = `<tr><th>Tarih</th><th>İşlem Tipi</th><th>Açıklama</th><th>Tutar</th></tr>`;
    
    // İşlemleri tarihe göre sıralayıp ekstreye dökmek için geçici bir liste oluşturuyoruz
    let partnerTransactions = [];

    state.stocks.forEach(s => {
        if (s.payer === partnerName && s.cost > 0) partnerTransactions.push({ date: s.date, type: "Atölyeye Harcadı", desc: s.name, amount: s.cost, badge: "success", sign: "+" });
    });

    state.tahsilatlar.forEach(t => {
        if (t.collector === partnerName) partnerTransactions.push({ date: t.date, type: "Müşteriden Aldı", desc: `${t.customer} (${t.model})`, amount: t.amount, badge: "danger", sign: "-" });
    });
    
    state.partners.forEach(p => {
        if (partnerName === "Semih") {
            if (p.type === "cekim_semih") partnerTransactions.push({ date: p.date, type: "Kâr Çekimi", desc: p.note, amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_ekrem_semihe") partnerTransactions.push({ date: p.date, type: "Ortaktan Aldı", desc: "Ekrem borcunu ödedi", amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_semih_ekreme") partnerTransactions.push({ date: p.date, type: "Ortağa Ödedi", desc: "Ekrem'e borç ödendi", amount: p.amount, badge: "success", sign: "+" });
        } else if (partnerName === "Ekrem") {
            if (p.type === "cekim_ekrem") partnerTransactions.push({ date: p.date, type: "Kâr Çekimi", desc: p.note, amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_semih_ekreme") partnerTransactions.push({ date: p.date, type: "Ortaktan Aldı", desc: "Semih borcunu ödedi", amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_ekrem_semihe") partnerTransactions.push({ date: p.date, type: "Ortağa Ödedi", desc: "Semih'e borç ödendi", amount: p.amount, badge: "success", sign: "+" });
        }
    });

    // Ekstredeki hareketleri de en yeniden en eskiye sırala
    partnerTransactions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    tbody.innerHTML = "";
    partnerTransactions.forEach(item => {
        const amountColor = item.sign === "+" ? "#2ecc71" : "#e74c3c";
        tbody.innerHTML += `<tr><td style="color:#8a99ad; font-size:13px;">${formatDateForDisplay(item.date)}</td><td><span class="badge ${item.badge}">${item.type}</span></td><td>${item.desc}</td><td style="color:${amountColor}; font-weight:bold;">${item.sign}${formatCurrency(item.amount)}</td></tr>`;
    });
}

function closeDetailModal() {
    document.getElementById("detailModal").style.display = "none";
}

// --- 7. STOK ALARMLARI ---
function renderDashboardAlerts() {
    const tbody = document.getElementById("dashStockAlerts");
    tbody.innerHTML = "";
    let hasAlert = false;
    
    let stockSummary = {};
    state.stocks.forEach(s => {
        if (!stockSummary[s.name]) {
            stockSummary[s.name] = { ...s };
        } else {
            stockSummary[s.name].qty += s.qty;
        }
    });

    Object.values(stockSummary).forEach(s => {
        if (s.threshold > 0 && s.qty <= s.threshold) {
            hasAlert = true;
            const unitText = s.unit ? ` ${s.unit}` : "";
            tbody.innerHTML += `
                <tr>
                    <td>${s.name}</td>
                    <td style="color:#e74c3c; font-weight:bold;">${s.qty}${unitText}</td>
                    <td>${s.threshold}${unitText}</td>
                    <td><span class="badge danger">Kritik</span></td>
                </tr>`;
        }
    });
    
    if (!hasAlert) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:#2ecc71; text-align:center;">Kritik malzeme yok.</td></tr>`;
    }
}

// --- 8. MALİYET HESAPLAYICI ---
function calculateTuftingCost() {
    const yarnWeight = parseFloat(document.getElementById("calcYarnWeight").value);
    const yarnPrice = parseFloat(document.getElementById("calcYarnPrice").value);
    const width = parseFloat(document.getElementById("calcWidth").value);
    const height = parseFloat(document.getElementById("calcHeight").value);
    const clothPrice = parseFloat(document.getElementById("calcClothPrice").value);
    const glueCost = parseFloat(document.getElementById("calcGlueCost").value);
    const baseCost = parseFloat(document.getElementById("calcBaseCost").value);
    const fixCost = parseFloat(document.getElementById("calcFixCost").value);
    const laborCost = parseFloat(document.getElementById("calcLaborCost").value);
    const margin = parseFloat(document.getElementById("calcProfitMargin").value);

    const netMaterial = ((yarnWeight / 1000) * yarnPrice) + (((width * height) / 10000) * clothPrice) + glueCost + baseCost;
    const totalCost = netMaterial + fixCost + laborCost;
    const salePrice = totalCost * (1 + margin / 100);

    document.getElementById("resMaterial").innerText = formatCurrency(netMaterial);
    document.getElementById("resTotalCost").innerText = formatCurrency(totalCost);
    document.getElementById("resSalePrice").innerText = formatCurrency(salePrice);
}