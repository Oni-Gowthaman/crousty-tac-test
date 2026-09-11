// Crousty Tac — shared UI-state helper (loading spinner, offline banner,
// generic "something went wrong" banner). Include this script on any
// page and call window.CroustyUI.* — it builds its own markup so no
// page needs to duplicate the HTML.

(function () {
  function injectMarkup() {
    if (document.getElementById('croustyLoading')) return;

    const loading = document.createElement('div');
    loading.id = 'croustyLoading';
    loading.className = 'app-loading';
    loading.style.display = 'none';
    loading.innerHTML = '<div class="spinner"></div><div class="spinner-label" id="croustyLoadingLabel">Loading…</div>';
    document.body.appendChild(loading);

    const offline = document.createElement('div');
    offline.id = 'croustyOfflineBanner';
    offline.className = 'app-banner offline';
    offline.innerHTML =
      '<span class="dot"></span><span id="croustyOfflineText">You\'re offline — check your connection.</span>' +
      '<button class="retry-btn" id="croustyOfflineRetry">Retry</button>';
    offline.style.bottom = 'auto';
    document.body.appendChild(offline);

    const error = document.createElement('div');
    error.id = 'croustyErrorBanner';
    error.className = 'app-banner';
    error.style.bottom = '16px';
    error.innerHTML =
      '<span class="dot"></span><span id="croustyErrorText">Something went wrong.</span>' +
      '<button class="retry-btn" id="croustyErrorRetry">Retry</button>';
    document.body.appendChild(error);

    document.getElementById('croustyOfflineRetry').addEventListener('click', () => {
      if (navigator.onLine) hideOffline();
      else window.location.reload();
    });
  }

  function showLoading(label) {
    injectMarkup();
    document.getElementById('croustyLoadingLabel').textContent = label || 'Loading…';
    document.getElementById('croustyLoading').style.display = 'flex';
  }

  function hideLoading() {
    const el = document.getElementById('croustyLoading');
    if (el) el.style.display = 'none';
  }

  function showOffline(text) {
    injectMarkup();
    if (text) document.getElementById('croustyOfflineText').textContent = text;
    document.getElementById('croustyOfflineBanner').classList.add('show');
  }

  function hideOffline() {
    const el = document.getElementById('croustyOfflineBanner');
    if (el) el.classList.remove('show');
  }

  let lastRetry = null;
  function showError(text, retryFn) {
    injectMarkup();
    document.getElementById('croustyErrorText').textContent = text || 'Something went wrong.';
    const banner = document.getElementById('croustyErrorBanner');
    banner.classList.add('show');
    lastRetry = retryFn || null;
    const btn = document.getElementById('croustyErrorRetry');
    btn.style.display = retryFn ? 'inline-block' : 'none';
  }

  function hideError() {
    const el = document.getElementById('croustyErrorBanner');
    if (el) el.classList.remove('show');
  }

  // Wraps fetch(): shows the loading spinner, hides it when done, and
  // shows the error banner (with a Retry button) on network failure or
  // a non-2xx response. Pages call this instead of raw fetch() so every
  // request gets consistent loading/offline/error handling for free.
  function croustyFetch(url, options, opts) {
    opts = opts || {};
    if (opts.loadingLabel !== false) showLoading(opts.loadingLabel);
    return fetch(url, options)
      .then((res) => {
        hideLoading();
        if (!res.ok) throw new Error('Request failed (' + res.status + ')');
        return res;
      })
      .catch((err) => {
        hideLoading();
        if (!navigator.onLine) {
          showOffline();
        } else {
          showError(
            (opts.errorText) || "Something went wrong — please try again.",
            () => croustyFetch(url, options, opts)
          );
        }
        throw err;
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectMarkup();
    document.getElementById('croustyErrorRetry').addEventListener('click', () => {
      hideError();
      if (lastRetry) lastRetry();
    });
    if (!navigator.onLine) showOffline();
  });

  window.addEventListener('online', () => { hideOffline(); hideError(); });
  window.addEventListener('offline', () => showOffline());

  window.CroustyUI = { showLoading, hideLoading, showOffline, hideOffline, showError, hideError, fetch: croustyFetch };
})();
