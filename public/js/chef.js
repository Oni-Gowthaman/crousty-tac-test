(function () {
  function fmtTimeAgo(dateStr, lang) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (mins < 1) return lang === 'en' ? 'just now' : "à l'instant";
    return mins + ' min ' + (lang === 'en' ? 'ago' : 'plus tôt');
  }

  function itemName(it) {
    return window.LANG === 'en' ? it.name_en : it.name_fr;
  }

  const PAY_LABEL = { cash: { en: 'Cash', fr: 'Espèces' }, card: { en: 'Card', fr: 'Carte' }, qr: { en: 'QR', fr: 'QR' } };
  const DINING_LABEL = { dine_in: { en: 'Dine in', fr: 'Sur place' }, takeaway: { en: 'Takeaway', fr: 'À emporter' } };

  function orderCard(order) {
    const itemsHtml = order.items
      .map((it) => '<li>' + it.quantity + '× ' + itemName(it) + '</li>')
      .join('');

    let actions = '';
    if (order.status === 'new') {
      actions =
        '<button class="btn-preparing" data-action="preparing" data-id="' + order.id + '">' + window.T.mark_preparing + '</button>' +
        '<input class="eta-input" type="number" min="1" max="60" placeholder="' + window.T.set_time + '" data-eta="' + order.id + '">';
    } else if (order.status === 'preparing') {
      actions = '<button class="btn-ready" data-action="ready" data-id="' + order.id + '">' + window.T.mark_ready + '</button>';
    } else if (order.status === 'ready') {
      actions = '<button class="btn-collected" data-action="collected" data-id="' + order.id + '">' + window.T.mark_collected + '</button>';
    }

    const lang = window.LANG;
    const tableLabel = order.is_counter ? (lang === 'en' ? 'Takeaway (counter)' : 'À emporter (comptoir)') : 'Table ' + order.table_number;
    const diningTag = DINING_LABEL[order.dining_option] ? DINING_LABEL[order.dining_option][lang] : '';
    const payTag = PAY_LABEL[order.payment_mode_label] ? PAY_LABEL[order.payment_mode_label][lang] : order.payment_mode_label;
    const instructionsHtml = order.special_instructions
      ? '<div class="instructions-tag">📝 ' + order.special_instructions + '</div>'
      : '';

    return (
      '<div class="order-card">' +
      '<div class="row1"><span class="table-num">' + tableLabel + '</span><span class="order-code">' + order.order_code + '</span></div>' +
      '<div class="customer">' + order.customer_name + ' · <span class="dining-tag">' + diningTag + '</span></div>' +
      '<ul>' + itemsHtml + '</ul>' +
      instructionsHtml +
      '<div class="order-meta-row"><span>' + (window.T.payment_label || 'Payment') + ': <b>' + payTag + '</b></span><span>€' + Number(order.total_amount).toFixed(2) + '</span></div>' +
      '<div class="time-ago">' + fmtTimeAgo(order.created_at, lang) + (order.estimated_minutes ? ' · ETA ' + order.estimated_minutes + ' min' : '') + '</div>' +
      '<div class="actions">' + actions + '</div>' +
      '</div>'
    );
  }

  function loadOrders() {
    fetch('/api/chef/orders')
      .then((r) => r.json())
      .then((orders) => {
        const cols = { new: [], preparing: [], ready: [] };
        orders.forEach((o) => cols[o.status] && cols[o.status].push(o));

        ['New', 'Preparing', 'Ready'].forEach((label) => {
          const key = label.toLowerCase();
          const container = document.getElementById('col' + label);
          const countEl = document.getElementById('count' + label);
          countEl.textContent = cols[key].length;
          container.innerHTML = cols[key].length
            ? cols[key].map(orderCard).join('')
            : '<div class="empty-col">' + window.T.no_orders + '</div>';
        });
      });
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const statusMap = { preparing: 'preparing', ready: 'ready', collected: 'collected' };
    const etaInput = document.querySelector('[data-eta="' + id + '"]');

    fetch('/api/chef/orders/' + id + '/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: statusMap[action],
        estimatedMinutes: etaInput ? etaInput.value : null
      })
    }).then(loadOrders);
  });

  document.addEventListener('change', function (e) {
    const toggle = e.target.closest('[data-toggle-id]');
    if (!toggle) return;
    fetch('/api/chef/menu/' + toggle.dataset.toggleId + '/toggle', { method: 'POST' });
  });

  function tickClock() {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toLocaleTimeString(window.LANG === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadOrders();
    tickClock();
    setInterval(tickClock, 15000);
    setInterval(loadOrders, 10000); // safety-net refresh alongside live socket pushes

    const socket = io();
    socket.emit('join_kitchen');
    socket.on('new_order', loadOrders);
    socket.on('orders_changed', loadOrders);
  });
})();
