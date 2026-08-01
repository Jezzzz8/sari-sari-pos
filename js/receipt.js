import { formatCurrency } from './helpers.js';

export function generateReceiptHTML(txn) {
    const itemsHtml = txn.items.map(item =>
        `<div class="ri-row">
            <span class="ri-name">${item.name}</span>
            <span class="ri-qty">x${item.qty}</span>
            <span class="ri-price">${formatCurrency(item.price * item.qty)}</span>
        </div>`
    ).join('');

    return `
        <div class="receipt-header">
            <h2>Sari-Sari Store</h2>
            <div class="sub">Your neighborhood convenience store</div>
            <div class="receipt-number">Receipt #${String(txn.receiptNumber).padStart(5, '0')}</div>
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

export function showReceipt(txn) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    content.innerHTML = generateReceiptHTML(txn);
    modal.dataset.txnId = txn.id;
    modal.classList.add('open');
}