function calculateFinancials() {
    var totalSales = 0, totalExpenses = 0, totalReceivables = 0;
    var semihHarcama = 0, ekremHarcama = 0;
    var semihTahsilat = 0, ekremTahsilat = 0;
    var semihCekim = 0, ekremCekim = 0;
    var semihTransferBakiye = 0, ekremTransferBakiye = 0;
    
    // Atölye Kasası Bakiyesi
    var atolyeKasasi = 0;

    state.stocks.forEach(function(s) {
        if (s.cost && s.cost > 0) {
            totalExpenses += s.cost; // Stok alım maliyeti
            if (s.payer === "Semih") { semihHarcama += s.cost; }
            if (s.payer === "Ekrem") { ekremHarcama += s.cost; }
            if (s.payer === "Atölye Kasası") { atolyeKasasi -= s.cost; } 
        }
    });
    
    // YENİ BAĞIMSIZ GİDERLER
    state.expenses.forEach(function(e) {
        if (e.amount && e.amount > 0) {
            totalExpenses += e.amount;
            if (e.payer === "Semih") { semihHarcama += e.amount; }
            if (e.payer === "Ekrem") { ekremHarcama += e.amount; }
            if (e.payer === "Atölye Kasası") { atolyeKasasi -= e.amount; }
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
}function downloadCSV(filename, csvContent) {
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

