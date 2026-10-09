/* ===================================
   TITAN WATCH - MAIN JAVASCRIPT
   =================================== */

// ===== CART & WISHLIST STATE =====
let cart = JSON.parse(localStorage.getItem('titan_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('titan_wishlist')) || [];

// Restore complete product data for older cart items
if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
  cart = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);

    if (product) {
      return {
        ...product,
        qty: Number(item.qty) || 1
      };
    }

    return item;
  });

  localStorage.setItem('titan_cart', JSON.stringify(cart));
}

function saveCart() {
  localStorage.setItem('titan_cart', JSON.stringify(cart));
  updateCartBadges();
}
function saveWishlist() {
  localStorage.setItem('titan_wishlist', JSON.stringify(wishlist));
  updateWishlistBadges();
}

function updateCartBadges() {
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}
function updateWishlistBadges() {
  document.querySelectorAll('.wish-badge').forEach(b => {
    b.textContent = wishlist.length;
    b.style.display = wishlist.length > 0 ? 'flex' : 'none';
  });
}

function addToCart(productId, qty = 1) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...product, qty });
  }
  saveCart();
  showToast(`<i class="fas fa-check-circle"></i> <span><strong>${product.name}</strong> added to cart!</span>`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  if (typeof renderCartPage === 'function') renderCartPage();
}

function toggleWishlist(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const idx = wishlist.findIndex(i => i.id === productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast(`<i class="fas fa-heart-broken"></i> <span>Removed from wishlist</span>`, '');
  } else {
    wishlist.push(product);
    showToast(`<i class="fas fa-heart"></i> <span><strong>${product.name}</strong> added to wishlist!</span>`, 'success');
  }
  saveWishlist();
  document.querySelectorAll(`[data-wish="${productId}"]`).forEach(btn => {
    btn.classList.toggle('wishlisted', wishlist.some(i => i.id === productId));
    btn.querySelector('i').className = wishlist.some(i => i.id === productId) ? 'fas fa-heart' : 'far fa-heart';
  });
}

function isWishlisted(productId) {
  return wishlist.some(i => i.id === productId);
}

// ===== TOAST =====
function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== STAR RATING HTML =====
function starsHtml(rating) {
  let html = '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
  if (half) html += '<i class="fas fa-star-half-alt"></i>';
  for (let i = full + (half ? 1 : 0); i < 5; i++) html += '<i class="far fa-star"></i>';
  return html;
}

// ===== FORMAT PRICE =====
function formatPrice(price) {
  return '₹' + price.toLocaleString('en-IN');
}

