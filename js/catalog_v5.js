function toggleCatalogFields() {
    var type = document.getElementById("catalogType").value;
    var yarnFields = document.getElementById("yarnFields");
    var otherFields = document.getElementById("otherFields");
    var brandLabel = document.getElementById("catalogBrandLabel");
    var modelLabel = document.getElementById("catalogModelLabel");
    var brandInput = document.getElementById("catalogBrand");
    var modelInput = document.getElementById("catalogModel");

    if (type === "İplik") {
        if(yarnFields) yarnFields.style.display = "contents";
        if(otherFields) otherFields.style.display = "none";
        if(brandLabel) brandLabel.innerText = "Marka / Kategori";
        if(modelLabel) modelLabel.innerText = "Seri / Model Adı";
        if(brandInput) brandInput.placeholder = "Örn: Nako, Alize";
        if(modelInput) modelInput.placeholder = "Örn: Vega, Cotton Gold";
    } else if (type === "Kumaş") {
        if(yarnFields) yarnFields.style.display = "none";
        if(otherFields) otherFields.style.display = "none"; 
        if(brandLabel) brandLabel.innerText = "Kumaş Cinsi";
        if(modelLabel) modelLabel.innerText = "Kumaş Detayı / Rengi";
        if(brandInput) brandInput.placeholder = "Örn: Tufting Kumaşı, Keçe";
        if(modelInput) modelInput.placeholder = "Örn: Beyaz, Kalın, Desenli";
    } else {
        if(yarnFields) yarnFields.style.display = "none";
        if(otherFields) otherFields.style.display = "contents";
        if(brandLabel) brandLabel.innerText = "Marka / Kategori";
        if(modelLabel) modelLabel.innerText = "Ürün Adı";
        if(brandInput) brandInput.placeholder = "Örn: Hırdavatçı, Kırtasiye";
        if(modelInput) modelInput.placeholder = "Örn: Lateks Tutkal, Zımpara";
    }
}

function addCatalogItem() {
    var type = document.getElementById("catalogType").value;
    var brand = document.getElementById("catalogBrand").value.trim();
    var model = document.getElementById("catalogModel").value.trim();
    
    if (!brand || !model) {
        showToast('warning', 'Eksik Bilgi', 'Marka ve Model adı boş bırakılamaz.');
        return;
    }
    
    var data = {
        type: type,
        category: brand, 
        name: brand + " " + model,
        createdAt: new Date().toISOString()
    };
    
    if (type === "İplik") {
        data.unit = "Top";
        data.grams = parseFloat(document.getElementById("catalogGrams").value) || 0;
        data.meters = parseFloat(document.getElementById("catalogMeters").value) || 0;
    } else if (type === "Kumaş") {
        data.unit = "Adet/Parça";
    } else {
        data.unit = (document.getElementById("catalogUnit").value || "").trim();
    }

    db.collection("catalog").add(data).then(function() {
        showToast('success', 'Katalog Güncellendi', '"' + data.name + '" kataloğa eklendi.');
        document.getElementById("catalogForm").reset();
        toggleCatalogFields();
        if(typeof closeModal === 'function') closeModal('katalogModal');
    });
}

function renderCatalogDropdowns() {
    var buyList = document.getElementById("catalogBuyList");
    if (!buyList) return;
    var html = '';
    state.catalog.forEach(function(c) {
        var extra = c.type === "İplik" ? " (İplik)" : " (" + c.type + ")";
        html += '<option data-id="' + c.id + '" value="' + c.name + extra + '"></option>';
    });
    buyList.innerHTML = html;
}

function renderCatalogTable() {
    var tbody = document.getElementById("catalogTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var searchInput = document.getElementById("catalogSearchInput");
    var searchText = searchInput ? searchInput.value.toLowerCase() : "";

    var filteredCatalog = state.catalog.filter(function(c) {
        if (!searchText) return true;
        var t = ((c.name || "") + " " + (c.type || "")).toLowerCase();
        return t.indexOf(searchText) > -1;
    });

    if (filteredCatalog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Henüz tanımlı ürün yok.</td></tr>';
        return;
    }

    var sortedCatalog = dynamicSort(filteredCatalog, 'catalog');

    sortedCatalog.forEach(function(c) {
        var detailText = "";
        if (c.type === "İplik") {
            detailText = (c.grams ? c.grams + "g" : "") + (c.meters ? " / " + c.meters + "m" : "");
            if (!detailText || detailText === " / ") detailText = "-";
        } else {
            detailText = c.unit || "-";
        }

        var typeBadge = "info";
        if (c.type === "Kumaş") typeBadge = "warning";
        if (c.type === "Tutkal") typeBadge = "danger";

        tbody.innerHTML += '<tr>' +
            '<td><span class="badge ' + typeBadge + '">' + (c.type || "Diğer") + '</span></td>' +
            '<td style="font-weight:600;">' + c.name + '</td>' +
            '<td style="color:var(--text-muted); font-size:13px;">' + detailText + '</td>' +
            '<td><button class="delete-btn" onclick="deleteCatalogItem(\'' + c.id + '\')">Sil</button></td>' +
        '</tr>';
    });
}

function deleteCatalogItem(catalogId) {
    if (confirm("Bu ürünü katalogdan silmek istediğinize emin misiniz?\n\nDİKKAT: Bu işleme bağlı tüm STOK GEÇMİŞİ (alım ve kullanımlar) ve CANLI ENVANTER de kalıcı olarak silinecektir!")) {
        // İlk olarak kataloğu sil
        db.collection("catalog").doc(catalogId).delete().then(function() {
            showToast('info', 'Katalogdan Silindi', 'Ürün katalogdan silindi, stoklar temizleniyor...');
            
            // Bu kataloğa ait tüm stok hareketlerini bul ve sil
            db.collection("stocks").where("catalogId", "==", catalogId).get().then(function(snapshot) {
                if (snapshot.empty) return; // Zaten stok yoksa bitir
                
                var batch = db.batch();
                snapshot.forEach(function(doc) {
                    batch.delete(doc.ref);
                });
                
                batch.commit().then(function() {
                    showToast('success', 'Stoklar Temizlendi', 'Ürüne ait tüm canlı envanter ve geçmiş silindi.');
                }).catch(function(err) {
                    showToast('error', 'Stok Silme Hatası', err.message);
                });
            }).catch(function(err) {
                showToast('error', 'Sorgu Hatası', err.message);
            });
            
        }).catch(function(err) {
            showToast('error', 'Silme Hatası', err.message);
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  2. STOK YÖNETİMİ (ALIM VE KULLANIM)
// ═══════════════════════════════════════════════════════════════
