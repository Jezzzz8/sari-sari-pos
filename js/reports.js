import { formatCurrency } from './helpers.js';
import { transactions } from './bill.js';
import { products } from './data.js';
import { renderCategories } from './ui.js';
import { getCategoryLabel } from './constants.js';

let currentCategory = 'all';
let currentSort = 'date-desc';
let expandedRowId = null;

// Pagination state
let currentPage = 1;
const itemsPerPage = 10;
let filteredData = [];

// Check if mobile
const isMobile = () => window.innerWidth <= 640;

document.addEventListener('DOMContentLoaded', () => {
    // DOM refs
    const catPanel = document.getElementById('categoriesPanel');
    const categoryReport = document.getElementById('categoryReport');

    // Render categories initially
    renderCategories(catPanel, currentCategory, (cat) => {
        currentCategory = cat;
        if (categoryReport) categoryReport.value = cat;
        applyFilters();
    });

    // Event listeners
    document.getElementById('searchReport').addEventListener('input', applyFilters);
    document.getElementById('sortReport').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
    });
    document.getElementById('dateRange').addEventListener('change', applyFilters);

    // Category dropdown change
    if (categoryReport) {
        categoryReport.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            // Sync sidebar by re-rendering categories
            renderCategories(catPanel, currentCategory, (cat) => {
                currentCategory = cat;
                if (categoryReport) categoryReport.value = cat;
                applyFilters();
            });
            applyFilters(); // re-apply filters with new category
        });
    }

    // Pagination button events
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTablePage();
        }
    });
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTablePage();
        }
    });

    // Handle resize for mobile/desktop switching
    window.addEventListener('resize', () => {
        renderTablePage();
    });

    // Initial render
    applyFilters();
});

function applyFilters() {
    // Re-render categories to update active state (and sync dropdown)
    const catPanel = document.getElementById('categoriesPanel');
    const categoryReport = document.getElementById('categoryReport');
    renderCategories(catPanel, currentCategory, (cat) => {
        currentCategory = cat;
        if (categoryReport) categoryReport.value = cat;
        applyFilters();
    });

    const searchTerm = document.getElementById('searchReport').value.trim().toLowerCase();
    const dateRange = document.getElementById('dateRange').value;

    let filtered = [...transactions];

    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(txn =>
            txn.items.some(item => {
                const product = products.find(p => p.id === item.id);
                return product && product.category === currentCategory;
            })
        );
    }

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(txn => {
            const idMatch = String(txn.receiptNumber).includes(searchTerm);
            const itemMatch = txn.items.some(i => i.name.toLowerCase().includes(searchTerm));
            return idMatch || itemMatch;
        });
    }

    // Date range filter
    if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        if (dateRange === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (dateRange === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        }
        filtered = filtered.filter(txn => {
            const txnDate = new Date(txn.date);
            return txnDate >= startDate;
        });
    }

    // Sort
    filtered = sortTransactions(filtered, currentSort);
    filteredData = filtered;

    // Reset to page 1 when filters change
    currentPage = 1;

    // Update stats
    renderStats(filtered);

    // Update total count
    document.getElementById('txnCount').textContent = filtered.length + ' transactions';

    // Render the first page
    renderTablePage();
}

function sortTransactions(txns, sortType) {
    const copy = [...txns];
    switch (sortType) {
        case 'date-desc':
            return copy.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'date-asc':
            return copy.sort((a, b) => new Date(a.date) - new Date(b.date));
        case 'total-desc':
            return copy.sort((a, b) => b.total - a.total);
        case 'total-asc':
            return copy.sort((a, b) => a.total - b.total);
        default:
            return copy;
    }
}