// ===== PRODUCT CARD HTML =====
function createProductCard(product) {
  const wished = isWishlisted(product.id);
  return `
    <div class="product-card fade-up" onclick="goToProduct(${product.id})">
      <div class="product-card-img">
        <img class="img-primary" src="${product.image}" alt="${product.name}" loading="lazy">
        <img class="img-hover" src="${product.image2}" alt="${product.name}" loading="lazy">
        <div class="product-badges">
          ${product.isNew ? '<span class="badge-new">New</span>' : ''}
          ${product.isBestseller ? '<span class="badge-best">Bestseller</span>' : ''}
          ${product.discount >= 20 ? `<span class="badge-discount">${product.discount}% Off</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="action-btn ${wished ? 'wishlisted' : ''}" data-wish="${product.id}"
            onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Wishlist">
            <i class="${wished ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="action-btn" onclick="event.stopPropagation(); goToProduct(${product.id})" title="Quick View">
            <i class="far fa-eye"></i>
          </button>
        </div>
        <button class="quick-add" onclick="event.stopPropagation(); addToCart(${product.id})">
          <i class="fas fa-shopping-bag"></i> Add to Cart
        </button>
      </div>
      <div class="product-card-info">
        <div class="product-brand">${product.brand} · ${product.collection}</div>
        <h4 class="product-name">${product.name}</h4>
        <div class="product-rating">
          <div class="stars">${starsHtml(product.rating)}</div>
          <span class="rating-count">(${product.reviews.toLocaleString()})</span>
        </div>
        <div class="product-price">
          <span class="price-current">${formatPrice(product.price)}</span>
          <span class="price-original">${formatPrice(product.mrp)}</span>
          <span class="price-off">${product.discount}% off</span>
        </div>
      </div>
    </div>
  `;
}

// ===== NAVIGATION =====
function goToProduct(id) {
  window.location.href = `product.html?id=${id}`;
}
function goToCollections(filter) {
  const url = filter ? `collections.html?${filter}` : 'collections.html';
  window.location.href = url;
}

// ===== HERO CAROUSEL =====
function initHeroCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;

  let current = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  function autoPlay() { timer = setInterval(() => goTo(current + 1), 5500); }
  function resetTimer() { clearInterval(timer); autoPlay(); }

  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); resetTimer(); }));
  document.querySelector('.hero-arrow.prev')?.addEventListener('click', () => { goTo(current - 1); resetTimer(); });
  document.querySelector('.hero-arrow.next')?.addEventListener('click', () => { goTo(current + 1); resetTimer(); });

  goTo(0);
  autoPlay();
}

// ===== TESTIMONIALS CAROUSEL =====
function initTestimonialsCarousel() {
  const track = document.querySelector('.testimonials-track');
  const dots = document.querySelectorAll('.testimonial-dot');
  if (!track) return;

  let current = 0;
  const count = dots.length;

  function goTo(idx) {
    current = (idx + count) % count;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  goTo(0);
  setInterval(() => goTo(current + 1), 5000);
}

// ===== STICKY HEADER =====
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ===== SCROLL TO TOP =====
function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 400));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

// ===== MOBILE NAV =====
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-overlay');
  const closeBtn = document.querySelector('.mobile-nav-close');

  function open() {
    hamburger?.classList.add('active');
    mobileNav?.classList.add('open');
    overlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    hamburger?.classList.remove('active');
    mobileNav?.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
}

// ===== SEARCH =====
function initSearch() {
  const searchBtns = document.querySelectorAll('.search-toggle');
  const searchBar = document.querySelector('.search-bar-overlay');
  const closeBtn = document.querySelector('.search-close');
  const searchInput = document.querySelector('.search-bar-overlay input');

  searchBtns.forEach(btn => btn.addEventListener('click', () => {
    searchBar?.classList.add('open');
    setTimeout(() => searchInput?.focus(), 300);
  }));
  closeBtn?.addEventListener('click', () => searchBar?.classList.remove('open'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') searchBar?.classList.remove('open');
  });
}

// ===== FILTER GROUP TOGGLE =====
function initFilterGroups() {
  document.querySelectorAll('.filter-group-title').forEach(title => {
    title.addEventListener('click', () => {
      title.closest('.filter-group').classList.toggle('collapsed');
    });
  });
}

// ===== HOME PAGE: RENDER PRODUCTS =====
function renderHomeProducts(containerId, filterFn, limit = 8) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const filtered = PRODUCTS.filter(filterFn).slice(0, limit);
  container.innerHTML = filtered.map(p => createProductCard(p)).join('');
  initScrollAnimations();
}

// ===== ARRIVALS TABS =====
function initArrivalsTabs() {
  const tabs = document.querySelectorAll('.arrivals-tab');
  const container = document.getElementById('arrivalsGrid');
  if (!tabs.length || !container) return;

  function renderTab(filter) {
    let filtered;
    if (filter === 'all') filtered = [...PRODUCTS].sort(() => Math.random() - 0.5).slice(0, 8);
    else if (filter === 'new') filtered = PRODUCTS.filter(p => p.isNew).slice(0, 8);
    else if (filter === 'bestseller') filtered = PRODUCTS.filter(p => p.isBestseller).slice(0, 8);
    else if (filter === 'men') filtered = PRODUCTS.filter(p => p.gender === 'Men').slice(0, 8);
    else if (filter === 'women') filtered = PRODUCTS.filter(p => p.gender === 'Women').slice(0, 8);
    else filtered = PRODUCTS.slice(0, 8);
    container.innerHTML = filtered.map(p => createProductCard(p)).join('');
    initScrollAnimations();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px)';
      setTimeout(() => {
        renderTab(tab.dataset.filter);
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        container.style.transition = 'all 0.4s ease';
      }, 200);
    });
  });

  renderTab('all');
}

// ===== BRAND CHIPS =====
function initBrandChips() {
  const chips = document.querySelectorAll('.brand-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

// ===== PRICE CHIPS (Home) =====
function initPriceChips() {
  const chips = document.querySelectorAll('.price-chip');
  const container = document.getElementById('priceFilterGrid');
  if (!container) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const range = chip.dataset.range;
      let filtered;
      if (range === 'all') filtered = PRODUCTS;
      else if (range === 'under-2000') filtered = PRODUCTS.filter(p => p.price < 2000);
      else if (range === '2000-5000') filtered = PRODUCTS.filter(p => p.price >= 2000 && p.price <= 5000);
      else if (range === '5000-10000') filtered = PRODUCTS.filter(p => p.price > 5000 && p.price <= 10000);
      else if (range === 'above-10000') filtered = PRODUCTS.filter(p => p.price > 10000);
      else filtered = PRODUCTS;
      container.innerHTML = filtered.slice(0, 8).map(p => createProductCard(p)).join('');
      initScrollAnimations();
    });
  });
}

// ===== COLLECTIONS PAGE FILTERS =====
let activeFilters = { gender: [], collection: [], strap: [], movement: [], brand: [] };
let sortBy = 'popularity';
let searchQuery = '';

function applyCollectionFilters() {
  let filtered = [...PRODUCTS];

  if (activeFilters.gender.length) filtered = filtered.filter(p => activeFilters.gender.includes(p.gender));
  if (activeFilters.collection.length) filtered = filtered.filter(p => activeFilters.collection.includes(p.collection));
  if (activeFilters.strap.length) filtered = filtered.filter(p => activeFilters.strap.includes(p.strap));
  if (activeFilters.movement.length) filtered = filtered.filter(p => activeFilters.movement.includes(p.movement));
  if (activeFilters.brand.length) filtered = filtered.filter(p => activeFilters.brand.includes(p.brand));

  const urlParams = new URLSearchParams(window.location.search);
  const urlGender = urlParams.get('gender');
  const urlCollection = urlParams.get('collection');
  const urlBrand = urlParams.get('brand');

  if (urlGender && !activeFilters.gender.length) filtered = filtered.filter(p => p.gender.toLowerCase() === urlGender.toLowerCase());
  if (urlCollection && !activeFilters.collection.length) filtered = filtered.filter(p => p.collection.toLowerCase() === urlCollection.toLowerCase());
  if (urlBrand && !activeFilters.brand.length) filtered = filtered.filter(p => p.brand.toLowerCase() === urlBrand.toLowerCase());

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.collection.toLowerCase().includes(q)
    );
  }

  if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === 'newest') filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else filtered.sort((a, b) => b.reviews - a.reviews);

  const container = document.getElementById('collectionsGrid');
  const countEl = document.getElementById('productCount');
  if (container) container.innerHTML = filtered.length
    ? filtered.map(p => createProductCard(p)).join('')
    : '<div class="empty-state" style="grid-column:1/-1"><i class="far fa-search"></i><h3>No products found</h3><p>Try adjusting your filters.</p></div>';
  if (countEl) countEl.textContent = filtered.length;
  initScrollAnimations();
}

function initCollectionsPage() {
  const container = document.getElementById('collectionsGrid');
  if (!container) return;

  // Sort
  const sortSelect = document.getElementById('sortSelect');
  sortSelect?.addEventListener('change', e => { sortBy = e.target.value; applyCollectionFilters(); });

  // Checkboxes
  document.querySelectorAll('.filter-checkbox input').forEach(cb => {
    cb.addEventListener('change', () => {
      const group = cb.dataset.group;
      const val = cb.dataset.val;
      if (cb.checked) {
        if (!activeFilters[group]) activeFilters[group] = [];
        activeFilters[group].push(val);
      } else {
        activeFilters[group] = activeFilters[group].filter(v => v !== val);
      }
      applyCollectionFilters();
    });
  });

  // Clear filters
  document.querySelector('.filter-clear')?.addEventListener('click', () => {
    activeFilters = { gender: [], collection: [], strap: [], movement: [], brand: [] };
    document.querySelectorAll('.filter-checkbox input').forEach(cb => cb.checked = false);
    applyCollectionFilters();
  });

  initFilterGroups();
  applyCollectionFilters();
}

// ===== CART PAGE =====
function renderCartPage() {
  const container = document.getElementById('cartItems');
  const summaryEl = document.getElementById('orderSummary');
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-shopping-bag"></i>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added any watches yet.</p>
        <a href="collections.html" class="btn-gold">Shop Now</a>
      </div>`;
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img
  class="cart-item-img"
  src="${item.image || ''}"
  alt="${item.name}"
  onerror="this.style.display='none'"
>
      <div class="cart-item-info">
        <div class="cart-item-brand">${item.brand} · ${item.collection}</div>
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-meta">
          <span>${item.movement}</span>
          <span>${item.strap}</span>
          <span>${item.colors[0]}</span>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQty(${item.id}, -1)"><i class="fas fa-minus"></i></button>
          <input class="qty-value" type="text" value="${item.qty}" readonly>
          <button class="qty-btn" onclick="updateQty(${item.id}, 1)"><i class="fas fa-plus"></i></button>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
          <i class="far fa-trash-alt"></i> Remove
        </button>
      </div>
    </div>
  `).join('');

  updateOrderSummary();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCartPage();
}

function updateOrderSummary() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const savings = cart.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);
  const delivery = subtotal >= 2000 ? 0 : 199;
  const total = subtotal + delivery;

  document.getElementById('summSubtotal').textContent = formatPrice(subtotal);
  document.getElementById('summSavings').textContent = `- ${formatPrice(savings)}`;
  document.getElementById('summDelivery').textContent = delivery === 0 ? 'FREE' : formatPrice(delivery);
  document.getElementById('summTotal').textContent = formatPrice(total);
  document.getElementById('summCount').textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
}

// Coupon
function initCoupon() {
  const btn = document.getElementById('applyCoupon');
  const input = document.getElementById('couponInput');
  if (!btn || !input) return;

  const coupons = { 'TITAN10': 10, 'RAGA15': 15, 'EDGE20': 20, 'WELCOME5': 5 };
  btn.addEventListener('click', () => {
    const code = input.value.trim().toUpperCase();
    if (coupons[code]) {
      showToast(`<i class="fas fa-tag"></i> <span>Coupon <strong>${code}</strong> applied! ${coupons[code]}% off</span>`, 'success');
      input.style.borderColor = 'var(--green)';
    } else {
      showToast(`<i class="fas fa-times-circle"></i> <span>Invalid coupon code</span>`, 'error');
      input.style.borderColor = 'var(--red)';
    }
  });
}

// ===== WISHLIST PAGE =====
function renderWishlistPage() {
  const container = document.getElementById('wishlistGrid');
  if (!container) return;

  if (!wishlist.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fas fa-heart"></i>
        <h3>Your wishlist is empty</h3>
        <p>Save your favourite watches here to buy later.</p>
        <a href="collections.html" class="btn-gold">Discover Watches</a>
      </div>`;
    return;
  }
  container.innerHTML = wishlist.map(p => createProductCard(p)).join('');
  initScrollAnimations();
}

