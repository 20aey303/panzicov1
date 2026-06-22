// ═══════════════════════════════════════════════════════════════
//  FIREBASE BAĞLANTISI
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
let state = {
    catalog: [], stocks: [], sales: [], partners: [], tahsilatlar: []
};

let editingSaleId = null;
let currentActiveSaleId = null;
let salesFilterMode = 'all';
let monthlyChartInstance = null;
let categoryChartInstance = null;

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initMobileMenu();
    initEventListeners();
    setDefaultDates();
    listenToCloudData();
});

// ═══════════════════════════════════════════════════════════════
//  TOAST BİLDİRİM SİSTEMİ
// ═══════════════════════════════════════════════════════════════
function showToast(type, title, message, duration = 4000) {
    const container = document.getElementById("toastContainer");

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ═══════════════════════════════════════════════════════════════
//  YARDIMCI FONKSİYONLAR (TARİH)
// ═══════════════════════════════════════════════════════════════
function getTodayForInput() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy}`;
}

function setDefaultDates() {
    const today = getTodayForInput();
    const dateFields = ["stockDate", "quickExpenseDate", "saleDate", "partDate"];
    dateFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
}

function formatCurrency(val) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
}

// ═══════════════════════════════════════════════════════════════
//  MOBİL MENÜ
// ═══════════════════════════════════════════════════════════════
function initMobileMenu() {
    const hamburger = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!hamburger) return;

    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    });

    // Menü butonuna tıklayınca mobilde sidebar'ı kapat
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove("open");
                overlay.classList.remove("active");
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  FIREBASE REAL-TIME LISTENERS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  TAB NAVİGASYONU
// ═══════════════════════════════════════════════════════════════
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

            // Raporlar sekmesine geçince grafikleri render et
            if (targetTab === 'reports') {
                setTimeout(() => renderReports(), 100);
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
function initEventListeners() {
    document.getElementById("calcForm").addEventListener("submit", (e) => { e.preventDefault(); calculateTuftingCost(); });
    document.getElementById("catalogForm").addEventListener("submit", (e) => { e.preventDefault(); addCatalogItem(); });
    document.getElementById("stockForm").addEventListener("submit", (e) => { e.preventDefault(); addStockAndExpense(); });
    document.getElementById("quickExpenseForm").addEventListener("submit", (e) => { e.preventDefault(); addQuickExpense(); });
    document.getElementById("saleForm").addEventListener("submit", (e) => { e.preventDefault(); saveSaleRecord(); });
    document.getElementById("partnerForm").addEventListener("submit", (e) => { e.preventDefault(); addPartnerTransaction(); });
    document.getElementById("modalTahsilatForm").addEventListener("submit", (e) => { e.preventDefault(); submitTahsilatModal(); });

    // Tüm Verileri Sıfırla butonu
    document.getElementById("resetDataBtn").addEventListener("click", resetAllData);
}

// ═══════════════════════════════════════════════════════════════
//  1. KATALOG
// ═══════════════════════════════════════════════════════════════
function addCatalogItem() {
    const category = document.getElementById("catalogCategory").value.trim();
    const name = document.getElementById("catalogName").value.trim();

    if (!category || !name) {
        showToast('warning', 'Eksik Bilgi', 'Kategori ve kalem adı boş bırakılamaz.');
        return;
    }

    db.collection("catalog").add({
        category: category,
        name: name,
        unit: document.getElementById("catalogUnit").value.trim() || ""
    }).then(() => {
        showToast('success', 'Katalog Güncellendi', `"${name}" kataloğa eklendi.`);
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

// ═══════════════════════════════════════════════════════════════
//  2. STOK / GİDER YÖNETİMİ
// ═══════════════════════════════════════════════════════════════
function addStockAndExpense() {
    const catalogItem = state.catalog.find(c => c.id === document.getElementById("stockItemSelect").value);
    if (!catalogItem) {
        showToast('warning', 'Seçim Hatası', 'Lütfen katalogdan bir kalem seçin!');
        return;
    }

    const cost = parseFloat(document.getElementById("stockTotalCost").value);
    if (isNaN(cost) || cost <= 0) {
        showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.');
        return;
    }

    db.collection("stocks").add({
        catalogId: catalogItem.id,
        category: catalogItem.category,
        name: catalogItem.name,
        qty: parseFloat(document.getElementById("stockQty").value) || 0,
        unit: catalogItem.unit,
        threshold: parseFloat(document.getElementById("stockThreshold").value) || 0,
        cost: cost,
        payer: document.getElementById("stockPayer").value,
        date: document.getElementById("stockDate").value
    }).then(() => {
        showToast('success', 'Stok Eklendi', `"${catalogItem.name}" stoğa ve gidere işlendi.`);
    });

    document.getElementById("stockForm").reset();
    setDefaultDates();
}

function addQuickExpense() {
    const catalogItem = state.catalog.find(c => c.id === document.getElementById("quickExpenseItem").value);
    if (!catalogItem) {
        showToast('warning', 'Seçim Hatası', 'Lütfen katalogdan bir kalem seçin!');
        return;
    }

    const amount = parseFloat(document.getElementById("quickExpenseAmount").value);
    if (isNaN(amount) || amount <= 0) {
        showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.');
        return;
    }

    db.collection("stocks").add({
        catalogId: catalogItem.id,
        category: catalogItem.category,
        name: catalogItem.name,
        qty: 0,
        unit: catalogItem.unit,
        threshold: 0,
        cost: amount,
        payer: document.getElementById("quickExpensePayer").value,
        date: document.getElementById("quickExpenseDate").value
    }).then(() => {
        showToast('success', 'Gider İşlendi', `${formatCurrency(amount)} gider olarak kaydedildi.`);
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
            stockSummary[s.name] = { ...s, totalQty: s.qty || 0 };
        } else {
            stockSummary[s.name].totalQty += (s.qty || 0);
            // threshold'u her zaman en yüksek değeri al
            if (s.threshold > stockSummary[s.name].threshold) {
                stockSummary[s.name].threshold = s.threshold;
            }
        }
    });

    const summaryItems = Object.values(stockSummary).filter(s => s.totalQty > 0 || s.threshold > 0);

    if (summaryItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="emoji">📦</div><p>Henüz stok kaydı yok.</p></td></tr>`;
        return;
    }

    summaryItems.forEach(s => {
        const isCritical = s.totalQty <= s.threshold && s.threshold > 0;
        const unitText = s.unit ? ` ${s.unit}` : "";

        tbody.innerHTML += `
            <tr>
                <td>${s.category}</td>
                <td style="font-weight:600;">${s.name}</td>
                <td style="font-weight:700; color:${isCritical ? 'var(--danger-red)' : 'var(--text-main)'}">${s.totalQty}${unitText}</td>
                <td>${s.threshold}${unitText}</td>
                <td><span class="badge ${isCritical ? 'danger' : 'success'}">${isCritical ? 'Kritik' : 'Normal'}</span></td>
            </tr>`;
    });
}

