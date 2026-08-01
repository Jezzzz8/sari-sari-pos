import { formatCurrency } from './helpers.js';
import { currentBill, getSummary, updateQty, removeFromBill } from './bill.js';
import { CATEGORIES, CAT_ICONS, getCategoryLabel } from './constants.js';

export function renderCategories(container, activeCat, onSelect) {
    let html = `<div class="cat-title">Categories</div>`;
    for (const c of CATEGORIES) {
        const active = activeCat === c.key ? 'active' : '';
        const icon = CAT_ICONS[c.key];
        let iconHtml = '';
        if (icon) {
            if (icon.img) {
                iconHtml = `<img src="${icon.img}" alt="${c.key}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" /><span class="icon-emoji" style="display:none;">${icon.emoji}</span>`;
            } else {
                iconHtml = `<span class="icon-emoji">${icon.emoji}</span>`;
            }
        } else {
            iconHtml = `<span class="icon-emoji">📌</span>`;
        }
        html += `
            <button class="cat-btn ${active}" data-cat="${c.key}">
                <span class="cat-icon">${iconHtml}</span>
                ${c.label}
            </button>
        `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat;
            onSelect(cat);
        });
    });
}

export function renderProducts(container, products, onSelectProduct) {
    if (products.length === 0) {
        container.innerHTML =
            `<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#94A3B8;">No products found</div>`;
        return;
    }
    let html = '';
    for (const p of products) {
        // Fallback to placeholder if image fails to load
        const imgSrc = p.img || 'assets/images/placeholder.jpg';
        html += `
            <div class="product-card" data-id="${p.id}">
                <img src="${imgSrc}" alt="${p.name}" class="product-image" onerror="this.src='assets/images/placeholder.jpg'" loading="lazy" />
                <div class="product-name">${p.name}</div>
                <div class="product-price">${formatCurrency(p.price)}</div>
                <div class="product-category">${p.category}</div>
            </div>
        `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = Number(card.dataset.id);
            onSelectProduct(id);
        });
    });
}

export function renderBill(container, footerEl) {
    const { subtotal, grandTotal } = getSummary();
    const dateEl = document.getElementById('billDate');
    const now = new Date();
    dateEl.textContent =
        `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (currentBill.length === 0) {
        container.innerHTML =
            `<div class="bill-empty">No items added yet.<br/><span class="text-muted">Click a product to start.</span></div>`;
        footerEl.querySelector('#billSubtotal').textContent = '₱0.00';
        footerEl.querySelector('#billGrandTotal').textContent = '₱0.00';
        footerEl.querySelector('#checkoutBtn').disabled = true;
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
                    <button class="btn-minus" data-id="${item.id}">−</button>
                    <span class="bi-qty">${item.qty}</span>
                    <button class="btn-plus" data-id="${item.id}">+</button>
                    <button class="btn-remove" data-id="${item.id}">✕</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.btn-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            updateQty(Number(btn.dataset.id), -1);
            renderBill(container, footerEl);
        });
    });
    container.querySelectorAll('.btn-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            updateQty(Number(btn.dataset.id), 1);
            renderBill(container, footerEl);
        });
    });
    container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromBill(Number(btn.dataset.id));
            renderBill(container, footerEl);
        });
    });

    footerEl.querySelector('#billSubtotal').textContent = formatCurrency(subtotal);
    footerEl.querySelector('#billGrandTotal').textContent = formatCurrency(grandTotal);
    footerEl.querySelector('#checkoutBtn').disabled = false;
}