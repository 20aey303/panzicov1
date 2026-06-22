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
let expenseFilterMode = 'all';
let monthlyChartInstance = null;
let categoryChartInstance = null;

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function() {
    initTabs();
    initMobileMenu();
    initEventListeners();
    setDefaultDates();
    listenToCloudData();
});

// ═══════════════════════════════════════════════════════════════
//  TOAST BİLDİRİM SİSTEMİ
// ═══════════════════════════════════════════════════════════════
function showToast(type, title, message, duration) {
    duration = duration || 4000;
    var container = document.getElementById("toastContainer");
    if (!container) return;

    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    var toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML =
        '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
        '<div class="toast-content">' +
            '<div class="toast-title">' + title + '</div>' +
            '<div class="toast-message">' + message + '</div>' +
        '</div>' +
        '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>' +
        '<div class="toast-progress"></div>';

    container.appendChild(toast);

    setTimeout(function() {
        if (toast.parentElement) {
            toast.classList.add("removing");
            setTimeout(function() { if (toast.parentElement) toast.remove(); }, 300);
        }
    }, duration);
}

// ═══════════════════════════════════════════════════════════════
//  YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════
function getTodayForInput() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return "-";
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return dd + '.' + mm + '.' + yyyy;
}

function setDefaultDates() {
    var today = getTodayForInput();
    var ids = ["stockDate", "quickExpenseDate", "saleDate", "partDate", "expenseDate"];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
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
    var hamburger = document.getElementById("hamburgerBtn");
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    if (!hamburger || !sidebar || !overlay) return;

    hamburger.addEventListener("click", function() {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", function() {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    });
}

// ═══════════════════════════════════════════════════════════════
//  FIREBASE REAL-TIME LISTENERS
// ═══════════════════════════════════════════════════════════════
function listenToCloudData() {
    db.collection("catalog").onSnapshot(function(snapshot) {
        state.catalog = [];
        snapshot.forEach(function(doc) { state.catalog.push({ id: doc.id, ...doc.data() }); });
        renderCatalogDropdowns();
    }, function(err) { console.error("Catalog error:", err); });

    db.collection("stocks").onSnapshot(function(snapshot) {
        state.stocks = [];
        snapshot.forEach(function(doc) { state.stocks.push({ id: doc.id, ...doc.data() }); });
        renderAll();
    }, function(err) { console.error("Stocks error:", err); });

    db.collection("sales").onSnapshot(function(snapshot) {
        state.sales = [];
        snapshot.forEach(function(doc) { state.sales.push({ id: doc.id, ...doc.data() }); });
        renderAll();
    }, function(err) { console.error("Sales error:", err); });

    db.collection("partners").onSnapshot(function(snapshot) {
        state.partners = [];
        snapshot.forEach(function(doc) { state.partners.push({ id: doc.id, ...doc.data() }); });
        renderAll();
    }, function(err) { console.error("Partners error:", err); });

    db.collection("tahsilatlar").onSnapshot(function(snapshot) {
        state.tahsilatlar = [];
        snapshot.forEach(function(doc) { state.tahsilatlar.push({ id: doc.id, ...doc.data() }); });
        renderAll();
    }, function(err) { console.error("Tahsilatlar error:", err); });
}

// ═══════════════════════════════════════════════════════════════
//  TAB NAVİGASYONU
// ═══════════════════════════════════════════════════════════════
function initTabs() {
    var navButtons = document.querySelectorAll(".nav-btn");
    var tabPanels = document.querySelectorAll(".tab-panel");

    navButtons.forEach(function(btn) {
        btn.addEventListener("click", function() {
            var targetTab = btn.getAttribute("data-tab");
            navButtons.forEach(function(b) { b.classList.remove("active"); });
            tabPanels.forEach(function(p) { p.classList.remove("active"); });
            btn.classList.add("active");
            var panel = document.getElementById(targetTab);
            if (panel) panel.classList.add("active");

            // Mobilde sidebar kapat
            if (window.innerWidth <= 768) {
                var sidebar = document.getElementById("sidebar");
                var overlay = document.getElementById("sidebarOverlay");
                if (sidebar) sidebar.classList.remove("open");
                if (overlay) overlay.classList.remove("active");
            }

            // Tab geçişlerinde grafikleri yeniden çiz (gecikmeli)
            if (targetTab === 'reports') {
                setTimeout(function() { renderReports(); }, 150);
            }
            if (targetTab === 'dashboard') {
                setTimeout(function() { renderDashboardChart(); }, 150);
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
function initEventListeners() {
    var calcForm = document.getElementById("calcForm");
    if (calcForm) calcForm.addEventListener("submit", function(e) { e.preventDefault(); calculateTuftingCost(); });

    var catalogForm = document.getElementById("catalogForm");
    if (catalogForm) catalogForm.addEventListener("submit", function(e) { e.preventDefault(); addCatalogItem(); });

    var stockForm = document.getElementById("stockForm");
    if (stockForm) stockForm.addEventListener("submit", function(e) { e.preventDefault(); addStockAndExpense(); });

    var quickExpForm = document.getElementById("quickExpenseForm");
    if (quickExpForm) quickExpForm.addEventListener("submit", function(e) { e.preventDefault(); addQuickExpense(); });

    var saleForm = document.getElementById("saleForm");
    if (saleForm) saleForm.addEventListener("submit", function(e) { e.preventDefault(); saveSaleRecord(); });

    var partnerForm = document.getElementById("partnerForm");
    if (partnerForm) partnerForm.addEventListener("submit", function(e) { e.preventDefault(); addPartnerTransaction(); });

    var modalForm = document.getElementById("modalTahsilatForm");
    if (modalForm) modalForm.addEventListener("submit", function(e) { e.preventDefault(); submitTahsilatModal(); });

    var expenseForm = document.getElementById("expenseForm");
    if (expenseForm) expenseForm.addEventListener("submit", function(e) { e.preventDefault(); addExpense(); });

    var resetBtn = document.getElementById("resetDataBtn");
    if (resetBtn) resetBtn.addEventListener("click", resetAllData);
}

// ═══════════════════════════════════════════════════════════════
//  1. KATALOG
// ═══════════════════════════════════════════════════════════════
function addCatalogItem() {
    var category = document.getElementById("catalogCategory").value.trim();
    var name = document.getElementById("catalogName").value.trim();
    if (!category || !name) {
        showToast('warning', 'Eksik Bilgi', 'Kategori ve kalem adı boş bırakılamaz.');
        return;
    }
    db.collection("catalog").add({
        category: category,
        name: name,
        unit: (document.getElementById("catalogUnit").value || "").trim()
    }).then(function() {
        showToast('success', 'Katalog Güncellendi', '"' + name + '" kataloğa eklendi.');
        document.getElementById("catalogForm").reset();
    });
}

function renderCatalogDropdowns() {
    var targets = ["stockItemSelect", "quickExpenseItem", "expenseItem"];
    var html = '<option value="">Seçim Yapın...</option>';
    state.catalog.forEach(function(c) {
        html += '<option value="' + c.id + '">' + c.name + ' (' + c.category + ')</option>';
    });
    targets.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
}

// ═══════════════════════════════════════════════════════════════
//  2. STOK / GİDER
// ═══════════════════════════════════════════════════════════════
function addStockAndExpense() {
    var selectVal = document.getElementById("stockItemSelect").value;
    var catalogItem = state.catalog.find(function(c) { return c.id === selectVal; });
    if (!catalogItem) { showToast('warning', 'Seçim Hatası', 'Lütfen katalogdan bir kalem seçin!'); return; }
    var cost = parseFloat(document.getElementById("stockTotalCost").value);
    if (isNaN(cost) || cost <= 0) { showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.'); return; }

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
    }).then(function() {
        showToast('success', 'Stok Eklendi', '"' + catalogItem.name + '" stoğa ve gidere işlendi.');
        document.getElementById("stockForm").reset();
        setDefaultDates();
    });
}

function addQuickExpense() {
    var selectVal = document.getElementById("quickExpenseItem").value;
    var catalogItem = state.catalog.find(function(c) { return c.id === selectVal; });
    if (!catalogItem) { showToast('warning', 'Seçim Hatası', 'Lütfen katalogdan bir kalem seçin!'); return; }
    var amount = parseFloat(document.getElementById("quickExpenseAmount").value);
    if (isNaN(amount) || amount <= 0) { showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.'); return; }

    db.collection("stocks").add({
        catalogId: catalogItem.id,
        category: catalogItem.category,
        name: catalogItem.name,
        qty: 0, unit: catalogItem.unit, threshold: 0,
        cost: amount,
        payer: document.getElementById("quickExpensePayer").value,
        date: document.getElementById("quickExpenseDate").value
    }).then(function() {
        showToast('success', 'Gider İşlendi', formatCurrency(amount) + ' gider olarak kaydedildi.');
        document.getElementById("quickExpenseForm").reset();
        setDefaultDates();
    });
}

// Giderler sekmesinden gider ekleme
function addExpense() {
    var selectVal = document.getElementById("expenseItem").value;
    var catalogItem = state.catalog.find(function(c) { return c.id === selectVal; });
    if (!catalogItem) { showToast('warning', 'Seçim Hatası', 'Lütfen katalogdan bir kalem seçin!'); return; }
    var amount = parseFloat(document.getElementById("expenseAmount").value);
    if (isNaN(amount) || amount <= 0) { showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.'); return; }

    db.collection("stocks").add({
        catalogId: catalogItem.id,
        category: catalogItem.category,
        name: catalogItem.name,
        qty: parseFloat(document.getElementById("expenseQty").value) || 0,
        unit: catalogItem.unit,
        threshold: 0,
        cost: amount,
        payer: document.getElementById("expensePayer").value,
        date: document.getElementById("expenseDate").value,
        note: (document.getElementById("expenseNote").value || "").trim()
    }).then(function() {
        showToast('success', 'Gider Kaydedildi', '"' + catalogItem.name + '" - ' + formatCurrency(amount));
        document.getElementById("expenseForm").reset();
        setDefaultDates();
    });
}

function renderStockTable() {
    var tbody = document.getElementById("stockTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var stockSummary = {};
    state.stocks.forEach(function(s) {
        if (!stockSummary[s.name]) {
            stockSummary[s.name] = { category: s.category, name: s.name, unit: s.unit, totalQty: s.qty || 0, threshold: s.threshold || 0 };
        } else {
            stockSummary[s.name].totalQty += (s.qty || 0);
            if ((s.threshold || 0) > stockSummary[s.name].threshold) {
                stockSummary[s.name].threshold = s.threshold;
            }
        }
    });

    var items = Object.values(stockSummary).filter(function(s) { return s.totalQty > 0 || s.threshold > 0; });

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">📦 Henüz stok kaydı yok.</td></tr>';
        return;
    }

    items.forEach(function(s) {
        var isCritical = s.threshold > 0 && s.totalQty <= s.threshold;
        var unitText = s.unit ? ' ' + s.unit : '';
        tbody.innerHTML +=
            '<tr>' +
                '<td>' + s.category + '</td>' +
                '<td style="font-weight:600;">' + s.name + '</td>' +
                '<td style="font-weight:700; color:' + (isCritical ? 'var(--danger-red)' : 'var(--text-main)') + '">' + s.totalQty + unitText + '</td>' +
                '<td>' + s.threshold + unitText + '</td>' +
                '<td><span class="badge ' + (isCritical ? 'danger' : 'success') + '">' + (isCritical ? 'Kritik' : 'Normal') + '</span></td>' +
            '</tr>';
    });
}

// ═══════════════════════════════════════════════════════════════
//  GİDERLER SEKMESİ
// ═══════════════════════════════════════════════════════════════
function setExpenseFilter(mode, btn) {
    expenseFilterMode = mode;
    if (btn) {
        var parent = btn.parentElement;
        if (parent) {
            parent.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        }
        btn.classList.add('active');
    }
    renderExpenseTable();
}

function renderExpenseTable() {
    var tbody = document.getElementById("expenseTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var expenses = state.stocks.filter(function(s) { return s.cost && s.cost > 0; });

    // Filtre uygula
    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (expenseFilterMode === 'month') {
        expenses = expenses.filter(function(s) { return new Date(s.date) >= startOfMonth; });
    } else if (expenseFilterMode === 'semih') {
        expenses = expenses.filter(function(s) { return s.payer === 'Semih'; });
    } else if (expenseFilterMode === 'ekrem') {
        expenses = expenses.filter(function(s) { return s.payer === 'Ekrem'; });
    } else if (expenseFilterMode === 'custom') {
        var startVal = document.getElementById("expFilterStart") ? document.getElementById("expFilterStart").value : '';
        var endVal = document.getElementById("expFilterEnd") ? document.getElementById("expFilterEnd").value : '';
        if (startVal) expenses = expenses.filter(function(s) { return s.date >= startVal; });
        if (endVal) expenses = expenses.filter(function(s) { return s.date <= endVal; });
    }

    // Tarih sıralaması (en yeni üstte)
    expenses.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">📝 Gösterilecek gider kaydı yok.</td></tr>';
        return;
    }

    expenses.forEach(function(s) {
        var unitText = s.unit ? ' ' + s.unit : '';
        tbody.innerHTML +=
            '<tr>' +
                '<td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(s.date) + '</td>' +
                '<td style="font-weight:600;">' + s.name + '</td>' +
                '<td>' + s.category + '</td>' +
                '<td>' + (s.qty > 0 ? s.qty + unitText : '-') + '</td>' +
                '<td style="font-weight:700; color:var(--danger-red);">' + formatCurrency(s.cost) + '</td>' +
                '<td><span class="badge ' + (s.payer === 'Semih' ? 'info' : 'warning') + '">' + s.payer + '</span></td>' +
                '<td><button class="delete-btn" onclick="deleteDocument(\'stocks\', \'' + s.id + '\')">Sil</button></td>' +
            '</tr>';
    });

    // Gider özet kartlarını güncelle
    updateExpenseSummaryCards();
}

function updateExpenseSummaryCards() {
    var totalExp = 0, semihExp = 0, ekremExp = 0;
    state.stocks.forEach(function(s) {
        if (s.cost && s.cost > 0) {
            totalExp += s.cost;
            if (s.payer === 'Semih') semihExp += s.cost;
            if (s.payer === 'Ekrem') ekremExp += s.cost;
        }
    });
    var el1 = document.getElementById("expTotalExpense");
    var el2 = document.getElementById("expSemihTotal");
    var el3 = document.getElementById("expEkremTotal");
    if (el1) el1.innerText = formatCurrency(totalExp);
    if (el2) el2.innerText = formatCurrency(semihExp);
    if (el3) el3.innerText = formatCurrency(ekremExp);
}

// ═══════════════════════════════════════════════════════════════
//  3. SATIŞ SİSTEMİ & TAHSİLAT
// ═══════════════════════════════════════════════════════════════
function saveSaleRecord() {
    var customer = document.getElementById("saleCustomer").value.trim();
    var model = document.getElementById("saleModel").value.trim();
    var price = parseFloat(document.getElementById("salePrice").value);
    var paid = parseFloat(document.getElementById("salePaid").value);
    var status = document.getElementById("saleStatus") ? document.getElementById("saleStatus").value : 'Bekliyor';
    var deliveryDate = document.getElementById("saleDeliveryDate") ? document.getElementById("saleDeliveryDate").value : '';

    if (!customer || !model) { showToast('warning', 'Eksik Bilgi', 'Müşteri adı ve halı modeli zorunludur.'); return; }
    if (isNaN(price) || price <= 0) { showToast('warning', 'Geçersiz Fiyat', 'Satış fiyatı sıfırdan büyük olmalıdır.'); return; }
    if (isNaN(paid) || paid < 0) { showToast('warning', 'Geçersiz Tutar', 'Tahsil edilen tutar negatif olamaz.'); return; }
    if (paid > price) { showToast('warning', 'Tutar Hatası', 'Tahsil edilen tutar satış fiyatını aşamaz.'); return; }

    var collectorEl = document.getElementById("saleCollector");
    var collector = collectorEl ? collectorEl.value : '';

    var saleData = {
        customer: customer,
        model: model,
        status: status,
        deliveryDate: deliveryDate,
        price: price,
        paid: paid,
        date: document.getElementById("saleDate").value,
        collector: collector
    };

    if (editingSaleId) {
        db.collection("sales").doc(editingSaleId).update(saleData).then(function() {
            showToast('success', 'Satış Güncellendi', customer + ' siparişi güncellendi.');
        });
        editingSaleId = null;
        var btn = document.querySelector("#saleForm button[type='submit']");
        if (btn) { btn.innerText = "Satışı Kaydet"; btn.style.background = ""; }
    } else {
        db.collection("sales").add(saleData).then(function() {
            showToast('success', 'Satış Kaydedildi', customer + ' - ' + model + ' satışı kaydedildi.');
        });
    }

    document.getElementById("saleForm").reset();
    setDefaultDates();
}

function editSale(id) {
    var sale = state.sales.find(function(s) { return s.id === id; });
    if (!sale) return;

    var parsedDate = sale.date ? sale.date.substring(0, 10) : getTodayForInput();

    document.getElementById("saleCustomer").value = sale.customer || '';
    document.getElementById("saleModel").value = sale.model || '';
    document.getElementById("salePrice").value = sale.price || 0;
    document.getElementById("salePaid").value = sale.paid || 0;
    document.getElementById("saleDate").value = parsedDate;
    if (document.getElementById("saleStatus")) document.getElementById("saleStatus").value = sale.status || 'Bekliyor';
    if (document.getElementById("saleDeliveryDate")) document.getElementById("saleDeliveryDate").value = sale.deliveryDate || '';

    var collectorEl = document.getElementById("saleCollector");
    if (collectorEl && sale.collector) collectorEl.value = sale.collector;

    editingSaleId = id;
    var btn = document.querySelector("#saleForm button[type='submit']");
    if (btn) {
        btn.innerText = "Satışı Güncelle";
        btn.style.background = "linear-gradient(135deg, #fbbf24, #f59e0b)";
    }
    document.getElementById("saleForm").scrollIntoView({ behavior: 'smooth' });
}

function receivePayment(id) {
    var sale = state.sales.find(function(s) { return s.id === id; });
    if (!sale) return;

    currentActiveSaleId = id;
    var remaining = sale.price - sale.paid;

    var info = document.getElementById("modalCustomerInfo");
    if (info) {
        info.innerHTML =
            '<strong>Müşteri:</strong> ' + sale.customer + '<br>' +
            '<strong>Model:</strong> ' + sale.model + '<br>' +
            '<strong>Kalan Borç:</strong> <span style="color:var(--accent-yellow); font-weight:bold;">' + formatCurrency(remaining) + '</span>';
    }

    var amountEl = document.getElementById("modalAmount");
    if (amountEl) { amountEl.value = remaining; amountEl.max = remaining; }

    var dateEl = document.getElementById("modalDate");
    if (dateEl) dateEl.value = getTodayForInput();

    // Modal'ı aç
    var modal = document.getElementById("tahsilatModal");
    if (modal) modal.style.display = "flex";
}

function closeTahsilatModal() {
    var modal = document.getElementById("tahsilatModal");
    if (modal) modal.style.display = "none";
    var form = document.getElementById("modalTahsilatForm");
    if (form) form.reset();
    currentActiveSaleId = null;
}

function submitTahsilatModal() {
    var sale = state.sales.find(function(s) { return s.id === currentActiveSaleId; });
    if (!sale) return;

    var amount = parseFloat(document.getElementById("modalAmount").value);
    var collector = document.getElementById("modalCollector").value;
    var tDate = document.getElementById("modalDate").value;
    var remaining = sale.price - sale.paid;

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
    .then(function() {
        var updatedPaid = sale.paid + amount;
        return db.collection("sales").doc(currentActiveSaleId).update({ paid: updatedPaid });
    })
    .then(function() {
        showToast('success', 'Tahsilat Başarılı', formatCurrency(amount) + ' ' + collector + ' hesabına işlendi.');
        closeTahsilatModal();
    })
    .catch(function(err) {
        showToast('error', 'Hata', 'İşlem hatası: ' + err.message);
    });
}

// Satış filtreleme
function setSalesFilter(mode, btn) {
    salesFilterMode = mode;
    if (btn) {
        var btns = document.querySelectorAll('#sales .filter-btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    }
    renderSalesTable();
}

function renderSalesTable() {
    var tbody = document.getElementById("salesTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var filtered = state.sales.slice();
    var searchInput = document.getElementById("salesSearchInput");
    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Arama
    if (searchTerm) {
        filtered = filtered.filter(function(s) {
            return (s.customer || '').toLowerCase().indexOf(searchTerm) >= 0 ||
                   (s.model || '').toLowerCase().indexOf(searchTerm) >= 0;
        });
    }

    // Tarih filtreleri
    var now = new Date();
    if (salesFilterMode === 'week') {
        var startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        filtered = filtered.filter(function(s) { return new Date(s.date) >= startOfWeek; });
    } else if (salesFilterMode === 'month') {
        var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(function(s) { return new Date(s.date) >= startOfMonth; });
    } else if (salesFilterMode === 'debtor') {
        filtered = filtered.filter(function(s) { return (s.price - s.paid) > 0; });
    }

    // Tarih sıralama
    filtered.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">🧾 Gösterilecek satış kaydı yok.</td></tr>';
        return;
    }

    filtered.forEach(function(s) {
        var remaining = s.price - s.paid;
        var tahsilatBtn = remaining > 0 ? '<button class="action-btn collect" onclick="receivePayment(\'' + s.id + '\')">💰</button>' : '';
        
        var statusColors = {
            'Bekliyor': 'warning',
            'Üretimde': 'info',
            'Hazır': 'success',
            'Teslim Edildi': 'success'
        };
        var badgeColor = statusColors[s.status] || 'warning';

        tbody.innerHTML +=
            '<tr>' +
                '<td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(s.date) + '</td>' +
                '<td style="font-weight:600;">' + s.customer + '</td>' +
                '<td>' + s.model + '</td>' +
                '<td><span class="badge ' + badgeColor + '">' + (s.status || 'Bekliyor') + '</span></td>' +
                '<td>' + formatCurrency(s.price) + '</td>' +
                '<td style="font-weight:bold; color:' + (remaining > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)') + '">' + formatCurrency(remaining) + '</td>' +
                '<td><div class="table-actions">' +
                    tahsilatBtn +
                    '<button class="action-btn edit" onclick="editSale(\'' + s.id + '\')">✏️</button>' +
                    '<button class="delete-btn" onclick="deleteDocument(\'sales\', \'' + s.id + '\')">🗑️</button>' +
                '</div></td>' +
            '</tr>';
    });
}

function renderDashboardDebtors() {
    var tbody = document.getElementById("dashDebtorsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    var hasDebtor = false;

    state.sales.forEach(function(s) {
        var remaining = s.price - s.paid;
        // Eğer durumu Teslim Edildi değilse veya kalan borcu varsa göster
        if (remaining > 0 || (s.status && s.status !== 'Teslim Edildi')) {
            hasDebtor = true;
            var statusColors = { 'Bekliyor': 'warning', 'Üretimde': 'info', 'Hazır': 'success', 'Teslim Edildi': 'success' };
            var badgeColor = statusColors[s.status] || 'warning';

            tbody.innerHTML +=
                '<tr>' +
                    '<td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(s.deliveryDate || s.date) + '</td>' +
                    '<td style="font-weight:700;">' + s.customer + '</td>' +
                    '<td>' + s.model + '</td>' +
                    '<td><span class="badge ' + badgeColor + '">' + (s.status || 'Bekliyor') + '</span></td>' +
                    '<td>' + formatCurrency(s.price) + '</td>' +
                    '<td style="color:var(--accent-yellow); font-weight:bold;">' + formatCurrency(remaining) + '</td>' +
                    '<td><button class="action-btn collect" onclick="receivePayment(\'' + s.id + '\')" style="font-size:11px;">💰 Tahsilat</button></td>' +
                '</tr>';
        }
    });

    if (!hasDebtor) {
        tbody.innerHTML = '<tr><td colspan="7" style="color:var(--accent-green); text-align:center; padding:20px;">✅ Aktif sipariş veya bekleyen alacak yok.</td></tr>';
    }
}

// ═══════════════════════════════════════════════════════════════
//  4. ORTAKLIK CARİ
// ═══════════════════════════════════════════════════════════════
function addPartnerTransaction() {
    var amount = parseFloat(document.getElementById("partAmount").value);
    var note = document.getElementById("partNote").value.trim();
    if (isNaN(amount) || amount <= 0) { showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.'); return; }
    if (!note) { showToast('warning', 'Eksik Bilgi', 'Açıklama notu zorunludur.'); return; }

    db.collection("partners").add({
        type: document.getElementById("partType").value,
        amount: amount,
        note: note,
        date: document.getElementById("partDate").value
    }).then(function() {
        showToast('success', 'Cari Güncellendi', formatCurrency(amount) + ' işlendi.');
        document.getElementById("partnerForm").reset();
        setDefaultDates();
    });
}

function renderPartnerTable() {
    var tbody = document.getElementById("partnerTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (state.partners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">🤝 Henüz ortaklık hareketi yok.</td></tr>';
        return;
    }

    state.partners.forEach(function(p) {
        var islemMetni = "";
        var badgeClass = "danger";
        if (p.type === "cekim_semih") { islemMetni = "Semih (Kâr Çekti)"; }
        else if (p.type === "cekim_ekrem") { islemMetni = "Ekrem (Kâr Çekti)"; }
        else if (p.type === "kasa_giris_semih") { islemMetni = "Semih (Sermaye Koydu)"; badgeClass = "success"; }
        else if (p.type === "kasa_giris_ekrem") { islemMetni = "Ekrem (Sermaye Koydu)"; badgeClass = "success"; }
        else if (p.type === "odeme_ekrem_semihe") { islemMetni = "Ekrem ➔ Semih (Borç Ödedi)"; badgeClass = "info"; }
        else if (p.type === "odeme_semih_ekreme") { islemMetni = "Semih ➔ Ekrem (Borç Ödedi)"; badgeClass = "info"; }

        tbody.innerHTML +=
            '<tr>' +
                '<td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(p.date) + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + islemMetni + '</span></td>' +
                '<td style="font-weight:bold; color:' + (badgeClass === 'success' ? 'var(--accent-green)' : 'var(--danger-red)') + '">' + formatCurrency(p.amount) + '</td>' +
                '<td style="color:var(--text-muted); font-size:13px">' + p.note + '</td>' +
                '<td><button class="delete-btn" onclick="deleteDocument(\'partners\', \'' + p.id + '\')">Sil</button></td>' +
            '</tr>';
    });
}

// ═══════════════════════════════════════════════════════════════
//  KAYIT SİLME & SIFIRLAMA
// ═══════════════════════════════════════════════════════════════
function deleteDocument(collectionName, docId) {
    if (confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) {
        db.collection(collectionName).doc(docId).delete().then(function() {
            showToast('info', 'Kayıt Silindi', 'Seçilen kayıt silindi.');
        }).catch(function(err) {
            showToast('error', 'Silme Hatası', err.message);
        });
    }
}

function resetAllData() {
    var step1 = confirm("⚠️ DİKKAT: Tüm verileri kalıcı olarak sileceksiniz!\n\nBu işlem geri alınamaz. Devam?");
    if (!step1) return;

    var step2 = confirm("🔴 İKİNCİ ONAY: Gerçekten TÜM verileri silmek istediğinize emin misiniz?");
    if (!step2) return;

    var step3 = prompt("🛑 SON ADIM: Silmek için 'SİL' yazın:");
    if (step3 !== 'SİL') {
        showToast('info', 'İptal Edildi', 'Veri silme işlemi iptal edildi.');
        return;
    }

    showToast('warning', 'Siliniyor', 'Tüm veriler temizleniyor...');

    var collections = ['catalog', 'stocks', 'sales', 'partners', 'tahsilatlar'];
    var promises = collections.map(function(col) {
        return db.collection(col).get().then(function(snapshot) {
            var batch = db.batch();
            snapshot.docs.forEach(function(doc) { batch.delete(doc.ref); });
            return batch.commit();
        });
    });

    Promise.all(promises).then(function() {
        showToast('success', 'Tamamlandı', 'Tüm veriler silindi.');
    }).catch(function(err) {
        showToast('error', 'Hata', err.message);
    });
}

// ═══════════════════════════════════════════════════════════════
//  5. FİNANSAL MOTOR (GÜNCEL ATÖLYE KASASI ENTEGRASYONU)
// ═══════════════════════════════════════════════════════════════
function calculateFinancials() {
    var totalSales = 0, totalExpenses = 0, totalReceivables = 0;
    var semihHarcama = 0, ekremHarcama = 0;
    var semihTahsilat = 0, ekremTahsilat = 0;
    var semihCekim = 0, ekremCekim = 0;
    var semihTransferBakiye = 0, ekremTransferBakiye = 0;
    
    // Atölye Kasası Bakiyesi
    var atolyeKasasi = 0;

    state.stocks.forEach(function(s) {
        if (s.cost) {
            totalExpenses += s.cost;
            if (s.payer === "Semih") { semihHarcama += s.cost; }
            if (s.payer === "Ekrem") { ekremHarcama += s.cost; }
            if (s.payer === "Atölye Kasası") { atolyeKasasi -= s.cost; } // Kasadan çıkan para
        }
    });

    state.sales.forEach(function(s) {
        totalSales += s.price;
        totalReceivables += (s.price - s.paid);
    });

    state.tahsilatlar.forEach(function(t) {
        if (t.collector === "Semih") { semihTahsilat += t.amount; }
        if (t.collector === "Ekrem") { ekremTahsilat += t.amount; }
        if (t.collector === "Atölye Kasası") { atolyeKasasi += t.amount; } // Kasaya giren tahsilat
    });

    state.partners.forEach(function(p) {
        // Sermaye girişleri (Kasaya para koyma)
        if (p.type === "kasa_giris_semih") { atolyeKasasi += p.amount; semihTransferBakiye += p.amount; }
        if (p.type === "kasa_giris_ekrem") { atolyeKasasi += p.amount; ekremTransferBakiye += p.amount; }
        
        // Kasadan çekimler
        if (p.type === "cekim_semih") { semihTransferBakiye -= p.amount; semihCekim += p.amount; atolyeKasasi -= p.amount; }
        if (p.type === "cekim_ekrem") { ekremTransferBakiye -= p.amount; ekremCekim += p.amount; atolyeKasasi -= p.amount; }
        
        // Kişisel borç ödemeleri
        if (p.type === "odeme_ekrem_semihe") { ekremTransferBakiye += p.amount; semihTransferBakiye -= p.amount; }
        if (p.type === "odeme_semih_ekreme") { semihTransferBakiye += p.amount; ekremTransferBakiye -= p.amount; }
    });

    var netProfit = totalSales - totalExpenses;
    var semihNetYatirim = semihHarcama - semihTahsilat + semihTransferBakiye;
    var ekremNetYatirim = ekremHarcama - ekremTahsilat + ekremTransferBakiye;

    var mutabakatMetni = "✅ Hesaplar Eşit";
    var mutabakatRenk = "var(--accent-green)";

    if (semihNetYatirim > ekremNetYatirim) {
        var borc = (semihNetYatirim - ekremNetYatirim) / 2;
        mutabakatMetni = 'Ekrem, Semih\'e <br><strong style="font-size:22px">' + formatCurrency(borc) + '</strong> ödemeli.';
        mutabakatRenk = "var(--accent-yellow)";
    } else if (ekremNetYatirim > semihNetYatirim) {
        var borc2 = (ekremNetYatirim - semihNetYatirim) / 2;
        mutabakatMetni = 'Semih, Ekrem\'e <br><strong style="font-size:22px">' + formatCurrency(borc2) + '</strong> ödemeli.';
        mutabakatRenk = "var(--accent-yellow)";
    }

    return {
        netProfit: netProfit, totalSales: totalSales, totalReceivables: totalReceivables, totalExpenses: totalExpenses,
        semihHarcama: semihHarcama, ekremHarcama: ekremHarcama, semihTahsilat: semihTahsilat, ekremTahsilat: ekremTahsilat,
        semihCekim: semihCekim, ekremCekim: ekremCekim, atolyeKasasi: atolyeKasasi,
        mutabakatMetni: mutabakatMetni, mutabakatRenk: mutabakatRenk
    };
}

// ═══════════════════════════════════════════════════════════════
//  MÜŞTERİ LİSTESİ DOLDURMA (DATALIST)
// ═══════════════════════════════════════════════════════════════
function populateCustomerDatalist() {
    var datalist = document.getElementById("customerList");
    if (!datalist) return;
    
    var uniqueCustomers = [];
    state.sales.forEach(function(s) {
        if (s.customer && uniqueCustomers.indexOf(s.customer) === -1) {
            uniqueCustomers.push(s.customer);
        }
    });
    
    var html = "";
    uniqueCustomers.sort().forEach(function(c) {
        html += '<option value="' + c + '"></option>';
    });
    datalist.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  RENDER ALL
// ═══════════════════════════════════════════════════════════════
function sortDataByDate() {
    var sorter = function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); };
    state.stocks.sort(sorter);
    state.sales.sort(sorter);
    state.partners.sort(sorter);
    state.tahsilatlar.sort(sorter);
}

function renderAll() {
    sortDataByDate();
    var fin = calculateFinancials();

    // Dashboard
    var el;
    el = document.getElementById("dashNetProfit");
    if (el) { el.innerText = formatCurrency(fin.netProfit); el.style.color = fin.netProfit < 0 ? "var(--danger-red)" : "var(--accent-green)"; }

    el = document.getElementById("dashIncome");
    if (el) el.innerText = formatCurrency(fin.totalSales);

    el = document.getElementById("dashReceivables");
    if (el) el.innerText = formatCurrency(fin.totalReceivables);

    el = document.getElementById("dashExpenses");
    if (el) el.innerText = formatCurrency(fin.totalExpenses);

    el = document.getElementById("dashSemih");
    if (el) el.innerText = "Atölye Harcaması: " + formatCurrency(fin.semihHarcama);

    el = document.getElementById("dashSemihTahsilat");
    if (el) el.innerText = "Cebine Giren Tahsilat: " + formatCurrency(fin.semihTahsilat);

    el = document.getElementById("dashEkrem");
    if (el) el.innerText = "Atölye Harcaması: " + formatCurrency(fin.ekremHarcama);

    el = document.getElementById("dashEkremTahsilat");
    if (el) el.innerText = "Cebine Giren Tahsilat: " + formatCurrency(fin.ekremTahsilat);

    el = document.getElementById("dashKasa");
    if (el) {
        el.innerText = formatCurrency(fin.atolyeKasasi);
        el.style.color = fin.atolyeKasasi < 0 ? "var(--danger-red)" : "var(--accent-green)";
    }

    el = document.getElementById("dashMutabakat");
    if (el) { el.innerHTML = fin.mutabakatMetni; el.style.color = fin.mutabakatRenk; }

    // Tablolar ve Listeler
    populateCustomerDatalist();
    renderStockTable();
    renderExpenseTable();
    renderSalesTable();
    renderPartnerTable();
    renderDashboardAlerts();
    renderDashboardDebtors();
    renderDashboardChart();
    populateReportMonthSelector();
}

// ═══════════════════════════════════════════════════════════════
//  6. DETAY MODALLARI
// ═══════════════════════════════════════════════════════════════
function showDetails(type) {
    var modal = document.getElementById("detailModal");
    if (modal) modal.style.display = "flex";

    var title = document.getElementById("detailModalTitle");
    var thead = document.getElementById("detailModalThead");
    var tbody = document.getElementById("detailModalTbody");
    if (!thead || !tbody) return;

    tbody.innerHTML = "";

    if (type === 'giderler') {
        if (title) title.innerText = "Tüm Gider ve Harcamalar";
        thead.innerHTML = '<tr><th>Tarih</th><th>Kalem</th><th>Kategori</th><th>Tutar</th><th>Ödeyen</th></tr>';
        state.stocks.forEach(function(s) {
            if (s.cost) {
                tbody.innerHTML += '<tr><td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(s.date) + '</td><td>' + s.name + '</td><td>' + s.category + '</td><td style="color:var(--danger-red); font-weight:bold;">' + formatCurrency(s.cost) + '</td><td><span class="badge ' + (s.payer === 'Semih' ? 'info' : 'warning') + '">' + s.payer + '</span></td></tr>';
            }
        });
    } else if (type === 'gelirler') {
        if (title) title.innerText = "Tüm Satışlar (Ciro)";
        thead.innerHTML = '<tr><th>Tarih</th><th>Müşteri</th><th>Model</th><th>Satış Tutarı</th><th>Tahsil Edilen</th></tr>';
        state.sales.forEach(function(s) {
            tbody.innerHTML += '<tr><td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(s.date) + '</td><td>' + s.customer + '</td><td>' + s.model + '</td><td style="color:var(--accent-green); font-weight:bold;">' + formatCurrency(s.price) + '</td><td style="color:var(--accent-blue);">' + formatCurrency(s.paid) + '</td></tr>';
        });
    } else if (type === 'alacaklar') {
        if (title) title.innerText = "Bekleyen Müşteri Alacakları";
        thead.innerHTML = '<tr><th>Tarih</th><th>Müşteri</th><th>Model</th><th>Kalan Borç</th></tr>';
        state.sales.forEach(function(s) {
            var rem = s.price - s.paid;
            if (rem > 0) {
                tbody.innerHTML += '<tr><td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(s.date) + '</td><td>' + s.customer + '</td><td>' + s.model + '</td><td style="color:var(--accent-yellow); font-weight:bold;">' + formatCurrency(rem) + '</td></tr>';
            }
        });
    }
}

function showPartnerDetails(partnerName) {
    var modal = document.getElementById("detailModal");
    if (modal) modal.style.display = "flex";

    var titleEl = document.getElementById("detailModalTitle");
    if (titleEl) titleEl.innerText = partnerName + ' Cari Ekstresi';

    var thead = document.getElementById("detailModalThead");
    var tbody = document.getElementById("detailModalTbody");
    if (!thead || !tbody) return;

    thead.innerHTML = '<tr><th>Tarih</th><th>İşlem Tipi</th><th>Açıklama</th><th>Tutar</th></tr>';

    var txns = [];

    state.stocks.forEach(function(s) {
        if (s.payer === partnerName && s.cost > 0) txns.push({ date: s.date, type: "Atölyeye Harcadı", desc: s.name, amount: s.cost, badge: "success", sign: "+" });
    });

    state.tahsilatlar.forEach(function(t) {
        if (t.collector === partnerName) txns.push({ date: t.date, type: "Müşteriden Aldı", desc: (t.customer || '') + ' (' + (t.model || '') + ')', amount: t.amount, badge: "danger", sign: "-" });
    });

    state.partners.forEach(function(p) {
        if (partnerName === "Semih") {
            if (p.type === "cekim_semih") txns.push({ date: p.date, type: "Kâr Çekimi", desc: p.note, amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_ekrem_semihe") txns.push({ date: p.date, type: "Ortaktan Aldı", desc: "Ekrem borcunu ödedi", amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_semih_ekreme") txns.push({ date: p.date, type: "Ortağa Ödedi", desc: "Ekrem'e borç ödendi", amount: p.amount, badge: "success", sign: "+" });
        } else if (partnerName === "Ekrem") {
            if (p.type === "cekim_ekrem") txns.push({ date: p.date, type: "Kâr Çekimi", desc: p.note, amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_semih_ekreme") txns.push({ date: p.date, type: "Ortaktan Aldı", desc: "Semih borcunu ödedi", amount: p.amount, badge: "danger", sign: "-" });
            if (p.type === "odeme_ekrem_semihe") txns.push({ date: p.date, type: "Ortağa Ödedi", desc: "Semih'e borç ödendi", amount: p.amount, badge: "success", sign: "+" });
        }
    });

    txns.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

    tbody.innerHTML = "";
    txns.forEach(function(item) {
        var color = item.sign === "+" ? "var(--accent-green)" : "var(--danger-red)";
        tbody.innerHTML += '<tr><td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(item.date) + '</td><td><span class="badge ' + item.badge + '">' + item.type + '</span></td><td>' + item.desc + '</td><td style="color:' + color + '; font-weight:bold;">' + item.sign + formatCurrency(item.amount) + '</td></tr>';
    });
}

function closeDetailModal() {
    var modal = document.getElementById("detailModal");
    if (modal) modal.style.display = "none";
}

// ═══════════════════════════════════════════════════════════════
//  7. STOK ALARMLARI
// ═══════════════════════════════════════════════════════════════
function renderDashboardAlerts() {
    var tbody = document.getElementById("dashStockAlerts");
    if (!tbody) return;
    tbody.innerHTML = "";
    var hasAlert = false;

    var summary = {};
    state.stocks.forEach(function(s) {
        if (!summary[s.name]) {
            summary[s.name] = { name: s.name, unit: s.unit, totalQty: s.qty || 0, threshold: s.threshold || 0 };
        } else {
            summary[s.name].totalQty += (s.qty || 0);
            if ((s.threshold || 0) > summary[s.name].threshold) summary[s.name].threshold = s.threshold;
        }
    });

    Object.values(summary).forEach(function(s) {
        if (s.threshold > 0 && s.totalQty <= s.threshold) {
            hasAlert = true;
            var unitText = s.unit ? ' ' + s.unit : '';
            tbody.innerHTML +=
                '<tr>' +
                    '<td style="font-weight:600;">' + s.name + '</td>' +
                    '<td style="color:var(--danger-red); font-weight:bold;">' + s.totalQty + unitText + '</td>' +
                    '<td>' + s.threshold + unitText + '</td>' +
                    '<td><span class="badge danger">Kritik</span></td>' +
                '</tr>';
        }
    });

    if (!hasAlert) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:var(--accent-green); text-align:center; padding:16px;">✅ Kritik malzeme yok.</td></tr>';
    }
}

// ═══════════════════════════════════════════════════════════════
//  8. MALİYET HESAPLAYICI (GÜNCEL - TOP BAZLI)
// ═══════════════════════════════════════════════════════════════
function calculateTuftingCost() {
    var spoolGrams = parseFloat(document.getElementById("calcSpoolGrams").value) || 1;
    var spoolPrice = parseFloat(document.getElementById("calcSpoolPrice").value) || 0;
    var yarnUsage = parseFloat(document.getElementById("calcYarnUsage").value) || 0;
    var width = parseFloat(document.getElementById("calcWidth").value) || 0;
    var height = parseFloat(document.getElementById("calcHeight").value) || 0;
    var clothPrice = parseFloat(document.getElementById("calcClothPrice").value) || 0;
    var glueCost = parseFloat(document.getElementById("calcGlueCost").value) || 0;
    var baseCost = parseFloat(document.getElementById("calcBaseCost").value) || 0;
    var fixCost = parseFloat(document.getElementById("calcFixCost").value) || 0;
    var laborCost = parseFloat(document.getElementById("calcLaborCost").value) || 0;
    var margin = parseFloat(document.getElementById("calcProfitMargin").value) || 0;

    // Kaç top iplik gerekli?
    var spoolsNeeded = Math.ceil(yarnUsage / spoolGrams);
    var yarnCost = spoolsNeeded * spoolPrice;

    // Kumaş maliyeti (m² bazlı)
    var fabricArea = (width * height) / 10000; // cm² -> m²
    var clothCost = fabricArea * clothPrice;

    // Diğer malzeme
    var otherMaterial = glueCost + baseCost;

    // Toplamlar
    var totalMaterial = yarnCost + clothCost + otherMaterial;
    var fixedTotal = fixCost + laborCost;
    var totalCost = totalMaterial + fixedTotal;
    var salePrice = totalCost * (1 + margin / 100);
    var profit = salePrice - totalCost;

    // Sonuçları göster
    var setVal = function(id, val) { var e = document.getElementById(id); if (e) e.innerText = val; };

    setVal("resYarn", formatCurrency(yarnCost));
    setVal("resSpools", spoolsNeeded + " top × " + formatCurrency(spoolPrice));
    setVal("resCloth", formatCurrency(clothCost) + " (" + fabricArea.toFixed(2) + " m²)");
    setVal("resOther", formatCurrency(otherMaterial));
    setVal("resMaterial", formatCurrency(totalMaterial));
    setVal("resFixed", formatCurrency(fixedTotal));
    setVal("resTotalCost", formatCurrency(totalCost));
    setVal("resSalePrice", formatCurrency(salePrice));
    setVal("resProfit", formatCurrency(profit));

    showToast('info', 'Hesaplandı', 'Önerilen satış: ' + formatCurrency(salePrice) + ' | Kâr: ' + formatCurrency(profit));
}

// ═══════════════════════════════════════════════════════════════
//  9. GRAFİKLER
// ═══════════════════════════════════════════════════════════════
function renderDashboardChart() {
    var canvas = document.getElementById("monthlyChart");
    if (!canvas) return;

    // Canvas görünür mü kontrol et
    if (canvas.offsetParent === null) return;

    var monthlyData = {};
    state.sales.forEach(function(s) {
        if (!s.date) return;
        var key = s.date.substring(0, 7);
        if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
        monthlyData[key].income += (s.price || 0);
    });

    state.stocks.forEach(function(s) {
        if (!s.date || !s.cost) return;
        var key = s.date.substring(0, 7);
        if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
        monthlyData[key].expense += s.cost;
    });

    var sortedMonths = Object.keys(monthlyData).sort();
    if (sortedMonths.length === 0) return;

    var turkMonths = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    var labels = sortedMonths.map(function(m) {
        var parts = m.split('-');
        return turkMonths[parseInt(parts[1]) - 1] + ' ' + parts[0];
    });
    var incomeData = sortedMonths.map(function(m) { return monthlyData[m].income; });
    var expenseData = sortedMonths.map(function(m) { return monthlyData[m].expense; });

    if (monthlyChartInstance) monthlyChartInstance.destroy();

    try {
        monthlyChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Gelir', data: incomeData, backgroundColor: 'rgba(52,211,153,0.6)', borderColor: 'rgba(52,211,153,1)', borderWidth: 1, borderRadius: 6, barPercentage: 0.6 },
                    { label: 'Gider', data: expenseData, backgroundColor: 'rgba(248,113,113,0.6)', borderColor: 'rgba(248,113,113,1)', borderWidth: 1, borderRadius: 6, barPercentage: 0.6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#7a8599', font: { size: 12 }, usePointStyle: true } },
                    tooltip: {
                        backgroundColor: '#181b24',
                        callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y); } }
                    }
                },
                scales: {
                    x: { ticks: { color: '#7a8599', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
                    y: { ticks: { color: '#7a8599', font: { size: 11 }, callback: function(v) { return formatCurrency(v); } }, grid: { color: 'rgba(255,255,255,0.03)' } }
                }
            }
        });
    } catch(e) { console.error("Chart error:", e); }
}

// ═══════════════════════════════════════════════════════════════
//  10. RAPORLAR
// ═══════════════════════════════════════════════════════════════
function populateReportMonthSelector() {
    var select = document.getElementById("reportMonth");
    if (!select) return;

    var months = {};
    state.sales.forEach(function(s) { if (s.date) months[s.date.substring(0, 7)] = true; });
    state.stocks.forEach(function(s) { if (s.date) months[s.date.substring(0, 7)] = true; });

    var sorted = Object.keys(months).sort().reverse();
    var currentVal = select.value;

    var turkMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    var html = '<option value="all">Tüm Zamanlar</option>';
    sorted.forEach(function(m) {
        var parts = m.split('-');
        html += '<option value="' + m + '">' + turkMonths[parseInt(parts[1]) - 1] + ' ' + parts[0] + '</option>';
    });
    select.innerHTML = html;
    if (currentVal) select.value = currentVal;
}

function renderReports() {
    var selectedMonth = document.getElementById("reportMonth") ? document.getElementById("reportMonth").value : 'all';

    var filteredSales = state.sales;
    var filteredStocks = state.stocks;
    var filteredTahsilatlar = state.tahsilatlar;
    var filteredPartners = state.partners;

    if (selectedMonth !== 'all') {
        filteredSales = state.sales.filter(function(s) { return s.date && s.date.startsWith(selectedMonth); });
        filteredStocks = state.stocks.filter(function(s) { return s.date && s.date.startsWith(selectedMonth); });
        filteredTahsilatlar = state.tahsilatlar.filter(function(t) { return t.date && t.date.startsWith(selectedMonth); });
        filteredPartners = state.partners.filter(function(p) { return p.date && p.date.startsWith(selectedMonth); });
    }

    var totalCiro = 0, totalGider = 0, totalAlacak = 0;
    var semihHarcama = 0, ekremHarcama = 0;
    var semihTahsilat = 0, ekremTahsilat = 0;
    var semihCekim = 0, ekremCekim = 0;

    filteredSales.forEach(function(s) { totalCiro += (s.price || 0); totalAlacak += ((s.price || 0) - (s.paid || 0)); });
    filteredStocks.forEach(function(s) {
        if (s.cost) { totalGider += s.cost; if (s.payer === "Semih") semihHarcama += s.cost; if (s.payer === "Ekrem") ekremHarcama += s.cost; }
    });
    filteredTahsilatlar.forEach(function(t) { if (t.collector === "Semih") semihTahsilat += t.amount; if (t.collector === "Ekrem") ekremTahsilat += t.amount; });
    filteredPartners.forEach(function(p) { if (p.type === "cekim_semih") semihCekim += p.amount; if (p.type === "cekim_ekrem") ekremCekim += p.amount; });

    var netKar = totalCiro - totalGider;
    var karPayi = netKar / 2;

    var setVal = function(id, val) { var e = document.getElementById(id); if (e) e.innerText = val; };
    var setColor = function(id, color) { var e = document.getElementById(id); if (e) e.style.color = color; };

    setVal("reportCiro", formatCurrency(totalCiro));
    setVal("reportGider", formatCurrency(totalGider));
    setVal("reportKar", formatCurrency(netKar));
    setColor("reportKar", netKar >= 0 ? 'var(--accent-green)' : 'var(--danger-red)');
    setVal("reportAlacak", formatCurrency(totalAlacak));

    setVal("rptSemihKarPay", formatCurrency(karPayi));
    setVal("rptSemihHarcama", formatCurrency(semihHarcama));
    setVal("rptSemihTahsilat", formatCurrency(semihTahsilat));
    setVal("rptSemihCekim", formatCurrency(semihCekim));
    var semihNet = karPayi - semihTahsilat - semihCekim + semihHarcama;
    setVal("rptSemihNet", formatCurrency(semihNet));
    setColor("rptSemihNet", semihNet >= 0 ? 'var(--accent-green)' : 'var(--danger-red)');

    setVal("rptEkremKarPay", formatCurrency(karPayi));
    setVal("rptEkremHarcama", formatCurrency(ekremHarcama));
    setVal("rptEkremTahsilat", formatCurrency(ekremTahsilat));
    setVal("rptEkremCekim", formatCurrency(ekremCekim));
    var ekremNet = karPayi - ekremTahsilat - ekremCekim + ekremHarcama;
    setVal("rptEkremNet", formatCurrency(ekremNet));
    setColor("rptEkremNet", ekremNet >= 0 ? 'var(--accent-green)' : 'var(--danger-red)');

    // Kategori grafiği
    renderCategoryChart(filteredStocks);
}

function renderCategoryChart(filteredStocks) {
    var canvas = document.getElementById("categoryChart");
    if (!canvas || canvas.offsetParent === null) return;

    var totals = {};
    filteredStocks.forEach(function(s) {
        if (s.cost && s.category) {
            if (!totals[s.category]) totals[s.category] = 0;
            totals[s.category] += s.cost;
        }
    });

    var labels = Object.keys(totals);
    var data = Object.values(totals);

    if (categoryChartInstance) categoryChartInstance.destroy();
    if (labels.length === 0) return;

    var colors = ['rgba(96,165,250,0.7)', 'rgba(248,113,113,0.7)', 'rgba(52,211,153,0.7)', 'rgba(251,191,36,0.7)', 'rgba(167,139,250,0.7)', 'rgba(244,114,182,0.7)', 'rgba(56,189,248,0.7)', 'rgba(163,230,53,0.7)'];

    try {
        categoryChartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length), borderColor: 'rgba(24,27,36,1)', borderWidth: 3, hoverOffset: 8 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#7a8599', font: { size: 12 }, usePointStyle: true, padding: 16 } },
                    tooltip: {
                        backgroundColor: '#181b24',
                        callbacks: {
                            label: function(ctx) {
                                var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var pct = ((ctx.parsed / total) * 100).toFixed(1);
                                return ctx.label + ': ' + formatCurrency(ctx.parsed) + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    } catch(e) { console.error("Category chart error:", e); }
}

// ═══════════════════════════════════════════════════════════════
//  11. DIŞA AKTARMA (CSV)
// ═══════════════════════════════════════════════════════════════
function downloadCSV(filename, csvContent) {
    var BOM = '\uFEFF';
    var blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function exportSales() {
    if (state.sales.length === 0) { showToast('warning', 'Veri Yok', 'Satış kaydı bulunamadı.'); return; }
    var csv = 'Tarih,Müşteri,Model,Satış Tutarı,Tahsil Edilen,Kalan\n';
    state.sales.forEach(function(s) {
        csv += formatDateForDisplay(s.date) + ',"' + s.customer + '","' + s.model + '",' + s.price + ',' + s.paid + ',' + (s.price - s.paid) + '\n';
    });
    downloadCSV('panzico_satislar_' + getTodayForInput() + '.csv', csv);
    showToast('success', 'İndirildi', 'Satış verileri CSV olarak indirildi.');
}

function exportExpenses() {
    var expenses = state.stocks.filter(function(s) { return s.cost && s.cost > 0; });
    if (expenses.length === 0) { showToast('warning', 'Veri Yok', 'Gider kaydı bulunamadı.'); return; }
    var csv = 'Tarih,Kalem,Kategori,Tutar,Ödeyen\n';
    expenses.forEach(function(s) {
        csv += formatDateForDisplay(s.date) + ',"' + s.name + '","' + s.category + '",' + s.cost + ',"' + s.payer + '"\n';
    });
    downloadCSV('panzico_giderler_' + getTodayForInput() + '.csv', csv);
    showToast('success', 'İndirildi', 'Gider verileri CSV olarak indirildi.');
}

function exportPartner() {
    if (state.partners.length === 0) { showToast('warning', 'Veri Yok', 'Cari kayıt bulunamadı.'); return; }
    var labels = { 'cekim_semih': 'Semih Kâr Çekimi', 'cekim_ekrem': 'Ekrem Kâr Çekimi', 'odeme_ekrem_semihe': 'Ekrem→Semih Borç Ödeme', 'odeme_semih_ekreme': 'Semih→Ekrem Borç Ödeme' };
    var csv = 'Tarih,İşlem,Tutar,Açıklama\n';
    state.partners.forEach(function(p) {
        csv += formatDateForDisplay(p.date) + ',"' + (labels[p.type] || p.type) + '",' + p.amount + ',"' + p.note + '"\n';
    });
    downloadCSV('panzico_cari_' + getTodayForInput() + '.csv', csv);
    showToast('success', 'İndirildi', 'Cari veriler CSV olarak indirildi.');
}

function exportReports() {
    var fin = calculateFinancials();
    var csv = 'Panzico Finansal Rapor\nTarih,' + formatDateForDisplay(getTodayForInput()) + '\n\n';
    csv += 'Toplam Ciro,' + fin.totalSales + '\nToplam Gider,' + fin.totalExpenses + '\nNet Kâr,' + fin.netProfit + '\nAlacak,' + fin.totalReceivables + '\n\n';
    csv += 'Semih Harcama,' + fin.semihHarcama + '\nSemih Tahsilat,' + fin.semihTahsilat + '\nEkrem Harcama,' + fin.ekremHarcama + '\nEkrem Tahsilat,' + fin.ekremTahsilat + '\n';
    downloadCSV('panzico_rapor_' + getTodayForInput() + '.csv', csv);
    showToast('success', 'İndirildi', 'Finansal rapor indirildi.');
}

function exportAllData() {
    var csv = 'Panzico Tam Veri Yedeği\nTarih: ' + formatDateForDisplay(getTodayForInput()) + '\n\n';
    csv += '=== SATIŞLAR ===\nTarih,Müşteri,Model,Fiyat,Tahsil,Kalan\n';
    state.sales.forEach(function(s) { csv += formatDateForDisplay(s.date) + ',"' + s.customer + '","' + s.model + '",' + s.price + ',' + s.paid + ',' + (s.price - s.paid) + '\n'; });
    csv += '\n=== GİDERLER ===\nTarih,Kalem,Kategori,Tutar,Ödeyen\n';
    state.stocks.forEach(function(s) { if (s.cost) csv += formatDateForDisplay(s.date) + ',"' + s.name + '","' + s.category + '",' + s.cost + ',"' + s.payer + '"\n'; });
    csv += '\n=== ORTAKLIK ===\nTarih,Tip,Tutar,Not\n';
    state.partners.forEach(function(p) { csv += formatDateForDisplay(p.date) + ',"' + p.type + '",' + p.amount + ',"' + p.note + '"\n'; });
    csv += '\n=== TAHSİLATLAR ===\nTarih,Müşteri,Model,Tutar,Alan\n';
    state.tahsilatlar.forEach(function(t) { csv += formatDateForDisplay(t.date) + ',"' + (t.customer||'') + '","' + (t.model||'') + '",' + t.amount + ',"' + t.collector + '"\n'; });
    downloadCSV('panzico_tam_yedek_' + getTodayForInput() + '.csv', csv);
    showToast('success', 'Yedek Alındı', 'Tüm veriler indirildi.');
}