// Bireysel gider kayıtları tablosu
function renderExpenseLogTable() {
    const tbody = document.getElementById("expenseLogTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const expenses = state.stocks.filter(s => s.cost && s.cost > 0);

    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="emoji">📝</div><p>Henüz gider kaydı yok.</p></td></tr>`;
        return;
    }

    expenses.forEach(s => {
        const unitText = s.unit ? ` ${s.unit}` : "";
        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(s.date)}</td>
                <td style="font-weight:600;">${s.name}</td>
                <td>${s.category}</td>
                <td>${s.qty > 0 ? s.qty + unitText : '-'}</td>
                <td style="font-weight:700; color:var(--danger-red);">${formatCurrency(s.cost)}</td>
                <td><span class="badge ${s.payer === 'Semih' ? 'info' : 'warning'}">${s.payer}</span></td>
                <td><button class="delete-btn" onclick="deleteDocument('stocks', '${s.id}')">Sil</button></td>
            </tr>`;
    });
}

// ═══════════════════════════════════════════════════════════════
//  3. SATIŞ SİSTEMİ & GELİŞMİŞ TAHSİLAT
// ═══════════════════════════════════════════════════════════════
function saveSaleRecord() {
    const customer = document.getElementById("saleCustomer").value.trim();
    const model = document.getElementById("saleModel").value.trim();
    const price = parseFloat(document.getElementById("salePrice").value);
    const paid = parseFloat(document.getElementById("salePaid").value);
    const collector = document.getElementById("saleCollector").value;

    if (!customer || !model) {
        showToast('warning', 'Eksik Bilgi', 'Müşteri adı ve halı modeli zorunludur.');
        return;
    }

    if (isNaN(price) || price <= 0) {
        showToast('warning', 'Geçersiz Fiyat', 'Satış fiyatı sıfırdan büyük olmalıdır.');
        return;
    }

    if (isNaN(paid) || paid < 0) {
        showToast('warning', 'Geçersiz Tutar', 'Tahsil edilen tutar negatif olamaz.');
        return;
    }

    if (paid > price) {
        showToast('warning', 'Tutar Hatası', 'Tahsil edilen tutar satış fiyatını aşamaz.');
        return;
    }

    const saleData = {
        customer: customer,
        model: model,
        price: price,
        paid: paid,
        date: document.getElementById("saleDate").value,
        collector: collector
    };

    if (editingSaleId) {
        db.collection("sales").doc(editingSaleId).update(saleData).then(() => {
            showToast('success', 'Satış Güncellendi', `${customer} siparişi güncellendi.`);
        });
        editingSaleId = null;
        document.querySelector("#saleForm button[type='submit']").innerText = "Satışı Kaydet";
        document.querySelector("#saleForm button[type='submit']").style.background = "";
    } else {
        db.collection("sales").add(saleData).then(() => {
            showToast('success', 'Satış Kaydedildi', `${customer} - ${model} satışı kaydedildi.`);
        });

        // İlk satış anında tahsilat varsa kaydet
        if (paid > 0 && collector !== 'Kasa') {
            db.collection("tahsilatlar").add({
                saleId: 'initial',
                customer: customer,
                model: model,
                amount: paid,
                collector: collector,
                date: document.getElementById("saleDate").value
            });
        }
    }

    document.getElementById("saleForm").reset();
    setDefaultDates();
}

