let tableSortState = { catalog: { col: 'type', dir: 'asc' } };

function dynamicSort(arr, tableId) {
    var state = tableSortState[tableId];
    if (!state || !state.col) return arr;
    
    var col = state.col;
    var dir = state.dir === 'asc' ? 1 : -1;

    return arr.slice().sort(function(a, b) {
        var valA = a[col] !== undefined && a[col] !== null ? a[col] : '';
        var valB = b[col] !== undefined && b[col] !== null ? b[col] : '';

        if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            return (parseFloat(valA) - parseFloat(valB)) * dir;
        }

        if (typeof valA === 'string' && valA.match(/^\d{4}-\d{2}-\d{2}/) && 
            typeof valB === 'string' && valB.match(/^\d{4}-\d{2}-\d{2}/)) {
            return (new Date(valA) - new Date(valB)) * dir;
        }

        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
}

let arr = [{type: 'İplik'}, {type: 'Kumaş'}];
console.log(dynamicSort(arr, 'catalog'));
