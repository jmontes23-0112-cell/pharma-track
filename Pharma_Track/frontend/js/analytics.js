/**
 * PHARMASTOCK — analytics.js
 * Dashboard charts, reports charts, data aggregation
 */

/* ── Chart defaults ── */
function getChartDefaults() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    textColor:  isDark ? '#a3b8a8' : '#475569',
    gridColor:  isDark ? '#1e3022' : '#e2e8f0',
    bgCard:     isDark ? '#111b15' : '#ffffff',
  };
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Aggregate orders by month ── */
function getMonthlyRevenue() {
  const orders = DB.get('orders') || [];
  const data   = new Array(12).fill(0);
  orders.forEach(o => {
    const m = new Date(o.date).getMonth();
    data[m] += o.total;
  });
  return data;
}

function getTopProducts(limit = 5) {
  const orders   = DB.get('orders') || [];
  const counts   = {};
  const revenues = {};

  orders.forEach(o => {
    o.items?.forEach(i => {
      counts[i.name]   = (counts[i.name]   || 0) + i.qty;
      revenues[i.name] = (revenues[i.name] || 0) + i.price * i.qty;
    });
  });

  return Object.keys(counts)
    .map(name => ({ name, qty: counts[name], revenue: revenues[name] }))
    .sort((a,b) => b.revenue - a.revenue)
    .slice(0, limit);
}

