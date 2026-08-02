import { products } from './data.js';
import {
    currentBill,
    transactions,
    receiptCounter,
    addToBill,
    clearBill,
    getSummary,
    createTransaction,
    updateQty,
    removeFromBill
} from './bill.js';
import { renderCategories, renderProducts, renderBill } from './ui.js';
import { filterByCategory, sortProducts, searchProducts } from './filter.js';
import { formatCurrency } from './helpers.js';
import { getCategoryLabel } from './constants.js';
import { renderReportStats, renderReportTable, resetExpandedRow } from './reports.js';

// ---- State ----
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'default';
let pendingProduct = null;
let pendingQty = 1;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// ---- DOM refs ----
const posContainer = document.querySelector('.pos-container');
const catPanel = document.getElementById('categoriesPanel');
const productGrid = document.getElementById('productGrid');
const productCount = document.getElementById('productCount');
const categoryTitle = document.getElementById('categoryTitle');
const billItems = document.getElementById('billItems');
const billFooter = document.getElementById('billFooter');
const checkoutBtn = document.getElementById('checkoutBtn');

const searchInput = document.getElementById('searchInput');
const sortFilter = document.getElementById('sortFilter');
const btnReport = document.getElementById('btnReport');
const backToPosBtn = document.getElementById('backToPos');
const categoryMobile = document.getElementById('categoryMobile');

const qtyModal = document.getElementById('qtyModal');
const qtyClose = document.getElementById('qtyClose');
const btnAddQty = document.getElementById('btnAddQty');
const qtyProductName = document.getElementById('qtyProductName');
const qtyProductPrice = document.getElementById('qtyProductPrice');
const qtyProductImage = document.getElementById('qtyProductImage');
const qtyDisplayValue = document.getElementById('qtyDisplayValue');

const checkoutModal = document.getElementById('checkoutModal');
const checkoutClose = document.getElementById('checkoutClose');
const cashInputDisplay = document.getElementById('cashInputDisplay');

const mobileBillSummary = document.getElementById('mobileBillSummary');
const mobileBillItems = document.getElementById('mobileBillItems');
const mobileBillTotal = document.getElementById('mobileBillTotal');
const mobileBillOverlay = document.getElementById('mobileBillOverlay');
const mobileBillClose = document.getElementById('mobileBillClose');
const mobileBillDate = document.getElementById('mobileBillDate');
const mobileBillItemsList = document.getElementById('mobileBillItemsList');
const mobileBillSubtotal = document.getElementById('mobileBillSubtotal');
const mobileBillGrandTotal = document.getElementById('mobileBillGrandTotal');
const mobileCheckoutBtn = document.getElementById('mobileCheckoutBtn');

const posView = document.getElementById('pos-view');
const reportView = document.getElementById('report-view');

const reportCategoryMobile = document.getElementById('reportCategoryMobile');
const dateRange = document.getElementById('dateRange');
const sortReport = document.getElementById('sortReport');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');

// ---- Helpers ----
const isMobile = () => window.innerWidth <= 640;

// ---- Mobile Bill ----
function toggleMobileBill() {
    updateMobileBillUI();
    mobileBillOverlay.classList.toggle('open');
}

function updateMobileBillUI() {
    if (reportView.style.display === 'flex') {
        mobileBillSummary.style.display = 'none';
        return;
    }
    const summary = getSummary();
    const totalItems = currentBill.reduce((s, b) => s + b.qty, 0);
    const hasItems = currentBill.length > 0;

    if (hasItems && isMobile()) {
        mobileBillSummary.style.display = 'block';
        mobileBillItems.textContent = `🛒 ${totalItems} items`;
        mobileBillTotal.textContent = formatCurrency(summary.grandTotal);
    } else {
        mobileBillSummary.style.display = 'none';
    }

    const now = new Date();
    mobileBillDate.textContent = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (currentBill.length === 0) {
        mobileBillItemsList.innerHTML = `<div class="bill-empty">No items added yet.</div>`;
        mobileBillSubtotal.textContent = '₱0.00';
        mobileBillGrandTotal.textContent = '₱0.00';
        mobileCheckoutBtn.disabled = true;
        return;
    }
    let html = '';
    for (const item of currentBill) {
        html += `
            <div class="bill-item">
                <div class="bi-info">
                    <div class="bi-name">${item.name}</div>
                    <div class="bi-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="bi-actions">
                    <button class="btn-minus mobile-qty-btn" data-id="${item.id}">−</button>
                    <span class="bi-qty">${item.qty}</span>
                    <button class="btn-plus mobile-qty-btn" data-id="${item.id}">+</button>
                    <button class="btn-remove mobile-remove-btn" data-id="${item.id}">✕</button>
                </div>
            </div>
        `;
    }
    mobileBillItemsList.innerHTML = html;
    mobileBillSubtotal.textContent = formatCurrency(summary.subtotal);
    mobileBillGrandTotal.textContent = formatCurrency(summary.grandTotal);
    mobileCheckoutBtn.disabled = false;
}

