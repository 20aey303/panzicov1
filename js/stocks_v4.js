function handleStockBuySelect() {
    var inputVal = document.getElementById("stockItemSearch").value;
    var list = document.getElementById("catalogBuyList");
    var hidden = document.getElementById("stockItemSelect");
    hidden.value = "";
    if (list && list.options) {
        for (var i = 0; i < list.options.length; i++) {
            if (list.options[i].value === inputVal) {
                hidden.value = list.options[i].getAttribute("data-id");
                break;
            }
        }
    }
    toggleStockBuyFields();
}

function handleStockUseSelect() {
    var inputVal = document.getElementById("stockUseSearch").value;
    var list = document.getElementById("catalogUseList");
    var hidden = document.getElementById("stockUseSelect");
    hidden.value = "";
    if (list && list.options) {
        for (var i = 0; i < list.options.length; i++) {
            if (list.options[i].value === inputVal) {
                hidden.value = list.options[i].getAttribute("data-id");
                break;
            }
        }
    }
    toggleFabricUseFields();
}

function toggleFabricUseFields() {
    var selectVal = document.getElementById("stockUseSelect").value;
    var typeOptions = document.getElementById("stockUseTypeOptions");
    var partialFields = document.getElementById("fabricPartialFields");
    var qtyLabel = document.getElementById("stockUseQtyLabel");
    
    if (!selectVal) {
        typeOptions.style.display = "none";
        partialFields.style.display = "none";
        qtyLabel.style.display = "block";
        return;
    }
    
    var parts = selectVal.split("|||");
    var catalogId = parts[0];
    var catalogItem = state.catalog.find(function(c) { return c.id === catalogId; });
    
    if (catalogItem && catalogItem.type === "Kumaş") {
        typeOptions.style.display = "flex";
        
        var isPartial = false;
        var radios = document.getElementsByName("fabricUseType");
        for(var i=0; i<radios.length; i++) {
            if(radios[i].checked && radios[i].value === "partial") isPartial = true;
        }
        
        if(isPartial) {
            partialFields.style.display = "grid";
            qtyLabel.style.display = "none";
        } else {
            partialFields.style.display = "none";
            qtyLabel.style.display = "block";
        }
    } else {
        typeOptions.style.display = "none";
        partialFields.style.display = "none";
        qtyLabel.style.display = "block";
    }
}

function toggleStockBuyFields() {
    var selectVal = document.getElementById("stockItemSelect").value;
    var catalogItem = state.catalog.find(function(c) { return c.id === selectVal; });
    var yarnFields = document.getElementById("stockBuyYarnFields");
    var fabricFields = document.getElementById("stockBuyFabricFields");
    
    if (catalogItem && catalogItem.type === "İplik") {
        if(yarnFields) yarnFields.style.display = "grid";
        if(fabricFields) fabricFields.style.display = "none";
    } else if (catalogItem && catalogItem.type === "Kumaş") {
        if(yarnFields) yarnFields.style.display = "none";
        if(fabricFields) fabricFields.style.display = "grid";
    } else {
        if(yarnFields) yarnFields.style.display = "none";
        if(fabricFields) fabricFields.style.display = "none";
    }
}

