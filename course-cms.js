/* ============================================================
   PRC Pakistan — Course CMS (Google Sheets backend)
   ------------------------------------------------------------
   1) PASTE your deployed Google Apps Script Web App URL below:
   const COURSES_API_URL = "PASTE_YOUR_GAPPS_WEBAPP_URL_HERE";
   2) This file is shared by:
        - index.html     (Courses & Programs cards)
        - services.html  (Courses & Programs cards)
        - contact.html   (course dropdown in the contact form)
   It fetches ONCE per page and feeds both consumers.
   ============================================================ */
(function () {
  'use strict';

  // ---- CONFIG -------------------------------------------------
  const COURSES_API_URL = 'https://script.google.com/macros/s/AKfycbzmDCheVR5_Hz5OuG9xvVZK_xkpe-13JjZpS5OfatIfLbj-UPo_1gSEFtDXCLXLugbR/exec';

  // Reused image for any course that has no image URL in the sheet.
  const COURSE_FALLBACK_IMAGE = 'images/course/independance day free session.webp';
  // Used when a course row has an empty "whatsapp" cell.
  const COURSE_WHATSAPP_DEFAULT = '923328274000';
  // WhatsApp community shown when there are no courses to list.
  const COURSE_WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/K3smDsKrzqfGnM4vkQlS7E?s=sh&p=i&ilr=4&amv=0';

  const isConfigured =
    COURSES_API_URL.indexOf('PASTE_') !== 0 && /^https:\/\//.test(COURSES_API_URL);

  // ---- Shared fetch (cached promise, single request per page) ----
  let _coursesPromise = null;

  async function fetchCourses() {
    if (!isConfigured) {
      throw new Error('Course CMS is not configured (COURSES_API_URL is still a placeholder).');
    }
    const res = await fetch(COURSES_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Course CMS request failed: HTTP ' + res.status);
    const data = await res.json();
    // Accept either a plain array or { ok, courses: [...] }.
    return Array.isArray(data) ? data : (data && Array.isArray(data.courses) ? data.courses : []);
  }

  function getCourses() {
    if (!_coursesPromise) {
      _coursesPromise = fetchCourses().catch(function (err) {
        _coursesPromise = null; // allow a retry if called again later
        throw err;
      });
    }
    return _coursesPromise;
  }

  // ---- Helpers ------------------------------------------------
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeCourse(c) {
    const str = function (v) { return String(v == null ? '' : v).trim(); };
    c = c || {};
    return {
      id: str(c.id),
      title: str(c.title) || 'Untitled Course',
      category: str(c.category),
      coach: str(c.coach),
      location: str(c.location),
      description: str(c.description),
      date: str(c.date),
      time: str(c.time),
      duration: str(c.duration),
      fee: str(c.fee),
      mode: str(c.mode),
      status: str(c.status),
      image: str(c.image),
      features: [c.feature1, c.feature2, c.feature3].map(str).filter(Boolean),
      whatsapp: str(c.whatsapp).replace(/\D/g, '') || COURSE_WHATSAPP_DEFAULT
    };
  }

  // Turns an Imgur share link (or direct link) into a direct image URL,
  // so coaches can paste "imgur.com/XXXX" straight into the sheet.
  function imageUrl(c) {
    const raw = c.image;
    if (raw) {
      const m = raw.match(/(?:i\.)?imgur\.com\/([a-zA-Z0-9]{5,})(?:\.\w+)?/);
      if (m) return 'https://i.imgur.com/' + m[1] + '.png';
      return raw;
    }
    return COURSE_FALLBACK_IMAGE;
  }

  function isCourseOpen(c) {
    const s = c.status.toLowerCase();
    if (s === '' || s === 'open' || s === 'available' || s === 'now open' || s === 'registering') {
      return true;
    }
    return !(s.indexOf('closed') !== -1 || s === 'close' || s === 'inactive' ||
             s === 'full' || s === 'sold out' || s === 'completed');
  }

  function isFree(c) {
    const f = c.fee.toLowerCase().replace(/[^a-z0-9.]/g, '');
    return f === '' || f === '0' || f === 'free';
  }

  function waLink(c, open) {
    if (!open) return '#';
    const text = 'Hi! I\u2019d like to register for ' + c.title +
      (c.date ? ' on ' + c.date : '') + (c.time ? ' at ' + c.time : '') + '.';
    return 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(text);
  }

  // ---- Course card (keeps the existing card design) -----------
  function buildCourseCard(raw) {
    const c = normalizeCourse(raw);
    const open = isCourseOpen(c);
    const badge = open
      ? { label: 'Open', cls: 'bg-green-500 text-white' }
      : { label: 'Closed', cls: 'bg-dark text-white' };

    const meta = [c.date, c.time, c.duration, c.mode ? c.mode.toUpperCase() : '']
      .filter(Boolean)
      .join(' \u00b7 ');

    const features = c.features
      .map(function (f) {
        return '<div class="flex items-center gap-2 text-sm text-dark/70">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-secondary" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
          escapeHtml(f) + '</div>';
      })
      .join('');

    const description = c.description
      ? '<p class="text-sm text-dark/70 mb-3 leading-relaxed">' + escapeHtml(c.description) + '</p>'
      : '';

    const coach = c.coach
      ? '<p class="flex items-center gap-2 text-xs text-dark/60 mb-1.5">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
          escapeHtml(c.coach) + '</p>'
      : '';

    const location = c.location
      ? '<p class="flex items-center gap-2 text-xs text-dark/60 mb-1.5">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>' +
          escapeHtml(c.location) + '</p>'
      : '';

    const price = isFree(c)
      ? '<p class="text-lg font-bold text-green-600">Free</p>'
      : '<p class="text-lg font-bold text-dark">' + escapeHtml(c.fee) + '</p>';

    const btnLabel = !open
      ? 'Registrations Closed'
      : (isFree(c) ? 'Register Free' : 'Register');
    const btnCls = open
      ? 'inline-flex items-center gap-2 bg-green-500 text-white text-xs rounded-full px-3 py-1.5 hover:bg-green-600 transition'
      : 'inline-flex items-center gap-2 bg-gray-200 text-gray-500 text-xs rounded-full px-3 py-1.5 cursor-not-allowed';
    const btnAttrs = open
      ? 'href="' + waLink(c, true) + '" target="_blank" rel="noopener noreferrer"'
      : 'href="#" aria-disabled="true"';

    return (
      '<div class="rounded-xl border-2 border-green-200 overflow-hidden bg-white card-hover relative">' +
        '<div class="absolute top-2 right-2 z-10 ' + badge.cls + ' text-xs font-bold px-3 py-1 rounded-full">' + badge.label + '</div>' +
        '<div class="aspect-square overflow-hidden">' +
          '<img src="' + imageUrl(c) + '" alt="' + escapeHtml(c.title) + '" class="w-full h-full object-cover" loading="lazy">' +
        '</div>' +
        '<div class="p-5">' +
          '<span class="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full">' + escapeHtml(c.category || 'Course') + '</span>' +
          '<h4 class="font-display text-lg mt-3 mb-2">' + escapeHtml(c.title) + '</h4>' +
          (meta ? '<p class="text-xs text-dark/50 mb-2">' + escapeHtml(meta) + '</p>' : '') +
          coach +
          location +
          description +
          (features ? '<div class="space-y-1 mb-4">' + features + '</div>' : '') +
          '<div class="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">' +
            '<div class="leading-tight">' +
              '<p class="text-[10px] uppercase tracking-wide text-dark/40 font-medium">Fee</p>' +
              price +
            '</div>' +
            '<a ' + btnAttrs + ' class="' + btnCls + '">' + btnLabel + '</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // Green "Join our WhatsApp group" button, shown when there is
  // nothing to list (empty sheet or the CMS is temporarily down).
  function waGroupButton() {
    return '<a href="' + COURSE_WHATSAPP_GROUP_URL + '" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
      'Join our WhatsApp group' +
    '</a>';
  }

  // ---- Course cards section (index.html / services.html) -----
  function initCourseGrid() {
    const grid = document.getElementById('course-grid');
    if (!grid) return;

    const status = document.getElementById('course-status');

    grid.innerHTML = '';
    if (status) status.textContent = 'Loading courses\u2026';

    getCourses()
      .then(function (courses) {
        if (!courses.length) {
          grid.innerHTML = '';
          if (status) {
            status.innerHTML =
              'New courses are coming soon!' +
              '<span class="flex justify-center mt-4">' + waGroupButton() + '</span>';
          }
          return;
        }
        grid.innerHTML = courses.map(buildCourseCard).join('');
        if (status) status.textContent = '';
      })
      .catch(function (err) {
        console.error('Course CMS:', err);
        grid.innerHTML = '';
        if (status) {
          status.innerHTML =
            'Course listings are temporarily unavailable. Please check back soon.' +
            '<span class="flex justify-center mt-4">' + waGroupButton() + '</span>';
        }
      });
  }

  // ---- Contact form course dropdown ---------------------------
  function initCourseSelect() {
    const select = document.getElementById('course');
    if (!select) return;

    getCourses()
      .then(function (courses) {
        const openCourses = courses.filter(isCourseOpen);

        const options = [];
        options.push('<option value="" disabled selected>Select a course</option>');

        if (openCourses.length) {
          openCourses.forEach(function (c) {
            options.push('<option value="' + escapeHtml(c.title) + '">' + escapeHtml(c.title) + '</option>');
          });
        } else {
          options.push('<option value="" disabled selected>No courses currently available</option>');
        }

        options.push('<option value="Other">Other</option>');
        select.innerHTML = options.join('');

        // Re-apply a ?course=... deep link now that options exist.
        const urlCourse = new URLSearchParams(window.location.search).get('course');
        if (urlCourse && openCourses.some(function (c) { return c.title === urlCourse; })) {
          select.value = urlCourse;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })
      .catch(function (err) {
        console.error('Course CMS:', err);
        // Keep the form usable even when the CMS is unreachable.
        select.innerHTML =
          '<option value="" disabled selected>Select a course</option>' +
          '<option value="" disabled>No courses currently available</option>' +
          '<option value="Other">Other</option>';
      });
  }

  // ---- Bootstrap ----------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initCourseGrid();
      initCourseSelect();
    });
  } else {
    initCourseGrid();
    initCourseSelect();
  }
})();