mobileBillItemsList.addEventListener('click', function(e) {
    const target = e.target.closest('.mobile-qty-btn, .mobile-remove-btn');
    if (!target) return;
    const id = Number(target.dataset.id);
    if (isNaN(id)) return;
    if (target.classList.contains('mobile-qty-btn')) {
        const delta = target.classList.contains('btn-plus') ? 1 : -1;
        updateQty(id, delta);
        renderAll();
    } else if (target.classList.contains('mobile-remove-btn')) {
        removeFromBill(id);
        renderAll();
    }
});

// ---- Render All (POS) ----
function renderAll() {
    // --- FORCE SYNC: always set search input to currentSearch ---
    searchInput.value = currentSearch;

    let list = filterByCategory(products, currentFilter);
    list = searchProducts(list, currentSearch);
    list = sortProducts(list, currentSort);

    renderCategories(catPanel, currentFilter, (cat) => {
        currentFilter = cat;
        categoryMobile.value = cat;
        reportCategoryMobile.value = cat;
        renderAll();
        if (reportView.style.display === 'flex') {
            currentPage = 1;
            renderReport();
        }
    });

    renderProducts(productGrid, list, (id) => {
        pendingProduct = products.find(p => p.id === id);
        if (pendingProduct) {
            qtyProductName.textContent = pendingProduct.name;
            qtyProductPrice.textContent = formatCurrency(pendingProduct.price);
            qtyProductImage.src = pendingProduct.img || 'assets/images/placeholder.jpg';
            qtyProductImage.onerror = () => { qtyProductImage.src = 'assets/images/placeholder.jpg'; };
            qtyString = '1';
            updateQtyDisplay();
            qtyModal.classList.add('open');
        }
    });

    productCount.textContent = list.length + ' items';
    categoryTitle.textContent = getCategoryLabel(currentFilter);
    renderBill(billItems, billFooter);
    updateMobileBillUI();
    categoryMobile.value = currentFilter;
    reportCategoryMobile.value = currentFilter;
}

// ---- Quantity Numpad ----
let qtyString = '1';

function updateQtyDisplay() {
    qtyDisplayValue.textContent = qtyString;
    pendingQty = parseInt(qtyString) || 0;
}

qtyModal.querySelectorAll('.qty-grid button').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        if (val === 'back') {
            qtyString = qtyString.slice(0, -1);
            if (qtyString === '') qtyString = '0';
        } else if (val === 'clear') {
            qtyString = '0';
        } else {
            if (qtyString === '0') qtyString = val;
            else qtyString += val;
        }
        updateQtyDisplay();
    });
});

document.getElementById('qtyDec').addEventListener('click', () => {
    let current = parseInt(qtyString) || 0;
    if (current > 1) { current--; qtyString = String(current); updateQtyDisplay(); }
});
document.getElementById('qtyInc').addEventListener('click', () => {
    let current = parseInt(qtyString) || 0;
    current++; qtyString = String(current); updateQtyDisplay();
});

btnAddQty.addEventListener('click', () => {
    if (pendingProduct && pendingQty > 0) {
        addToBill(pendingProduct, pendingQty);
        renderAll();
        qtyModal.classList.remove('open');
        pendingProduct = null;
        qtyString = '1';
        updateQtyDisplay();
    }
});
qtyClose.addEventListener('click', () => qtyModal.classList.remove('open'));
qtyModal.addEventListener('click', (e) => {
    if (e.target === qtyModal) qtyModal.classList.remove('open');
});

