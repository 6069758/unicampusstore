/* ==========================================================================
   Campus Store — Admin Panel Script
   Wired to real data via StoreData (js/store-data.js): actual orders placed
   at checkout, and a live-editable product catalog.
   ========================================================================== */

(function () {
  "use strict";

  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "Unicampus@26";
  const SESSION_KEY = "cs_admin_session";

  const loginScreen = document.getElementById("loginScreen");
  const adminShell = document.getElementById("adminShell");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const togglePass = document.getElementById("togglePass");
  const passwordInput = document.getElementById("password");
  const logoutBtn = document.getElementById("logoutBtn");
  const modalOverlay = document.getElementById("adminModalOverlay");
  const modalBox = document.getElementById("adminModalBox");

  function money(n) {
    return "₹ " + Math.round(n || 0).toLocaleString("en-IN");
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
    modalBox.innerHTML = "";
  }

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  function openModal(html) {
    modalBox.innerHTML = html;
    modalOverlay.classList.add("active");
  }

  // -------------------- Auth --------------------
  function showAdmin() {
    loginScreen.style.display = "none";
    adminShell.classList.add("active");
    renderAll();
  }

  function showLogin() {
    adminShell.classList.remove("active");
    loginScreen.style.display = "flex";
  }

  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    showAdmin();
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = passwordInput.value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      loginError.style.display = "none";
      sessionStorage.setItem(SESSION_KEY, "true");
      loginForm.reset();
      showAdmin();
    } else {
      loginError.style.display = "flex";
    }
  });

  togglePass.addEventListener("click", function () {
    const isPass = passwordInput.type === "password";
    passwordInput.type = isPass ? "text" : "password";
    togglePass.textContent = isPass ? "Hide" : "Show";
  });

  logoutBtn.addEventListener("click", function () {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  // -------------------- Sidebar navigation --------------------
  const navItems = document.querySelectorAll(".nav-item");
  const pageSections = document.querySelectorAll(".page-section");

  function goToPage(pageKey) {
    navItems.forEach((btn) => btn.classList.toggle("active", btn.dataset.page === pageKey));
    pageSections.forEach((sec) => sec.classList.toggle("active", sec.id === "page-" + pageKey));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
  });

  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      goToPage(el.dataset.goto);
      if (el.dataset.action === "add-product") {
        setTimeout(openAddProductModal, 150);
      }
    });
  });

  document.getElementById("openAddProductBtn").addEventListener("click", openAddProductModal);

  // -------------------- Master render --------------------
  function renderAll() {
    const todayEl = document.getElementById("todayDate");
    if (todayEl) {
      todayEl.textContent = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    renderOverview();
    renderOrdersPage();
    renderProductsPage();
    renderProfitPage();
    renderClientsPage();
  }

  // -------------------- Overview --------------------
  function renderOverview() {
    const stats = StoreData.getStats();

    document.getElementById("statRevenue").textContent = money(stats.revenue);
    document.getElementById("statProfit").textContent = money(stats.profit);
    document.getElementById("statOrders").textContent = stats.totalOrders;
    document.getElementById("statClients").textContent = stats.totalClients;
    document.getElementById("revenueAmountLabel").textContent = money(stats.revenue);

    const statusList = document.getElementById("statusList");
    const colors = { Completed: "#10b981", Processing: "#3b82f6", Pending: "#f59e0b", Cancelled: "#ef4444" };
    const total = stats.totalOrders || 1;
    statusList.innerHTML = Object.keys(colors)
      .map((key) => {
        const count = stats.statusCount[key] || 0;
        const pct = ((count / total) * 100).toFixed(1);
        return `<div class="status-row"><span class="status-dot" style="background:${colors[key]}"></span><span class="status-name">${key}</span><span class="status-val">${count} (${pct}%)</span></div>`;
      })
      .join("");

    drawStatusDonut(stats.statusCount, stats.totalOrders);
    drawRevenueChart(stats.byDate);

    const body = document.getElementById("recentOrdersBody");
    const recent = stats.orders.slice(0, 5);
    if (recent.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:1.5rem;">No orders yet — orders placed on the storefront will appear here.</td></tr>`;
    } else {
      body.innerHTML = recent.map((o) => orderRowHtml(o, false)).join("");
      attachOrderRowEvents(body);
    }
  }

  // -------------------- Orders page --------------------
  function orderRowHtml(o, showItems) {
    const status = o.status || "Processing";
    const name = (o.student && o.student.custName) || "Guest";
    const dateStr = o.orderTime ? o.orderTime.split(",")[0] : "-";
    const itemsCell = showItems ? `<td>${(o.items || []).length} item(s)</td>` : "";
    return `
      <tr data-order-id="${o.orderId}">
        <td>#${o.orderId}</td>
        <td>${name}</td>
        ${itemsCell}
        <td>${money(o.total)}</td>
        <td>
          <select class="status-select order-status-select" data-order-id="${o.orderId}">
            ${["Processing", "Pending", "Completed", "Cancelled"]
              .map((s) => `<option value="${s}" ${s === status ? "selected" : ""}>${s}</option>`)
              .join("")}
          </select>
        </td>
        <td>${dateStr}</td>
        <td><button class="action-btn view-order-btn" data-order-id="${o.orderId}">👁</button></td>
      </tr>`;
  }

  function attachOrderRowEvents(container) {
    container.querySelectorAll(".order-status-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        StoreData.updateOrderStatus(sel.dataset.orderId, sel.value);
        renderAll();
      });
    });
    container.querySelectorAll(".view-order-btn").forEach((btn) => {
      btn.addEventListener("click", () => showOrderDetail(btn.dataset.orderId));
    });
  }

  function renderOrdersPage() {
    const stats = StoreData.getStats();
    const body = document.getElementById("allOrdersBody");
    const filterEl = document.getElementById("orderStatusFilter");

    function render() {
      const filter = filterEl.value;
      const list = filter === "all" ? stats.orders : stats.orders.filter((o) => (o.status || "Processing") === filter);
      if (list.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.5rem;">No orders found.</td></tr>`;
      } else {
        body.innerHTML = list.map((o) => orderRowHtml(o, true)).join("");
        attachOrderRowEvents(body);
      }
    }

    filterEl.onchange = render;
    render();
  }

  function showOrderDetail(orderId) {
    const orders = StoreData.getOrders();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) return;

    const itemsHtml = (order.items || [])
      .map((i) => `<div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--slate-100); font-size:0.85rem;"><span>${i.name} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`)
      .join("");

    openModal(`
      <div class="modal-title-row">
        <h3>Order #${order.orderId}</h3>
        <button class="modal-close-btn" id="closeModalBtn">✕</button>
      </div>
      <div style="font-size:0.85rem; color:var(--slate-600); margin-bottom:1rem;">
        <div><strong>Customer:</strong> ${order.student ? order.student.custName : "Guest"} (${order.student ? order.student.custUid : "-"})</div>
        <div><strong>Phone:</strong> ${order.student ? order.student.custPhone : "-"}</div>
        <div><strong>Delivery:</strong> ${order.student ? [order.student.custHostel, order.student.custFloor, order.student.custRoom].filter(Boolean).join(", ") : "-"}</div>
        <div><strong>Placed:</strong> ${order.orderTime}</div>
        <div><strong>Payment:</strong> ${order.paymentMethod} (Ref: ${order.transactionRef})</div>
      </div>
      <div style="margin-bottom:1rem;">${itemsHtml}</div>
      <div style="display:flex; justify-content:space-between; font-weight:700; padding-top:0.5rem; border-top:2px solid var(--slate-200);">
        <span>Total</span><span>${money(order.total)}</span>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="closeModalBtn2">Close</button>
      </div>
    `);
    document.getElementById("closeModalBtn").addEventListener("click", closeModal);
    document.getElementById("closeModalBtn2").addEventListener("click", closeModal);
  }

  // -------------------- Products page --------------------
  function renderProductsPage() {
    const body = document.getElementById("productsBody");
    const searchInput = document.getElementById("productSearchInput");
    const catFilter = document.getElementById("productCategoryFilter");

    const products = StoreData.getProducts();
    const categories = [...new Set(products.map((p) => p.categoryLabel || p.category))];
    catFilter.innerHTML = `<option value="all">All Categories</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");

    function render() {
      const q = (searchInput.value || "").toLowerCase().trim();
      const cat = catFilter.value;
      let list = StoreData.getProducts();
      if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
      if (cat !== "all") list = list.filter((p) => (p.categoryLabel || p.category) === cat);

      if (list.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.5rem;">No products found.</td></tr>`;
        return;
      }

      body.innerHTML = list
        .map((p) => {
          const stockTag =
            p.inStock !== false && (p.stockCount === undefined || p.stockCount > 0)
              ? `<span class="in-stock-tag">In Stock</span>`
              : `<span class="out-of-stock-tag">Out of Stock</span>`;
          return `
          <tr data-id="${p.id}">
            <td>
              <div class="prod-name-cell">
                <img src="${escapeAttr(resolveImg(p.image))}" class="prod-thumb" onerror="this.style.visibility='hidden'">
                <span>${escapeHtml(p.name)}</span>
              </div>
            </td>
            <td>${escapeHtml(p.categoryLabel || p.category || "-")}</td>
            <td>₹${p.price}</td>
            <td>₹${p.cost !== undefined ? p.cost : "-"}</td>
            <td>${p.stockCount !== undefined ? p.stockCount : "-"}</td>
            <td>${stockTag}</td>
            <td style="display:flex; gap:0.4rem;">
              <button class="action-btn edit-product-btn" data-id="${p.id}" title="Edit">✎</button>
              <button class="action-btn delete-product-btn" data-id="${p.id}" title="Delete">🗑</button>
            </td>
          </tr>`;
        })
        .join("");

      body.querySelectorAll(".edit-product-btn").forEach((btn) => {
        btn.addEventListener("click", () => openEditProductModal(btn.dataset.id));
      });
      body.querySelectorAll(".delete-product-btn").forEach((btn) => {
        btn.addEventListener("click", () => confirmDeleteProduct(btn.dataset.id));
      });
    }

    searchInput.oninput = render;
    catFilter.onchange = render;
    render();
  }

  function resolveImg(src) {
    if (!src) return "";
    if (src.startsWith("http") || src.startsWith("/")) return src;
    return "/" + src;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function productFormHtml(p) {
    p = p || {};
    return `
      <div class="form-grid-2">
        <div class="form-row">
          <label>Product Name *</label>
          <input type="text" id="pfName" value="${escapeAttr(p.name || "")}" required>
        </div>
        <div class="form-row">
          <label>Category *</label>
          <input type="text" id="pfCategory" value="${escapeAttr(p.categoryLabel || p.category || "")}" placeholder="e.g. Stationary Essentials" required>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-row">
          <label>Selling Price (₹) *</label>
          <input type="number" id="pfPrice" value="${p.price !== undefined ? p.price : ""}" required>
        </div>
        <div class="form-row">
          <label>Cost Price (₹)</label>
          <input type="number" id="pfCost" value="${p.cost !== undefined ? p.cost : ""}">
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-row">
          <label>Stock Count</label>
          <input type="number" id="pfStock" value="${p.stockCount !== undefined ? p.stockCount : ""}">
        </div>
        <div class="form-row">
          <label>In Stock?</label>
          <select id="pfInStock">
            <option value="true" ${p.inStock !== false ? "selected" : ""}>Yes</option>
            <option value="false" ${p.inStock === false ? "selected" : ""}>No</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>Image URL</label>
        <input type="text" id="pfImage" value="${escapeAttr(p.image || "")}" placeholder="assets/images/... or https://...">
      </div>
      <div class="form-row">
        <label>Description</label>
        <textarea id="pfDescription">${escapeHtml(p.description || "")}</textarea>
      </div>
    `;
  }

  function readProductForm(existing) {
    const name = document.getElementById("pfName").value.trim();
    const category = document.getElementById("pfCategory").value.trim();
    const price = parseFloat(document.getElementById("pfPrice").value);
    const cost = parseFloat(document.getElementById("pfCost").value);
    const stockCount = parseInt(document.getElementById("pfStock").value, 10);
    const inStock = document.getElementById("pfInStock").value === "true";
    const image = document.getElementById("pfImage").value.trim();
    const description = document.getElementById("pfDescription").value.trim();

    if (!name || !category || isNaN(price)) {
      alert("Please fill in product name, category, and price.");
      return null;
    }

    const product = Object.assign({}, existing || {}, {
      id: existing ? existing.id : StoreData.generateId(),
      name,
      category: category.toLowerCase().replace(/\s+/g, "-"),
      categoryLabel: category,
      price,
      cost: isNaN(cost) ? Math.round(price * 0.6) : cost,
      originalPrice: existing && existing.originalPrice ? existing.originalPrice : price,
      stockCount: isNaN(stockCount) ? 0 : stockCount,
      inStock,
      image: image || (existing ? existing.image : ""),
      gallery: existing && existing.gallery && existing.gallery.length ? existing.gallery : [image || ""],
      description,
      rating: existing && existing.rating ? existing.rating : 4.5,
      reviewsCount: existing && existing.reviewsCount ? existing.reviewsCount : 0,
      specs: existing && existing.specs ? existing.specs : [],
      tags: existing && existing.tags ? existing.tags : [name.toLowerCase()],
    });
    return product;
  }

  function openAddProductModal() {
    openModal(`
      <div class="modal-title-row">
        <h3>Add New Product</h3>
        <button class="modal-close-btn" id="closeModalBtn">✕</button>
      </div>
      <form id="productForm">
        ${productFormHtml()}
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelProductBtn">Cancel</button>
          <button type="submit" class="btn-primary">Add Product</button>
        </div>
      </form>
    `);
    document.getElementById("closeModalBtn").addEventListener("click", closeModal);
    document.getElementById("cancelProductBtn").addEventListener("click", closeModal);
    document.getElementById("productForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const product = readProductForm(null);
      if (!product) return;
      StoreData.saveProduct(product);
      closeModal();
      renderProductsPage();
      renderProfitPage();
    });
  }

  function openEditProductModal(id) {
    const product = StoreData.getProducts().find((p) => p.id === id);
    if (!product) return;
    openModal(`
      <div class="modal-title-row">
        <h3>Edit Product</h3>
        <button class="modal-close-btn" id="closeModalBtn">✕</button>
      </div>
      <form id="productForm">
        ${productFormHtml(product)}
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelProductBtn">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    `);
    document.getElementById("closeModalBtn").addEventListener("click", closeModal);
    document.getElementById("cancelProductBtn").addEventListener("click", closeModal);
    document.getElementById("productForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const updated = readProductForm(product);
      if (!updated) return;
      StoreData.saveProduct(updated);
      closeModal();
      renderProductsPage();
      renderProfitPage();
    });
  }

  function confirmDeleteProduct(id) {
    const product = StoreData.getProducts().find((p) => p.id === id);
    if (!product) return;
    openModal(`
      <div class="modal-title-row">
        <h3>Remove Product</h3>
        <button class="modal-close-btn" id="closeModalBtn">✕</button>
      </div>
      <p style="font-size:0.9rem; color:var(--slate-600); margin-bottom:1.25rem;">
        Are you sure you want to remove <strong>${escapeHtml(product.name)}</strong>? It will be removed from the live storefront immediately.
      </p>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancelDeleteBtn">Cancel</button>
        <button type="button" class="btn-primary" style="background:#ef4444;" id="confirmDeleteBtn">Remove Product</button>
      </div>
    `);
    document.getElementById("closeModalBtn").addEventListener("click", closeModal);
    document.getElementById("cancelDeleteBtn").addEventListener("click", closeModal);
    document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
      StoreData.deleteProduct(id);
      closeModal();
      renderProductsPage();
      renderProfitPage();
    });
  }

  // -------------------- Profit page --------------------
  function renderProfitPage() {
    const stats = StoreData.getStats();
    document.getElementById("profitRevenue").textContent = money(stats.revenue);
    document.getElementById("profitCost").textContent = money(stats.revenue - stats.profit);
    document.getElementById("profitNet").textContent = money(stats.profit);

    const body = document.getElementById("profitByCategoryBody");
    const categories = Object.keys(stats.byCategory);
    if (categories.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:1.5rem;">No sales data yet.</td></tr>`;
      return;
    }
    body.innerHTML = categories
      .map((cat) => {
        const c = stats.byCategory[cat];
        const margin = c.revenue > 0 ? ((c.profit / c.revenue) * 100).toFixed(1) : "0.0";
        return `<tr><td>${escapeHtml(cat)}</td><td>${money(c.revenue)}</td><td>${money(c.cost)}</td><td>${money(c.profit)}</td><td>${margin}%</td></tr>`;
      })
      .join("");
  }

  // -------------------- Clients / Customer Support page --------------------
  function renderClientsPage() {
    const stats = StoreData.getStats();
    const body = document.getElementById("clientsBody");
    if (stats.clients.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:1.5rem;">No clients yet — clients appear here after their first order.</td></tr>`;
      return;
    }
    body.innerHTML = stats.clients
      .map(
        (c) => `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.uid)}</td>
          <td>${escapeHtml(c.phone)}</td>
          <td>${escapeHtml(c.email)}</td>
          <td>${c.orders}</td>
          <td>${money(c.spent)}</td>
        </tr>`
      )
      .join("");
  }

  // -------------------- Charts --------------------
  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  let lastByDate = {};
  window.addEventListener(
    "resize",
    debounce(() => drawRevenueChart(lastByDate), 200)
  );

  function drawRevenueChart(byDate) {
    lastByDate = byDate || {};
    const canvas = document.getElementById("revenueChart");
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.parentElement.clientWidth;
    const h = 170;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const entries = Object.entries(lastByDate);
    const padL = 52, padR = 10, padT = 10, padB = 24;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    if (entries.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No revenue data yet — place an order on the storefront to see it here.", w / 2, h / 2);
      return;
    }

    const data = entries.map(([label, val]) => ({ label, val }));
    const max = Math.max(...data.map((d) => d.val), 1) * 1.15;

    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px 'Plus Jakarta Sans', sans-serif";
    ctx.lineWidth = 1;
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const val = (max / steps) * i;
      const y = padT + chartH - (val / max) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText("₹" + Math.round(val).toLocaleString("en-IN"), padL - 8, y + 3);
    }

    const points = data.map((d, i) => ({
      x: data.length > 1 ? padL + (i / (data.length - 1)) * chartW : padL + chartW / 2,
      y: padT + chartH - (d.val / max) * chartH,
      label: d.label,
    }));

    ctx.textAlign = "center";
    points.forEach((p) => ctx.fillText(p.label, p.x, h - 6));

    if (points.length > 1) {
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, "rgba(59,130,246,0.25)");
      grad.addColorStop(1, "rgba(59,130,246,0.02)");

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1], curr = points[i];
        const midX = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
      }
      ctx.lineTo(points[points.length - 1].x, padT + chartH);
      ctx.lineTo(points[0].x, padT + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1], curr = points[i];
        const midX = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawStatusDonut(statusCount, totalOrders) {
    const canvas = document.getElementById("statusDonut");
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 170;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const outerR = 78, innerR = 52;

    const order = ["Completed", "Processing", "Pending", "Cancelled"];
    const colors = { Completed: "#10b981", Processing: "#3b82f6", Pending: "#f59e0b", Cancelled: "#ef4444" };
    const total = totalOrders || 0;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
    } else {
      let startAngle = -Math.PI / 2;
      order.forEach((key) => {
        const value = statusCount[key] || 0;
        const angle = (value / total) * Math.PI * 2;
        if (angle <= 0) return;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
        ctx.arc(cx, cy, innerR, startAngle + angle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[key];
        ctx.fill();
        startAngle += angle;
      });
    }

    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.font = "700 22px 'Poppins', sans-serif";
    ctx.fillText(String(total), cx, cy - 2);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Total Orders", cx, cy + 16);
  }
})();
