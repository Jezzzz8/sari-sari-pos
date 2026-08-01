import { products } from './data.js';
import {
    currentBill,
    transactions,
    receiptCounter,
    loadPersistedData,
    saveTransactions,
    saveCounter,
    addToBill,
    clearBill,
    getSummary,
    createTransaction
} from './bill.js';
import { renderCategories, renderProducts, renderBill } from './ui.js';
import { searchProducts } from './search.js';
import { filterByCategory, sortProducts } from './filter.js';
import { showReceipt } from './receipt.js';
import { formatCurrency } from './helpers.js';
import { getCategoryLabel } from './constants.js';

// Load persisted data
loadPersistedData();

// DOM refs
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
const categoryMobile = document.getElementById('categoryMobile');

const qtyModal = document.getElementById('qtyModal');
const qtyDisplay = document.getElementById('qtyDisplay');
const qtyClose = document.getElementById('qtyClose');
const btnAddQty = document.getElementById('btnAddQty');

const checkoutModal = document.getElementById('checkoutModal');
const checkoutClose = document.getElementById('checkoutClose');

// Mobile bill elements
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

// State
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'default';
let pendingProduct = null;
let pendingQty = 1;

// ========== Mobile Bill Toggle ==========
function toggleMobileBill() {
    mobileBillOverlay.classList.toggle('open');
}

function updateMobileBillUI() {
    const summary = getSummary();
    const totalItems = currentBill.reduce((s, b) => s + b.qty, 0);
    const hasItems = currentBill.length > 0;

    // Update floating bar
    if (hasItems) {
        mobileBillSummary.style.display = 'block';
        mobileBillItems.textContent = `🛒 ${totalItems} items`;
        mobileBillTotal.textContent = formatCurrency(summary.grandTotal);
    } else {
        mobileBillSummary.style.display = 'none';
    }

    // Update overlay content
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

    // Attach events for mobile bill items
    mobileBillItemsList.querySelectorAll('.mobile-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.id);
            const delta = btn.classList.contains('btn-plus') ? 1 : -1;
            updateQty(id, delta);
            renderAll();
        });
    });
    mobileBillItemsList.querySelectorAll('.mobile-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.id);
            removeFromBill(id);
            renderAll();
        });
    });

    mobileBillSubtotal.textContent = formatCurrency(summary.subtotal);
    mobileBillGrandTotal.textContent = formatCurrency(summary.grandTotal);
    mobileCheckoutBtn.disabled = false;
}

// ========== Render All ==========
function renderAll() {
    let list = filterByCategory(products, currentFilter);
    list = searchProducts(list, currentSearch);
    list = sortProducts(list, currentSort);

    renderCategories(catPanel, currentFilter, (cat) => {
        currentFilter = cat;
        if (categoryMobile) categoryMobile.value = cat;
        renderAll();
    });

    renderProducts(productGrid, list, (id) => {
        pendingProduct = products.find(p => p.id === id);
        if (pendingProduct) {
            pendingQty = 1;
            qtyDisplay.textContent = '1';
            qtyModal.classList.add('open');
        }
    });

    productCount.textContent = list.length + ' items';
    const catNames = {
        all: 'All Products',
        snacks: 'Snacks',
        drinks: 'Drinks',
        rice: 'Rice',
        canned: 'Canned Goods',
        condiments: 'Condiments',
        frozen: 'Frozen',
        fruits: 'Fruits',
        vegetables: 'Vegetables',
        other: 'Other'
    };
    categoryTitle.textContent = getCategoryLabel(currentFilter);

    renderBill(billItems, billFooter);
    updateMobileBillUI();
    
    // Sync mobile dropdown with current filter
    if (categoryMobile) categoryMobile.value = currentFilter;
}

// ========== Quantity Keypad ==========
qtyModal.querySelectorAll('.qty-grid button').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        let current = parseInt(qtyDisplay.textContent) || 0;
        if (val === 'back') {
            let str = String(current);
            if (str.length > 1) str = str.slice(0, -1);
            else str = '0';
            pendingQty = parseInt(str) || 0;
        } else if (val === 'clear') {
            pendingQty = 0;
        } else {
            let newStr = (current === 0 && val !== '0') ? val : String(current) + String(val);
            pendingQty = parseInt(newStr) || 0;
        }
        if (pendingQty < 0) pendingQty = 0;
        qtyDisplay.textContent = pendingQty;
    });
});

