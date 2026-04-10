/**
 * PHARMASTOCK — main.js
 * App shell: sidebar, routing, toast notifications, dark mode, utilities
 */

/* ============================================================
   STATE
   ============================================================ */
const APP = {
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  darkMode: false,
  lowStockThreshold: 10,
};

/* ============================================================
   SIDEBAR
   ============================================================ */
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const collapseBtn = document.getElementById('collapseBtn');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburgerBtn');

  if (!sidebar) return;

  // Collapse toggle (desktop)
  collapseBtn?.addEventListener('click', () => {
    APP.sidebarCollapsed = !APP.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', APP.sidebarCollapsed);
    mainContent.classList.toggle('expanded', APP.sidebarCollapsed);
    const icon = collapseBtn.querySelector('.collapse-icon');
    if (icon) icon.textContent = APP.sidebarCollapsed ? '→' : '←';
  });

  // Hamburger (mobile)
  hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
      // Close mobile sidebar
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      showToast('Logged out successfully', 'info');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    }
  });
}

/* ============================================================
   ROUTER
   ============================================================ */
function navigateTo(page) {
  APP.currentPage = page;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
    void target.offsetWidth; // trigger reflow for animation
  }

  // Update header title
  const titles = {
    dashboard: 'Dashboard',
    inventory: 'Inventory Management',
    pos:       'Point of Sale',
    reports:   'Reports & Analytics',
    suppliers: 'Suppliers',
    history:   'History Log',
    settings:  'Settings',
  };

  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) headerTitle.textContent = titles[page] || page;

  // Init page-specific modules
  if (page === 'dashboard')  window.DashboardModule?.init();
  if (page === 'inventory')  window.InventoryModule?.init();
  if (page === 'pos')        window.POSModule?.init();
  if (page === 'reports')    window.ReportsModule?.init();
  if (page === 'settings')   initSettings();
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
const TOAST_ICONS = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type]}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* Global expose */
window.showToast = showToast;

/* ============================================================
   DARK MODE
   ============================================================ */
function initDarkMode() {
  const btn = document.getElementById('darkModeBtn');
  const saved = localStorage.getItem('pharmastock_dark');

  if (saved === 'true') {
    document.documentElement.setAttribute('data-theme', 'dark');
    APP.darkMode = true;
    if (btn) btn.title = 'Light Mode';
  }

  btn?.addEventListener('click', () => {
    APP.darkMode = !APP.darkMode;
    document.documentElement.setAttribute('data-theme', APP.darkMode ? 'dark' : '');
    localStorage.setItem('pharmastock_dark', APP.darkMode);
    btn.textContent = APP.darkMode ? '☀️' : '🌙';
    showToast(`${APP.darkMode ? 'Dark' : 'Light'} mode enabled`, 'info', 1500);
  });
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */
function showLoading() {
  document.getElementById('loadingOverlay')?.classList.add('active');
}
function hideLoading() {
  document.getElementById('loadingOverlay')?.classList.remove('active');
}

window.showLoading = showLoading;
window.hideLoading = hideLoading;

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

window.openModal  = openModal;
window.closeModal = closeModal;

/* ============================================================
   FORMATTING UTILITIES
   ============================================================ */
function formatCurrency(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(date) {
  return new Date(date).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function generateId(prefix = 'OR') {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 99999)).padStart(6, '0');
  return `${prefix}-${y}-${n}`;
}

window.formatCurrency = formatCurrency;
window.formatDate     = formatDate;
window.formatDateTime = formatDateTime;
window.generateId     = generateId;

/* ============================================================
   LOCAL STORAGE (mock backend)
   ============================================================ */
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(`pharmastock_${key}`)) || null; }
    catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(`pharmastock_${key}`, JSON.stringify(val));
  },
};

window.DB = DB;

/* ============================================================
   SETTINGS PAGE
   ============================================================ */
function initSettings() {
  const threshold = document.getElementById('lowStockThreshold');
  if (threshold) {
    threshold.value = APP.lowStockThreshold;
    threshold.addEventListener('change', () => {
      APP.lowStockThreshold = Number(threshold.value);
      showToast('Settings saved', 'success');
    });
  }
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initDarkMode();

  // Start on dashboard
  navigateTo('dashboard');

  // Notification bell
  document.getElementById('notifBtn')?.addEventListener('click', () => {
    const count = window.InventoryModule?.getLowStockCount() || 0;
    showToast(`You have ${count} low-stock alerts`, 'warning');
  });

  // Update notification badge
  setTimeout(() => {
    const badge = document.getElementById('navBadgeInventory');
    const count = (window.InventoryModule?.getLowStockCount() || 0);
    if (badge && count > 0) badge.textContent = count;
  }, 500);
});
