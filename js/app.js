// Campus Store Application Logic
// Handles Catalog, Interactive Gallery, Filter, Cart, Auth/Guest, SBI/UPI Payments,
// 3 Wings & 11 Floors Hostel Room Delivery, Return/Refund Policy, Real-time Email & WhatsApp

// Application State
const AppState = {
  products: PRODUCTS_DATA,
  currentCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  cart: JSON.parse(localStorage.getItem('store_cart') || '[]'),
  user: JSON.parse(localStorage.getItem('store_user') || 'null'),
  discountCode: '',
  discountPercent: 0,   // kept for backward compatibility; use discountType/discountValue below
  discountType: null,   // 'percentage' | 'fixed' | null
  discountValue: 0,
  selectedPaymentMethod: 'upi',
  lastOrder: null
};

// Computes the rupee discount amount for a given subtotal based on the
// currently applied promo code (percentage or fixed), or 0 if none applied.
function computeDiscountAmount(subtotal) {
  if (!AppState.discountType) return 0;
  if (AppState.discountType === 'percentage') {
    return Math.round((subtotal * AppState.discountValue) / 100);
  }
  return Math.min(subtotal, AppState.discountValue);
}

// Validates a promo code against the backend and applies it to AppState.
function applyPromoCode() {
  const input = document.getElementById('promoCodeInput');
  const msgEl = document.getElementById('promoCodeMsg');
  const code = input ? input.value.trim().toUpperCase() : '';

  if (!code) {
    showToast('Enter a promo code first', 'warning');
    return;
  }

  const subtotal = AppState.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  fetch('/api/discounts/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal })
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.valid) {
        AppState.discountType = null;
        AppState.discountValue = 0;
        AppState.discountCode = '';
        AppState.discountPercent = 0;
        if (msgEl) {
          msgEl.textContent = data.message || 'Invalid discount code.';
          msgEl.style.color = '#ef4444';
          msgEl.style.display = 'block';
        }
        updateCartUI();
        return;
      }
      AppState.discountType = data.type;
      AppState.discountValue = data.value;
      AppState.discountCode = data.code;
      AppState.discountPercent = data.type === 'percentage' ? data.value : 0;
      if (msgEl) {
        msgEl.textContent = `"${data.code}" applied — you saved ₹${data.discount_amount}!`;
        msgEl.style.color = '#10b981';
        msgEl.style.display = 'block';
      }
      showToast(`Promo code "${data.code}" applied!`, 'info');
      updateCartUI();
    })
    .catch(() => {
      if (msgEl) {
        msgEl.textContent = 'Could not validate code right now. Please try again.';
        msgEl.style.color = '#ef4444';
        msgEl.style.display = 'block';
      }
    });
}

// DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  renderProducts();
  updateCartUI();
  updateAuthUI();
  setupEventListeners();
  checkURLParams();
});

// Initialize UI elements
function initUI() {
  const yearSpans = document.querySelectorAll('.current-year');
  yearSpans.forEach(el => el.textContent = new Date().getFullYear());
}

