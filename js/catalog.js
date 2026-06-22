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

    if (state.catalog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Henüz tanımlı ürün yok.</td></tr>';
        return;
    }

    state.catalog.forEach(function(c) {
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
            '<td><button class="delete-btn" onclick="deleteDocument(\'catalog\', \'' + c.id + '\')">Sil</button></td>' +
        '</tr>';
    });
}

// ═══════════════════════════════════════════════════════════════
//  2. STOK YÖNETİMİ (ALIM VE KULLANIM)
// ═══════════════════════════════════════════════════════════════
