export function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return "₱0.00";
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
    }).format(amount);
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}