// Setup Event Listeners
function setupEventListeners() {
  // Category Filtering
  document.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.currentCategory = btn.dataset.category;
      renderProducts();
    });
  });

  // Search Input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Sort Selector
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.sortBy = e.target.value;
      renderProducts();
    });
  }

  // Cart Drawer Toggles
  const cartBtn = document.getElementById('cartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const drawerBackdrop = document.getElementById('drawerBackdrop');

  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeCartDrawer);

  // Modal Backdrop Click
  const modalBackdrop = document.getElementById('modalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeAllModals);
  }

  // User Auth Modal Trigger
  const userBtn = document.getElementById('userBtn');
  if (userBtn) userBtn.addEventListener('click', openAuthModal);

  // Contact Form Submission
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const catIntroTitle = document.getElementById('catIntroTitle');
  const catIntroDesc = document.getElementById('catIntroDesc');

  if (!grid) return;

  // Filter Logic
  let filtered = AppState.products.filter(item => {
    const matchesCategory = AppState.currentCategory === 'all' || item.category === AppState.currentCategory;
    const matchesSearch = !AppState.searchQuery || 
      item.name.toLowerCase().includes(AppState.searchQuery) ||
      item.description.toLowerCase().includes(AppState.searchQuery) ||
      item.tags.some(t => t.toLowerCase().includes(AppState.searchQuery));
    return matchesCategory && matchesSearch;
  });

  // Sorting Logic
  if (AppState.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (AppState.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (AppState.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  // Update Category Header Info
  const catMeta = {
    all: { title: "All Campus Store Essentials", desc: "Official student supplies delivered across Wings A, B, C (Floors 1-11) of Boys & Girls Hostels." },
    stationary: { title: "1. Stationary Essentials", desc: "Universal Science practical notebooks (144/200 pgs), assignment sheets, & exam accessories." },
    gym: { title: "2. Gym & Fitness Essentials", desc: "Heavy-duty wrist wraps, barrel duffel bags, leatherette grip gloves, and 3-compartment shaker bottles." },
    laptop: { title: "3. Laptop & Computing Accessories", desc: "Wired/wireless keyboards, mice, cooling pads with stands, and high-speed 32GB/64GB flash drives." },
    hostel: { title: "4. Hostel Living Essentials", desc: "4-socket spike guard extensions, multi-cook kettles, study lamps, laundry hampers & single bedsheets." }
  };

  const currentMeta = catMeta[AppState.currentCategory] || catMeta.all;
  if (catIntroTitle) catIntroTitle.textContent = currentMeta.title;
  if (catIntroDesc) catIntroDesc.textContent = currentMeta.desc;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1rem; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style="margin: 0 auto 1rem;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 style="font-size: 1.15rem; color: #1e293b; font-weight: 700; margin-bottom: 0.35rem;">No products found</h3>
        <p style="color: #64748b; font-size: 0.9rem;">Try adjusting your search query or switch categories.</p>
        <button onclick="resetFilters()" style="margin-top: 1rem; background: #8b0000; color: #fff; padding: 0.5rem 1.2rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">View All Products</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    const hasMultipleImages = product.gallery && product.gallery.length > 1;

    return `
      <article class="product-card" id="prod-${product.id}">
        <div class="product-image-wrap" onclick="openProductQuickView('${product.id}')" style="cursor: pointer;" title="Click to view details & photos">
          <img id="img-card-${product.id}" src="${product.image}" alt="${product.name}" loading="lazy" style="object-fit: contain; background: #ffffff; padding: 8px;">
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
          <span class="stock-tag">In Stock (${product.stockCount})</span>
          ${hasMultipleImages ? `
            <div class="gallery-badge" style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.8); color: #fff; font-size: 0.7rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 3px;">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>${product.gallery.length} Photos</span>
            </div>
          ` : ''}
        </div>
        <div class="product-body">
          <span class="product-category-tag">${product.categoryLabel}</span>
          <h3 class="product-title" onclick="openProductQuickView('${product.id}')" style="cursor: pointer;">${product.name}</h3>
          
          <div class="product-rating">
            <span class="stars">★ ${product.rating}</span>
            <span>(${product.reviewsCount} reviews)</span>
          </div>

          <p class="product-desc">${product.description}</p>

          <div class="product-footer">
            <div class="price-box">
              <span class="current-price">₹${product.price}</span>
              <span class="original-price">₹${product.originalPrice} (${discount}% OFF)</span>
            </div>
            <div class="card-add-control" id="qtybox-${product.id}">${renderCardAddControl(product.id)}</div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Product Quick View Modal with Gallery Viewer
function openProductQuickView(productId) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const modalContainer = document.getElementById('checkoutModalContent');
  if (!modalContainer) return;

  const gallery = product.gallery || [product.image];
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  modalContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; color: #d97706; text-transform: uppercase;">${product.categoryLabel}</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">${product.name}</h3>
        </div>
        <span style="background: #10b981; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 999px;">
          In Stock (${product.stockCount})
        </span>
      </div>

      <!-- Main Photo Preview & Thumbnails -->
      <div style="display: grid; grid-template-columns: ${gallery.length > 1 ? '1fr 90px' : '1fr'}; gap: 1rem; align-items: center;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; height: 280px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          <img id="quickViewMainImg" src="${gallery[0]}" alt="${product.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
        </div>

        ${gallery.length > 1 ? `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 280px; overflow-y: auto;">
            ${gallery.map((imgUrl, idx) => `
              <div onclick="switchQuickViewImg('${imgUrl}', this)" style="border: 2px solid ${idx === 0 ? '#8b0000' : '#e2e8f0'}; border-radius: 8px; padding: 4px; cursor: pointer; background: #fff; height: 60px; display: flex; align-items: center; justify-content: center;" class="quickview-thumb">
                <img src="${imgUrl}" alt="thumbnail" style="max-height: 100%; max-width: 100%; object-fit: contain;">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Price & Specifications -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <span style="font-size: 1.4rem; font-weight: 800; color: #8b0000;">₹${product.price}</span>
            <span style="font-size: 0.9rem; color: #94a3b8; text-decoration: line-through; margin-left: 0.5rem;">₹${product.originalPrice}</span>
            <span style="font-size: 0.8rem; font-weight: 700; color: #10b981; margin-left: 0.4rem;">(${discount}% OFF)</span>
          </div>
          <div style="font-size: 0.85rem; color: #475569; font-weight: 600;">
            ★ ${product.rating} / 5.0 (${product.reviewsCount} student reviews)
          </div>
        </div>

        <p style="font-size: 0.9rem; color: #334155; line-height: 1.5; margin-bottom: 0.85rem;">
          ${product.description}
        </p>

        <h4 style="font-size: 0.85rem; font-weight: 700; color: #0f172a; margin-bottom: 0.4rem;">Key Features & Specifications:</h4>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: #475569;">
          ${product.specs.map(s => `
            <li style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="color: #10b981; font-weight: 700;">✓</span>
              <span>${s}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem;">
        <button onclick="closeAllModals()" style="background: #e2e8f0; color: #334155; padding: 0.65rem 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">
          Close
        </button>
        <button onclick="addToCart('${product.id}'); closeAllModals(); openCartDrawer();" style="background: #8b0000; color: #fff; padding: 0.65rem 1.6rem; border-radius: 8px; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Add to Cart & View</span>
        </button>
      </div>
    </div>
  `;

  openModal('checkoutModal');
}

function switchQuickViewImg(imgUrl, el) {
  const main = document.getElementById('quickViewMainImg');
  if (main) main.src = imgUrl;

  document.querySelectorAll('.quickview-thumb').forEach(t => t.style.borderColor = '#e2e8f0');
  if (el) el.style.borderColor = '#8b0000';
}

// Renders either the "Add" button (not in cart) or a live qty stepper
// (already in cart) for a given product card. Called on initial render and
// re-synced (without a full grid re-render) whenever the cart changes.
function renderCardAddControl(productId) {
  const item = AppState.cart.find(i => i.id === productId);

  if (!item) {
    return `
      <button class="btn-add-cart" onclick="addToCart('${productId}')" id="btn-add-${productId}">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add</span>
      </button>
    `;
  }

  return `
    <div class="card-qty-stepper">
      <button class="card-qty-btn" onclick="updateCartItemQty('${productId}', -1)" aria-label="Decrease quantity">−</button>
      <span class="card-qty-value">${item.qty}</span>
      <button class="card-qty-btn" onclick="updateCartItemQty('${productId}', 1)" aria-label="Increase quantity">+</button>
    </div>
  `;
}

// Re-renders just the qty control for one product card, so add/remove/qty
// changes feel instant without re-rendering (and losing hover state on) the
// entire products grid.
function syncCardQtyUI(productId) {
  const box = document.getElementById(`qtybox-${productId}`);
  if (box) box.innerHTML = renderCardAddControl(productId);
}

function resetFilters() {
  AppState.currentCategory = 'all';
  AppState.searchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.category-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.category === 'all');
  });
  renderProducts();
}

// Cart Operations
function addToCart(productId) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const existing = AppState.cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    AppState.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category,
      qty: 1
    });
  }

  saveCart();
  updateCartUI();
  syncCardQtyUI(productId);
  showToast(`Added "${product.name}" to cart!`);
}

function updateCartItemQty(productId, delta) {
  const item = AppState.cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  updateCartUI();
  syncCardQtyUI(productId);
}

function removeFromCart(productId) {
  AppState.cart = AppState.cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
  syncCardQtyUI(productId);
  showToast('Item removed from cart');
}

function saveCart() {
  localStorage.setItem('store_cart', JSON.stringify(AppState.cart));
}

function updateCartUI() {
  const cartBadge = document.getElementById('cartBadge');
  const cartItemsBody = document.getElementById('cartItemsBody');
  const subtotalEl = document.getElementById('cartSubtotal');
  const discountEl = document.getElementById('cartDiscount');
  const totalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('proceedCheckoutBtn');

  const totalCount = AppState.cart.reduce((sum, i) => sum + i.qty, 0);
  if (cartBadge) cartBadge.textContent = totalCount;

  if (!cartItemsBody) return;

  if (AppState.cart.length === 0) {
    cartItemsBody.innerHTML = `
      <div class="cart-empty-state">
        <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h4 style="font-size: 1.1rem; color: #1e293b; font-weight: 700; margin-bottom: 0.35rem;">Your Cart is Empty</h4>
        <p style="font-size: 0.85rem; color: #64748b;">Explore Stationary, Gym Gear, Laptop Accessories, and Hostel Needs.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (discountEl) discountEl.textContent = '₹0';
    if (totalEl) totalEl.textContent = '₹0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  cartItemsBody.innerHTML = AppState.cart.map(item => `
    <div class="cart-item-row" id="cart-row-${item.id}">
      <img src="${item.image}" alt="${item.name}" class="cart-item-thumb" style="object-fit: contain; background: #ffffff;">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <div class="cart-item-price">₹${item.price} x ${item.qty} = ₹${item.price * item.qty}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateCartItemQty('${item.id}', -1)">-</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="updateCartItemQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <button class="btn-remove-item" title="Remove Item" onclick="removeFromCart('${item.id}')">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `).join('');

  const subtotal = AppState.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const discount = computeDiscountAmount(subtotal);
  const total = Math.max(0, subtotal - discount);

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (discountEl) discountEl.textContent = discount > 0 ? `-₹${discount}${AppState.discountCode ? ' (' + AppState.discountCode + ')' : ''}` : '₹0';
  if (totalEl) totalEl.textContent = `₹${total}`;
}

// Open & Close Drawers / Modals
function openCartDrawer() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('drawerBackdrop')?.classList.add('open');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('drawerBackdrop')?.classList.remove('open');
}

function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById('modalBackdrop');
  if (modal && backdrop) {
    modal.classList.add('open');
    backdrop.classList.add('open');
  }
}

function openPolicyModal() {
  openModal('policyModal');
}

function closeAllModals() {
  document.querySelectorAll('.modal-container').forEach(m => m.classList.remove('open'));
  document.getElementById('modalBackdrop')?.classList.remove('open');
}

// User Auth Management
function updateAuthUI() {
  const userBtn = document.getElementById('userBtn');
  if (!userBtn) return;

  if (AppState.user) {
    userBtn.innerHTML = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span>${AppState.user.name.split(' ')[0]} (${AppState.user.uid || 'Student'})</span>
    `;
  } else {
    userBtn.innerHTML = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
      <span>Login / Sign Up</span>
    `;
  }
}

function openAuthModal() {
  if (AppState.user) {
    renderUserProfileModal();
  } else {
    openModal('authModal');
  }
}

function renderUserProfileModal() {
  const container = document.getElementById('authModalContent');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 1rem 0;">
      <div style="width: 60px; height: 60px; background: #8b0000; color: #fff; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; margin: 0 auto 1rem;">
        ${AppState.user.name.charAt(0).toUpperCase()}
      </div>
      <h3 style="font-size: 1.3rem; font-weight: 700; color: #0f172a;">${AppState.user.name}</h3>
      <p style="color: #64748b; font-size: 0.9rem;">Student ID: <strong>${AppState.user.uid || 'N/A'}</strong></p>
      <p style="color: #64748b; font-size: 0.9rem;">Hostel Room: <strong>${AppState.user.hostel || 'N/A'}, ${AppState.user.floor || 'Floor 1'}, Room ${AppState.user.roomNo || 'N/A'}</strong></p>
      <p style="color: #64748b; font-size: 0.9rem;">Phone: <strong>${AppState.user.phone || 'N/A'}</strong></p>
      <p style="color: #64748b; font-size: 0.9rem;">Email: <strong>${AppState.user.email || 'N/A'}</strong></p>

      <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center;">
        <button onclick="handleLogout()" style="background: #ef4444; color: #fff; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">
          Log Out
        </button>
        <button onclick="closeAllModals()" style="background: #e2e8f0; color: #334155; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">
          Close
        </button>
      </div>
    </div>
  `;
  openModal('authModal');
}

function handleLogin(e) {
  e.preventDefault();
  const uid = document.getElementById('loginUid').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!uid || !password) {
    showToast('Please enter both Student ID and Password', 'error');
    return;
  }

  // Save student session
  AppState.user = {
    name: uid.toUpperCase(),
    uid: uid.toUpperCase(),
    email: `${uid.toLowerCase()}@studentmail.com`,
    phone: "+91 7009918303",
    hostel: "Boys Hostel - Wing A",
    floor: "Floor 3",
    roomNo: "302"
  };

  localStorage.setItem('store_user', JSON.stringify(AppState.user));
  updateAuthUI();
  closeAllModals();
  showToast(`Welcome back, ${AppState.user.uid}!`);
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const uid = document.getElementById('regUid').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const hostel = document.getElementById('regHostel').value;
  const floor = document.getElementById('regFloor').value;
  const roomNo = document.getElementById('regRoom').value.trim();

  if (!name || !uid || !phone) {
    showToast('Please fill all mandatory fields', 'error');
    return;
  }

  AppState.user = { name, uid, email, phone, hostel, floor, roomNo };
  localStorage.setItem('store_user', JSON.stringify(AppState.user));
  updateAuthUI();
  closeAllModals();
  showToast(`Account registered successfully for ${name}!`);
}

function handleLogout() {
  AppState.user = null;
  localStorage.removeItem('store_user');
  updateAuthUI();
  closeAllModals();
  showToast('Logged out successfully');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-tab-content').forEach(c => c.style.display = 'none');

  if (tab === 'login') {
    document.getElementById('tabBtnLogin')?.classList.add('active');
    document.getElementById('loginTabContent').style.display = 'block';
  } else if (tab === 'register') {
    document.getElementById('tabBtnRegister')?.classList.add('active');
    document.getElementById('registerTabContent').style.display = 'block';
  } else if (tab === 'guest') {
    document.getElementById('tabBtnGuest')?.classList.add('active');
    document.getElementById('guestTabContent').style.display = 'block';
  }
}

// Checkout Process
function startCheckout() {
  if (AppState.cart.length === 0) {
    showToast('Your cart is empty! Add products to proceed.', 'warning');
    return;
  }

  closeCartDrawer();
  renderCheckoutStep1();
  openModal('checkoutModal');
}

function renderCheckoutStep1() {
  const container = document.getElementById('checkoutModalContent');
  if (!container) return;

  const subtotal = AppState.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const discount = computeDiscountAmount(subtotal);
  const total = Math.max(0, subtotal - discount);

  const defaultName = AppState.user ? AppState.user.name : '';
  const defaultUid = AppState.user ? AppState.user.uid : '';
  const defaultPhone = AppState.user ? AppState.user.phone : '';
  const defaultEmail = AppState.user ? AppState.user.email : '';
  const defaultRoom = AppState.user ? AppState.user.roomNo : '';

  container.innerHTML = `
    <div class="checkout-steps">
      <div class="step-indicator active">1. Delivery Details</div>
      <div class="step-indicator">2. SBI / UPI Payment</div>
      <div class="step-indicator">3. Confirmation</div>
    </div>

    <div style="background: #fdf2f2; border: 1px solid rgba(139, 0, 0, 0.2); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; color: #680000; display: flex; align-items: center; justify-content: space-between;">
      <span><strong>Order Total:</strong> ${AppState.cart.length} item(s) • <strong style="font-size: 1.1rem; color: #8b0000;">₹${total}</strong> (Free Campus Delivery)</span>
      ${!AppState.user ? `<span style="background: #8b0000; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem;">Guest Checkout</span>` : `<span style="background: #10b981; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem;">Logged In</span>`}
    </div>

    <form id="deliveryDetailsForm" onsubmit="handleDeliveryFormSubmit(event)">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label>Student Full Name *</label>
          <input type="text" id="custName" class="form-input" required placeholder="e.g. Harpreet Singh" value="${defaultName}">
        </div>
        <div class="form-group">
          <label>Student ID / Roll No *</label>
          <input type="text" id="custUid" class="form-input" required placeholder="e.g. 23BCS10145" value="${defaultUid}">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label>Phone Number (WhatsApp) *</label>
          <input type="tel" id="custPhone" class="form-input" required placeholder="e.g. +91 70099 18303" value="${defaultPhone}">
        </div>
        <div class="form-group">
          <label>Student Email ID *</label>
          <input type="email" id="custEmail" class="form-input" required placeholder="e.g. student@gmail.com" value="${defaultEmail}">
        </div>
      </div>

      <!-- 3 Wings & 11 Floors Location Selection -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr 0.8fr; gap: 0.75rem;">
        <div class="form-group">
          <label>Hostel & Wing *</label>
          <select id="custHostel" class="form-select" required>
            <optgroup label="Boys Hostel (Wings A, B, C)">
              <option value="Boys Hostel - Wing A">Boys Hostel - Wing A</option>
              <option value="Boys Hostel - Wing B">Boys Hostel - Wing B</option>
              <option value="Boys Hostel - Wing C">Boys Hostel - Wing C</option>
            </optgroup>
            <optgroup label="Girls Hostel (Wings A, B, C)">
              <option value="Girls Hostel - Wing A">Girls Hostel - Wing A</option>
              <option value="Girls Hostel - Wing B">Girls Hostel - Wing B</option>
              <option value="Girls Hostel - Wing C">Girls Hostel - Wing C</option>
            </optgroup>
            <optgroup label="Other Locations">
              <option value="Main Academic Block Gate (Day Scholar)">Main Academic Block Gate (Day Scholar)</option>
              <option value="Campus Sports Complex">Campus Sports Complex</option>
            </optgroup>
          </select>
        </div>

        <div class="form-group">
          <label>Floor (1-11) *</label>
          <select id="custFloor" class="form-select" required>
            <option value="Floor 1">Floor 1</option>
            <option value="Floor 2">Floor 2</option>
            <option value="Floor 3">Floor 3</option>
            <option value="Floor 4">Floor 4</option>
            <option value="Floor 5">Floor 5</option>
            <option value="Floor 6">Floor 6</option>
            <option value="Floor 7">Floor 7</option>
            <option value="Floor 8">Floor 8</option>
            <option value="Floor 9">Floor 9</option>
            <option value="Floor 10">Floor 10</option>
            <option value="Floor 11">Floor 11</option>
          </select>
        </div>

        <div class="form-group">
          <label>Room No *</label>
          <input type="text" id="custRoom" class="form-input" required placeholder="e.g. 304" value="${defaultRoom}">
        </div>
      </div>

      <div class="form-group">
        <label>Preferred Delivery Slot / Special Notes</label>
        <input type="text" id="custNotes" class="form-input" placeholder="e.g. Please deliver after 5:00 PM lecture or call before arrival">
      </div>

      <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
        <button type="button" onclick="closeAllModals()" style="background: #e2e8f0; color: #334155; padding: 0.7rem 1.4rem; border-radius: 8px; font-weight: 600;">Cancel</button>
        <button type="submit" style="background: #8b0000; color: #fff; padding: 0.7rem 1.6rem; border-radius: 8px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
          <span>Proceed to Payment</span>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </form>
  `;
}

function handleDeliveryFormSubmit(e) {
  e.preventDefault();
  const custName = document.getElementById('custName').value.trim();
  const custUid = document.getElementById('custUid').value.trim();
  const custPhone = document.getElementById('custPhone').value.trim();
  const custEmail = document.getElementById('custEmail').value.trim();
  const custHostel = document.getElementById('custHostel').value;
  const custFloor = document.getElementById('custFloor').value;
  const custRoom = document.getElementById('custRoom').value.trim();
  const custNotes = document.getElementById('custNotes').value.trim();

  AppState.deliveryInfo = { custName, custUid, custPhone, custEmail, custHostel, custFloor, custRoom, custNotes };
  renderCheckoutStep2();
}

// Payment Screen: SBI Bank & UPI Details
function renderCheckoutStep2() {
  const container = document.getElementById('checkoutModalContent');
  if (!container) return;

  const subtotal = AppState.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const discount = computeDiscountAmount(subtotal);
  const total = Math.max(0, subtotal - discount);

  const gpayId = PAYMENT_INFO.upi.gpay;
  const phonepeId = PAYMENT_INFO.upi.phonepe;
  const upiIntentURI = `upi://pay?pa=${gpayId}&pn=Campus%20Store&am=${total}&cu=INR&tn=Order%20Booking`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiIntentURI)}`;

  container.innerHTML = `
    <div class="checkout-steps">
      <div class="step-indicator" onclick="renderCheckoutStep1()" style="cursor: pointer;">✓ 1. Delivery Details</div>
      <div class="step-indicator active">2. SBI / UPI Payment</div>
      <div class="step-indicator">3. Confirmation</div>
    </div>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #1e40af; display: flex; justify-content: space-between; align-items: center;">
      <span>Payable Amount: <strong style="font-size: 1.15rem; color: #1e3a8a;">₹${total}</strong></span>
      <span style="font-size: 0.8rem; color: #2563eb;">Delivering to: ${AppState.deliveryInfo.custHostel}, ${AppState.deliveryInfo.custFloor}, Rm ${AppState.deliveryInfo.custRoom}</span>
    </div>

    <!-- Payment Tabs -->
    <div class="payment-method-selector">
      <div class="payment-option-card ${AppState.selectedPaymentMethod === 'upi' ? 'selected' : ''}" onclick="selectPaymentTab('upi')">
        <h4>⚡ UPI / Google Pay / PhonePe</h4>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">Scan QR or Pay via UPI ID</p>
      </div>
      <div class="payment-option-card ${AppState.selectedPaymentMethod === 'bank' ? 'selected' : ''}" onclick="selectPaymentTab('bank')">
        <h4>🏛️ SBI Direct Bank Transfer</h4>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">IMPS / NEFT / Net Banking</p>
      </div>
    </div>

    <!-- UPI Payment View -->
    <div id="upiPaymentView" style="display: ${AppState.selectedPaymentMethod === 'upi' ? 'block' : 'none'};">
      <div class="payment-details-box">
        <div class="qr-container">
          <p style="font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Scan & Pay via Any UPI App (GPay, PhonePe, Paytm)</p>
          <img src="${qrCodeUrl}" alt="UPI QR Code for ₹${total}" class="qr-code-img">
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; max-width: 360px; margin-top: 0.5rem;">
            <div class="bank-detail-row">
              <span class="bank-detail-label">Google Pay ID:</span>
              <span class="bank-detail-val">
                ${gpayId}
                <span class="copy-badge" onclick="copyToClipboard('${gpayId}', 'Google Pay ID copied!')">Copy</span>
              </span>
            </div>
            <div class="bank-detail-row">
              <span class="bank-detail-label">PhonePe ID:</span>
              <span class="bank-detail-val">
                ${phonepeId}
                <span class="copy-badge" onclick="copyToClipboard('${phonepeId}', 'PhonePe ID copied!')">Copy</span>
              </span>
            </div>
          </div>

          <a href="${upiIntentURI}" style="margin-top: 0.75rem; background: #0f172a; color: #fff; padding: 0.45rem 1rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>Tap to Pay on Mobile UPI App</span>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- SBI Bank Transfer View -->
    <div id="bankPaymentView" style="display: ${AppState.selectedPaymentMethod === 'bank' ? 'block' : 'none'};">
      <div class="payment-details-box">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>Official SBI Bank Account Details</span>
        </h4>
        <div class="bank-detail-row">
          <span class="bank-detail-label">Bank Name:</span>
          <span class="bank-detail-val">${PAYMENT_INFO.bank.bankName}</span>
        </div>
        <div class="bank-detail-row">
          <span class="bank-detail-label">Account Number:</span>
          <span class="bank-detail-val">
            <strong style="color: #8b0000; font-size: 1rem;">${PAYMENT_INFO.bank.accountNumber}</strong>
            <span class="copy-badge" onclick="copyToClipboard('${PAYMENT_INFO.bank.accountNumber}', 'Account Number copied!')">Copy</span>
          </span>
        </div>
        <div class="bank-detail-row">
          <span class="bank-detail-label">Account Type:</span>
          <span class="bank-detail-val">${PAYMENT_INFO.bank.accountType}</span>
        </div>
        <div class="bank-detail-row">
          <span class="bank-detail-label">IFSC Code:</span>
          <span class="bank-detail-val">
            <strong>${PAYMENT_INFO.bank.ifscCode}</strong>
            <span class="copy-badge" onclick="copyToClipboard('${PAYMENT_INFO.bank.ifscCode}', 'IFSC Code copied!')">Copy</span>
          </span>
        </div>
        <div class="bank-detail-row">
          <span class="bank-detail-label">Beneficiary Name:</span>
          <span class="bank-detail-val">${PAYMENT_INFO.bank.accountHolder}</span>
        </div>
      </div>
    </div>

    <!-- Payment Proof Verification Form -->
    <form id="paymentVerificationForm" onsubmit="handleFinalPaymentSubmit(event)">
      <div class="form-group">
        <label>Enter 12-Digit UPI Ref / UTR / Transaction ID *</label>
        <input type="text" id="transactionRef" class="form-input" required placeholder="e.g. 423891024892 or IMPS Reference" maxlength="20">
        <span style="font-size: 0.75rem; color: #64748b;">Found in your Google Pay, PhonePe, or SBI Netbanking receipt.</span>
      </div>

      <div class="form-group">
        <label>Optional: Upload Payment Screenshot</label>
        <input type="file" id="paymentScreenshot" class="form-input" accept="image/*" style="padding: 0.4rem;">
      </div>

      <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: space-between; align-items: center;">
        <button type="button" onclick="renderCheckoutStep1()" style="background: #e2e8f0; color: #334155; padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 600;">
          ← Back
        </button>
        <button type="submit" id="btnConfirmPay" style="background: #10b981; color: #fff; padding: 0.75rem 1.8rem; border-radius: 8px; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 0.5rem;">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Confirm Payment & Place Order</span>
        </button>
      </div>
    </form>
  `;
}

function selectPaymentTab(method) {
  AppState.selectedPaymentMethod = method;
  renderCheckoutStep2();
}

// Final Order Completion & Automated Multi-Channel Notifications
function handleFinalPaymentSubmit(e) {
  e.preventDefault();
  const txRef = document.getElementById('transactionRef').value.trim();
  if (!txRef) {
    showToast('Please enter your Transaction / UTR reference number', 'error');
    return;
  }

  const btnConfirm = document.getElementById('btnConfirmPay');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `<span>Processing Order & Sending Alerts...</span>`;
  }

  const subtotal = AppState.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const discount = computeDiscountAmount(subtotal);
  const total = Math.max(0, subtotal - discount);

  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const orderTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const orderData = {
    orderId,
    orderTime,
    items: [...AppState.cart],
    subtotal,
    discount,
    total,
    paymentMethod: AppState.selectedPaymentMethod === 'upi' ? 'UPI (Google Pay / PhonePe)' : 'SBI Direct Bank Transfer',
    transactionRef: txRef,
    student: { ...AppState.deliveryInfo },
    status: 'Processing'
  };

  AppState.lastOrder = orderData;

  // Save to order history
  const orderHistory = JSON.parse(localStorage.getItem('store_orders') || '[]');
  orderHistory.unshift(orderData);
  localStorage.setItem('store_orders', JSON.stringify(orderHistory));

  // Trigger Automatic Background Email to Managers & Student
  sendAutomatedEmail(orderData);

  // Clear Cart
  AppState.cart = [];
  saveCart();
  updateCartUI();

  // Render Step 3: Success & Dispatch Triggers
  renderOrderSuccessScreen(orderData);
}

// Automated Background Real-Time Email Dispatch
function sendAutomatedEmail(order) {
  const itemsSummary = order.items.map((it, idx) => (idx + 1) + '. ' + it.name + ' (Qty: ' + it.qty + ') - Rs.' + (it.price * it.qty)).join('\n');
  
  const autoresponseMessage = 
    'Hi ' + order.student.custName + ',\n\n' +
    'Your order on Campus Store has been placed successfully!\n\n' +
    'ORDER DETAILS:\n' +
    '---------------------------------------------\n' +
    'Order ID: #' + order.orderId + '\n' +
    'Total Paid: Rs.' + order.total + ' (Free Campus Delivery)\n' +
    'Delivery Location: ' + order.student.custHostel + ', ' + (order.student.custFloor || 'Floor 1') + ', Room ' + order.student.custRoom + '\n' +
    'Estimated Delivery: Within 2 Business Days\n\n' +
    'ITEMS ORDERED:\n' +
    '---------------------------------------------\n' +
    itemsSummary + '\n\n' +
    'Payment Mode: ' + order.paymentMethod + '\n' +
    'Transaction Ref / UTR: ' + order.transactionRef + '\n\n' +
    'If you have any questions or need assistance, simply reply to this email or reach us at singhharpreet5975@gmail.com / WhatsApp (+91 70099 18303).\n\n' +
    'Thank you for choosing Campus Store!';

  const storePayload = {
    name: "Order Placed",
    _subject: 'Order Placed: New Booking #' + order.orderId + ' - Rs.' + order.total + ' by ' + order.student.custName,
    _replyto: order.student.custEmail,
    email: order.student.custEmail,
    _autoresponse: autoresponseMessage,
    _template: "table",
    _captcha: "false",
    "Order ID": order.orderId,
    "Order Date Time": order.orderTime,
    "Student Name": order.student.custName,
    "Student ID": order.student.custUid,
    "Phone (WhatsApp)": order.student.custPhone,
    "Student Email": order.student.custEmail,
    "Hostel & Wing": order.student.custHostel,
    "Floor": order.student.custFloor || "Floor 1",
    "Room No": order.student.custRoom,
    "Special Notes": order.student.custNotes || 'N/A',
    "Items Ordered": itemsSummary,
    "Grand Total": 'Rs. ' + order.total + ' (Free Delivery)',
    "Payment Mode": order.paymentMethod,
    "UTR / Ref No": order.transactionRef
  };

  fetch('https://formsubmit.co/ajax/singhharpreet5975@gmail.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(storePayload)
  }).then(res => res.json()).then(data => {
    console.log("Order email & autoresponse sent:", data);
  }).catch(err => {
    console.warn("Email dispatch error:", err);
  });
}

function renderOrderSuccessScreen(order) {
  const container = document.getElementById('checkoutModalContent');
  if (!container) return;

  // Format Items String for WhatsApp and Email
  const itemsText = order.items.map((it, idx) => `${idx + 1}. ${it.name} (Qty: ${it.qty}) - ₹${it.price * it.qty}`).join('\n');
  const itemsHtml = order.items.map(it => `
    <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.85rem;">
      <span>${it.name} <strong>x${it.qty}</strong></span>
      <strong>₹${it.price * it.qty}</strong>
    </div>
  `).join('');

  // Prepare Email Notification Link
  const emailRecipients = "singhharpreet5975@gmail.com";
  const emailSubject = `Order Placed: Campus Store Booking #${order.orderId} - ₹${order.total}`;
  const emailBody = `Hi ${order.student.custName},\n\nYour order on Campus Store has been placed successfully!\n\nORDER DETAILS:\n---------------------------------------------\nOrder ID: #${order.orderId}\nPlaced At: ${order.orderTime}\nStudent Name: ${order.student.custName} (${order.student.custUid})\nContact: ${order.student.custPhone}\nDelivery Location: ${order.student.custHostel}, ${order.student.custFloor || 'Floor 1'}, Room ${order.student.custRoom}\nEstimated Delivery: Within 2 Business Days\n\nITEMS ORDERED:\n---------------------------------------------\n${itemsText}\n\nPAYMENT DETAILS:\n---------------------------------------------\nGrand Total: ₹${order.total} (Free Campus Delivery)\nPayment Method: ${order.paymentMethod}\nTransaction Ref / UTR: ${order.transactionRef}\n\nThank you for choosing Campus Store!`;

  const targetEmail = order.student.custEmail || emailRecipients;
  const mailtoUrl = `mailto:${targetEmail}?cc=${emailRecipients}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  // Prepare WhatsApp message
  const waMessage = 
`🎓 *NEW CAMPUS ORDER BOOKING*
━━━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* ${order.orderId}
📅 *Date/Time:* ${order.orderTime}
👤 *Student:* ${order.student.custName}
🆔 *Student ID:* ${order.student.custUid}
📞 *Phone:* ${order.student.custPhone}
✉️ *Email:* ${order.student.custEmail}
🏢 *Hostel & Wing:* ${order.student.custHostel}
📶 *Floor:* ${order.student.custFloor || 'Floor 1'}
🚪 *Room No:* ${order.student.custRoom}
📝 *Notes:* ${order.student.custNotes || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━
🛒 *ORDERED ITEMS:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total Paid:* ₹${order.total} (Free Delivery)
💳 *Payment Mode:* ${order.paymentMethod}
🔢 *UTR / Ref No:* ${order.transactionRef}
━━━━━━━━━━━━━━━━━━━━━━
📍 *Action:* Please verify payment and dispatch order to room within 2 business days.`;

  const waUrl = `https://wa.me/917009918303?text=${encodeURIComponent(waMessage)}`;

  // Auto-launch WhatsApp in a new tab so the student is seamlessly taken to send the notification
  try {
    window.open(waUrl, '_blank');
  } catch (e) {
    console.log("Auto-popup blocked, user can click button");
  }

  container.innerHTML = `
    <div class="order-success-screen">
      <div class="success-icon-wrap">✓</div>
      <h3 class="success-title">Order Placed Successfully!</h3>
      <p style="color: #64748b; font-size: 0.9rem;">Order ID: <strong style="color: #8b0000; font-size: 1.05rem;">#${order.orderId}</strong></p>
      <p style="color: #10b981; font-size: 0.85rem; font-weight: 600; margin-top: 0.25rem;">⚡ Estimated Hostel Delivery: Within 2 Business Days</p>

      <!-- Prominent WhatsApp Action Card -->
      <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 1.2rem; text-align: center; margin: 1.25rem 0;">
        <h4 style="font-size: 1.05rem; font-weight: 800; color: #166534; margin-bottom: 0.75rem;">
          📱 Send Order Confirmation to WhatsApp
        </h4>
        <a href="${waUrl}" target="_blank" style="background: #25d366; color: #ffffff; padding: 0.75rem 1.6rem; border-radius: 8px; font-weight: 800; font-size: 1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);">
          <span>💬 Send Order Confirmation on WhatsApp</span>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      <div class="order-receipt-card">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem;">
          Receipt & Delivery Details
        </h4>
        <div style="margin-bottom: 0.75rem;">
          ${itemsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; color: #8b0000; margin-top: 0.5rem;">
          <span>Total Paid (Free Delivery):</span>
          <span>₹${order.total}</span>
        </div>
        <div style="margin-top: 0.75rem; font-size: 0.8rem; color: #64748b;">
          <strong>Delivering to:</strong> ${order.student.custName} (${order.student.custUid}), ${order.student.custHostel}, ${order.student.custFloor || 'Floor 1'}, Room ${order.student.custRoom}<br>
          <strong>Phone:</strong> ${order.student.custPhone} • <strong>UTR:</strong> ${order.transactionRef}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0.75rem 0;">
        <a href="${mailtoUrl}" target="_blank" style="background: #0284c7; color: #ffffff; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Send Receipt to My Email</span>
        </a>
        <button onclick="window.print()" style="background: #0f172a; color: #fff; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print / PDF Receipt</span>
        </button>
      </div>

      <div style="margin-top: 1rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <button onclick="openPolicyModal()" style="background: #e2e8f0; color: #334155; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
          Return & Refund Policy
        </button>
        <button onclick="closeAllModals()" style="background: #8b0000; color: #fff; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
          Done & Continue Shopping
        </button>
      </div>
    </div>
  `;
}

// Contact Form Handler with Automatic Email Submission
function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const uid = document.getElementById('contactUid').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const subject = document.getElementById('contactSubject').value;
  const description = document.getElementById('contactDescription').value.trim();

  if (!name || !subject || !description) {
    showToast('Please fill in Name, Subject, and Issue Description', 'error');
    return;
  }

  const targetEmail = "singhharpreet5975@gmail.com";
  const mailSubject = `Customer Inquiry / Return: ${subject} - ${name} (${uid || 'Student'})`;

  // Submit directly to FormSubmit endpoint
  fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      name: "Customer Inquiry",
      _subject: mailSubject,
      _replyto: email,
      _template: "table",
      _captcha: "false",
      "Student Name": name,
      "Student ID": uid || 'N/A',
      "Email": email,
      "Phone": phone || 'N/A',
      "Query Category": subject,
      "Issue Description": description,
      "Submission Date Time": new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    })
  }).then(res => res.json()).then(data => {
    document.getElementById('contactSuccessMsg').style.display = 'block';
    document.getElementById('contactForm').reset();
    showToast('Message sent directly to singhharpreet5975@gmail.com!', 'info');
  }).catch(err => {
    // Fallback: mailto link
    const mailBody = `Hello Store Team,\n\nStudent: ${name} (${uid})\nPhone: ${phone}\n\nCategory: ${subject}\n\n${description}`;
    window.open(`mailto:${targetEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`, '_blank');
    document.getElementById('contactSuccessMsg').style.display = 'block';
  });

  setTimeout(() => {
    document.getElementById('contactSuccessMsg').style.display = 'none';
  }, 6000);
}

// Utility Helpers
function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Copied to clipboard!');
  }).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(successMsg || 'Copied to clipboard!');
  });
}

function showToast(message, type = 'normal') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  if (type === 'error') toast.style.background = '#ef4444';
  if (type === 'warning') toast.style.background = '#f59e0b';
  if (type === 'info') toast.style.background = '#3b82f6';

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('category');
  if (cat && ['stationary', 'gym', 'laptop', 'hostel'].includes(cat)) {
    AppState.currentCategory = cat;
    document.querySelectorAll('.category-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.category === cat);
    });
    renderProducts();
  }
}