function addStockBuy() {
    var selectVal = document.getElementById("stockItemSelect").value;
    var catalogItem = state.catalog.find(function(c) { return c.id === selectVal; });
    if (!catalogItem) { showToast('warning', 'Seçim Hatası', 'Lütfen katalogdan bir kalem seçin!'); return; }
    
    var cost = parseFloat(document.getElementById("stockTotalCost").value);
    var qty = parseFloat(document.getElementById("stockQty").value);
    
    if (isNaN(cost) || cost < 0) { showToast('warning', 'Geçersiz Tutar', 'Tutar 0 veya daha büyük olmalıdır.'); return; }
    if (isNaN(qty) || qty <= 0) { showToast('warning', 'Geçersiz Miktar', 'Miktar sıfırdan büyük olmalıdır.'); return; }

    var unit = catalogItem.unit;
    if (catalogItem.type === "Kumaş") unit = "Adet";

    var data = {
        catalogId: catalogItem.id,
        category: catalogItem.category, 
        name: catalogItem.name,         
        type: catalogItem.type || 'Diğer',
        qty: qty,                       
        unit: unit,
        cost: cost,
        payer: document.getElementById("stockPayer").value,
        date: document.getElementById("stockDate").value,
        isPurchase: true
    };

    if (catalogItem.type === "İplik") {
        var gramsPerTop = parseFloat(catalogItem.grams) || 100;
        qty = qty * gramsPerTop; // Top miktarını grama çevir
        unit = "g";
        
        data.qty = qty;
        data.unit = unit;
        
        data.colorName = document.getElementById("stockColorName").value.trim();
        data.colorCode = document.getElementById("stockColorCode").value.trim();
        if(!data.colorName && !data.colorCode) {
            showToast('warning', 'Eksik Bilgi', 'İplik alımlarında en azından bir renk kodu veya adı girilmelidir.'); return;
        }
    } else if (catalogItem.type === "Kumaş") {
        data.fabricW = parseFloat(document.getElementById("stockFabricW").value) || 0;
        data.fabricH = parseFloat(document.getElementById("stockFabricH").value) || 0;
        if(data.fabricW <= 0 || data.fabricH <= 0) {
            showToast('warning', 'Eksik Bilgi', 'Kumaş için En ve Boy ölçüleri sıfırdan büyük olmalıdır.'); return;
        }
    }

    var editingId = document.getElementById("editingStockBuyId").value;

    if (editingId) {
        db.collection("stocks").doc(editingId).update(data).then(function() {
            showToast('success', 'Güncellendi', 'Stok alım kaydı güncellendi.');
            cancelEditStock('buy');
        });
    } else {
        db.collection("stocks").add(data).then(function() {
            showToast('success', 'Stok Kaydedildi', qty + ' ' + unit + ' stoklara girdi.');
            document.getElementById("stockBuyForm").reset();
            toggleStockBuyFields();
            setDefaultDates();
        });
    }
}