function editSale(id) {
    const sale = state.sales.find(s => s.id === id);
    if (!sale) return;

    const parsedDate = sale.date ? sale.date.substring(0, 10) : getTodayForInput();

    document.getElementById("saleCustomer").value = sale.customer;
    document.getElementById("saleModel").value = sale.model;
    document.getElementById("salePrice").value = sale.price;
    document.getElementById("salePaid").value = sale.paid;
    document.getElementById("saleDate").value = parsedDate;
    if (sale.collector) {
        document.getElementById("saleCollector").value = sale.collector;
    }

    editingSaleId = id;
    const submitBtn = document.querySelector("#saleForm button[type='submit']");
    submitBtn.innerText = "Satışı Güncelle";
    submitBtn.style.background = "linear-gradient(135deg, #fbbf24, #f59e0b)";

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
        <strong>Kalan Toplam Borç:</strong> <span style="color:var(--accent-yellow); font-weight:bold;">${formatCurrency(remaining)}</span>
    `;

    document.getElementById("modalAmount").value = remaining;
    document.getElementById("modalAmount").max = remaining;
    document.getElementById("modalDate").value = getTodayForInput();
    document.getElementById("tahsilatModal").classList.add("active");
}

function closeTahsilatModal() {
    document.getElementById("tahsilatModal").classList.remove("active");
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
        showToast('warning', 'Geçersiz Tutar', 'Lütfen kalan borç tutarını aşmayacak geçerli bir miktar girin!');
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
        showToast('success', 'Tahsilat Başarılı', `${formatCurrency(amount)} ${collector} cari hesabına işlendi.`);
        closeTahsilatModal();
    })
    .catch(err => {
        showToast('error', 'Hata', 'İşlem sırasında bir hata oluştu: ' + err.message);
    });
}

// Satış tablosu filtreleme
function setSalesFilter(mode, btn) {
    salesFilterMode = mode;

    // Aktif buton stili
    if (btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    renderSalesTable();
}

function filterSalesTable() {
    renderSalesTable();
}

function getFilteredSales() {
    let filtered = [...state.sales];
    const searchTerm = (document.getElementById("salesSearchInput")?.value || "").toLowerCase().trim();

    // Arama filtresi
    if (searchTerm) {
        filtered = filtered.filter(s =>
            (s.customer || "").toLowerCase().includes(searchTerm) ||
            (s.model || "").toLowerCase().includes(searchTerm)
        );
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (salesFilterMode === 'week') {
        filtered = filtered.filter(s => new Date(s.date) >= startOfWeek);
    } else if (salesFilterMode === 'month') {
        filtered = filtered.filter(s => new Date(s.date) >= startOfMonth);
    } else if (salesFilterMode === 'debtor') {
        filtered = filtered.filter(s => (s.price - s.paid) > 0);
    } else if (salesFilterMode === 'custom') {
        const startVal = document.getElementById("salesFilterStart")?.value;
        const endVal = document.getElementById("salesFilterEnd")?.value;
        if (startVal) filtered = filtered.filter(s => s.date >= startVal);
        if (endVal) filtered = filtered.filter(s => s.date <= endVal);
    }

    return filtered;
}

function renderSalesTable() {
    const tbody = document.getElementById("salesTableBody");
    tbody.innerHTML = "";

    const filtered = getFilteredSales();

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="emoji">🧾</div><p>Gösterilecek satış kaydı yok.</p></td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const remaining = s.price - s.paid;
        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(s.date)}</td>
                <td style="font-weight:600;">${s.customer}</td>
                <td>${s.model}</td>
                <td>${formatCurrency(s.price)}</td>
                <td style="color:var(--accent-green)">${formatCurrency(s.paid)}</td>
                <td style="font-weight:bold; color:${remaining > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)'}">${formatCurrency(remaining)}</td>
                <td>
                    <div class="table-actions">
                        ${remaining > 0 ? `<button class="action-btn collect" onclick="receivePayment('${s.id}')">💰 Tahsilat</button>` : ''}
                        <button class="action-btn edit" onclick="editSale('${s.id}')">✏️</button>
                        <button class="delete-btn" onclick="deleteDocument('sales', '${s.id}')">🗑️</button>
                    </div>
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
                    <td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(s.date)}</td>
                    <td style="font-weight:700;">${s.customer}</td>
                    <td>${s.model}</td>
                    <td>${formatCurrency(s.price)}</td>
                    <td style="color:var(--accent-green)">${formatCurrency(s.paid)}</td>
                    <td style="color:var(--accent-yellow); font-weight:bold;">${formatCurrency(remaining)}</td>
                    <td>
                        <button class="action-btn collect" onclick="receivePayment('${s.id}')" style="font-size:11px;">💰 Tahsilat Yap</button>
                    </td>
                </tr>`;
        }
    });

    if (!hasDebtor) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-green); text-align:center; padding:20px;">✅ Harika! Bekleyen herhangi bir müşteri alacağı yok.</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════════