// ===== PRODUCT DETAIL PAGE =====
function initProductPage() {
  const container = document.getElementById('productDetail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) { container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>Product not found</h3><p>The product you are looking for does not exist.</p><a href="collections.html" class="btn-gold">Shop All</a></div>'; return; }

  document.title = `${product.name} | Titan Watch`;

  container.innerHTML = `
  <div class="product-detail-grid">

    <div class="product-gallery">

      <div class="gallery-main slider-container">

        <button class="gallery-arrow gallery-prev" onclick="changeProductImage(-1)">
          <i class="fas fa-chevron-left"></i>
        </button>

        <img
          id="mainImg"
          src="${product.image}"
          alt="${product.name}"
        >

        <button class="gallery-arrow gallery-next" onclick="changeProductImage(1)">
          <i class="fas fa-chevron-right"></i>
        </button>

      </div>

      <div class="gallery-thumbs">

        <img
          src="${product.image}"
          onclick="selectProductImage(0)"
          class="thumb active"
          data-index="0"
          alt="${product.name}"
        >

        <img
          src="${product.image2}"
          onclick="selectProductImage(1)"
          class="thumb"
          data-index="1"
          alt="${product.name}"
        >

      </div>

    </div>

    <div class="product-info-panel">
        <div class="product-badges-detail">
          ${product.isNew ? '<span class="badge-new">New Arrival</span>' : ''}
          ${product.isBestseller ? '<span class="badge-best">Bestseller</span>' : ''}
        </div>
        <div class="product-brand-detail">${product.brand} · ${product.collection} Collection</div>
        <h1 class="product-title-detail">${product.name}</h1>
        <div class="product-rating" style="margin-bottom:20px">
          <div class="stars">${starsHtml(product.rating)}</div>
          <span class="rating-count">${product.rating} (${product.reviews.toLocaleString()} reviews)</span>
        </div>
        <div class="product-price-detail">
          <span class="price-big">${formatPrice(product.price)}</span>
          <span class="price-orig-detail">${formatPrice(product.mrp)}</span>
          <span class="price-off-badge">${product.discount}% OFF</span>
        </div>
        <p class="savings-info"><i class="fas fa-tag"></i> You save ${formatPrice(product.mrp - product.price)} on this order</p>
        <div class="product-description">${product.description}</div>
        <div class="product-options">
          <div class="option-group">
            <label>Color: <strong>${product.colors[0]}</strong></label>
            <div class="color-swatches">
              ${product.colorHex.map((hex, i) => `
                <span class="color-swatch ${i === 0 ? 'active' : ''}" style="background:${hex}" title="${product.colors[i]}" onclick="selectColor(this, '${product.colors[i]}')"></span>
              `).join('')}
            </div>
          </div>
          <div class="option-group">
            <label>Quantity</label>
            <div class="qty-control">
              <button class="qty-btn" onclick="changeDetailQty(-1)"><i class="fas fa-minus"></i></button>
              <input class="qty-value" id="detailQty" type="text" value="1" readonly>
              <button class="qty-btn" onclick="changeDetailQty(1)"><i class="fas fa-plus"></i></button>
            </div>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn-gold" style="flex:1" onclick="addToCart(${product.id}, parseInt(document.getElementById('detailQty').value))">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>

<button class="btn-gold" onclick="buyNow()">
  <i class="fas fa-shopping-bag"></i>
  Buy Now
</button>
          <button class="action-btn ${isWishlisted(product.id) ? 'wishlisted' : ''} detail-wish" data-wish="${product.id}"
            onclick="toggleWishlist(${product.id})" style="width:52px;height:52px;font-size:1.1rem;border:2px solid var(--light-gray)">
            <i class="${isWishlisted(product.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div class="detail-badges">
          <div class="detail-badge"><i class="fas fa-truck"></i><span>Free delivery above ₹2,000</span></div>
          <div class="detail-badge"><i class="fas fa-undo"></i><span>30-day easy returns</span></div>
          <div class="detail-badge"><i class="fas fa-shield-alt"></i><span>2-year brand warranty</span></div>
          <div class="detail-badge"><i class="fas fa-certificate"></i><span>100% genuine product</span></div>
        </div>
        <div class="product-specs">
          <h4>Specifications</h4>
          <table class="specs-table">
            <tr><td>Brand</td><td>${product.brand}</td></tr>
            <tr><td>Collection</td><td>${product.collection}</td></tr>
            <tr><td>Movement</td><td>${product.movement}</td></tr>
            <tr><td>Strap</td><td>${product.strap}</td></tr>
            <tr><td>Gender</td><td>${product.gender}</td></tr>
            <tr><td>Available Colors</td><td>${product.colors.join(', ')}</td></tr>
          </table>
        </div>
        <div class="product-features-list">
          <h4>Key Features</h4>
          <ul>${product.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}</ul>
        </div>
        <div class="emi-info">
          <i class="fas fa-credit-card"></i>
          <span>No-cost EMI from <strong>${formatPrice(Math.round(product.price / 6))}/month</strong> on 6-month plans</span>
        </div>
      </div>
    </div>
    <div class="related-products section-padding">
      <div class="section-header">
        <span class="pre-title">You May Also Like</span>
        <h2>Related Products</h2>
        <div class="gold-divider"></div>
      </div>
      <div class="products-grid" id="relatedGrid"></div>
    </div>
  `;
initProductImageSlider(product);
  // Render related
  const related = PRODUCTS.filter(p => p.id !== id && (p.collection === product.collection || p.brand === product.brand)).slice(0, 4);
  document.getElementById('relatedGrid').innerHTML = related.map(p => createProductCard(p)).join('');

  initScrollAnimations();
}