function getKPIs(period = 'month') {
  const orders = DB.get('orders') || [];
  const now    = new Date();
  let filtered = orders;

  if (period === 'day') {
    filtered = orders.filter(o => {
      const d = new Date(o.date);
      return d.toDateString() === now.toDateString();
    });
  } else if (period === 'week') {
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    filtered = orders.filter(o => new Date(o.date) >= weekAgo);
  } else if (period === 'month') {
    filtered = orders.filter(o => {
      const d = new Date(o.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  const totalRevenue = filtered.reduce((s,o) => s + o.total, 0);
  const totalOrders  = filtered.length;
  const avgOrder     = totalOrders ? totalRevenue / totalOrders : 0;
  const totalItems   = filtered.reduce((s,o) => s + (o.items?.reduce((ss,i) => ss + i.qty, 0) || 0), 0);

  return { totalRevenue, totalOrders, avgOrder, totalItems };
}

/* ── Dashboard Module ── */
window.DashboardModule = (() => {

  let revenueChart = null;
  let topChart     = null;

  function init() {
    renderStatCards();
    renderQuickActions();
    renderRecentTransactions();
    renderTopProducts();
    renderAlerts();
    initCharts();
  }

  function renderStatCards() {
    const orders   = DB.get('orders') || [];
    const products = window.InventoryModule?.getAll() || [];
    const kpis     = getKPIs('month');

    const totalProfit   = orders.reduce((s,o) => s + o.total * 0.3, 0); // 30% margin estimate
    const totalOrders   = orders.length;
    const totalRevenue  = orders.reduce((s,o) => s + o.total, 0);
    const lowStockCount = window.InventoryModule?.getLowStockCount() || 0;

    setVal('dashTotalProfit',  formatCurrency(totalProfit));
    setVal('dashTotalOrders',  totalOrders);
    setVal('dashRevenue',      formatCurrency(totalRevenue));
    setVal('dashLowStock',     lowStockCount);
  }

  function renderAlerts() {
    const low  = window.InventoryModule?.getLowStockCount() || 0;
    const out  = window.InventoryModule?.getOutOfStockCount() || 0;
    const strip = document.getElementById('alertStrip');
    if (!strip) return;

    if (low + out === 0) {
      strip.style.display = 'none';
    } else {
      strip.style.display = 'flex';
      const msg = strip.querySelector('.alert-text');
      if (msg) msg.textContent = `⚠️ ${out} out-of-stock items and ${low} low-stock items need attention.`;
    }
  }

  function renderRecentTransactions() {
    const tbody  = document.getElementById('dashTransactions');
    if (!tbody) return;
    const orders = (DB.get('orders') || []).slice(-8).reverse();

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted)">No transactions yet</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customer}</td>
        <td>${o.items?.map(i => i.name).join(', ').substring(0,40)}…</td>
        <td><strong>${formatCurrency(o.total)}</strong></td>
        <td><span class="badge badge-success">Delivered</span></td>
      </tr>
    `).join('');
  }

  function renderTopProducts() {
    const list = document.getElementById('dashTopProducts');
    if (!list) return;
    const top = getTopProducts(5);

    if (!top.length) {
      list.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:24px">No sales data yet</div>`;
      return;
    }

    const maxRev = top[0]?.revenue || 1;
    list.innerHTML = top.map((p, i) => `
      <div class="product-rank-item">
        <div class="rank-num">${i+1}</div>
        <div class="rank-info">
          <div class="rank-name">${p.name}</div>
          <div class="rank-cat">${p.qty} units sold</div>
        </div>
        <div class="rank-bar-wrap">
          <div class="rank-bar" style="width:${Math.round(p.revenue/maxRev*100)}%"></div>
        </div>
        <div class="rank-sales">${formatCurrency(p.revenue)}</div>
      </div>
    `).join('');
  }

  function renderQuickActions() {
    const wrap = document.getElementById('quickActions');
    if (!wrap) return;
    // Already in HTML, just make them clickable
    wrap.querySelectorAll('.quick-action-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
  }

  function initCharts() {
    const d = getChartDefaults();

    // Revenue chart
    const revCtx = document.getElementById('revenueChart');
    if (revCtx) {
      if (revenueChart) revenueChart.destroy();
      const monthlyData = getMonthlyRevenue();
      revenueChart = new Chart(revCtx, {
        type: 'bar',
        data: {
          labels: MONTH_LABELS,
          datasets: [{
            label: 'Revenue (₱)',
            data: monthlyData,
            backgroundColor: 'rgba(22,163,74,.75)',
            borderColor: '#16a34a',
            borderWidth: 2,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ₱${ctx.raw.toLocaleString('en-PH', {minimumFractionDigits:2})}`,
              },
            },
          },
          scales: {
            x: { grid: { color: d.gridColor }, ticks: { color: d.textColor } },
            y: { grid: { color: d.gridColor }, ticks: { color: d.textColor, callback: v => '₱'+v.toLocaleString() } },
          },
        },
      });
    }

    // Top products donut
    const topCtx = document.getElementById('topProductsChart');
    if (topCtx) {
      if (topChart) topChart.destroy();
      const top = getTopProducts(5);
      const COLORS = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0'];
      topChart = new Chart(topCtx, {
        type: 'doughnut',
        data: {
          labels: top.map(p => p.name.split(' ')[0]),
          datasets: [{
            data: top.map(p => p.revenue),
            backgroundColor: COLORS,
            borderWidth: 0,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: d.textColor, font: { size: 11 }, boxWidth: 12, padding: 12 },
            },
          },
        },
      });
    }
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { init };
})();

/* ── Reports Module ── */
window.ReportsModule = (() => {

  let mainChart = null;
  let pieChart  = null;
  let barChart  = null;
  let currentPeriod = 'month';

  function init() {
    renderKPIs();
    renderInsights();
    renderCharts();
    renderSalesLog();
    renderTopProductsTable();

    document.querySelectorAll('.period-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentPeriod = tab.dataset.period;
        document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderKPIs();
        renderCharts();
        renderSalesLog();
      });
    });
  }

  function renderKPIs() {
    const kpis = getKPIs(currentPeriod);
    setVal('kpiRevenue', formatCurrency(kpis.totalRevenue));
    setVal('kpiOrders',  kpis.totalOrders);
    setVal('kpiAvg',     formatCurrency(kpis.avgOrder));
    setVal('kpiItems',   kpis.totalItems);
  }

  function renderInsights() {
    const top = getTopProducts(1);
    if (top[0]) setVal('insightBestProduct', top[0].name.split(' ').slice(0,2).join(' '));
    const orders = DB.get('orders') || [];
    const cashOrders = orders.filter(o => o.payment === 'cash').length;
    setVal('insightPayMethod', cashOrders >= orders.length/2 ? 'Cash' : 'E-Wallet');
    const products = window.InventoryModule?.getAll() || [];
    setVal('insightTotalSKU', products.length + ' SKUs');
  }

  function renderCharts() {
    const d = getChartDefaults();
    const orders = DB.get('orders') || [];

    // Main revenue line chart
    const mainCtx = document.getElementById('mainRevenueChart');
    if (mainCtx) {
      if (mainChart) mainChart.destroy();
      const monthlyData = getMonthlyRevenue();
      mainChart = new Chart(mainCtx, {
        type: 'line',
        data: {
          labels: MONTH_LABELS,
          datasets: [{
            label: 'Revenue',
            data: monthlyData,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#16a34a',
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ₱${ctx.raw.toLocaleString('en-PH',{minimumFractionDigits:2})}` } },
          },
          scales: {
            x: { grid: { color: d.gridColor }, ticks: { color: d.textColor } },
            y: { grid: { color: d.gridColor }, ticks: { color: d.textColor, callback: v => '₱'+v.toLocaleString() } },
          },
        },
      });
    }

    // Category pie
    const pieCtx = document.getElementById('categoryPieChart');
    if (pieCtx) {
      if (pieChart) pieChart.destroy();
      const catRevenue = {};
      orders.forEach(o => {
        o.items?.forEach(i => {
          const p = window.InventoryModule?.getAll().find(x => x.id === i.id);
          const cat = p?.category || 'Other';
          catRevenue[cat] = (catRevenue[cat] || 0) + i.price * i.qty;
        });
      });
      const cats = Object.keys(catRevenue);
      const COLORS = ['#16a34a','#22c55e','#4ade80','#f59e0b','#3b82f6','#ef4444','#8b5cf6'];

      pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: cats.length ? cats : ['No Data'],
          datasets: [{
            data: cats.length ? cats.map(c => catRevenue[c]) : [1],
            backgroundColor: COLORS.slice(0, cats.length || 1),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: d.textColor, font: {size: 10}, padding: 8, boxWidth: 10 } },
          },
        },
      });
    }

    // Payment method bar
    const barCtx = document.getElementById('paymentBarChart');
    if (barCtx) {
      if (barChart) barChart.destroy();
      const methods  = { cash: 0, card: 0, ewallet: 0 };
      orders.forEach(o => { if (methods[o.payment] !== undefined) methods[o.payment] += o.total; });

      barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['Cash','Card','E-Wallet'],
          datasets: [{
            label: 'Sales by Payment',
            data: [methods.cash, methods.card, methods.ewallet],
            backgroundColor: ['#16a34a','#3b82f6','#f59e0b'],
            borderRadius: 6,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: d.textColor } },
            y: { grid: { color: d.gridColor }, ticks: { color: d.textColor, callback: v => '₱'+v.toLocaleString() } },
          },
        },
      });
    }
  }

  function renderSalesLog() {
    const tbody  = document.getElementById('salesLogBody');
    if (!tbody) return;
    const orders = (DB.get('orders') || []).slice().reverse().slice(0, 20);

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted)">No sales data</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${formatDateTime(o.date)}</td>
        <td>${o.customer}</td>
        <td>${o.items?.length || 0} item(s)</td>
        <td><strong>${formatCurrency(o.total)}</strong></td>
        <td><span class="badge badge-success">Completed</span></td>
      </tr>
    `).join('');
  }

  function renderTopProductsTable() {
    const tbody = document.getElementById('topProductsBody');
    if (!tbody) return;
    const top   = getTopProducts(10);

    if (!top.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--text-muted)">No data</td></tr>`;
      return;
    }

    tbody.innerHTML = top.map((p, i) => `
      <tr>
        <td><strong>#${i+1}</strong></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.qty.toLocaleString()}</td>
        <td><strong>${formatCurrency(p.revenue)}</strong></td>
      </tr>
    `).join('');
  }

  function exportCSV() {
    const orders = DB.get('orders') || [];
    const rows   = [['Order ID','Date','Customer','Items','Total','Payment']];
    orders.forEach(o => {
      rows.push([
        o.id,
        formatDateTime(o.date),
        o.customer,
        o.items?.map(i => `${i.name} x${i.qty}`).join('; '),
        o.total,
        o.payment,
      ]);
    });
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'pharmastock_sales.csv'; a.click();
    showToast('CSV exported', 'success');
  }

  function exportPDF() {
    window.print();
    showToast('Print dialog opened for PDF export', 'info');
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { init, exportCSV, exportPDF };
})();