//  4. ORTAKLIK CARİ
// ═══════════════════════════════════════════════════════════════
function addPartnerTransaction() {
    const amount = parseFloat(document.getElementById("partAmount").value);
    const note = document.getElementById("partNote").value.trim();

    if (isNaN(amount) || amount <= 0) {
        showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.');
        return;
    }

    if (!note) {
        showToast('warning', 'Eksik Bilgi', 'Açıklama notu zorunludur.');
        return;
    }

    const type = document.getElementById("partType").value;

    db.collection("partners").add({
        type: type,
        amount: amount,
        note: note,
        date: document.getElementById("partDate").value
    }).then(() => {
        const labels = {
            'cekim_semih': 'Semih kâr çekimi',
            'cekim_ekrem': 'Ekrem kâr çekimi',
            'odeme_ekrem_semihe': 'Ekrem → Semih borç ödeme',
            'odeme_semih_ekreme': 'Semih → Ekrem borç ödeme'
        };
        showToast('success', 'Cari Hesap Güncellendi', `${labels[type] || 'İşlem'}: ${formatCurrency(amount)}`);
    });

    document.getElementById("partnerForm").reset();
    setDefaultDates();
}

function renderPartnerTable() {
    const tbody = document.getElementById("partnerTableBody");
    tbody.innerHTML = "";

    if (state.partners.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="emoji">🤝</div><p>Henüz ortaklık hareketi yok.</p></td></tr>`;
        return;
    }

    state.partners.forEach(p => {
        let islemMetni = "";
        let badgeClass = "danger";

        if (p.type === "cekim_semih") islemMetni = "Semih (Kâr Çekimi)";
        else if (p.type === "cekim_ekrem") islemMetni = "Ekrem (Kâr Çekimi)";
        else if (p.type === "odeme_ekrem_semihe") { islemMetni = "Ekrem ➔ Semih'e (Borç Ödedi)"; badgeClass = "info"; }
        else if (p.type === "odeme_semih_ekreme") { islemMetni = "Semih ➔ Ekrem'e (Borç Ödedi)"; badgeClass = "info"; }

        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(p.date)}</td>
                <td><span class="badge ${badgeClass}">${islemMetni}</span></td>
                <td style="font-weight:bold; color:var(--danger-red)">${formatCurrency(p.amount)}</td>
                <td style="color:var(--text-muted); font-size:13px">${p.note}</td>
                <td><button class="delete-btn" onclick="deleteDocument('partners', '${p.id}')">Sil</button></td>
            </tr>`;
    });
}

