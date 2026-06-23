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

    var stockBuyForm = document.getElementById("stockBuyForm");
    if (stockBuyForm) stockBuyForm.addEventListener("submit", function(e) { e.preventDefault(); addStockBuy(); });

    var stockUseForm = document.getElementById("stockUseForm");
    if (stockUseForm) stockUseForm.addEventListener("submit", function(e) { e.preventDefault(); addStockUse(); });

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
    
    var stockSearchInput = document.getElementById("stockSearchInput");
    if (stockSearchInput) stockSearchInput.addEventListener("input", renderStockTable);
}

// ═══════════════════════════════════════════════════════════════
//  1. KATALOG
// ═══════════════════════════════════════════════════════════════
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
    renderCatalogDropdowns();
    renderCatalogTable();
    renderStockTable();
    renderStockHistoryTable();
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


function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}
