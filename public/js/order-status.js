// Live-updating order status page via Socket.IO.

(function () {
  function normalize(status) {
    if (status === 'ready' || status === 'collected') return 'ready';
    if (status === 'preparing') return 'preparing';
    return 'new';
  }

  function applyStatus(rawStatus, estimatedMinutes) {
    const status = normalize(rawStatus);
    document.getElementById('statusTitle').textContent = status === 'ready' ? window.T.status_ready : status === 'preparing' ? window.T.status_preparing : window.T.status_received;
    document.getElementById('statusEmoji').textContent = status === 'ready' ? '🎉' : '👨‍🍳';

    document.querySelectorAll('.step').forEach((stepEl) => {
      const stepOrder = { new: 1, preparing: 2, ready: 3 };
      stepEl.classList.toggle('done', stepOrder[stepEl.dataset.step] <= stepOrder[status]);
    });

    const etaCard = document.getElementById('etaCard');
    if (estimatedMinutes && status === 'preparing') {
      etaCard.style.display = 'block';
      document.getElementById('etaNum').textContent = estimatedMinutes;
    } else {
      etaCard.style.display = 'none';
    }

    if (status === 'ready') {
      document.getElementById('rateLink').style.display = 'block';
      const toast = document.getElementById('readyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 6000);
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyStatus(window.INITIAL_STATUS, window.INITIAL_ESTIMATED_MINUTES);

    const socket = io();
    socket.emit('join_order', window.ORDER_CODE);
    socket.on('order_status_updated', function (data) {
      applyStatus(data.status, data.estimatedMinutes);
    });

    // Fallback poll every 15s in case a socket message was missed
    // (e.g. brief wifi drop) — keeps the screen accurate either way.
    setInterval(function () {
      fetch('/api/orders/' + window.ORDER_CODE)
        .then((r) => r.json())
        .then((order) => { if (order && order.status) applyStatus(order.status, order.estimated_minutes); })
        .catch(() => { if (window.CroustyUI && !navigator.onLine) window.CroustyUI.showOffline(); });
    }, 15000);
  });
})();