// ═══════════════════════════════════════════════════════════════
//  KAYIT SİLME
// ═══════════════════════════════════════════════════════════════
function deleteDocument(collectionName, docId) {
    if (confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) {
        db.collection(collectionName).doc(docId).delete().then(() => {
            showToast('info', 'Kayıt Silindi', 'Seçilen kayıt başarıyla silindi.');
        }).catch(err => {
            showToast('error', 'Silme Hatası', err.message);
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  TÜM VERİLERİ SIFIRLA
// ═══════════════════════════════════════════════════════════════
function resetAllData() {
    const step1 = confirm("⚠️ DİKKAT: Tüm verileri (stok, satış, ortaklık, katalog, tahsilatlar) kalıcı olarak sileceksiniz!\n\nBu işlem geri alınamaz. Devam etmek istiyor musunuz?");
    if (!step1) return;

    const step2 = confirm("🔴 İKİNCİ ONAY: Gerçekten TÜM verileri silmek istediğinize emin misiniz?\n\nBu işlemi onaylarsanız tüm veriler kaybolacaktır!");
    if (!step2) return;

    const step3 = prompt("🛑 SON ADIM: Silme işlemini onaylamak için 'SİL' yazın:");
    if (step3 !== 'SİL') {
        showToast('info', 'İptal Edildi', 'Veri silme işlemi iptal edildi.');
        return;
    }

    showToast('warning', 'Veriler Siliniyor', 'Tüm koleksiyonlar temizleniyor...');

    const collections = ['catalog', 'stocks', 'sales', 'partners', 'tahsilatlar'];
    const deletePromises = collections.map(col => {
        return db.collection(col).get().then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        });
    });

    Promise.all(deletePromises).then(() => {
        showToast('success', 'Tamamlandı', 'Tüm veriler başarıyla silindi.');
    }).catch(err => {
        showToast('error', 'Hata', 'Silme sırasında bir hata oluştu: ' + err.message);
    });
}

// ═══════════════════════════════════════════════════════════════
//  5. GELİŞMİŞ FİNANSAL MOTOR (BEYİN)
// ═══════════════════════════════════════════════════════════════
function calculateFinancials() {
    let totalSales = 0, totalExpenses = 0, totalReceivables = 0;

    let semihHarcama = 0, ekremHarcama = 0;
    let semihTahsilat = 0, ekremTahsilat = 0;
    let semihCekim = 0, ekremCekim = 0;

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
        if (p.type === "cekim_semih") {
            semihTransferBakiye -= p.amount;
            semihCekim += p.amount;
        }
        if (p.type === "cekim_ekrem") {
            ekremTransferBakiye -= p.amount;
            ekremCekim += p.amount;
        }
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

    let mutabakatMetni = "✅ Hesaplar Eşit";
    let mutabakatRenk = "var(--accent-green)";

    if (semihNetYatirim > ekremNetYatirim) {
        let borc = (semihNetYatirim - ekremNetYatirim) / 2;
        mutabakatMetni = `Ekrem, Semih'e <br><strong style="font-size:22px">${formatCurrency(borc)}</strong> ödemeli.`;
        mutabakatRenk = "var(--accent-yellow)";
    } else if (ekremNetYatirim > semihNetYatirim) {
        let borc = (ekremNetYatirim - semihNetYatirim) / 2;
        mutabakatMetni = `Semih, Ekrem'e <br><strong style="font-size:22px">${formatCurrency(borc)}</strong> ödemeli.`;
        mutabakatRenk = "var(--accent-yellow)";
    }

    return {
        netProfit, totalSales, totalReceivables, totalExpenses,
        semihHarcama, ekremHarcama, semihTahsilat, ekremTahsilat,
        semihCekim, ekremCekim,
        mutabakatMetni, mutabakatRenk
    };
}

// ═══════════════════════════════════════════════════════════════
//  RENDER ALL
// ═══════════════════════════════════════════════════════════════
function sortDataByDate() {
    const sorter = (a, b) => new Date(b.date || 0) - new Date(a.date || 0);
    state.stocks.sort(sorter);
    state.sales.sort(sorter);
    state.partners.sort(sorter);
    state.tahsilatlar.sort(sorter);
}

function renderAll() {
    sortDataByDate();
    const fin = calculateFinancials();

    // Dashboard KPI'lar
    document.getElementById("dashNetProfit").innerText = formatCurrency(fin.netProfit);
    document.getElementById("dashNetProfit").style.color = fin.netProfit < 0 ? "var(--danger-red)" : "var(--accent-green)";
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

    // Tablolar
    renderStockTable();
    renderExpenseLogTable();
    renderSalesTable();
    renderPartnerTable();
    renderDashboardAlerts();
    renderDashboardDebtors();
    renderDashboardChart();
    populateReportMonthSelector();
}

// ═══════════════════════════════════════════════════════════════
//  6. MODAL DETAY GÖRÜNÜM (EKSTRELER)
// ═══════════════════════════════════════════════════════════════
function showDetails(type) {
    document.getElementById("detailModal").classList.add("active");
    const title = document.getElementById("detailModalTitle");
    const thead = document.getElementById("detailModalThead");
    const tbody = document.getElementById("detailModalTbody");

    tbody.innerHTML = "";

    if (type === 'giderler') {
        title.innerText = "Tüm Gider ve Harcamalar";
        thead.innerHTML = `<tr><th>Tarih</th><th>Kalem/Ürün</th><th>Kategori</th><th>Tutar</th><th>Ödeyen</th></tr>`;
        state.stocks.forEach(s => {
            if (s.cost) {
                tbody.innerHTML += `<tr><td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(s.date)}</td><td>${s.name}</td><td>${s.category}</td><td style="color:var(--danger-red); font-weight:bold;">${formatCurrency(s.cost)}</td><td><span class="badge ${s.payer === 'Semih' ? 'info' : 'warning'}">${s.payer}</span></td></tr>`;
            }
        });
    } else if (type === 'gelirler') {
        title.innerText = "Tüm Satışlar (Ciro)";
        thead.innerHTML = `<tr><th>Tarih</th><th>Müşteri</th><th>Model</th><th>Satış Tutarı</th><th>Tahsil Edilen</th></tr>`;
        state.sales.forEach(s => {
            tbody.innerHTML += `<tr><td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(s.date)}</td><td>${s.customer}</td><td>${s.model}</td><td style="color:var(--accent-green); font-weight:bold;">${formatCurrency(s.price)}</td><td style="color:var(--accent-blue);">${formatCurrency(s.paid)}</td></tr>`;
        });
    } else if (type === 'alacaklar') {
        title.innerText = "Bekleyen Müşteri Alacakları";
        thead.innerHTML = `<tr><th>Tarih</th><th>Müşteri</th><th>Model</th><th>Kalan Borç</th></tr>`;
        state.sales.forEach(s => {
            const rem = s.price - s.paid;
            if (rem > 0) {
                tbody.innerHTML += `<tr><td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(s.date)}</td><td>${s.customer}</td><td>${s.model}</td><td style="color:var(--accent-yellow); font-weight:bold;">${formatCurrency(rem)}</td></tr>`;
            }
        });
    }
}

function showPartnerDetails(partnerName) {
    document.getElementById("detailModal").classList.add("active");
    document.getElementById("detailModalTitle").innerText = `${partnerName} Cari Ekstresi (Hesap Hareketleri)`;

    const thead = document.getElementById("detailModalThead");
    const tbody = document.getElementById("detailModalTbody");

    thead.innerHTML = `<tr><th>Tarih</th><th>İşlem Tipi</th><th>Açıklama</th><th>Tutar</th></tr>`;

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

    partnerTransactions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    tbody.innerHTML = "";
    partnerTransactions.forEach(item => {
        const amountColor = item.sign === "+" ? "var(--accent-green)" : "var(--danger-red)";
        tbody.innerHTML += `<tr><td style="color:var(--text-muted); font-size:12px;">${formatDateForDisplay(item.date)}</td><td><span class="badge ${item.badge}">${item.type}</span></td><td>${item.desc}</td><td style="color:${amountColor}; font-weight:bold;">${item.sign}${formatCurrency(item.amount)}</td></tr>`;
    });
}

function closeDetailModal() {
    document.getElementById("detailModal").classList.remove("active");
}

// ═══════════════════════════════════════════════════════════════
//  7. STOK ALARMLARI
// ═══════════════════════════════════════════════════════════════
function renderDashboardAlerts() {
    const tbody = document.getElementById("dashStockAlerts");
    tbody.innerHTML = "";
    let hasAlert = false;

    let stockSummary = {};
    state.stocks.forEach(s => {
        if (!stockSummary[s.name]) {
            stockSummary[s.name] = { ...s, totalQty: s.qty || 0 };
        } else {
            stockSummary[s.name].totalQty += (s.qty || 0);
            if (s.threshold > stockSummary[s.name].threshold) {
                stockSummary[s.name].threshold = s.threshold;
            }
        }
    });

    Object.values(stockSummary).forEach(s => {
        if (s.threshold > 0 && s.totalQty <= s.threshold) {
            hasAlert = true;
            const unitText = s.unit ? ` ${s.unit}` : "";
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600;">${s.name}</td>
                    <td style="color:var(--danger-red); font-weight:bold;">${s.totalQty}${unitText}</td>
                    <td>${s.threshold}${unitText}</td>
                    <td><span class="badge danger">Kritik</span></td>
                </tr>`;
        }
    });

    if (!hasAlert) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--accent-green); text-align:center; padding:16px;">✅ Kritik malzeme yok.</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════════
//  8. MALİYET HESAPLAYICI
// ═══════════════════════════════════════════════════════════════
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

    showToast('info', 'Hesaplandı', `Önerilen satış fiyatı: ${formatCurrency(salePrice)}`);
}

// ═══════════════════════════════════════════════════════════════
//  9. GRAFİKLER (Chart.js)
// ═══════════════════════════════════════════════════════════════
function renderDashboardChart() {
    const ctx = document.getElementById("monthlyChart");
    if (!ctx) return;

    // Aylık verileri topla
    const monthlyData = {};

    state.sales.forEach(s => {
        if (!s.date) return;
        const monthKey = s.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        monthlyData[monthKey].income += s.price;
    });

    state.stocks.forEach(s => {
        if (!s.date || !s.cost) return;
        const monthKey = s.date.substring(0, 7);
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        monthlyData[monthKey].expense += s.cost;
    });

    const sortedMonths = Object.keys(monthlyData).sort();

    // Ay isimlerini Türkçe göster
    const turkishMonths = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const labels = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        return `${turkishMonths[parseInt(mo) - 1]} ${y}`;
    });

    const incomeData = sortedMonths.map(m => monthlyData[m].income);
    const expenseData = sortedMonths.map(m => monthlyData[m].expense);

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    if (sortedMonths.length === 0) return;

    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gelir',
                    data: incomeData,
                    backgroundColor: 'rgba(52, 211, 153, 0.6)',
                    borderColor: 'rgba(52, 211, 153, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.6
                },
                {
                    label: 'Gider',
                    data: expenseData,
                    backgroundColor: 'rgba(248, 113, 113, 0.6)',
                    borderColor: 'rgba(248, 113, 113, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#7a8599',
                        font: { family: 'Inter', size: 12 },
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                tooltip: {
                    backgroundColor: '#181b24',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#7a8599', font: { family: 'Inter', size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                },
                y: {
                    ticks: {
                        color: '#7a8599',
                        font: { family: 'Inter', size: 11 },
                        callback: function(value) { return formatCurrency(value); }
                    },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
//  10. RAPORLAR SEKMESİ
// ═══════════════════════════════════════════════════════════════
function populateReportMonthSelector() {
    const select = document.getElementById("reportMonth");
    if (!select) return;

    const months = new Set();
    state.sales.forEach(s => { if (s.date) months.add(s.date.substring(0, 7)); });
    state.stocks.forEach(s => { if (s.date) months.add(s.date.substring(0, 7)); });

    const sorted = Array.from(months).sort().reverse();

    const currentVal = select.value;
    select.innerHTML = `<option value="all">Tüm Zamanlar</option>`;

    const turkishMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    sorted.forEach(m => {
        const [y, mo] = m.split('-');
        select.innerHTML += `<option value="${m}">${turkishMonths[parseInt(mo) - 1]} ${y}</option>`;
    });

    if (currentVal) select.value = currentVal;
}

function renderReports() {
    const selectedMonth = document.getElementById("reportMonth")?.value || 'all';
    const fin = calculateFinancials();

    // Filtreleme
    let filteredSales = state.sales;
    let filteredStocks = state.stocks;
    let filteredTahsilatlar = state.tahsilatlar;
    let filteredPartners = state.partners;

    if (selectedMonth !== 'all') {
        filteredSales = state.sales.filter(s => s.date && s.date.startsWith(selectedMonth));
        filteredStocks = state.stocks.filter(s => s.date && s.date.startsWith(selectedMonth));
        filteredTahsilatlar = state.tahsilatlar.filter(t => t.date && t.date.startsWith(selectedMonth));
        filteredPartners = state.partners.filter(p => p.date && p.date.startsWith(selectedMonth));
    }

    let totalCiro = 0, totalGider = 0, totalAlacak = 0;
    let semihHarcama = 0, ekremHarcama = 0;
    let semihTahsilat = 0, ekremTahsilat = 0;
    let semihCekim = 0, ekremCekim = 0;

    filteredSales.forEach(s => {
        totalCiro += s.price;
        totalAlacak += (s.price - s.paid);
    });

    filteredStocks.forEach(s => {
        if (s.cost) {
            totalGider += s.cost;
            if (s.payer === "Semih") semihHarcama += s.cost;
            if (s.payer === "Ekrem") ekremHarcama += s.cost;
        }
    });

    filteredTahsilatlar.forEach(t => {
        if (t.collector === "Semih") semihTahsilat += t.amount;
        if (t.collector === "Ekrem") ekremTahsilat += t.amount;
    });

    filteredPartners.forEach(p => {
        if (p.type === "cekim_semih") semihCekim += p.amount;
        if (p.type === "cekim_ekrem") ekremCekim += p.amount;
    });

    const netKar = totalCiro - totalGider;
    const karPayi = netKar / 2;

    // Özet kartlar
    document.getElementById("reportCiro").innerText = formatCurrency(totalCiro);
    document.getElementById("reportGider").innerText = formatCurrency(totalGider);
    document.getElementById("reportKar").innerText = formatCurrency(netKar);
    document.getElementById("reportKar").style.color = netKar >= 0 ? 'var(--accent-green)' : 'var(--danger-red)';
    document.getElementById("reportAlacak").innerText = formatCurrency(totalAlacak);

    // Kâr dağıtım - Semih
    document.getElementById("rptSemihKarPay").innerText = formatCurrency(karPayi);
    document.getElementById("rptSemihHarcama").innerText = formatCurrency(semihHarcama);
    document.getElementById("rptSemihTahsilat").innerText = formatCurrency(semihTahsilat);
    document.getElementById("rptSemihCekim").innerText = formatCurrency(semihCekim);
    const semihNet = karPayi - semihTahsilat - semihCekim + semihHarcama;
    document.getElementById("rptSemihNet").innerText = formatCurrency(semihNet);
    document.getElementById("rptSemihNet").style.color = semihNet >= 0 ? 'var(--accent-green)' : 'var(--danger-red)';

    // Kâr dağıtım - Ekrem
    document.getElementById("rptEkremKarPay").innerText = formatCurrency(karPayi);
    document.getElementById("rptEkremHarcama").innerText = formatCurrency(ekremHarcama);
    document.getElementById("rptEkremTahsilat").innerText = formatCurrency(ekremTahsilat);
    document.getElementById("rptEkremCekim").innerText = formatCurrency(ekremCekim);
    const ekremNet = karPayi - ekremTahsilat - ekremCekim + ekremHarcama;
    document.getElementById("rptEkremNet").innerText = formatCurrency(ekremNet);
    document.getElementById("rptEkremNet").style.color = ekremNet >= 0 ? 'var(--accent-green)' : 'var(--danger-red)';

    // Kategori Grafiği
    renderCategoryChart(filteredStocks);
}

function renderCategoryChart(filteredStocks) {
    const ctx = document.getElementById("categoryChart");
    if (!ctx) return;

    const categoryTotals = {};
    filteredStocks.forEach(s => {
        if (s.cost && s.category) {
            if (!categoryTotals[s.category]) categoryTotals[s.category] = 0;
            categoryTotals[s.category] += s.cost;
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const colors = [
        'rgba(96, 165, 250, 0.7)',
        'rgba(248, 113, 113, 0.7)',
        'rgba(52, 211, 153, 0.7)',
        'rgba(251, 191, 36, 0.7)',
        'rgba(167, 139, 250, 0.7)',
        'rgba(244, 114, 182, 0.7)',
        'rgba(56, 189, 248, 0.7)',
        'rgba(163, 230, 53, 0.7)'
    ];

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    if (labels.length === 0) return;

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: 'rgba(24, 27, 36, 1)',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#7a8599',
                        font: { family: 'Inter', size: 12 },
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: '#181b24',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
//  11. DIŞA AKTARMA (CSV / EXCEL)
// ═══════════════════════════════════════════════════════════════
function downloadCSV(filename, csvContent) {
    // BOM ekle (Excel'de Türkçe karakter desteği)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function exportSales() {
    if (state.sales.length === 0) {
        showToast('warning', 'Veri Yok', 'Dışa aktarılacak satış kaydı bulunamadı.');
        return;
    }

    let csv = 'Tarih,Müşteri,Model,Satış Tutarı,Tahsil Edilen,Kalan Alacak\n';
    state.sales.forEach(s => {
        csv += `${formatDateForDisplay(s.date)},"${s.customer}","${s.model}",${s.price},${s.paid},${s.price - s.paid}\n`;
    });

    downloadCSV(`panzico_satislar_${getTodayForInput()}.csv`, csv);
    showToast('success', 'Dışa Aktarıldı', 'Satış verileri CSV olarak indirildi.');
}

function exportExpenses() {
    const expenses = state.stocks.filter(s => s.cost && s.cost > 0);
    if (expenses.length === 0) {
        showToast('warning', 'Veri Yok', 'Dışa aktarılacak gider kaydı bulunamadı.');
        return;
    }

    let csv = 'Tarih,Kalem,Kategori,Miktar,Tutar,Ödeyen\n';
    expenses.forEach(s => {
        const unitText = s.unit ? ` ${s.unit}` : "";
        csv += `${formatDateForDisplay(s.date)},"${s.name}","${s.category}",${s.qty > 0 ? s.qty + unitText : '-'},${s.cost},"${s.payer}"\n`;
    });

    downloadCSV(`panzico_giderler_${getTodayForInput()}.csv`, csv);
    showToast('success', 'Dışa Aktarıldı', 'Gider verileri CSV olarak indirildi.');
}

function exportPartner() {
    if (state.partners.length === 0) {
        showToast('warning', 'Veri Yok', 'Dışa aktarılacak cari kayıt bulunamadı.');
        return;
    }

    let csv = 'Tarih,İşlem Tipi,Tutar,Açıklama\n';
    state.partners.forEach(p => {
        const labels = {
            'cekim_semih': 'Semih Kâr Çekimi',
            'cekim_ekrem': 'Ekrem Kâr Çekimi',
            'odeme_ekrem_semihe': 'Ekrem → Semih Borç Ödeme',
            'odeme_semih_ekreme': 'Semih → Ekrem Borç Ödeme'
        };
        csv += `${formatDateForDisplay(p.date)},"${labels[p.type] || p.type}",${p.amount},"${p.note}"\n`;
    });

    downloadCSV(`panzico_cari_${getTodayForInput()}.csv`, csv);
    showToast('success', 'Dışa Aktarıldı', 'Cari hesap verileri CSV olarak indirildi.');
}

function exportReports() {
    const fin = calculateFinancials();
    let csv = 'Panzico Tufting Atölyesi - Finansal Rapor\n';
    csv += `Rapor Tarihi,${formatDateForDisplay(getTodayForInput())}\n\n`;
    csv += `Toplam Ciro,${fin.totalSales}\n`;
    csv += `Toplam Gider,${fin.totalExpenses}\n`;
    csv += `Net Kâr,${fin.netProfit}\n`;
    csv += `Bekleyen Alacak,${fin.totalReceivables}\n\n`;
    csv += `Semih Harcama,${fin.semihHarcama}\n`;
    csv += `Semih Tahsilat,${fin.semihTahsilat}\n`;
    csv += `Ekrem Harcama,${fin.ekremHarcama}\n`;
    csv += `Ekrem Tahsilat,${fin.ekremTahsilat}\n`;

    downloadCSV(`panzico_rapor_${getTodayForInput()}.csv`, csv);
    showToast('success', 'Rapor İndirildi', 'Finansal rapor CSV olarak indirildi.');
}

function exportAllData() {
    let csv = 'Panzico Tüm Veri Yedeği\n';
    csv += `Yedek Tarihi: ${formatDateForDisplay(getTodayForInput())}\n\n`;

    csv += '=== SATIŞLAR ===\n';
    csv += 'Tarih,Müşteri,Model,Fiyat,Tahsil,Kalan\n';
    state.sales.forEach(s => {
        csv += `${formatDateForDisplay(s.date)},"${s.customer}","${s.model}",${s.price},${s.paid},${s.price - s.paid}\n`;
    });

    csv += '\n=== GİDERLER ===\n';
    csv += 'Tarih,Kalem,Kategori,Tutar,Ödeyen\n';
    state.stocks.forEach(s => {
        if (s.cost) csv += `${formatDateForDisplay(s.date)},"${s.name}","${s.category}",${s.cost},"${s.payer}"\n`;
    });

    csv += '\n=== ORTAKLIK HAREKETLERİ ===\n';
    csv += 'Tarih,Tip,Tutar,Not\n';
    state.partners.forEach(p => {
        csv += `${formatDateForDisplay(p.date)},"${p.type}",${p.amount},"${p.note}"\n`;
    });

    csv += '\n=== TAHSİLATLAR ===\n';
    csv += 'Tarih,Müşteri,Model,Tutar,Alan\n';
    state.tahsilatlar.forEach(t => {
        csv += `${formatDateForDisplay(t.date)},"${t.customer}","${t.model}",${t.amount},"${t.collector}"\n`;
    });

    downloadCSV(`panzico_tam_yedek_${getTodayForInput()}.csv`, csv);
    showToast('success', 'Yedek Alındı', 'Tüm veriler CSV dosyası olarak indirildi.');
}