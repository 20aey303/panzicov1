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

// Firebase'i Başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ATÖLYE VERİ MODELİ (Buluttan Gelen Anlık Veriler Burada Tutulacak)
let state = {
    stocks: [],
    sales: [],
    partners: []
};

// UYGULAMAYI BAŞLAT
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initEventListeners();
    listenToCloudData(); // Bulut dinleyicisini başlat
});

// BULUTTAKİ VERİLERİ ANLIK DİNLE (CANLI YAYIN)
function listenToCloudData() {
    // Stokları Dinle
    db.collection("stocks").onSnapshot((snapshot) => {
        state.stocks = [];
        snapshot.forEach((doc) => state.stocks.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    // Satışları Dinle
    db.collection("sales").onSnapshot((snapshot) => {
        state.sales = [];
        snapshot.forEach((doc) => state.sales.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    // Ortaklık Hareketlerini Dinle
    db.collection("partners").onSnapshot((snapshot) => {
        state.partners = [];
        snapshot.forEach((doc) => state.partners.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });
}

// SEKMELERİ YÖNET (TAB LOGIC)
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

// FORMLAR VE OLAY DİNLEYİCİLERİ
function initEventListeners() {
    document.getElementById("calcForm").addEventListener("submit", (e) => { e.preventDefault(); calculateTuftingCost(); });
    document.getElementById("stockForm").addEventListener("submit", (e) => { e.preventDefault(); addStockAndExpense(); });
    document.getElementById("saleForm").addEventListener("submit", (e) => { e.preventDefault(); addSaleRecord(); });
    document.getElementById("partnerForm").addEventListener("submit", (e) => { e.preventDefault(); addPartnerTransaction(); });

    document.getElementById("resetDataBtn").addEventListener("click", () => {
        alert("Bulut sistemine geçildiği için toplu sıfırlama güvenliğe alındı. Verileri silmek isterseniz tablolardaki 'Sil' butonlarını veya Firebase panelini kullanın.");
    });
}

// ARKA PLAN MUHASEBE MOTORU
function calculateFinancials() {
    let totalCash = 0, totalReceivables = 0, totalExpenses = 0, semihBalance = 0, ekremBalance = 0;

    state.partners.forEach(p => {
        const amt = parseFloat(p.amount);
        if (p.type === "sermaye") {
            totalCash += amt;
            if (p.person === "Semih") semihBalance += amt;
            if (p.person === "Ekrem") ekremBalance += amt;
        } else if (p.type === "cekme") {
            totalCash -= amt;
            if (p.person === "Semih") semihBalance -= amt;
            if (p.person === "Ekrem") ekremBalance -= amt;
        }
    });

    state.stocks.forEach(s => {
        if (s.cost) {
            const costAmt = parseFloat(s.cost);
            totalExpenses += costAmt;
            if (s.payer === "Atölye Kasası") totalCash -= costAmt;
            else if (s.payer === "Semih") semihBalance += costAmt;
            else if (s.payer === "Ekrem") ekremBalance += costAmt;
        }
    });

    state.sales.forEach(s => {
        const price = parseFloat(s.price);
        const paid = parseFloat(s.paid);
        totalCash += paid;
        totalReceivables += (price - paid);
    });

    return { totalCash, totalReceivables, totalExpenses, semihBalance, ekremBalance };
}

// GÖRSEL LİSTELERİ YENİLE
function renderAll() {
    const fin = calculateFinancials();
    document.getElementById("dashCash").innerText = formatCurrency(fin.totalCash);
    document.getElementById("dashReceivables").innerText = formatCurrency(fin.totalReceivables);
    document.getElementById("dashExpenses").innerText = formatCurrency(fin.totalExpenses);
    document.getElementById("dashSemih").innerText = formatCurrency(fin.semihBalance);
    document.getElementById("dashEkrem").innerText = formatCurrency(fin.ekremBalance);

    renderStockTable();
    renderSalesTable();
    renderPartnerTable();
    renderDashboardAlerts();
}

function formatCurrency(val) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

// 1. MALİYET HESAPLAMA (Yerel Hesaplama)
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

// 2. STOK / GİDER YÖNETİMİ (Firebase Write)
function addStockAndExpense() {
    const category = document.getElementById("stockCategory").value;
    const name = document.getElementById("stockName").value;
    const qty = parseFloat(document.getElementById("stockQty").value);
    const unit = document.getElementById("stockUnit").value;
    const threshold = parseFloat(document.getElementById("stockThreshold").value) || 0;
    const cost = parseFloat(document.getElementById("stockTotalCost").value);
    const payer = document.getElementById("stockPayer").value;

    const existing = state.stocks.find(s => s.name.toLowerCase() === name.toLowerCase() && s.category === category);
    
    if (existing) {
        // Var olan stoğu güncelle (Bulutta)
        db.collection("stocks").doc(existing.id).update({
            qty: existing.qty + qty,
            cost: cost,
            payer: payer
        });
    } else {
        // Yeni stok ekle (Buluta)
        db.collection("stocks").add({ category, name, qty, unit, threshold, cost, payer });
    }
    document.getElementById("stockForm").reset();
}

function renderStockTable() {
    const tbody = document.getElementById("stockTableBody");
    tbody.innerHTML = "";
    state.stocks.forEach(s => {
        const isCritical = s.qty <= s.threshold;
        tbody.innerHTML += `<tr>
            <td>${s.category}</td><td>${s.name}</td>
            <td style="font-weight:bold; color:${isCritical ? '#e74c3c' : '#fff'}">${s.qty} ${s.unit}</td>
            <td>${s.threshold} ${s.unit}</td>
            <td><button class="delete-btn" onclick="deleteDocument('stocks', '${s.id}')">Sil</button></td>
        </tr>`;
    });
}

// 3. SATIŞ SİSTEMİ (Firebase Write)
function addSaleRecord() {
    db.collection("sales").add({
        customer: document.getElementById("saleCustomer").value,
        model: document.getElementById("saleModel").value,
        price: parseFloat(document.getElementById("salePrice").value),
        cost: parseFloat(document.getElementById("saleCost").value),
        paid: parseFloat(document.getElementById("salePaid").value)
    });
    document.getElementById("saleForm").reset();
}

function renderSalesTable() {
    const tbody = document.getElementById("salesTableBody");
    tbody.innerHTML = "";
    state.sales.forEach(s => {
        const remaining = s.price - s.paid;
        tbody.innerHTML += `<tr>
            <td>${s.customer}</td><td>${s.model}</td>
            <td>${formatCurrency(s.price)}</td><td style="color:#aaa">${formatCurrency(s.cost)}</td>
            <td style="color:#2ecc71">${formatCurrency(s.paid)}</td>
            <td style="font-weight:bold; color:${remaining > 0 ? '#f1c40f' : '#aaa'}">${formatCurrency(remaining)}</td>
            <td><button class="delete-btn" onclick="deleteDocument('sales', '${s.id}')">Sil</button></td>
        </tr>`;
    });
}

// 4. ORTAKLIK CARİ (Firebase Write)
function addPartnerTransaction() {
    db.collection("partners").add({
        person: document.getElementById("partPerson").value,
        type: document.getElementById("partType").value,
        amount: parseFloat(document.getElementById("partAmount").value),
        note: document.getElementById("partNote").value
    });
    document.getElementById("partnerForm").reset();
}

function renderPartnerTable() {
    const tbody = document.getElementById("partnerTableBody");
    tbody.innerHTML = "";
    state.partners.forEach(p => {
        const isSermaye = p.type === "sermaye";
        tbody.innerHTML += `<tr>
            <td style="font-weight:bold">${p.person}</td>
            <td style="color:${isSermaye ? '#3498db' : '#e74c3c'}">${isSermaye ? "Sermaye Ekleme" : "Kârdan Çekim"}</td>
            <td style="font-weight:bold">${formatCurrency(p.amount)}</td>
            <td style="color:#8a99ad; font-size:13px">${p.note}</td>
            <td><button class="delete-btn" onclick="deleteDocument('partners', '${p.id}')">Sil</button></td>
        </tr>`;
    });
}

// BULUTTAN SİLME İŞLEMİ (Ortak Silme Fonksiyonu)
function deleteDocument(collectionName, docId) {
    if(confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) {
        db.collection(collectionName).doc(docId).delete();
    }
}

// 5. STOK DURUM DETEKTÖRÜ
function renderDashboardAlerts() {
    const tbody = document.getElementById("dashStockAlerts");
    tbody.innerHTML = "";
    let hasAlert = false;
    state.stocks.forEach(s => {
        if (s.qty <= s.threshold) {
            hasAlert = true;
            tbody.innerHTML += `<tr>
                <td>${s.name}</td><td style="color:#e74c3c; font-weight:bold;">${s.qty} ${s.unit}</td>
                <td>${s.threshold} ${s.unit}</td><td><span class="badge danger">Kritik Seviye</span></td>
            </tr>`;
        }
    });
    if (!hasAlert) tbody.innerHTML = `<tr><td colspan="4" style="color:#2ecc71; text-align:center;">Atölyede kritik seviyede malzeme yok.</td></tr>`;
}