// ---- Cash Numpad ----
let cashString = '';

function updateCashDisplay() {
    const amount = parseFloat(cashString) || 0;
    cashInputDisplay.textContent = formatCurrency(amount);
    calculateChange();
}

function calculateChange() {
    const summary = getSummary();
    const cash = parseFloat(cashString) || 0;
    const changeEl = document.getElementById('changeDisplay');
    const completeBtn = document.getElementById('checkoutComplete');
    if (!isNaN(cash) && cash >= summary.grandTotal) {
        changeEl.textContent = formatCurrency(cash - summary.grandTotal);
        changeEl.className = 'change-amount';
        completeBtn.disabled = false;
    } else if (!isNaN(cash) && cash < summary.grandTotal) {
        changeEl.textContent = formatCurrency(cash - summary.grandTotal);
        changeEl.className = 'change-amount negative';
        completeBtn.disabled = true;
    } else {
        changeEl.textContent = '₱0.00';
        changeEl.className = 'change-amount';
        completeBtn.disabled = true;
    }
}

document.querySelectorAll('.cash-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        if (val === 'back') {
            cashString = cashString.slice(0, -1);
        } else if (val === 'clear') {
            cashString = '';
        } else {
            if (val === '.' && cashString.includes('.')) return;
            cashString += val;
        }
        updateCashDisplay();
    });
});

// ---- Checkout ----
function openCheckout() {
    const summary = getSummary();
    document.getElementById('coItems').textContent = currentBill.reduce((s, b) => s + b.qty, 0);
    document.getElementById('coTotal').textContent = formatCurrency(summary.grandTotal);
    document.getElementById('changeDisplay').textContent = '₱0.00';
    document.getElementById('changeDisplay').className = 'change-amount';
    cashString = '';
    updateCashDisplay();
    document.getElementById('checkoutComplete').disabled = true;
    checkoutModal.classList.add('open');
    mobileBillOverlay.classList.remove('open');
}

checkoutBtn.addEventListener('click', openCheckout);
mobileCheckoutBtn.addEventListener('click', openCheckout);
checkoutClose.addEventListener('click', () => checkoutModal.classList.remove('open'));
document.getElementById('checkoutCancel').addEventListener('click', () => checkoutModal.classList.remove('open'));
document.getElementById('checkoutComplete').addEventListener('click', () => {
    const cash = parseFloat(cashString);
    const summary = getSummary();
    if (isNaN(cash) || cash < summary.grandTotal) return;
    const txn = createTransaction(cash);
    clearBill();
    renderAll();
    checkoutModal.classList.remove('open');
    showReceipt(txn);
});

// ---- Receipt ----
function showReceipt(txn) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    content.innerHTML = generateReceiptHTML(txn);
    modal.dataset.txnId = txn.id;
    modal.classList.add('open');
}

function generateReceiptHTML(txn) {
    const itemsHtml = txn.items.map(item =>
        `<div class="ri-row"><span class="ri-name">${item.name}</span><span class="ri-qty">x${item.qty}</span><span class="ri-price">${formatCurrency(item.price * item.qty)}</span></div>`
    ).join('');
    return `
        <div class="receipt-header">
            <h2>Sari-Sari Store</h2>
            <div class="sub">Your neighborhood convenience store</div>
            <div class="receipt-number">Receipt #${String(txn.receiptNumber).padStart(5,'0')}</div>
            <div class="sub" style="margin-top:2px;">${txn.date}</div>
        </div>
        <div class="receipt-items">${itemsHtml}</div>
        <div class="receipt-totals">
            <div class="rt-row"><span>Subtotal</span><span>${formatCurrency(txn.subtotal)}</span></div>
            <div class="rt-row"><span>Tax</span><span>${formatCurrency(txn.tax || 0)}</span></div>
            <div class="rt-row grand"><span>Total</span><span class="amount">${formatCurrency(txn.total)}</span></div>
            <div class="rt-row"><span>Cash</span><span>${formatCurrency(txn.cash)}</span></div>
            <div class="rt-row" style="color:#22C55E;font-weight:600;"><span>Change</span><span>${formatCurrency(txn.change)}</span></div>
        </div>
        <div class="receipt-footer">Thank you for your purchase!<br />Visit us again!</div>
    `;
}