function addStockUse() {
    var selectVal = document.getElementById("stockUseSelect").value;
    if (!selectVal) { showToast('warning', 'Seçim Hatası', 'Kullanılacak stoku seçin!'); return; }
    
    var qty = parseFloat(document.getElementById("stockUseQty").value);
    if (isNaN(qty) || qty <= 0) { showToast('warning', 'Geçersiz Miktar', 'Miktar sıfırdan büyük olmalıdır.'); return; }

    var parts = selectVal.split("|||");
    var catalogId = parts[0];
    var colorName = parts[1] || "";
    var colorCode = parts[2] || "";
    var fabricW = parseFloat(parts[3]) || 0;
    var fabricH = parseFloat(parts[4]) || 0;

    var catalogItem = state.catalog.find(function(c) { return c.id === catalogId; });
    if(!catalogItem) return;

    var unit = catalogItem.unit;
    if (catalogItem.type === "Kumaş") unit = "Adet";

    var isPartialCut = false;
    if (catalogItem.type === "Kumaş") {
        var radios = document.getElementsByName("fabricUseType");
        for(var i=0; i<radios.length; i++) {
            if(radios[i].checked && radios[i].value === "partial") isPartialCut = true;
        }
    }

    if (isPartialCut) {
        qty = 1; // 1 adet büyük parça kullanılacak
    } else {
        if (isNaN(qty) || qty <= 0) { showToast('warning', 'Geçersiz Miktar', 'Miktar sıfırdan büyük olmalıdır.'); return; }
    }

    var data = {
        catalogId: catalogId,
        category: catalogItem.category,
        name: catalogItem.name,
        type: catalogItem.type || 'Diğer',
        qty: -qty, 
        unit: unit,
        cost: 0, 
        date: document.getElementById("stockUseDate").value,
        isUsage: true
    };

    if (catalogItem.type === "İplik") {
        data.colorName = colorName;
        data.colorCode = colorCode;
    } else if (catalogItem.type === "Kumaş") {
        data.fabricW = fabricW;
        data.fabricH = fabricH;
    }

    var partialRemnantData = null;
    if (isPartialCut) {
        var fabUseW = parseFloat(document.getElementById("fabUseW").value) || 0;
        var fabUseH = parseFloat(document.getElementById("fabUseH").value) || 0;
        var fabRemW = parseFloat(document.getElementById("fabRemW").value) || 0;
        var fabRemH = parseFloat(document.getElementById("fabRemH").value) || 0;

        if (fabUseW <= 0 || fabUseH <= 0 || fabRemW <= 0 || fabRemH <= 0) {
            showToast('warning', 'Eksik Bilgi', 'Lütfen Kullanılan ve Kalan ölçüleri eksiksiz girin.');
            return;
        }

        data.actionDetails = fabricW + "x" + fabricH + " cm kumaştan " + fabUseW + "x" + fabUseH + " cm kesildi.";

        partialRemnantData = {
            catalogId: catalogId,
            category: catalogItem.category,
            name: catalogItem.name,
            type: catalogItem.type,
            qty: 1, 
            unit: "Adet",
            cost: 0, 
            date: data.date,
            isPurchase: false,
            isRemnant: true,
            actionDetails: fabUseW + "x" + fabUseH + " cm kesimden kalan sağlam parça.",
            fabricW: fabRemW,
            fabricH: fabRemH
        };
    }

    var editingId = document.getElementById("editingStockUseId").value;

    if (editingId) {
        db.collection("stocks").doc(editingId).update(data).then(function() {
            showToast('info', 'Güncellendi', 'Stok kullanım kaydı güncellendi.');
            cancelEditStock('use');
        });
    } else {
        if (isPartialCut) {
            var batch = db.batch();
            var useRef = db.collection("stocks").doc();
            var remRef = db.collection("stocks").doc();
            batch.set(useRef, data);
            batch.set(remRef, partialRemnantData);
            
            batch.commit().then(function() {
                showToast('info', 'Parça Kesildi', 'Eski parça düşülüp kalan parça stoğa eklendi.');
                document.getElementById("stockUseForm").reset();
                toggleFabricUseFields();
                setDefaultDates();
            });
        } else {
            db.collection("stocks").add(data).then(function() {
                showToast('info', 'Stok Kullanıldı', qty + ' birim stoktan düşüldü.');
                document.getElementById("stockUseForm").reset();
                toggleFabricUseFields();
                setDefaultDates();
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  3. BAĞIMSIZ GİDERLER
// ═══════════════════════════════════════════════════════════════
function renderStockTable() {
    var tbody = document.getElementById("stockTableBody");
    var alertBody = document.getElementById("dashStockAlerts");
    var useList = document.getElementById("catalogUseList");
    
    if (!tbody || !alertBody || !useList) return;

    tbody.innerHTML = "";
    alertBody.innerHTML = "";
    useList.innerHTML = "";
    
    var stockSummary = {};
    
    state.stocks.forEach(function(s) {
        if (s.qty === undefined || isNaN(s.qty)) return;

        var key = s.catalogId;
        if (s.type === 'İplik') {
            key += "|||" + (s.colorName || "") + "|||" + (s.colorCode || "") + "|||0|||0";
        } else if (s.type === 'Kumaş') {
            key += "|||||||||" + (s.fabricW || 0) + "|||" + (s.fabricH || 0);
        } else {
            key += "|||||||||0|||0"; 
        }

        if (!stockSummary[key]) {
            stockSummary[key] = {
                catalogId: s.catalogId,
                type: s.type || 'Diğer',
                brand: s.category || '',
                model: s.name || '',
                colorName: s.colorName || '',
                colorCode: s.colorCode || '',
                fabricW: s.fabricW || 0,
                fabricH: s.fabricH || 0,
                totalQty: 0,
                unit: s.unit || (s.type === 'Kumaş' ? 'Adet' : 'Birim')
            };
        }
        stockSummary[key].totalQty += s.qty;
    });

    var searchInput = document.getElementById("stockSearchInput");
    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    var useListHtml = '';
    var alertHtml = "";
    var tableHtml = "";

    Object.keys(stockSummary).forEach(function(key) {
        var item = stockSummary[key];
        
        var displayName = item.model;
        var displayColor = "";
        
        if (item.brand && displayName.indexOf(item.brand) === -1) {
             displayName = item.brand + " " + displayName;
        }

        if (item.type === 'İplik') {
            var colStrs = [];
            if(item.colorName) colStrs.push(item.colorName);
            if(item.colorCode) colStrs.push("(#" + item.colorCode + ")");
            displayColor = colStrs.join(" ");
            displayName += " " + displayColor;
        } else if (item.type === 'Kumaş') {
            if (item.fabricW && item.fabricH) {
                displayColor = item.fabricW + "x" + item.fabricH + " cm";
                displayName += " (" + displayColor + ")";
            }
        }

        if (item.totalQty > 0) {
            useListHtml += '<option data-id="' + key + '" value="' + displayName + ' (Mevcut: ' + item.totalQty.toFixed(1) + ' ' + item.unit + ')"></option>';
        }

        if (searchTerm) {
            var searchStr = (item.model + " " + item.colorName + " " + item.colorCode + " " + item.fabricW + " " + item.fabricH).toLowerCase();
            if (searchStr.indexOf(searchTerm) === -1) return;
        }

        var isCritical = item.totalQty <= 2;
        var statusBadge = isCritical ? '<span class="badge danger">Kritik</span>' : '<span class="badge success">Yeterli</span>';
        
        tableHtml += '<tr>' +
            '<td><strong style="color:var(--accent-blue)">' + (item.brand ? item.brand + ' ' : '') + '</strong>' + item.model.replace(item.brand+" ", "") + '</td>' +
            '<td>' + (displayColor || '-') + '</td>' +
            '<td style="font-weight:bold; font-size:16px;">' + item.totalQty.toFixed(1) + ' <span style="font-size:12px; font-weight:normal; color:var(--text-muted);">' + item.unit + '</span></td>' +
            '<td>' + statusBadge + '</td>' +
        '</tr>';

        if (isCritical && item.totalQty >= 0) {
            alertHtml += '<tr><td>' + displayName + '</td><td style="color:var(--danger-red); font-weight:bold;">' + item.totalQty.toFixed(1) + '</td><td>2</td><td>' + statusBadge + '</td></tr>';
        }
    });

    if (tableHtml === "") tableHtml = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Envanterde kayıt bulunamadı.</td></tr>';
    if (alertHtml === "") alertHtml = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Kritik seviyede ürün yok.</td></tr>';

    tbody.innerHTML = tableHtml;
    alertBody.innerHTML = alertHtml;
    useList.innerHTML = useListHtml;
}

function renderStockHistoryTable() {
    var tbody = document.getElementById("stockHistoryTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var history = state.stocks.filter(function(s) {
        return s.isPurchase || s.isUsage || (s.qty !== undefined && s.qty !== 0);
    });

    history.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Henüz stok hareketi yok.</td></tr>';
        return;
    }

    history.forEach(function(s) {
        var actionText = "";
        var actionClass = "";
        if (s.isPurchase || s.qty > 0) { actionText = "Alım (+)"; actionClass = "success"; }
        else if (s.isUsage || s.qty < 0) { actionText = "Kullanım (-)"; actionClass = "danger"; }
        else { actionText = "Kayıt"; actionClass = "info"; }

        var detailText = s.name;
        if (s.type === "İplik") {
            if(s.colorName) detailText += " " + s.colorName;
            if(s.colorCode) detailText += " (#" + s.colorCode + ")";
        } else if (s.type === "Kumaş") {
            if(s.fabricW && s.fabricH) detailText += " (" + s.fabricW + "x" + s.fabricH + " cm)";
        }

        var rowHtml = '<tr>';
        rowHtml += '<td>' + formatDateForDisplay(s.date) + '</td>';
        
        var actionIcon = s.isPurchase ? '🟢 Alım' : '🔴 Kullanım';
        if (s.isRemnant) actionIcon = '🟡 Kalan Parça';
        rowHtml += '<td>' + actionIcon + '</td>';
        
        var detailsHtml = detailText;
        if (s.actionDetails) {
            detailsHtml += '<br><small style="color:var(--text-muted);">' + s.actionDetails + '</small>';
        }
        rowHtml += '<td>' + detailsHtml + '</td>';
        
        var qtyStr = Math.abs(s.qty) + ' ' + (s.unit || '');
        if (s.isPurchase) { rowHtml += '<td style="color:var(--success-green);">+' + qtyStr + '</td>'; }
        else { rowHtml += '<td style="color:var(--danger-red);">' + (s.isRemnant ? '+'+qtyStr : '-'+qtyStr) + '</td>'; }
        
        rowHtml += '<td>' + formatCurrency(s.cost || 0) + '</td>';
        rowHtml += '<td>' +
                '<button class="action-btn" style="margin-right:5px; background:var(--accent-blue); color:white;" onclick="editStock(\'' + s.id + '\')">✏️</button>' +
                '<button class="action-btn" style="background:var(--danger-red); color:white;" onclick="deleteDocument(\'stocks\', \'' + s.id + '\')">🗑️</button>' +
            '</td>' +
        '</tr>';
        tbody.innerHTML += rowHtml;
    });
}

function editStock(id) {
    var stock = state.stocks.find(function(s) { return s.id === id; });
    if (!stock) return;

    if (stock.isPurchase || stock.qty > 0) {
        document.getElementById("editingStockBuyId").value = stock.id;
        document.getElementById("stockItemSelect").value = stock.catalogId || "";
        
        var buyList = document.getElementById("catalogBuyList");
        var buySearchText = "";
        if (buyList && buyList.options) {
            for (var i = 0; i < buyList.options.length; i++) {
                if (buyList.options[i].getAttribute("data-id") === stock.catalogId) {
                    buySearchText = buyList.options[i].value;
                    break;
                }
            }
        }
        document.getElementById("stockItemSearch").value = buySearchText;
        toggleStockBuyFields();
        
        if (stock.type === "İplik") {
            document.getElementById("stockColorName").value = stock.colorName || "";
            document.getElementById("stockColorCode").value = stock.colorCode || "";
        } else if (stock.type === "Kumaş") {
            document.getElementById("stockFabricW").value = stock.fabricW || "";
            document.getElementById("stockFabricH").value = stock.fabricH || "";
        }

        document.getElementById("stockDate").value = stock.date || getTodayForInput();
        document.getElementById("stockQty").value = Math.abs(stock.qty);
        document.getElementById("stockTotalCost").value = stock.cost || 0;
        if(stock.payer) document.getElementById("stockPayer").value = stock.payer;

        document.getElementById("cancelStockBuyBtn").style.display = "inline-block";
        document.getElementById("stockBuyForm").scrollIntoView({behavior: "smooth"});
        showToast("info", "Düzenleme Modu", "Alım kaydını düzenliyorsunuz.");

    } else if (stock.isUsage || stock.qty < 0) {
        document.getElementById("editingStockUseId").value = stock.id;
        
        var selectKey = stock.catalogId;
        if (stock.type === 'İplik') selectKey += "|||" + (stock.colorName||"") + "|||" + (stock.colorCode||"") + "|||0|||0";
        else if (stock.type === 'Kumaş') selectKey += "|||||||||" + (stock.fabricW||0) + "|||" + (stock.fabricH||0);
        else selectKey += "|||||||||0|||0";
        
        document.getElementById("stockUseSelect").value = selectKey;
        
        var useList = document.getElementById("catalogUseList");
        var useSearchText = "";
        if (useList && useList.options) {
            for (var i = 0; i < useList.options.length; i++) {
                if (useList.options[i].getAttribute("data-id") === selectKey) {
                    useSearchText = useList.options[i].value;
                    break;
                }
            }
        }
        document.getElementById("stockUseSearch").value = useSearchText;

        document.getElementById("stockUseDate").value = stock.date || getTodayForInput();
        document.getElementById("stockUseQty").value = Math.abs(stock.qty);
        
        document.getElementById("cancelStockUseBtn").style.display = "inline-block";
        document.getElementById("stockUseForm").scrollIntoView({behavior: "smooth"});
        showToast("info", "Düzenleme Modu", "Kullanım kaydını düzenliyorsunuz.");
    }
}

function cancelEditStock(type) {
    if (type === 'buy') {
        document.getElementById("editingStockBuyId").value = "";
        document.getElementById("cancelStockBuyBtn").style.display = "none";
        document.getElementById("stockItemSearch").value = "";
        document.getElementById("stockItemSelect").value = "";
        document.getElementById("stockBuyForm").reset();
        toggleStockBuyFields();
    } else if (type === 'use') {
        document.getElementById("editingStockUseId").value = "";
        document.getElementById("cancelStockUseBtn").style.display = "none";
        document.getElementById("stockUseSearch").value = "";
        document.getElementById("stockUseSelect").value = "";
        document.getElementById("stockUseForm").reset();
    }
    setDefaultDates();
}

// ═══════════════════════════════════════════════════════════════
//  GİDERLER SEKMESİ (YENİ SİSTEM)
// ═══════════════════════════════════════════════════════════════
