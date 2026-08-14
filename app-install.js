/* PRC Pakistan — "App" footer link opens the Add-to-Home-Screen prompt.
   Falls back to a per-platform install modal, and only navigates to
   app.html when the app is already installed (standalone mode). */
(function () {
  'use strict';
  var deferredPrompt = null;
  var modal = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'app-install-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'app-install-title');
    modal.className = 'fixed inset-0 items-center justify-center p-6';
    modal.style.cssText =
      'display:none;z-index:999;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    modal.innerHTML =
      '<div class="bg-white rounded-3xl w-full max-w-md mx-auto p-6 shadow-2xl">' +
      '<p id="app-install-title" class="font-display text-xl font-bold text-dark mb-1">Install the PRC Pakistan App</p>' +
      '<p class="text-sm text-dark/60 mb-4">Get the app on your home screen for quick access to articles, check-ins and support.</p>' +
      '<div class="flex flex-col gap-3 text-sm text-dark/70 leading-relaxed">' +
      '<p><span class="font-bold text-dark">Android / Chrome:</span> open the menu (&#8943;) &rarr; &ldquo;Add to Home screen&rdquo; &rarr; &ldquo;Install&rdquo;.</p>' +
      '<p><span class="font-bold text-dark">iPhone / Safari:</span> tap the Share button &rarr; &ldquo;Add to Home Screen&rdquo;.</p>' +
      '</div>' +
      '<button type="button" id="app-install-ok" class="mt-5 w-full bg-primary text-white py-3 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">Got it</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) hide();
    });
    modal.querySelector('#app-install-ok').addEventListener('click', hide);
    return modal;
  }

  function show() {
    var m = ensureModal();
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    var ok = m.querySelector('#app-install-ok');
    if (ok) setTimeout(function () { ok.focus(); }, 50);
  }

  function hide() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  document.querySelectorAll('[data-install-app]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (isStandalone()) return; // app already installed — let the link open it
      e.preventDefault();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
      } else {
        show();
      }
    });
  });

  // Register the service worker on every page so the whole site is
  // installable (beforeinstallprompt only fires on SW-controlled pages).
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})();