function renderStats(txns) {
    const totalSales = txns.reduce((sum, t) => sum + t.total, 0);
    const totalTxns = txns.length;

    const freq = {};
    for (const t of txns) {
        for (const item of t.items) {
            freq[item.id] = freq[item.id] || { name: item.name, qty: 0 };
            freq[item.id].qty += item.qty;
        }
    }
    let top = null;
    let topQty = 0;
    for (const data of Object.values(freq)) {
        if (data.qty > topQty) { topQty = data.qty; top = data; }
    }

    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalTxns').textContent = totalTxns;
    document.getElementById('topProduct').textContent = top ? `${top.name} (${topQty} units)` : 'N/A';
}

function renderTablePage() {
    const tbody = document.getElementById('txnTableBody');
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageData = filteredData.slice(start, end);

    document.getElementById('pageIndicator').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages || totalItems === 0);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px 0;color:#94A3B8;">No transactions recorded yet.</td></tr>`;
        return;
    }

    let html = '';
    for (const t of pageData) {
        const itemsStr = t.items.map(i => `${i.name} x${i.qty}`).join(', ');
        const itemsDetails = t.items.map(i =>
            `<div class="detail-item">
                <span>${i.name}</span>
                <span>x${i.qty}  ${formatCurrency(i.price * i.qty)}</span>
            </div>`
        ).join('');

        const mobileItemsDetails = `<div class="items-details">${itemsDetails}</div>`;

        html += `
            <tr class="txn-row" data-id="${t.id}" style="cursor:pointer;">
                <td data-label=""><span class="row-number">▶</span></td>
                <td data-label="Order ID"><strong>#${String(t.receiptNumber).padStart(5, '0')}</strong></td>
                <td data-label="Date & Time">${t.date}</td>
                <td data-label="Items" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${itemsStr.length > 30 ? itemsStr.substring(0, 30) + '...' : itemsStr}
                    ${isMobile() ? mobileItemsDetails : ''}
                </td>
                <td data-label="Total"><strong style="color: var(--primary);">${formatCurrency(t.total)}</strong></td>
            </tr>
            ${!isMobile() ? `<tr class="details-row" data-parent="${t.id}" style="display:none; background:#f9fafb;">
                <td colspan="5" style="padding: 12px 20px;">
                    <div style="font-weight:600;margin-bottom:6px;">Items:</div>
                    ${itemsDetails}
                </td>
            </tr>` : ''}
        `;
    }
    tbody.innerHTML = html;

    // Attach click event
    tbody.querySelectorAll('.txn-row').forEach(row => {
        row.addEventListener('click', function() {
            const id = this.dataset.id;
            const detailsRow = document.querySelector(`.details-row[data-parent="${id}"]`);
            const mobileDetails = this.querySelector('.items-details');

            if (expandedRowId && expandedRowId !== id) {
                const prevDetails = document.querySelector(`.details-row[data-parent="${expandedRowId}"]`);
                if (prevDetails) prevDetails.style.display = 'none';
                const prevRow = document.querySelector(`.txn-row[data-id="${expandedRowId}"]`);
                if (prevRow) {
                    prevRow.querySelector('.row-number').textContent = '▶';
                    const prevMobileDetails = prevRow.querySelector('.items-details');
                    if (prevMobileDetails) prevMobileDetails.style.display = 'none';
                }
            }

            if (isMobile()) {
                if (mobileDetails) {
                    if (mobileDetails.style.display === 'none' || !mobileDetails.style.display) {
                        mobileDetails.style.display = 'block';
                        this.querySelector('.row-number').textContent = '▼';
                        expandedRowId = id;
                    } else {
                        mobileDetails.style.display = 'none';
                        this.querySelector('.row-number').textContent = '▶';
                        expandedRowId = null;
                    }
                }
            } else {
                if (!detailsRow) return;
                if (detailsRow.style.display === 'none') {
                    detailsRow.style.display = 'table-row';
                    this.querySelector('.row-number').textContent = '▼';
                    expandedRowId = id;
                } else {
                    detailsRow.style.display = 'none';
                    this.querySelector('.row-number').textContent = '▶';
                    expandedRowId = null;
                }
            }
        });
    });
}