export const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'snacks', label: 'Snacks' },
    { key: 'drinks', label: 'Drinks' },
    { key: 'rice', label: 'Rice' },
    { key: 'canned', label: 'Canned Goods' },
    { key: 'condiments', label: 'Condiments' },
    { key: 'frozen', label: 'Frozen' },
    { key: 'fruits', label: 'Fruits' },
    { key: 'vegetables', label: 'Vegetables' },
    { key: 'other', label: 'Other' }
];

export const CAT_ICONS = {
    'all': { img: 'assets/icons/all.png', emoji: '📋' },
    'snacks': { img: 'assets/icons/snacks.png', emoji: '🥨' },
    'drinks': { img: 'assets/icons/drinks.png', emoji: '🥤' },
    'rice': { img: 'assets/icons/rice.png', emoji: '🍚' },
    'canned': { img: 'assets/icons/canned.png', emoji: '🥫' },
    'condiments': { img: 'assets/icons/condiments.png', emoji: '🧂' },
    'frozen': { img: 'assets/icons/frozen.png', emoji: '❄️' },
    'fruits': { img: 'assets/icons/fruits.png', emoji: '🍎' },
    'vegetables': { img: 'assets/icons/vegetables.png', emoji: '🥬' },
    'other': { img: 'assets/icons/other.png', emoji: '📦' }
};

export function getCategoryLabel(key) {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.label : 'Products';
}