// ==========================================================================
// Campus Store — Shared Data Layer
// Bridges the live storefront and the Admin Panel using localStorage as the
// data store: real customer orders (created at checkout) and a product
// override layer (admin-added/edited/removed products) that gets merged
// into PRODUCTS_DATA so changes show up on the storefront immediately.
//
// NOTE: This is browser-local storage, not a shared server database — data
// is real (not mock) but lives only on this device/browser until a backend
// (e.g. a small API + database) is added.
// ==========================================================================

const StoreData = (function () {
  const ORDERS_KEY = 'store_orders';
  const OVERRIDES_KEY = 'store_product_overrides';
  const DELETED_KEY = 'store_deleted_product_ids';

  // ---- Product catalog merge (runs immediately on load) ----
  function mergeProducts() {
    if (typeof PRODUCTS_DATA === 'undefined') return;
    try {
      const overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
      const deletedIds = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');

      // Remove admin-deleted base products
      for (let i = PRODUCTS_DATA.length - 1; i >= 0; i--) {
        if (deletedIds.includes(PRODUCTS_DATA[i].id)) {
          PRODUCTS_DATA.splice(i, 1);
        }
      }

      // Apply edits to existing products / append newly added ones
      Object.keys(overrides).forEach((id) => {
        const idx = PRODUCTS_DATA.findIndex((p) => p.id === id);
        if (idx >= 0) {
          PRODUCTS_DATA[idx] = overrides[id];
        } else {
          PRODUCTS_DATA.push(overrides[id]);
        }
      });
    } catch (e) {
      console.error('StoreData: product merge failed', e);
    }
  }
  mergeProducts();

  function getProducts() {
    return typeof PRODUCTS_DATA !== 'undefined' ? PRODUCTS_DATA : [];
  }

  function generateId() {
    return 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function saveProduct(product) {
    if (!product.id) product.id = generateId();
    const overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
    overrides[product.id] = product;
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));

    const list = getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.push(product);

    return product;
  }

  function deleteProduct(id) {
    const overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
    if (overrides[id]) {
      delete overrides[id];
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    } else {
      const deletedIds = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      if (!deletedIds.includes(id)) deletedIds.push(id);
      localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
    }
    const list = getProducts();
    const idx = list.findIndex((p) => p.id === id);
    if (idx >= 0) list.splice(idx, 1);
  }

  // ---- Orders (created for real at storefront checkout) ----
  function getOrders() {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const order = orders.find((o) => o.orderId === orderId);
    if (order) {
      order.status = status;
      saveOrders(orders);
    }
    return orders;
  }

  // ---- Aggregated stats for the admin dashboard ----
  function getStats() {
    const orders = getOrders();
    const products = getProducts();
    let revenue = 0;
    let profit = 0;
    const clientsMap = {};
    const statusCount = { Completed: 0, Processing: 0, Pending: 0, Cancelled: 0 };
    const byDate = {};
    const byCategory = {};

    orders.forEach((o) => {
      const status = o.status || 'Processing';
      statusCount[status] = (statusCount[status] || 0) + 1;

      const dateKey = (o.orderTime || '').split(',')[0] || 'Unknown';

      if (status !== 'Cancelled') {
        revenue += o.total || 0;
        byDate[dateKey] = (byDate[dateKey] || 0) + (o.total || 0);

        (o.items || []).forEach((item) => {
          const prod = products.find((p) => p.id === item.id);
          const cost = prod && typeof prod.cost === 'number' ? prod.cost : Math.round(item.price * 0.6);
          const lineProfit = (item.price - cost) * item.qty;
          const lineRevenue = item.price * item.qty;
          profit += lineProfit;

          const cat = prod ? (prod.categoryLabel || prod.category) : 'Other';
          if (!byCategory[cat]) byCategory[cat] = { revenue: 0, cost: 0, profit: 0 };
          byCategory[cat].revenue += lineRevenue;
          byCategory[cat].cost += cost * item.qty;
          byCategory[cat].profit += lineProfit;
        });
      }

      const key = (o.student && (o.student.custUid || o.student.custPhone)) || o.orderId;
      if (!clientsMap[key]) {
        clientsMap[key] = {
          name: (o.student && o.student.custName) || 'Guest',
          uid: (o.student && o.student.custUid) || '-',
          phone: (o.student && o.student.custPhone) || '-',
          email: (o.student && o.student.custEmail) || '-',
          orders: 0,
          spent: 0,
        };
      }
      clientsMap[key].orders += 1;
      if (status !== 'Cancelled') clientsMap[key].spent += o.total || 0;
    });

    return {
      revenue,
      profit,
      totalOrders: orders.length,
      totalClients: Object.keys(clientsMap).length,
      statusCount,
      clients: Object.values(clientsMap).sort((a, b) => b.spent - a.spent),
      orders: [...orders].sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime)),
      byDate,
      byCategory,
    };
  }

  return {
    getProducts,
    saveProduct,
    deleteProduct,
    generateId,
    getOrders,
    saveOrders,
    updateOrderStatus,
    getStats,
    ORDERS_KEY,
    OVERRIDES_KEY,
    DELETED_KEY,
  };
})();