document.getElementById('receiptClose').addEventListener('click', () => document.getElementById('receiptModal').classList.remove('open'));
document.getElementById('receiptClose2').addEventListener('click', () => document.getElementById('receiptModal').classList.remove('open'));
document.getElementById('receiptModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('receiptModal').classList.remove('open');
});
document.getElementById('btnPrintReceipt').addEventListener('click', () => {
    const modal = document.getElementById('receiptModal');
    const txnId = modal.dataset.txnId;
    if (!txnId) return;
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;
    const content = generateReceiptHTML(txn);
    const win = window.open('', '_blank', 'width=420,height=700');
    win.document.write(`
        <html><head><title>Receipt</title>
        <style>
            body{font-family:'Courier New',monospace;padding:20px;background:#fff;color:#1F2937;max-width:400px;margin:0 auto;}
            .receipt-header{text-align:center;border-bottom:2px dashed #E5E7EB;padding-bottom:14px;margin-bottom:14px;}
            .receipt-header h2{font-size:20px;font-weight:700;margin:0;}
            .receipt-header .sub{font-size:12px;color:#94A3B8;}
            .receipt-header .receipt-number{font-size:13px;color:#4B5563;margin-top:4px;}
            .receipt-items{margin:12px 0;}
            .ri-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px;border-bottom:1px dotted #E5E7EB;}
            .ri-name{flex:1;}
            .ri-qty{margin:0 12px;color:#4B5563;}
            .ri-price{font-weight:500;}
            .receipt-totals{border-top:2px dashed #E5E7EB;padding-top:12px;margin-top:10px;}
            .rt-row{display:flex;justify-content:space-between;font-size:14px;padding:2px 0;}
            .rt-row.grand{font-weight:700;font-size:18px;padding-top:8px;border-top:1px solid #E5E7EB;margin-top:6px;}
            .rt-row.grand .amount{color:#3B82F6;}
            .receipt-footer{text-align:center;margin-top:16px;font-size:12px;color:#94A3B8;border-top:2px dashed #E5E7EB;padding-top:14px;}
            @media print{body{padding:10px;}}
        </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
});

// ---- Report ----
function renderReport() {
    // Reset expansion so table always starts collapsed
    resetExpandedRow();

    const category = currentFilter;
    const searchTerm = currentSearch;
    const sort = sortReport.value;
    const dateRangeVal = dateRange.value;

    let filtered = [...transactions];

    // Category filter
    if (category !== 'all') {
        filtered = filtered.filter(txn =>
            txn.items.some(item => {
                const product = products.find(p => p.id === item.id);
                return product && product.category === category;
            })
        );
    }

    // Search filter (by order ID or product name)
    if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        filtered = filtered.filter(txn => {
            const idMatch = String(txn.receiptNumber).includes(q);
            const itemMatch = txn.items.some(item => item.name.toLowerCase().includes(q));
            return idMatch || itemMatch;
        });
    }

    // Date range filter
    if (dateRangeVal !== 'all') {
        const now = new Date();
        let startDate = new Date();
        if (dateRangeVal === 'today') startDate.setHours(0,0,0,0);
        else if (dateRangeVal === 'week') startDate.setDate(now.getDate() - 7);
        else if (dateRangeVal === 'month') startDate.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(txn => new Date(txn.date) >= startDate);
    }

    // Sorting
    switch (sort) {
        case 'date-desc': filtered.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
        case 'date-asc': filtered.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
        case 'total-desc': filtered.sort((a,b) => b.total - a.total); break;
        case 'total-asc': filtered.sort((a,b) => a.total - b.total); break;
    }

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, totalFiltered);
    const pageData = filtered.slice(start, end);

    renderReportStats(filtered);
    renderReportTable(pageData);

    document.getElementById('txnCount').textContent = totalFiltered + ' transactions';
    document.getElementById('pageIndicator').textContent = `${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = (currentPage === 1);
    nextPageBtn.disabled = (currentPage === totalPages || totalFiltered === 0);
}

function toggleReportView(show) {
    if (show) {
        mobileBillOverlay.classList.remove('open');
        mobileBillSummary.style.display = 'none';
        posContainer.classList.add('report-mode');

        posView.style.display = 'none';
        reportView.style.display = 'flex';
        backToPosBtn.style.display = 'inline-block';
        btnReport.style.display = 'none';

        // Update search placeholder and sync value
        searchInput.placeholder = 'Search transactions...';
        searchInput.value = currentSearch;

        currentPage = 1;
        dateRange.value = 'all';
        sortReport.value = 'date-desc';
        reportCategoryMobile.value = currentFilter;
        renderReport();
    } else {
        posContainer.classList.remove('report-mode');
        reportView.style.display = 'none';
        posView.style.display = 'flex';
        backToPosBtn.style.display = 'none';
        btnReport.style.display = 'inline-block';

        // Restore search placeholder and sync value
        searchInput.placeholder = 'Search product...';
        searchInput.value = currentSearch;

        updateMobileBillUI();
        renderAll();  // refresh POS with current filters
    }
}

btnReport.addEventListener('click', () => toggleReportView(true));
backToPosBtn.addEventListener('click', () => toggleReportView(false));

// ---- Report filter events ----
dateRange.addEventListener('change', () => { currentPage = 1; renderReport(); });
sortReport.addEventListener('change', () => { currentPage = 1; renderReport(); });

// ---- Report category dropdown ----
reportCategoryMobile.addEventListener('change', (e) => {
    const newFilter = e.target.value;
    currentFilter = newFilter;
    categoryMobile.value = newFilter; // sync POS dropdown
    // If report is open, update report directly; otherwise re-render POS.
    if (reportView.style.display === 'flex') {
        currentPage = 1;
        renderReport();
    } else {
        renderAll();
    }
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderReport(); }
});
nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) { currentPage++; renderReport(); }
});

