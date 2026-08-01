export function searchProducts(list, term) {
    if (!term.trim()) return list;
    const q = term.trim().toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q));
}