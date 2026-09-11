// Crousty Tac — customer cart
// The cart lives in the browser (localStorage) per table, so it survives
// navigating between the menu and checkout pages without needing a login.

(function () {
  function cartKey() { return 'crousty_cart_' + (window.TABLE_CODE || 'default'); }
  function dipsKey() { return 'crousty_dips_' + (window.TABLE_CODE || 'default'); }

  function getCart() {
    try { return JSON.parse(localStorage.getItem(cartKey())) || {}; } catch (e) { return {}; }
  }
  function saveCart(cart) { localStorage.setItem(cartKey(), JSON.stringify(cart)); }

  function getDips() {
    try { return JSON.parse(localStorage.getItem(dipsKey())) || {}; } catch (e) { return {}; }
  }
  function saveDips(dips) { localStorage.setItem(dipsKey(), JSON.stringify(dips)); }

  function addItem(el) {
    const cart = getCart();
    const id = el.dataset.id;
    if (!cart[id]) {
      cart[id] = { id: id, nameEn: el.dataset.nameEn, nameFr: el.dataset.nameFr, price: parseFloat(el.dataset.price), photo: el.dataset.photo, qty: 0 };
    }
    cart[id].qty += 1;
    saveCart(cart);
  }

  function changeQty(id, delta) {
    const cart = getCart();
    if (!cart[id]) return;
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    saveCart(cart);
  }

  function removeItem(id) {
    const cart = getCart();
    delete cart[id];
    saveCart(cart);
  }

  function toggleDip(dipId) {
    const dips = getDips();
    const row = document.querySelector('.dip-row[data-dip-id="' + dipId + '"]');
    if (dips[dipId]) {
      delete dips[dipId];
    } else {
      dips[dipId] = {
        id: dipId,
        nameEn: row.dataset.dipNameEn,
        nameFr: row.dataset.dipNameFr,
        price: parseFloat(row.dataset.dipPrice)
      };
    }
    saveDips(dips);
    renderCheckout();
  }

  function foodTotals() {
    const cart = getCart();
    let count = 0, subtotal = 0;
    Object.values(cart).forEach((line) => { count += line.qty; subtotal += line.qty * line.price; });
    return { count, subtotal };
  }

  function dipsTotal() {
    const dips = getDips();
    return Object.values(dips).reduce((sum, d) => sum + d.price, 0);
  }

  function grandSubtotal() {
    const { subtotal } = foodTotals();
    return Math.round((subtotal + dipsTotal()) * 100) / 100;
  }

  function computeBreakdown() {
    const subtotal = grandSubtotal();
    const offer = window.ACTIVE_OFFER;
    let discount = 0;
    if (offer) {
      discount = offer.type === 'percentage' ? (subtotal * offer.value) / 100 : offer.value;
      discount = Math.min(discount, subtotal);
    }
    const afterDiscount = subtotal - discount;
    const settings = window.SETTINGS || { taxPercent: 0, chargePercent: 0 };
    const tax = Math.round(afterDiscount * (settings.taxPercent / 100) * 100) / 100;
    const charge = Math.round(afterDiscount * (settings.chargePercent / 100) * 100) / 100;
    const total = Math.round((afterDiscount + tax + charge) * 100) / 100;
    return { subtotal: Math.round(subtotal * 100) / 100, discount: Math.round(discount * 100) / 100, tax, charge, total };
  }

  function euro(n) { return '€' + n.toFixed(2); }

  // ---------------- Menu page ----------------
  function renderMenu() {
    const cart = getCart();
    document.querySelectorAll('.dish-card').forEach((card) => {
      const id = card.dataset.id;
      const slot = card.querySelector('.qty-slot');
      const qty = cart[id] ? cart[id].qty : 0;
      slot.innerHTML = '';
      if (qty > 0) {
        const wrap = document.createElement('div');
        wrap.className = 'qty-control';
        wrap.innerHTML = '<button type="button" data-action="minus">−</button><span>' + qty + '</span><button type="button" data-action="plus">+</button>';
        slot.appendChild(wrap);
      } else {
        const btn = document.createElement('button');
        btn.className = 'add-btn'; btn.type = 'button'; btn.dataset.action = 'add';
        btn.textContent = (window.T && window.T.add) || 'Add';
        slot.appendChild(btn);
      }
    });
    updateCartBar();
  }

  function updateCartBar() {
    const { count } = foodTotals();
    const bar = document.getElementById('cartBar');
    if (!bar) return;
    if (count > 0) {
      bar.classList.add('visible');
      document.getElementById('cartCount').textContent = count + (window.LANG === 'en' ? ' item' + (count > 1 ? 's' : '') : ' article' + (count > 1 ? 's' : ''));
      document.getElementById('cartAmount').textContent = euro(grandSubtotal());
    } else {
      bar.classList.remove('visible');
    }
  }

  document.addEventListener('click', function (e) {
    const card = e.target.closest('.dish-card');
    if (!card) return;
    const action = e.target.dataset.action;
    if (!action) return;
    const id = card.dataset.id;
    if (action === 'add') addItem(card);
    if (action === 'plus') changeQty(id, 1);
    if (action === 'minus') changeQty(id, -1);
    renderMenu();
  });

  // ---------------- Checkout page ----------------
  function renderCheckout() {
    const cart = getCart();
    const dips = getDips();
    const lines = Object.values(cart);
    const linesContainer = document.getElementById('cartLines');
    const emptyState = document.getElementById('cartEmptyState');

    if (!lines.length) {
      if (emptyState) emptyState.style.display = 'block';
      document.querySelectorAll('.card, .place-order-btn').forEach((el) => (el.style.display = 'none'));
      return;
    }

    linesContainer.innerHTML = '';
    lines.forEach((line) => {
      const name = window.LANG === 'en' ? line.nameEn : line.nameFr;
      const row = document.createElement('div');
      row.className = 'cart-line';
      row.innerHTML =
        '<div><div class="name">' + name + '</div><div class="meta">' + line.qty + ' × ' + euro(line.price) + '</div></div>' +
        '<div><b>' + euro(line.qty * line.price) + '</b> ' +
        '<button type="button" class="remove" data-id="' + line.id + '">' + ((window.T && window.T.remove) || 'Remove') + '</button></div>';
      linesContainer.appendChild(row);
    });
    linesContainer.querySelectorAll('.remove').forEach((btn) => {
      btn.addEventListener('click', function () { removeItem(btn.dataset.id); renderCheckout(); });
    });

    // Reflect the saved dip selections onto the checkbox rows.
    document.querySelectorAll('.dip-row').forEach((row) => {
      const checked = !!dips[row.dataset.dipId];
      const box = document.getElementById('dipCheck' + row.dataset.dipId);
      box.classList.toggle('checked', checked);
      box.textContent = checked ? '✓' : '';
    });

    const b = computeBreakdown();
    document.getElementById('sumSubtotal').textContent = euro(b.subtotal);
    document.getElementById('sumTotal').textContent = euro(b.total);

    const discRow = document.getElementById('sumDiscountRow');
    if (b.discount > 0) { discRow.style.display = 'flex'; document.getElementById('sumDiscount').textContent = '-' + euro(b.discount); }
    else discRow.style.display = 'none';

    const taxRow = document.getElementById('sumTaxRow');
    if (b.tax > 0) { taxRow.style.display = 'flex'; document.getElementById('sumTax').textContent = euro(b.tax); }
    else taxRow.style.display = 'none';

    const chargeRow = document.getElementById('sumChargeRow');
    if (b.charge > 0) { chargeRow.style.display = 'flex'; document.getElementById('sumCharge').textContent = euro(b.charge); }
    else chargeRow.style.display = 'none';

    document.querySelectorAll('.pay-options label').forEach((label) => {
      label.addEventListener('click', function () {
        document.querySelectorAll('.pay-options label').forEach((l) => l.classList.remove('selected'));
        label.classList.add('selected');
      });
    });
    const firstPay = document.querySelector('.pay-options label');
    if (firstPay) firstPay.classList.add('selected');

    const form = document.getElementById('checkoutForm');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', function (e) { e.preventDefault(); submitOrder(); });
    }
  }

  function submitOrder() {
    const cart = getCart();
    const dips = getDips();
    const lines = Object.values(cart);
    const dipLines = Object.values(dips);
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.textContent = '…';

    const payload = {
      tableCode: window.TABLE_CODE,
      name: document.getElementById('custName').value.trim(),
      mobile: document.getElementById('custMobile').value.trim(),
      items: lines.concat(dipLines).map((l) => ({ id: l.id, qty: l.qty || 1 })),
      paymentMode: document.querySelector('input[name="paymentMode"]:checked').value,
      lang: window.LANG,
      diningOption: window.DINING || 'dine_in',
      specialInstructions: (document.getElementById('cookingInstructions') || {}).value || ''
    };

    const restore = () => { btn.disabled = false; btn.textContent = (window.T && window.T.place_order) || 'Place order'; };

    (window.CroustyUI ? window.CroustyUI.fetch : fetch)('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { errorText: 'Could not place your order — please try again.' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { alert(data.error); restore(); return; }
        localStorage.removeItem(cartKey());
        localStorage.removeItem(dipsKey());
        showOrderConfirmed(data.orderCode);
      })
      .catch(() => restore());
  }

  function showOrderConfirmed(orderCode) {
    const overlay = document.getElementById('confirmOverlay');
    overlay.classList.add('show');
    document.getElementById('confirmContinueBtn').onclick = function () {
      window.location.href = '/t/' + window.TABLE_CODE + '/status/' + orderCode;
    };
  }

  window.CroustyCart = { renderMenu, renderCheckout, toggleDip };
})();