// ---- Header events ----
searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    if (reportView.style.display === 'flex') {
        // If report is open, update report directly
        currentPage = 1;
        renderReport();
    } else {
        renderAll();   // updates POS and also triggers report if open (but it's closed)
    }
});
sortFilter.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderAll();
});
categoryMobile.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    reportCategoryMobile.value = currentFilter;
    renderAll();
});

// ---- Mobile bill events ----
mobileBillSummary.addEventListener('click', toggleMobileBill);
mobileBillClose.addEventListener('click', toggleMobileBill);
mobileBillOverlay.addEventListener('click', (e) => {
    if (e.target === mobileBillOverlay) toggleMobileBill();
});

// ---- Resize ----
window.addEventListener('resize', updateMobileBillUI);

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
        mobileBillOverlay.classList.remove('open');
    }
    if (qtyModal.classList.contains('open')) {
        if (e.key === 'Enter') {
            if (pendingProduct && pendingQty > 0) {
                addToBill(pendingProduct, pendingQty);
                renderAll();
                qtyModal.classList.remove('open');
                pendingProduct = null;
                qtyString = '1';
                updateQtyDisplay();
            }
            return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            qtyString = qtyString.slice(0, -1);
            if (qtyString === '') qtyString = '0';
            updateQtyDisplay();
            return;
        }
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            if (qtyString === '0') qtyString = e.key;
            else qtyString += e.key;
            updateQtyDisplay();
        }
        return;
    }
    if (checkoutModal.classList.contains('open')) {
        if (e.key === 'Enter') {
            const btn = document.getElementById('checkoutComplete');
            if (!btn.disabled) btn.click();
            return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            cashString = cashString.slice(0, -1);
            updateCashDisplay();
            return;
        }
        if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            e.preventDefault();
            if (e.key === '.' && cashString.includes('.')) return;
            cashString += e.key;
            updateCashDisplay();
        }
    }
});

// ---- Init ----
renderAll();
console.log('✅ Sari-Sari Store POS ready!');
console.log(`📦 ${products.length} products loaded`);
console.log(`🧾 ${transactions.length} past transactions`);
console.log(`🔢 Next receipt #${receiptCounter + 1}`);