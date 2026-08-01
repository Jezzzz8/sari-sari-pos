import { generateId } from './helpers.js';

export const currentBill = [];
export let transactions = [];
export let receiptCounter = 0;

const STORAGE_KEY = 'posTransactions';
const COUNTER_KEY = 'posReceiptCounter';

// Load persisted data
export function loadPersistedData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        transactions = data ? JSON.parse(data) : [];
    } catch { transactions = []; }
    try {
        const val = localStorage.getItem(COUNTER_KEY);
        receiptCounter = val ? parseInt(val, 10) : 0;
    } catch { receiptCounter = 0; }
}

export function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function saveCounter() {
    localStorage.setItem(COUNTER_KEY, String(receiptCounter));
}

// Cart operations
export function addToBill(product, qty) {
    const existing = currentBill.find(b => b.id === product.id);
    if (existing) {
        existing.qty += qty;
    } else {
        currentBill.push({ ...product, qty: qty });
    }
}

export function removeFromBill(id) {
    const idx = currentBill.findIndex(b => b.id === id);
    if (idx !== -1) currentBill.splice(idx, 1);
}

export function updateQty(id, delta) {
    const item = currentBill.find(b => b.id === id);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
        removeFromBill(id);
        return;
    }
    item.qty = newQty;
}

export function getSummary() {
    const subtotal = currentBill.reduce((sum, b) => sum + b.price * b.qty, 0);
    return { subtotal, grandTotal: subtotal };
}

export function clearBill() {
    currentBill.length = 0;
}

// Create a transaction from current bill
export function createTransaction(cash) {
    const summary = getSummary();
    receiptCounter += 1;
    saveCounter();
    const txn = {
        id: generateId(),
        date: new Date().toLocaleString(),
        items: currentBill.map(b => ({ ...b })),
        subtotal: summary.subtotal,
        tax: 0,
        total: summary.grandTotal,
        cash: cash,
        change: cash - summary.grandTotal,
        receiptNumber: receiptCounter
    };
    transactions.push(txn);
    saveTransactions();
    return txn;
}