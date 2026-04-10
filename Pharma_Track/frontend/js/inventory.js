/**
 * PHARMASTOCK — inventory.js
 * Inventory CRUD, search, filter, pagination, stock alerts
 */

window.InventoryModule = (() => {

  /* ── Seed Data ── */
  const SEED_PRODUCTS = [
    { id: 'P001', name: 'Amoxicillin 500mg', category: 'Antibiotics', price: 15.00, stock: 250, reorder: 50, supplier: 'MedSupply Co.', expiry: '2026-08-01', emoji: '💊' },
    { id: 'P002', name: 'Biogesic (Paracetamol)', category: 'Pain Relief', price: 8.00, stock: 180, reorder: 30, supplier: 'Unilab', expiry: '2026-12-15', emoji: '🩹' },
    { id: 'P003', name: 'Cetirizine 10mg', category: 'Antihistamine', price: 12.00, stock: 7, reorder: 20, supplier: 'Pharex', expiry: '2025-11-30', emoji: '💉' },
    { id: 'P004', name: 'Vitamin C 500mg', category: 'Vitamins', price: 5.00, stock: 320, reorder: 50, supplier: 'Stresstabs', expiry: '2027-03-01', emoji: '🍊' },
    { id: 'P005', name: 'Metformin 500mg', category: 'Diabetes', price: 9.00, stock: 4, reorder: 30, supplier: 'Generika', expiry: '2026-06-20', emoji: '💊' },
    { id: 'P006', name: 'Losartan 50mg', category: 'Hypertension', price: 18.00, stock: 130, reorder: 25, supplier: 'MedSupply Co.', expiry: '2026-09-10', emoji: '❤️' },
    { id: 'P007', name: 'Omeprazole 20mg', category: 'GI', price: 14.00, stock: 0, reorder: 20, supplier: 'Pfizer', expiry: '2026-04-15', emoji: '🫁' },
    { id: 'P008', name: 'Salbutamol Inhaler', category: 'Respiratory', price: 220.00, stock: 45, reorder: 10, supplier: 'GSK', expiry: '2026-07-01', emoji: '💨' },
    { id: 'P009', name: 'Ascorbic Acid 1000mg', category: 'Vitamins', price: 7.50, stock: 95, reorder: 40, supplier: 'Natures Plus', expiry: '2027-01-15', emoji: '🍋' },
    { id: 'P010', name: 'Ibuprofen 400mg', category: 'Pain Relief', price: 10.00, stock: 60, reorder: 20, supplier: 'Unilab', expiry: '2026-10-30', emoji: '💊' },
    { id: 'P011', name: 'Amlodipine 5mg', category: 'Hypertension', price: 13.00, stock: 8, reorder: 20, supplier: 'Pharex', expiry: '2026-05-01', emoji: '❤️' },
    { id: 'P012', name: 'Multivitamins (Centrum)', category: 'Vitamins', price: 35.00, stock: 200, reorder: 30, supplier: 'Pfizer', expiry: '2027-02-28', emoji: '💊' },
  ];

  let products = [];
  let filteredProducts = [];
  let currentPage = 1;
  const PAGE_SIZE = 8;
  let editingId = null;

  /* ── Load / Save ── */
  function load() {
    const saved = DB.get('products');
    products = saved && saved.length ? saved : JSON.parse(JSON.stringify(SEED_PRODUCTS));
    if (!saved) DB.set('products', products);
  }

  function save() {
    DB.set('products', products);
  }

  /* ── Utility ── */
  function getLowStockCount() {
    return products.filter(p => p.stock > 0 && p.stock <= APP.lowStockThreshold).length;
  }

  function getOutOfStockCount() {
    return products.filter(p => p.stock === 0).length;
  }

  /* ── Render Summary Cards ── */
  function renderSummary() {
    const total     = products.length;
    const lowStock  = getLowStockCount();
    const outStock  = getOutOfStockCount();
    const totalVal  = products.reduce((s, p) => s + p.price * p.stock, 0);

    setText('inv-total-products', total);
    setText('inv-low-stock', lowStock);
    setText('inv-out-stock', outStock);
    setText('inv-total-value', formatCurrency(totalVal));

    // Nav badge
    const badge = document.getElementById('navBadgeInventory');
    if (badge) badge.textContent = lowStock + outStock || '';
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Render Table ── */
  function applyFilters() {
    const search   = document.getElementById('invSearch')?.value?.toLowerCase() || '';
    const category = document.getElementById('invCatFilter')?.value || '';
    const stock    = document.getElementById('invStockFilter')?.value || '';

    filteredProducts = products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search)
        || p.category.toLowerCase().includes(search)
        || p.supplier.toLowerCase().includes(search)
        || p.id.toLowerCase().includes(search);
      const matchCat    = !category || p.category === category;
      const matchStock  = !stock
        || (stock === 'in'  && p.stock > APP.lowStockThreshold)
        || (stock === 'low' && p.stock > 0 && p.stock <= APP.lowStockThreshold)
        || (stock === 'out' && p.stock === 0);

      return matchSearch && matchCat && matchStock;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
  }

  function renderTable() {
    const tbody = document.getElementById('invTableBody');
    if (!tbody) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = filteredProducts.slice(start, start + PAGE_SIZE);

    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No products found</td></tr>`;
      return;
    }

    tbody.innerHTML = slice.map(p => {
      const pct  = Math.min(100, Math.round((p.stock / (p.reorder * 3)) * 100));
      const cls  = p.stock === 0 ? 'critical' : p.stock <= APP.lowStockThreshold ? 'low' : 'ok';
      const rowClass = p.stock === 0 ? 'out-of-stock' : p.stock <= APP.lowStockThreshold ? 'low-stock' : '';
      const badge    = p.stock === 0
        ? '<span class="badge badge-danger">Out of Stock</span>'
        : p.stock <= APP.lowStockThreshold
          ? '<span class="badge badge-warning">Low Stock</span>'
          : '<span class="badge badge-success">In Stock</span>';
      return `
        <tr class="${rowClass}">
          <td><strong>${p.id}</strong></td>
          <td>
            <div class="d-flex align-center gap-8">
              <span>${p.emoji}</span>
              <div>
                <div><strong>${p.name}</strong></div>
                <div class="text-xs text-muted">Exp: ${p.expiry}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-gray">${p.category}</span></td>
          <td><strong>${formatCurrency(p.price)}</strong></td>
          <td>
            <div class="stock-bar">
              <span style="min-width:30px;font-weight:700">${p.stock}</span>
              <div class="stock-progress"><div class="stock-fill ${cls}" style="width:${pct}%"></div></div>
            </div>
          </td>
          <td>${badge}</td>
          <td class="text-muted">${p.supplier}</td>
          <td>
            <div class="action-btns">
              <button class="tbl-action view" onclick="InventoryModule.viewProduct('${p.id}')" title="View">👁️</button>
              <button class="tbl-action edit" onclick="InventoryModule.openEdit('${p.id}')" title="Edit">✏️</button>
              <button class="tbl-action del"  onclick="InventoryModule.confirmDelete('${p.id}')" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPagination() {
    const total = filteredProducts.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    const info  = document.getElementById('invPageInfo');
    const ctrl  = document.getElementById('invPageControls');
    if (!info || !ctrl) return;

    const start = Math.min((currentPage - 1) * PAGE_SIZE + 1, total);
    const end   = Math.min(currentPage * PAGE_SIZE, total);
    info.textContent = `Showing ${start}–${end} of ${total} products`;

    ctrl.innerHTML = '';
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.onclick = () => { currentPage = i; renderTable(); renderPagination(); };
      ctrl.appendChild(btn);
    }
  }

  /* ── Category dropdown ── */
  function populateCategoryFilter() {
    const sel = document.getElementById('invCatFilter');
    if (!sel) return;
    const cats = [...new Set(products.map(p => p.category))].sort();
    sel.innerHTML = '<option value="">All Categories</option>'
      + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  /* ── CRUD ── */
  function openAdd() {
    editingId = null;
    document.getElementById('productForm').reset();
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productIdGroup').style.display = 'none';
    openModal('productModal');
  }

  function openEdit(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productIdGroup').style.display = 'block';
    document.getElementById('pId').value       = p.id;
    document.getElementById('pName').value     = p.name;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value    = p.price;
    document.getElementById('pStock').value    = p.stock;
    document.getElementById('pReorder').value  = p.reorder;
    document.getElementById('pSupplier').value = p.supplier;
    document.getElementById('pExpiry').value   = p.expiry;
    document.getElementById('pEmoji').value    = p.emoji;
    openModal('productModal');
  }

  function saveProduct() {
    const name     = document.getElementById('pName').value.trim();
    const category = document.getElementById('pCategory').value.trim();
    const price    = parseFloat(document.getElementById('pPrice').value);
    const stock    = parseInt(document.getElementById('pStock').value);
    const reorder  = parseInt(document.getElementById('pReorder').value) || 10;
    const supplier = document.getElementById('pSupplier').value.trim();
    const expiry   = document.getElementById('pExpiry').value;
    const emoji    = document.getElementById('pEmoji').value || '💊';

    if (!name || !category || isNaN(price) || isNaN(stock)) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (editingId) {
      const idx = products.findIndex(x => x.id === editingId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], name, category, price, stock, reorder, supplier, expiry, emoji };
        showToast('Product updated successfully', 'success');
      }
    } else {
      const newId = 'P' + String(products.length + 1).padStart(3, '0');
      products.push({ id: newId, name, category, price, stock, reorder, supplier, expiry, emoji });
      showToast('Product added successfully', 'success');
    }

    save();
    closeModal('productModal');
    applyFilters();
    renderSummary();
    populateCategoryFilter();
  }

  function confirmDelete(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('deleteProductName').textContent = p.name;
    document.getElementById('confirmDeleteBtn').onclick = () => deleteProduct(id);
    openModal('deleteModal');
  }

  function deleteProduct(id) {
    products = products.filter(x => x.id !== id);
    save();
    closeModal('deleteModal');
    applyFilters();
    renderSummary();
    showToast('Product deleted', 'warning');
  }

  function viewProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const body = document.getElementById('viewProductBody');
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:48px">${p.emoji}</div>
          <h3 style="font-family:'Sora',sans-serif;margin-top:8px">${p.name}</h3>
          <span class="badge badge-gray">${p.category}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${field('Product ID', p.id)}
          ${field('Price', formatCurrency(p.price))}
          ${field('Current Stock', p.stock + ' units')}
          ${field('Reorder Level', p.reorder + ' units')}
          ${field('Supplier', p.supplier)}
          ${field('Expiry Date', p.expiry)}
        </div>
      `;
    }
    openModal('viewProductModal');
  }

  function field(label, val) {
    return `<div style="background:var(--bg-main);padding:12px;border-radius:8px">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:4px">${label}</div>
      <div style="font-weight:600;color:var(--text-primary)">${val}</div>
    </div>`;
  }

  /* ── Public getters for POS ── */
  function getAll() { return [...products]; }

  function updateStock(id, delta) {
    const p = products.find(x => x.id === id);
    if (p) { p.stock = Math.max(0, p.stock + delta); save(); }
  }

  /* ── Init ── */
  function init() {
    load();
    renderSummary();
    populateCategoryFilter();
    applyFilters();

    // Search & filter listeners
    document.getElementById('invSearch')?.addEventListener('input', applyFilters);
    document.getElementById('invCatFilter')?.addEventListener('change', applyFilters);
    document.getElementById('invStockFilter')?.addEventListener('change', applyFilters);

    // Buttons
    document.getElementById('addProductBtn')?.addEventListener('click', openAdd);
    document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);
  }

  return { init, getAll, getLowStockCount, getOutOfStockCount, updateStock, openEdit, confirmDelete, viewProduct };

})();
