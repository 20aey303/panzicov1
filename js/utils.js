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
    var ids = ["stockDate", "stockUseDate", "quickExpenseDate", "saleDate", "partDate", "expenseDate", "expFilterStart", "expFilterEnd"];
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
function sortDataByDate() {
    var sorter = function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); };
    state.stocks.sort(sorter);
    state.sales.sort(sorter);
    state.partners.sort(sorter);
    state.tahsilatlar.sort(sorter);
}