function setMainImg(el) {
  document.getElementById('mainImg').src = el.src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function selectColor(el, name) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  const label = el.closest('.option-group').querySelector('label');
  label.innerHTML = `Color: <strong>${name}</strong>`;
}

function changeDetailQty(delta) {
  const input = document.getElementById('detailQty');
  if (!input) return;
  const val = Math.max(1, parseInt(input.value) + delta);
  input.value = val;
}

// ===== NEWSLETTER =====
function initNewsletter() {
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]');
      if (email?.value) {
        showToast('<i class="fas fa-check-circle"></i> <span>Thank you for subscribing! 🎉</span>', 'success');
        email.value = '';
      }
    });
  });
}

// ===== USER ACCOUNT NAV SYNC =====
function updateUserAccountNav() {
  const userStr = localStorage.getItem('titan_user');
  const accountButtons = document.querySelectorAll('.nav-icon-btn[title="Account"], a.nav-icon-btn[href="login.html"]');

  accountButtons.forEach(btn => {
    // If it's a button, convert or make it navigate to login.html
    btn.setAttribute('title', userStr ? 'My Account' : 'Login / Register');
    btn.style.cursor = 'pointer';

    if (btn.tagName.toLowerCase() === 'button') {
      btn.onclick = () => window.location.href = 'login.html';
    } else {
      btn.href = 'login.html';
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const firstName = user.name ? user.name.split(' ')[0] : 'Member';
        btn.innerHTML = `<i class="fas fa-user-circle" style="color:var(--gold);font-size:1.15rem"></i>`;
        btn.setAttribute('title', `Account: ${firstName}`);
      } catch (e) {}
    } else {
      btn.innerHTML = `<i class="far fa-user"></i>`;
    }
  });

  // Mobile nav account link update
  const mobileAccountLinks = document.querySelectorAll('.mobile-nav-links a');
  mobileAccountLinks.forEach(link => {
    if (link.href && link.href.includes('login.html')) {
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          link.innerHTML = `My Account (${user.name.split(' ')[0]}) <i class="fas fa-user-check"></i>`;
        } catch (e) {}
      }
    }
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();
  updateWishlistBadges();
  updateUserAccountNav();
  initHeroCarousel();
  initTestimonialsCarousel();
  initStickyHeader();
  initScrollTop();
  initMobileNav();
  initSearch();
  initBrandChips();
  initPriceChips();
  initArrivalsTabs();
  initCollectionsPage();
  initNewsletter();
  initCoupon();
  renderCartPage();
  renderWishlistPage();
  initProductPage();
