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
import { searchProducts } from './search.js';
import { filterByCategory, sortProducts } from './filter.js';
import { showReceipt } from './receipt.js';
import { formatCurrency } from './helpers.js';
import { getCategoryLabel } from './constants.js';

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
const qtyClose = document.getElementById('qtyClose');
const btnAddQty = document.getElementById('btnAddQty');
const qtyProductName = document.getElementById('qtyProductName');
const qtyProductPrice = document.getElementById('qtyProductPrice');
const qtyProductImage = document.getElementById('qtyProductImage');
const qtyDisplayValue = document.getElementById('qtyDisplayValue'); // Pure DIV

// Checkout modal
const checkoutModal = document.getElementById('checkoutModal');
const checkoutClose = document.getElementById('checkoutClose');
const cashInputDisplay = document.getElementById('cashInputDisplay'); // Pure DIV

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

// ========== Helpers ==========
const isMobile = () => window.innerWidth <= 640;

// ========== Mobile Bill Toggle ==========
function toggleMobileBill() {
    mobileBillOverlay.classList.toggle('open');
}

function updateMobileBillUI() {
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

// ========== Event delegation for mobile bill item buttons ==========
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
            qtyProductName.textContent = pendingProduct.name;
            qtyProductPrice.textContent = formatCurrency(pendingProduct.price);
            qtyProductImage.src = pendingProduct.img || 'assets/images/placeholder.jpg';
            qtyProductImage.onerror = () => { qtyProductImage.src = 'assets/images/placeholder.jpg'; };
            
            // Reset quantity string and display
            qtyString = '1';
            updateQtyDisplay();
            
            qtyModal.classList.add('open');
        }
    });

    productCount.textContent = list.length + ' items';
    categoryTitle.textContent = getCategoryLabel(currentFilter);

    renderBill(billItems, billFooter);
    updateMobileBillUI();

    if (categoryMobile) categoryMobile.value = currentFilter;
}

// =============================================================
// ========== QUANTITY NUMPAD + KEYBOARD (MATH KIDS STYLE) ======
// =============================================================

let qtyString = '1'; // String-based input, just like cashString

function updateQtyDisplay() {
    qtyDisplayValue.textContent = qtyString;
    pendingQty = parseInt(qtyString) || 0;
}

// On-screen Numpad click handling
qtyModal.querySelectorAll('.qty-grid button').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        if (val === 'back') {
            qtyString = qtyString.slice(0, -1);
            if (qtyString === '') qtyString = '0';
        } else if (val === 'clear') {
            qtyString = '0';
        } else {
            if (qtyString === '0') {
                qtyString = val;
            } else {
                qtyString += val;
            }
        }
        updateQtyDisplay();
    });
});

// + and - buttons
document.getElementById('qtyDec').addEventListener('click', () => {
    let current = parseInt(qtyString) || 0;
    if (current > 1) { // Prevent going below 1
        current--;
        qtyString = String(current);
        updateQtyDisplay();
    }
});

document.getElementById('qtyInc').addEventListener('click', () => {
    let current = parseInt(qtyString) || 0;
    current++;
    qtyString = String(current);
    updateQtyDisplay();
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

// =============================================================
// ========== CASH NUMPAD + KEYBOARD (MATH KIDS STYLE) ==========
// =============================================================

let cashString = '';

// Update the display and calculate change
function updateCashDisplay() {
    const amount = parseFloat(cashString) || 0;
    cashInputDisplay.textContent = formatCurrency(amount);
    calculateChange();
}

// Calculate change and enable/disable the complete button
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

// On-screen Numpad click handling
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

// Desktop keyboard support for both Quantity and Cash modals
document.addEventListener('keydown', (e) => {
    
    // --- Handle Quantity Modal ---
    if (qtyModal.classList.contains('open')) {
        // Enter adds the product to bill
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

        // Backspace / Delete clears last digit
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            qtyString = qtyString.slice(0, -1);
            if (qtyString === '') qtyString = '0';
            updateQtyDisplay();
            return;
        }

        // Number keys 0-9
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            if (qtyString === '0') {
                qtyString = e.key;
            } else {
                qtyString += e.key;
            }
            updateQtyDisplay();
        }
        return; // Prevent accidental Cash modal handling if Quantity is open
    }

    // --- Handle Checkout Modal ---
    if (checkoutModal.classList.contains('open')) {
        // Enter triggers complete transaction
        if (e.key === 'Enter') {
            const btn = document.getElementById('checkoutComplete');
            if (!btn.disabled) btn.click();
            return;
        }

        // Backspace / Delete clears last digit
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            cashString = cashString.slice(0, -1);
            updateCashDisplay();
            return;
        }

        // Number keys 0-9 and decimal point
        if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            e.preventDefault();
            if (e.key === '.' && cashString.includes('.')) return;
            cashString += e.key;
            updateCashDisplay();
        }
    }
});

// ========== Checkout ==========
function openCheckout() {
    const summary = getSummary();
    document.getElementById('coItems').textContent = currentBill.reduce((s, b) => s + b.qty, 0);
    document.getElementById('coTotal').textContent = formatCurrency(summary.grandTotal);
    document.getElementById('changeDisplay').textContent = '₱0.00';
    document.getElementById('changeDisplay').className = 'change-amount';
    
    // Reset cash input and recalculate
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

// ========== Resize handler ==========
window.addEventListener('resize', () => {
    updateMobileBillUI();
});

// ========== Global Escape Shortcut ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
        mobileBillOverlay.classList.remove('open');
    }
});

// ========== Init ==========
renderAll();

console.log('✅ Sari-Sari Store POS ready!');
console.log(`📦 ${products.length} products loaded`);
console.log(`🧾 ${transactions.length} past transactions`);
console.log(`🔢 Next receipt #${receiptCounter + 1}`);