btnAddQty.addEventListener('click', () => {
    if (pendingProduct && pendingQty > 0) {
        addToBill(pendingProduct, pendingQty);
        renderAll();
        qtyModal.classList.remove('open');
        pendingProduct = null;
        pendingQty = 1;
    }
});

qtyClose.addEventListener('click', () => qtyModal.classList.remove('open'));
qtyModal.addEventListener('click', (e) => {
    if (e.target === qtyModal) qtyModal.classList.remove('open');
});

// ========== Checkout ==========
function openCheckout() {
    const summary = getSummary();
    document.getElementById('coItems').textContent = currentBill.reduce((s, b) => s + b.qty, 0);
    document.getElementById('coTotal').textContent = formatCurrency(summary.grandTotal);
    document.getElementById('changeDisplay').textContent = '₱0.00';
    document.getElementById('changeDisplay').className = 'change-amount';
    document.getElementById('cashInput').value = '';
    document.getElementById('checkoutComplete').disabled = true;
    checkoutModal.classList.add('open');
    // Close mobile bill overlay if open
    mobileBillOverlay.classList.remove('open');
}

checkoutBtn.addEventListener('click', openCheckout);
mobileCheckoutBtn.addEventListener('click', openCheckout);

checkoutClose.addEventListener('click', () => checkoutModal.classList.remove('open'));
document.getElementById('checkoutCancel').addEventListener('click', () => checkoutModal.classList.remove('open'));

document.getElementById('cashInput').addEventListener('input', () => {
    const summary = getSummary();
    const cash = parseFloat(document.getElementById('cashInput').value);
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
});

document.getElementById('checkoutComplete').addEventListener('click', () => {
    const cashInput = document.getElementById('cashInput');
    const cash = parseFloat(cashInput.value);
    const summary = getSummary();
    if (isNaN(cash) || cash < summary.grandTotal) return;

    const txn = createTransaction(cash);
    clearBill();
    renderAll();
    checkoutModal.classList.remove('open');
    showReceipt(txn);
});

// ========== Receipt ==========
document.getElementById('receiptClose').addEventListener('click', () => {
    document.getElementById('receiptModal').classList.remove('open');
});
document.getElementById('receiptClose2').addEventListener('click', () => {
    document.getElementById('receiptModal').classList.remove('open');
});
document.getElementById('receiptModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('receiptModal').classList.remove('open');
});

document.getElementById('btnPrintReceipt').addEventListener('click', async () => {
    const modal = document.getElementById('receiptModal');
    const txnId = modal.dataset.txnId;
    if (!txnId) return;
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;
    const { generateReceiptHTML } = await import('./receipt.js');
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
        </style></head><body>
            ${content}
        </body></html>
    `);
    win.document.close();
    win.print();
});

// ========== Report Button – redirect ==========
btnReport.addEventListener('click', () => {
    window.location.href = 'reports.html';
});

// ========== Mobile Bill Events ==========
mobileBillSummary.addEventListener('click', toggleMobileBill);
mobileBillClose.addEventListener('click', toggleMobileBill);
mobileBillOverlay.addEventListener('click', (e) => {
    if (e.target === mobileBillOverlay) toggleMobileBill();
});

// ========== Mobile Category Dropdown ==========
if (categoryMobile) {
    categoryMobile.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderAll();
    });
}

// ========== Header Events ==========
searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderAll();
});

sortFilter.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderAll();
});

// ========== Keyboard Shortcuts ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
        mobileBillOverlay.classList.remove('open');
    }
});

document.getElementById('cashInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const btn = document.getElementById('checkoutComplete');
        if (!btn.disabled) btn.click();
    }
});

// ========== Init ==========
renderAll();

console.log('✅ Sari-Sari Store POS ready!');
console.log(`📦 ${products.length} products loaded`);
console.log(`🧾 ${transactions.length} past transactions`);
console.log(`🔢 Next receipt #${receiptCounter + 1}`);