// ===== PRODUCT IMAGE SLIDER =====

let currentProductImage = 0;
let productGalleryImages = [];

function initProductImageSlider(product) {
  productGalleryImages = [];

  if (product.image) {
    productGalleryImages.push(product.image);
  }

  if (product.image2) {
    productGalleryImages.push(product.image2);
  }

  currentProductImage = 0;

  updateProductImage();
}

function updateProductImage() {
  const mainImg = document.getElementById('mainImg');

  if (!mainImg || productGalleryImages.length === 0) return;

  mainImg.src = productGalleryImages[currentProductImage];

  document.querySelectorAll('.gallery-thumbs .thumb').forEach((thumb, index) => {
    thumb.classList.toggle(
      'active',
      index === currentProductImage
    );
  });
}

function changeProductImage(direction) {
  if (productGalleryImages.length <= 1) return;

  currentProductImage += direction;

  if (currentProductImage < 0) {
    currentProductImage = productGalleryImages.length - 1;
  }

  if (currentProductImage >= productGalleryImages.length) {
    currentProductImage = 0;
  }

  updateProductImage();
}

function selectProductImage(index) {
  if (index < 0 || index >= productGalleryImages.length) return;

  currentProductImage = index;

  updateProductImage();
}
  // Render home sections
  renderHomeProducts('bestsellersGrid', p => p.isBestseller, 8);

  // Delayed scroll animations init
  setTimeout(initScrollAnimations, 200);
});

