export function filterByCategory(list, category) {
    if (category === 'all') return list;
    return list.filter(p => p.category === category);
}

export function sortProducts(list, sortType) {
    const copy = [...list];
    switch (sortType) {
        case 'price-low': return copy.sort((a,b) => a.price - b.price);
        case 'price-high': return copy.sort((a,b) => b.price - a.price);
        case 'name-az': return copy.sort((a,b) => a.name.localeCompare(b.name));
        case 'name-za': return copy.sort((a,b) => b.name.localeCompare(a.name));
        default: return copy.sort((a,b) => a.id - b.id);
    }
}

export function searchProducts(list, term) {
    if (!term.trim()) return list;
    const q = term.trim().toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q));
}