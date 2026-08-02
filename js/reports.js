import { formatCurrency } from './helpers.js';
import { transactions } from './bill.js';
import { products } from './data.js';

let expandedRowId = null;

export function resetExpandedRow() {
    expandedRowId = null;
}

export function renderReportStats(txns) {
    const totalSales = txns.reduce((sum, t) => sum + t.total, 0);
    const totalTxns = txns.length;
    const freq = {};
    for (const t of txns) {
        for (const item of t.items) {
            freq[item.id] = freq[item.id] || { name: item.name, qty: 0 };
            freq[item.id].qty += item.qty;
        }
    }
    let top = null, topQty = 0;
    for (const data of Object.values(freq)) {
        if (data.qty > topQty) { topQty = data.qty; top = data; }
    }
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalTxns').textContent = totalTxns;
    document.getElementById('topProduct').textContent = top ? `${top.name} (${topQty} units)` : 'N/A';
}

export function renderReportTable(txns) {
    const tbody = document.getElementById('txnTableBody');
    if (txns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px 0;color:#94A3B8;">No transactions recorded yet.</td></tr>`;
        expandedRowId = null;
        return;
    }

    let html = '';
    for (const t of txns) {
        // Build summary string (comma separated)
        const itemsSummary = t.items.map(i => `${i.name} x${i.qty}`).join(', ');
        // Build detailed list (each on its own line)
        const itemsDetails = t.items.map(i =>
            `<div class="detail-item"><span>${i.name}</span><span>x${i.qty}  ${formatCurrency(i.price * i.qty)}</span></div>`
        ).join('');

        // For mobile we also want the same structure; we'll use the same markup everywhere.
        // The CSS will handle layout differences.
        html += `
            <tr class="txn-row" data-id="${t.id}" style="cursor:pointer;">
                <td data-label=""><span class="row-number">▶</span></td>
                <td data-label="Order ID"><strong>#${String(t.receiptNumber).padStart(5, '0')}</strong></td>
                <td data-label="Date & Time">${t.date}</td>
                <td data-label="Items" class="items-cell">
                    <span class="items-summary">${itemsSummary}</span>
                    <div class="items-details" style="display:none;">${itemsDetails}</div>
                </td>
                <td data-label="Total"><strong style="color:var(--primary);">${formatCurrency(t.total)}</strong></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    // Restore expanded state (if any)
    if (expandedRowId) {
        const row = tbody.querySelector(`.txn-row[data-id="${expandedRowId}"]`);
        if (row) {
            // Expand this row
            toggleRowExpand(row, true);
        } else {
            expandedRowId = null;
        }
    }

    // Attach click event to each row
    tbody.querySelectorAll('.txn-row').forEach(row => {
        row.addEventListener('click', function() {
            const id = this.dataset.id;

            // If another row is expanded, collapse it first
            if (expandedRowId && expandedRowId !== id) {
                const prevRow = document.querySelector(`.txn-row[data-id="${expandedRowId}"]`);
                if (prevRow) {
                    toggleRowExpand(prevRow, false);
                }
            }

            // Toggle current row
            const currentlyExpanded = this.classList.contains('expanded');
            toggleRowExpand(this, !currentlyExpanded);

            // Update expandedRowId
            expandedRowId = currentlyExpanded ? null : id;
        });
    });
}

// Helper to toggle row expansion
function toggleRowExpand(row, expand) {
    const summary = row.querySelector('.items-summary');
    const details = row.querySelector('.items-details');
    const arrow = row.querySelector('.row-number');

    if (expand) {
        row.classList.add('expanded');
        summary.style.display = 'none';
        details.style.display = 'block';
        arrow.textContent = '▼';
        // Adjust the cell to allow wrapping
        const cell = row.querySelector('.items-cell');
        if (cell) {
            cell.style.whiteSpace = 'normal';
            cell.style.overflow = 'visible';
            cell.style.textOverflow = 'clip';
        }
    } else {
        row.classList.remove('expanded');
        summary.style.display = 'inline-block';   // fixes ellipsis on mobile
        details.style.display = 'none';
        arrow.textContent = '▶';
        const cell = row.querySelector('.items-cell');
        if (cell) {
            cell.style.whiteSpace = 'nowrap';
            cell.style.overflow = 'hidden';
            cell.style.textOverflow = 'ellipsis';
        }
    }
}