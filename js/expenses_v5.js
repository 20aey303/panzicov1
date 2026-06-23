function addExpense() {
    var category = document.getElementById("expenseCategory").value;
    var desc = document.getElementById("expenseDesc").value.trim();
    if (!category || !desc) { showToast('warning', 'Eksik Bilgi', 'Kategori ve açıklama zorunludur.'); return; }
    
    var amount = parseFloat(document.getElementById("expenseAmount").value);
    if (isNaN(amount) || amount <= 0) { showToast('warning', 'Geçersiz Tutar', 'Tutar sıfırdan büyük olmalıdır.'); return; }

    var editingId = document.getElementById("editingExpenseId").value;
    var editingType = document.getElementById("editingExpenseType").value; // 'old' veya 'new'

    if (editingId) {
        if (editingType === 'old') {
            db.collection("stocks").doc(editingId).update({
                category: category,
                name: desc,
                cost: amount,
                payer: document.getElementById("expensePayer").value,
                date: getDateWithTime("expenseDate")
            }).then(function() {
                showToast('success', 'Güncellendi', 'Eski gider kaydı başarıyla güncellendi.');
                cancelEditExpense();
            });
        } else {
            db.collection("expenses").doc(editingId).update({
                category: category,
                description: desc,
                amount: amount,
                payer: document.getElementById("expensePayer").value,
                date: getDateWithTime("expenseDate")
            }).then(function() {
                showToast('success', 'Güncellendi', 'Gider başarıyla güncellendi.');
                cancelEditExpense();
            });
        }
    } else {
        db.collection("expenses").add({
            category: category,
            description: desc,
            amount: amount,
            payer: document.getElementById("expensePayer").value,
            date: getDateWithTime("expenseDate")
        }).then(function() {
            showToast('success', 'Gider Kaydedildi', formatCurrency(amount) + ' tutarında gider işlendi.');
            document.getElementById("expenseForm").reset();
            setDefaultDates();
        });
    }
}

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

    var filteredList = [];
    
    // Eski sistem giderleri (Geriye Dönük Uyumluluk için stoklardaki cost'u olan kayıtlar)
    state.stocks.forEach(function(s) {
        if (s.cost > 0 && s.qty === 0) {
            filteredList.push({
                id: s.id + "_old",
                date: s.date,
                category: s.category || 'Eski Kayıt',
                description: s.note || s.name || 'Açıklama Yok',
                amount: s.cost,
                payer: s.payer,
                isOld: true,
                rawDocId: s.id
            });
        }
    });

    // Yeni sistem bağımsız giderler
    state.expenses.forEach(function(e) {
        filteredList.push({
            id: e.id,
            date: e.date,
            category: e.category,
            description: e.description,
            amount: e.amount,
            payer: e.payer,
            isOld: false,
            rawDocId: e.id
        });
    });

    // Filtre uygula
    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (expenseFilterMode === 'month') {
        filteredList = filteredList.filter(function(s) { return new Date(s.date) >= startOfMonth; });
    } else if (expenseFilterMode === 'semih') {
        filteredList = filteredList.filter(function(s) { return s.payer === 'Semih'; });
    } else if (expenseFilterMode === 'ekrem') {
        filteredList = filteredList.filter(function(s) { return s.payer === 'Ekrem'; });
    } else if (expenseFilterMode === 'custom') {
        var startVal = document.getElementById("expFilterStart") ? document.getElementById("expFilterStart").value : '';
        var endVal = document.getElementById("expFilterEnd") ? document.getElementById("expFilterEnd").value : '';
        if (startVal) filteredList = filteredList.filter(function(s) { return s.date >= startVal; });
        if (endVal) filteredList = filteredList.filter(function(s) { return s.date <= endVal; });
    }

    var searchInput = document.getElementById("expenseSearchInput");
    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (searchTerm) {
        filteredList = filteredList.filter(function(e) {
            var searchStr = ((e.category || "") + " " + (e.description || "") + " " + (e.payer || "")).toLowerCase();
            return searchStr.indexOf(searchTerm) > -1;
        });
    }

    // Tabloyu map ile "desc" özelliğini dahil ederek formatla çünkü sortState'te desc var
    var sortedList = dynamicSort(filteredList, 'expenses');

    if (sortedList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">📝 Gösterilecek gider kaydı yok.</td></tr>';
        return;
    }

    sortedList.forEach(function(e) {
        var payerIcon = "";
        if (e.payer === "Semih") { payerIcon = "🟦 Semih"; }
        else if (e.payer === "Ekrem") { payerIcon = "🟪 Ekrem"; }
        else if (e.payer === "Atölye Kasası") { payerIcon = "🏦 Atölye Kasası"; }
        else { payerIcon = e.payer; }

        var deleteCmd = e.isOld ? 'deleteDocument(\'stocks\', \'' + e.rawDocId + '\')' : 'deleteDocument(\'expenses\', \'' + e.rawDocId + '\')';

        tbody.innerHTML +=
            '<tr>' +
                '<td style="color:var(--text-muted); font-size:12px;">' + formatDateForDisplay(e.date) + '</td>' +
                '<td><span class="badge info">' + e.category + '</span></td>' +
                '<td>' + e.description + '</td>' +
                '<td style="font-weight:700; color:var(--danger-red);">' + formatCurrency(e.amount) + '</td>' +
                '<td>' + payerIcon + '</td>' +
                '<td>' +
                    '<button class="action-btn" style="margin-right:5px; background:var(--accent-blue); color:white;" onclick="editExpense(\'' + e.rawDocId + '\', ' + e.isOld + ')">✏️</button>' +
                    '<button class="action-btn" style="background:var(--danger-red); color:white;" onclick="' + deleteCmd + '">🗑️</button>' +
                '</td>' +
            '</tr>';
    });

    // Gider özet kartlarını güncelle
    updateExpenseSummaryCards();
}

function editExpense(id, isOld) {
    var expense;
    if (isOld) {
        expense = state.stocks.find(function(s) { return s.id === id; });
        if (!expense) return;
        document.getElementById("expenseCategory").value = expense.category || "";
        document.getElementById("expenseDesc").value = expense.name || expense.note || "";
        document.getElementById("expenseAmount").value = expense.cost || 0;
    } else {
        expense = state.expenses.find(function(e) { return e.id === id; });
        if (!expense) return;
        document.getElementById("expenseCategory").value = expense.category || "";
        document.getElementById("expenseDesc").value = expense.description || "";
        document.getElementById("expenseAmount").value = expense.amount || 0;
    }
    
    document.getElementById("expensePayer").value = expense.payer || "Atölye Kasası";
    document.getElementById("expenseDate").value = expense.date || getTodayForInput();
    
    document.getElementById("editingExpenseId").value = id;
    document.getElementById("editingExpenseType").value = isOld ? 'old' : 'new';
    
    document.getElementById("cancelExpenseBtn").style.display = "inline-block";
    document.getElementById("expenseForm").scrollIntoView({behavior: "smooth"});
    showToast("info", "Düzenleme Modu", "Gider kaydını düzenliyorsunuz.");
}

function cancelEditExpense() {
    document.getElementById("editingExpenseId").value = "";
    document.getElementById("editingExpenseType").value = "";
    document.getElementById("cancelExpenseBtn").style.display = "none";
    document.getElementById("expenseForm").reset();
    setDefaultDates();
}

