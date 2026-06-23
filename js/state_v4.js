let state = {
    catalog: [],
    stocks: [],
    sales: [],
    partners: [],
    tahsilatlar: [],
    expenses: [] // YENİ EKLENDİ
};

let editingSaleId = null;
let currentActiveSaleId = null;
let salesFilterMode = 'all';
let expenseFilterMode = 'all';
let monthlyChartInstance = null;
let categoryChartInstance = null;

//  INIT
document.addEventListener("DOMContentLoaded", function() {
    initTabs();
    initMobileMenu();
    initEventListeners();
    setDefaultDates();
    listenToCloudData();
});

//  TOAST BİLDİRİM SİSTEMİ
function listenToCloudData() {
    db.collection("catalog").onSnapshot(function(snapshot) {
        state.catalog = [];
        snapshot.forEach(function(doc) { state.catalog.push({ id: doc.id, ...doc.data() }); });
        renderCatalogDropdowns();
        renderCatalogTable();
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

    db.collection("expenses").onSnapshot(function(snapshot) {
        state.expenses = [];
        snapshot.forEach(function(doc) { state.expenses.push({ id: doc.id, ...doc.data() }); });
        renderAll();
    }, function(err) { console.error("Expenses error:", err); });
}

// ═══════════════════════════════════════════════════════════════
//  TAB NAVİGASYONU
// ═══════════════════════════════════════════════════════════════
