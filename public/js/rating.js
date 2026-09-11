// Crousty Tac — "Which food did you like the most?" (multi-select from
// the customer's own order) + an optional feedback comment.

(function () {
  const selected = new Set();

  window.toggleFavorite = function (el) {
    const id = el.dataset.itemId;
    if (selected.has(id)) { selected.delete(id); el.classList.remove('selected'); }
    else { selected.add(id); el.classList.add('selected'); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('submitRating').addEventListener('click', function () {
      const btn = this;
      btn.disabled = true;

      const payload = {
        orderCode: window.ORDER_CODE,
        favoriteItemIds: Array.from(selected),
        comments: document.getElementById('comments').value.trim()
      };

      (window.CroustyUI ? window.CroustyUI.fetch : fetch)('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, { errorText: 'Could not send your feedback — please try again.' })
        .then((r) => r.json())
        .then(() => {
          document.getElementById('ratingForm').style.display = 'none';
          document.getElementById('thankYou').style.display = 'block';
        })
        .catch(() => { btn.disabled = false; });
    });
  });
})();