// ===== PRODUCT IMAGE SLIDER =====

let currentProductImage = 0;
let productGalleryImages = [];

function initProductImageSlider(product) {
  productGalleryImages = [];

  if (product.image) {
    productGalleryImages.push(product.image);
  }

  if (product.image2) {
    productGalleryImages.push(product.image2);
  }

  currentProductImage = 0;

  updateProductImage();
}

function updateProductImage() {
  const mainImg = document.getElementById('mainImg');

  if (!mainImg || productGalleryImages.length === 0) return;

  mainImg.src = productGalleryImages[currentProductImage];

  document.querySelectorAll('.gallery-thumbs .thumb').forEach((thumb, index) => {
    thumb.classList.toggle(
      'active',
      index === currentProductImage
    );
  });
}

function changeProductImage(direction) {
  if (productGalleryImages.length <= 1) return;

  currentProductImage += direction;

  if (currentProductImage < 0) {
    currentProductImage = productGalleryImages.length - 1;
  }

  if (currentProductImage >= productGalleryImages.length) {
    currentProductImage = 0;
  }

  updateProductImage();
}

function selectProductImage(index) {
  if (index < 0 || index >= productGalleryImages.length) return;

  currentProductImage = index;

  updateProductImage();
}
// ===== BUY NOW =====

function buyNow() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    alert('Product information is missing.');
    return;
  }

  window.location.href = `checkout.html?id=${id}`;
}