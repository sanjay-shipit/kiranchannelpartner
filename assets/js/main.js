/* Kiran Channel Partner — site behaviour (no dependencies). */
(function () {
  'use strict';

  // Existing WhatsApp number. If it changes, also update the wa.me links in index.html.
  var WA_NUMBER = '15553680842';

  var doc = document;
  var body = doc.body;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var prefersReducedMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* ---------- Year ---------- */
  var yearEl = $('#currentYear');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header state + back to top ---------- */
  var header = $('#header');
  var toTop = $('#backToTop');
  var scrollQueued = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 900);
    scrollQueued = false;
  }
  window.addEventListener('scroll', function () {
    if (!scrollQueued) { scrollQueued = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuToggle = $('#menuToggle');
  var mobileMenu = $('#mobileMenu');
  var backgroundRegions = [$('#main'), $('.footer'), $('.wa-fab'), $('.topbar')].filter(Boolean);

  function setMenu(open) {
    if (!menuToggle || !mobileMenu) return;
    mobileMenu.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.classList.toggle('menu-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    if (open) mobileMenu.removeAttribute('inert'); else mobileMenu.setAttribute('inert', '');
    backgroundRegions.forEach(function (el) { el.inert = open; });
    if (open) {
      var first = $('a', mobileMenu);
      if (first) first.focus({ preventScroll: true });
    }
  }
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      setMenu(!mobileMenu.classList.contains('is-open'));
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        setMenu(false);
        menuToggle.focus();
      }
    });
    if (window.matchMedia) {
      var desktopMq = window.matchMedia('(min-width: 1120px)');
      var onMq = function (mq) { if (mq.matches) setMenu(false); };
      if (desktopMq.addEventListener) desktopMq.addEventListener('change', onMq);
      else if (desktopMq.addListener) desktopMq.addListener(onMq);
    }
  }

  /* ---------- Active section in navigation ---------- */
  var navLinks = $$('.nav__list a[href^="#"]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var linkFor = {};
    navLinks.forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = linkFor[entry.target.id];
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(linkFor).forEach(function (id) {
      var section = doc.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion()) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { revealer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
  // Safety net: never leave content hidden if an observer callback is missed.
  window.addEventListener('beforeprint', function () {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  });

  /* ---------- Legal dialogs ---------- */
  function openModal(id) {
    var dialog = doc.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }
  function closeModal(id) {
    var dialog = doc.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  doc.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.getAttribute('data-modal-open'));
      return;
    }
    var closer = e.target.closest('[data-modal-close]');
    if (closer) {
      var dlg = closer.closest('dialog');
      if (dlg) closeModal(dlg.id);
    }
  });
  $$('dialog.modal').forEach(function (dialog) {
    // A click on the backdrop targets the dialog element itself.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeModal(dialog.id); });
  });
  var hashModals = { '#privacy-policy': 'privacyModal', '#terms': 'termsModal', '#rera-disclaimer': 'reraModal' };
  if (hashModals[window.location.hash]) openModal(hashModals[window.location.hash]);

  /* ---------- Site visit form ---------- */
  var form = $('#siteVisitForm');
  var fields = {
    name: $('#fullName'),
    phone: $('#phoneNum'),
    loc: $('#preferredLoc'),
    date: $('#visitDate'),
    req: $('#reqOrDate')
  };
  var submitBtn = $('#submitBtn');
  var formError = $('#formError');
  var successCard = $('#formSuccessCard');
  var liveRegion = $('#formLive');
  var attempted = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function formatVisitDate(iso) {
    var parts = iso.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    try {
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (err) {
      return iso;
    }
  }
  function locationLabel(value) {
    return value === 'Both' ? 'Kompally & Shadnagar' : value;
  }

  // Accepts 10-digit Indian numbers (with optional +91 / 0 prefix and spaces)
  // or an international number starting with "+". Returns null when invalid.
  function normalisePhone(raw) {
    var trimmed = String(raw || '').trim();
    var digits = trimmed.replace(/\D/g, '');
    var intl = trimmed.charAt(0) === '+';
    var local = digits;
    if (digits.length === 12 && digits.indexOf('91') === 0) local = digits.slice(2);
    else if (!intl && digits.length === 11 && digits.charAt(0) === '0') local = digits.slice(1);
    if (/^\d{10}$/.test(local) && !/^(\d)\1{9}$/.test(local) && !(intl && digits.indexOf('91') !== 0)) return local;
    if (intl && digits.indexOf('91') !== 0 && digits.length >= 8 && digits.length <= 15) return '+' + digits;
    return null;
  }

  // Combines the date picker and requirements into the single "reqOrDate"
  // value the Google Sheet has always received.
  function composeReqOrDate() {
    var date = fields.date && fields.date.value ? 'Preferred date: ' + formatVisitDate(fields.date.value) : '';
    var req = fields.req ? fields.req.value.trim() : '';
    if (date && req) return date + ' | ' + req;
    return date || req;
  }

  function setFieldError(field, message) {
    if (!field) return;
    var errorEl = doc.getElementById(field.id + 'Error');
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    if (errorEl) errorEl.textContent = message || '';
  }

  function validate() {
    var errors = [];
    var name = fields.name.value.trim();
    var nameOk = name.length >= 2;
    try { nameOk = nameOk && /\p{L}/u.test(name); } catch (err) { nameOk = nameOk && /[A-Za-z]/.test(name); }
    errors.push([fields.name, nameOk ? '' : 'Please enter your full name.']);

    errors.push([fields.phone, normalisePhone(fields.phone.value) ? '' : 'Please enter a valid 10-digit mobile number.']);
    errors.push([fields.loc, fields.loc.value ? '' : 'Please choose a preferred location.']);

    var dateVal = fields.date.value;
    var reqVal = fields.req.value.trim();
    var dateMsg = '';
    var reqMsg = '';
    if (dateVal && dateVal < todayISO()) dateMsg = 'Please choose today or a later date.';
    if (!dateVal && !reqVal) reqMsg = 'Please add a preferred visit date or a short note on your requirements.';
    errors.push([fields.date, dateMsg]);
    errors.push([fields.req, reqMsg]);

    errors.forEach(function (pair) { setFieldError(pair[0], pair[1]); });
    // "Date or requirements" is one rule, so flag both inputs when it fails.
    if (reqMsg) fields.date.setAttribute('aria-invalid', 'true');
    return errors.filter(function (pair) { return pair[1]; });
  }

  function setSending(sending) {
    if (!submitBtn) return;
    submitBtn.disabled = sending;
    submitBtn.setAttribute('aria-busy', String(sending));
    var label = $('.btn__label', submitBtn);
    if (label) label.textContent = sending ? 'Sending your request…' : 'Request Site Visit';
    form.classList.toggle('is-sending', sending);
  }

  function postToSheet(url, data) {
    var params = new URLSearchParams();
    params.append('fullName', data.name);
    params.append('phoneNum', data.phone);
    params.append('preferredLoc', data.loc);
    params.append('reqOrDate', data.reqOrDate);
    params.append('timestamp', data.timestamp);
    params.append('name', data.name);
    params.append('phone', data.phone);
    params.append('mobile', data.phone);
    params.append('location', data.loc);
    params.append('preferredLocation', data.loc);
    params.append('requirements', data.reqOrDate);
    params.append('message', data.reqOrDate);

    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, 20000) : null;
    // Google Apps Script does not send CORS headers, so the response is opaque:
    // a resolved promise means the request reached Google; a rejection means it did not.
    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) window.clearTimeout(timer);
      return res;
    }, function (err) {
      if (timer) window.clearTimeout(timer);
      throw err;
    });
  }

  function whatsappUrl(text) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
  }

  function sendViaWhatsAppDirect() {
    var name = fields.name.value.trim() || 'A Client';
    var phone = fields.phone.value.trim() || 'Not provided';
    var loc = fields.loc.value || 'Not selected';
    var req = composeReqOrDate() || 'Site visit inquiry';
    var text = 'Hello Kiran Channel Partner,\n\nI would like to book a site visit!\n\n' +
      '📌 Name: ' + name + '\n📞 Phone: ' + phone + '\n📍 Preferred Location: ' + loc + '\n📝 Requirement/Date: ' + req;
    window.open(whatsappUrl(text), '_blank', 'noopener');
  }

  function strongText(text) {
    var el = doc.createElement('strong');
    el.textContent = text;
    return el;
  }

  function showSuccess(data) {
    var firstName = data.name.split(/\s+/)[0];
    var title = $('#successTitle');
    var msg = $('#successCardMsg');
    var waBtn = $('#successWaBtn');
    var loc = locationLabel(data.loc);

    if (title) title.textContent = 'Thank you, ' + firstName + '.';
    if (msg) {
      while (msg.firstChild) msg.removeChild(msg.firstChild);
      msg.appendChild(doc.createTextNode('Your site visit request for '));
      msg.appendChild(strongText(loc));
      msg.appendChild(doc.createTextNode(' has been sent. Our team will call you on '));
      msg.appendChild(strongText(data.phone));
      msg.appendChild(doc.createTextNode(' to confirm the details.'));
    }
    if (waBtn) {
      waBtn.href = whatsappUrl('Hi Kiran Channel Partner, I just submitted a site visit request on your website for ' +
        data.loc + '. (Name: ' + data.name + ', Phone: ' + data.phone + ')');
    }

    form.hidden = true;
    successCard.hidden = false;
    if (liveRegion) liveRegion.textContent = 'Your site visit request has been sent.';
    successCard.focus({ preventScroll: true });
    var card = $('#formCard');
    if (card) {
      var top = card.getBoundingClientRect().top;
      var headerH = header ? header.offsetHeight : 0;
      if (top < headerH) window.scrollBy({ top: top - headerH - 16, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function resetFormCard() {
    form.reset();
    Object.keys(fields).forEach(function (key) { setFieldError(fields[key], ''); });
    attempted = false;
    if (formError) formError.hidden = true;
    successCard.hidden = true;
    form.hidden = false;
    if (liveRegion) liveRegion.textContent = '';
    fields.name.focus();
  }

  function selectLocation(name) {
    if (!fields.loc) return;
    fields.loc.value = name;
    setFieldError(fields.loc, '');
    fields.loc.classList.add('is-prefilled');
    window.setTimeout(function () { fields.loc.classList.remove('is-prefilled'); }, 1800);
  }

  if (form && fields.name && fields.phone && fields.loc && fields.date && fields.req) {
    form.noValidate = true;
    fields.date.min = todayISO();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.classList.contains('is-sending')) return;
      attempted = true;
      if (formError) formError.hidden = true;

      var errors = validate();
      if (errors.length) {
        errors[0][0].focus();
        return;
      }

      var data = {
        name: fields.name.value.trim(),
        phone: normalisePhone(fields.phone.value),
        loc: fields.loc.value,
        reqOrDate: composeReqOrDate(),
        timestamp: new Date().toLocaleString()
      };

      setSending(true);
      postToSheet(form.getAttribute('action'), data).then(function () {
        setSending(false);
        showSuccess(data);
      }, function () {
        setSending(false);
        if (formError) {
          formError.hidden = false;
          formError.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      });
    });

    // Re-check a field as the visitor corrects it, once they've tried to submit.
    ['input', 'change'].forEach(function (evt) {
      form.addEventListener(evt, function (e) {
        if (attempted && e.target.matches('input, select, textarea')) validate();
      });
    });

    $$('[data-wa-direct]').forEach(function (btn) { btn.addEventListener('click', sendViaWhatsAppDirect); });
    var resetBtn = $('#resetFormBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFormCard);
  }

  // Property "Enquire" buttons pre-select the location in the form.
  $$('[data-location]').forEach(function (el) {
    el.addEventListener('click', function () { selectLocation(el.getAttribute('data-location')); });
  });

  // Keep the original global helpers available for any external links or snippets.
  window.selectLocation = selectLocation;
  window.sendViaWhatsAppDirect = sendViaWhatsAppDirect;
  window.openModal = openModal;
  window.closeModal = closeModal;
})();
