/**
 * PHARMASTOCK — pos.js
 * Point of Sale: cart, checkout, receipt, inventory deduction
 */

window.POSModule = (() => {

  let cart       = [];
  let products   = [];
  let activeCategory = 'All';
  let paymentMethod  = 'cash';
  let discountPct    = 0;

  /* ── Load products from inventory ── */
  function loadProducts() {
    products = window.InventoryModule?.getAll() || [];
  }

  /* ── Categories ── */
  function getCategories() {
    const cats = ['All', ...new Set(products.map(p => p.category))].sort((a,b) => a === 'All' ? -1 : a.localeCompare(b));
    return cats;
  }

  function renderCatTabs() {
    const wrap = document.getElementById('posCatTabs');
    if (!wrap) return;
    wrap.innerHTML = getCategories().map(c => `
      <button class="cat-tab ${c === activeCategory ? 'active' : ''}"
              onclick="POSModule.setCategory('${c}')">${c}</button>
    `).join('');
  }

  function setCategory(cat) {
    activeCategory = cat;
    renderCatTabs();
    renderProducts();
  }

  /* ── Product Grid ── */
  function renderProducts(searchTerm = '') {
    const grid = document.getElementById('posProductGrid');
    if (!grid) return;

    let filtered = products;
    if (activeCategory !== 'All') filtered = filtered.filter(p => p.category === activeCategory);
    if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No products found</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const oos        = p.stock === 0;
      const lowStock   = !oos && p.stock <= (APP.lowStockThreshold || 10);
      const stockLabel = oos ? 'Out of Stock' : lowStock ? `Low: ${p.stock}` : `Stock: ${p.stock}`;
      const badgeClass = oos ? 'empty' : lowStock ? 'low' : '';

      return `
        <div class="product-card ${oos ? 'out-of-stock' : ''}"
             onclick="${oos ? '' : `POSModule.addToCart('${p.id}')`}">
          <span class="product-stock-badge ${badgeClass}">${stockLabel}</span>
          <span class="product-emoji">${p.emoji}</span>
          <div class="product-name">${p.name}</div>
          <div class="product-price">${formatCurrency(p.price)}</div>
          <div class="add-indicator">+</div>
        </div>
      `;
    }).join('');
  }

  /* ── Cart ── */
  function addToCart(productId) {
    const p = products.find(x => x.id === productId);
    if (!p || p.stock === 0) return;

    const existing = cart.find(c => c.id === productId);
    if (existing) {
      if (existing.qty >= p.stock) {
        showToast(`Only ${p.stock} units available`, 'warning');
        return;
      }
      existing.qty++;
    } else {
      cart.push({ id: p.id, name: p.name, price: p.price, qty: 1, emoji: p.emoji });
    }

    showToast(`${p.name} added`, 'success', 1200);
    renderCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(c => c.id !== productId);
    renderCart();
  }

  function updateQty(productId, delta) {
    const item = cart.find(c => c.id === productId);
    if (!item) return;

    const p = products.find(x => x.id === productId);
    const newQty = item.qty + delta;

    if (newQty <= 0) { removeFromCart(productId); return; }
    if (newQty > (p?.stock || 99)) { showToast('Max stock reached', 'warning'); return; }

    item.qty = newQty;
    renderCart();
  }

  function clearCart() {
    cart = [];
    discountPct = 0;
    document.getElementById('discountInput').value = '';
    renderCart();
  }

  function renderCart() {
    const countEl  = document.getElementById('cartCount');
    const itemsEl  = document.getElementById('cartItems');
    if (!itemsEl) return;

    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const count = cart.reduce((s, c) => s + c.qty, 0);

    if (countEl) countEl.textContent = count;

    if (!cart.length) {
      itemsEl.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🛒</div>
          <div class="cart-empty-text">Cart is empty<br><small>Click a product to add</small></div>
        </div>`;
    } else {
      itemsEl.innerHTML = cart.map(c => `
        <div class="cart-item">
          <span style="font-size:20px">${c.emoji}</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${c.name}</div>
            <div class="cart-item-price">${formatCurrency(c.price)} each</div>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="POSModule.updateQty('${c.id}',-1)">−</button>
            <span class="qty-num">${c.qty}</span>
            <button class="qty-btn" onclick="POSModule.updateQty('${c.id}',1)">+</button>
          </div>
          <div class="cart-item-total">${formatCurrency(c.price * c.qty)}</div>
          <button class="cart-item-del" onclick="POSModule.removeFromCart('${c.id}')">✕</button>
        </div>
      `).join('');
    }

    renderSummary(total);
    updateCheckoutBtn();
  }

  function renderSummary(subtotal) {
    const discAmt  = subtotal * (discountPct / 100);
    const taxAmt   = (subtotal - discAmt) * 0.12;
    const grandTotal = subtotal - discAmt + taxAmt;

    setText('posSubtotal', formatCurrency(subtotal));
    setText('posDiscount', discountPct ? `-${formatCurrency(discAmt)}` : '₱0.00');
    setText('posTax',      formatCurrency(taxAmt));
    setText('posTotal',    formatCurrency(grandTotal));

    // Change calculation
    const cashIn = parseFloat(document.getElementById('cashReceived')?.value) || 0;
    const change = cashIn - grandTotal;
    setText('posChange', change >= 0 ? formatCurrency(change) : '₱0.00');

    window._currentTotal = grandTotal;
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateCheckoutBtn() {
    const btn = document.getElementById('checkoutBtn');
    if (btn) btn.disabled = cart.length === 0;
  }

  /* ── Payment ── */
  function setPaymentMethod(method) {
    paymentMethod = method;
    document.querySelectorAll('.pay-method').forEach(b => {
      b.classList.toggle('active', b.dataset.method === method);
    });
    const cashSection = document.getElementById('cashSection');
    if (cashSection) cashSection.style.display = method === 'cash' ? 'block' : 'none';
  }

  function applyDiscount() {
    const val = parseFloat(document.getElementById('discountInput').value);
    if (isNaN(val) || val < 0 || val > 100) { showToast('Enter a valid discount (0–100%)', 'error'); return; }
    discountPct = val;
    renderCart();
    showToast(`${val}% discount applied`, 'success');
  }

  /* ── Checkout ── */
  function checkout() {
    if (!cart.length) return;

    const total = window._currentTotal || 0;
    const cashIn = paymentMethod === 'cash' ? parseFloat(document.getElementById('cashReceived')?.value) || 0 : total;

    if (paymentMethod === 'cash' && cashIn < total) {
      showToast('Insufficient cash amount', 'error');
      return;
    }

    // Deduct inventory
    cart.forEach(item => {
      window.InventoryModule?.updateStock(item.id, -item.qty);
    });

    // Save order
    const order = {
      id:         generateId('OR'),
      date:       new Date().toISOString(),
      customer:   document.getElementById('customerName')?.value || 'Walk-in',
      items:      [...cart],
      subtotal:   cart.reduce((s,c) => s + c.price * c.qty, 0),
      discount:   discountPct,
      total:      total,
      payment:    paymentMethod,
      cashReceived: paymentMethod === 'cash' ? cashIn : total,
      change:     paymentMethod === 'cash' ? Math.max(0, cashIn - total) : 0,
      cashier:    'Admin',
    };

    const orders = DB.get('orders') || [];
    orders.push(order);
    DB.set('orders', orders);

    // Show receipt
    showReceipt(order);

    showToast('Transaction completed!', 'success');
    clearCart();
    loadProducts();
    renderProducts();
  }

  function showReceipt(order) {
    const body = document.getElementById('receiptBody');
    if (!body) return;

    const subtotal   = order.items.reduce((s,i) => s + i.price * i.qty, 0);
    const discAmt    = subtotal * (order.discount / 100);
    const tax        = (subtotal - discAmt) * 0.12;

    body.innerHTML = `
      <div class="receipt-body">
        <div class="receipt-header-block">
          <div class="receipt-logo">💊</div>
          <div class="receipt-store">PHARMASTOCK</div>
          <div style="font-size:.75rem;color:var(--text-muted)">Pharmacy & Medicine Supply</div>
          <div class="receipt-or">Receipt #${order.id}</div>
          <div class="receipt-or">${formatDateTime(order.date)}</div>
          <div class="receipt-or">Cashier: ${order.cashier} | Customer: ${order.customer}</div>
        </div>

        <div class="receipt-items">
          <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:6px;display:grid;grid-template-columns:1fr auto auto">
            <span>Item</span><span style="text-align:center">Qty</span><span style="text-align:right">Total</span>
          </div>
          ${order.items.map(i => `
            <div class="receipt-item">
              <span class="receipt-item-name">${i.emoji} ${i.name}<br><small>${formatCurrency(i.price)} × ${i.qty}</small></span>
              <span class="receipt-item-val">${formatCurrency(i.price * i.qty)}</span>
            </div>
          `).join('')}
        </div>

        <div class="receipt-totals">
          <div class="receipt-total-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
          ${order.discount ? `<div class="receipt-total-row"><span>Discount (${order.discount}%)</span><span>-${formatCurrency(discAmt)}</span></div>` : ''}
          <div class="receipt-total-row"><span>VAT (12%)</span><span>${formatCurrency(tax)}</span></div>
          <div class="receipt-total-row grand"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
          <div class="receipt-total-row"><span>Payment (${order.payment.toUpperCase()})</span><span>${formatCurrency(order.cashReceived)}</span></div>
          <div class="receipt-total-row"><span>Change</span><span>${formatCurrency(order.change)}</span></div>
        </div>

        <div class="receipt-footer">
          Thank you for your purchase! 🙏<br>
          Please keep this receipt for returns.<br>
          <strong>PHARMASTOCK</strong> — Your Health Partner
        </div>
      </div>
    `;

    openModal('receiptModal');
  }

  function printReceipt() {
    window.print();
  }

  /* ── Init ── */
  function init() {
    loadProducts();
    renderCatTabs();
    renderProducts();
    renderCart();

    // Search
    document.getElementById('posSearch')?.addEventListener('input', e => renderProducts(e.target.value));

    // Payment methods
    document.querySelectorAll('.pay-method').forEach(btn => {
      btn.addEventListener('click', () => setPaymentMethod(btn.dataset.method));
    });

    // Cash received input
    document.getElementById('cashReceived')?.addEventListener('input', () => {
      const total = window._currentTotal || 0;
      const cashIn = parseFloat(document.getElementById('cashReceived').value) || 0;
      setText('posChange', cashIn >= total ? formatCurrency(cashIn - total) : '₱0.00');
    });

    // Discount
    document.getElementById('applyDiscountBtn')?.addEventListener('click', applyDiscount);

    // Checkout
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);

    // Clear cart
    document.getElementById('clearCartBtn')?.addEventListener('click', () => {
      if (cart.length && confirm('Clear cart?')) clearCart();
    });

    // Print receipt
    document.getElementById('printReceiptBtn')?.addEventListener('click', printReceipt);

    // Set default payment method
    setPaymentMethod('cash');
  }

  return { init, addToCart, removeFromCart, updateQty, setCategory, clearCart };

})();
