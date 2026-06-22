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
