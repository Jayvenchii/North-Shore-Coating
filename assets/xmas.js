/* North Shore Coating: Christmas light installation quote form. */
(function () {
  "use strict";
  // top bar: the Thanksgiving deadline line comes down the day after Thanksgiving (4th Thursday of November)
  var bar = document.getElementById("xmas-banner");
  if (bar) {
    var now = new Date(), y = now.getFullYear(), nov1 = new Date(y, 10, 1).getDay();
    var thanks = new Date(y, 10, 1 + (4 - nov1 + 7) % 7 + 21, 23, 59, 59);
    if (now > thanks || now.getMonth() < 9) bar.textContent = "NOW BOOKING HOLIDAY LIGHT INSTALLS · DESIGN, INSTALL, TAKEDOWN & STORAGE";
  }
  var form = document.getElementById("xmas-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var el = function (n) { return form.elements.namedItem(n); };

  var WEBHOOK = "https://hooks.airtable.com/workflows/v1/genericWebhook/appJld0WSZrARaTkc/wflHBSQ6GT4QTydMk/wtrkZoOfdnMY8Y3Hw";
  var DRAFT = "nsc-xmas-draft";
  var TEXT = ["name", "phone", "email", "street", "city", "zip", "message"];
  var REQUIRED = ["name", "phone", "email", "street", "city"];
  var store = { get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
                del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} } };

  /* ---------- helpers ---------- */
  var digits = function (s) { var d = String(s || "").replace(/\D/g, ""); if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1); return d.slice(0, 10); };
  var fmtPhone = function (d) {
    if (!d) return "";
    if (d.length < 4) return "(" + d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  };
  var values = function () {
    return {
      name: String(el("name").value || "").replace(/\s+/g, " ").trim().slice(0, 80),
      phone: digits(el("phone").value),
      email: String(el("email").value || "").replace(/\s/g, "").slice(0, 100),
      street: String(el("street").value || "").replace(/\s+/g, " ").trim().slice(0, 120),
      city: String(el("city").value || "").replace(/\s+/g, " ").trim().slice(0, 60),
      zip: String(el("zip").value || "").replace(/\D/g, "").slice(0, 5),
      message: String(el("message").value || "").trim().slice(0, 600)
    };
  };
  var check = function (d) {
    var r = {
      name: /[A-Za-zÀ-ſ]{2,}\s+[A-Za-zÀ-ſ]/.test(d.name),
      phone: /^[2-9]\d{2}[2-9]\d{6}$/.test(d.phone),
      email: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(d.email),
      street: /^\d{1,6}[A-Za-z]?\s+.*[A-Za-z]{2,}/.test(d.street),
      city: /[A-Za-z]{2,}/.test(d.city)
    };
    r.all = REQUIRED.every(function (k) { return r[k]; });
    return r;
  };
  var tried = false;
  var showErrors = function (r) {
    REQUIRED.forEach(function (k) {
      var bad = !r[k];
      $("xerr-" + k).hidden = !bad;
      el(k).setAttribute("aria-invalid", bad ? "true" : "false");
      el(k).style.borderColor = bad ? "#b00020" : "#000000";
    });
    $("xform-summary").hidden = r.all;
  };

  /* ---------- draft (typed fields only) ---------- */
  var saveDraft = function () {
    var d = {}; TEXT.forEach(function (k) { d[k] = el(k).value; });
    store.set(DRAFT, JSON.stringify(d));
  };
  (function restore() {
    try {
      var d = JSON.parse(store.get(DRAFT) || "null");
      if (!d) return;
      TEXT.forEach(function (k) { if (typeof d[k] === "string") el(k).value = d[k]; });
    } catch (e) {}
  })();
  form.addEventListener("input", function (e) {
    var t = e.target;
    if (t.name === "phone") { var v = fmtPhone(t.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10)); if (v !== t.value) t.value = v; }
    if (t.name === "street") el("zip").value = ""; // ZIP comes only from a picked suggestion
    saveDraft();
    if (tried) showErrors(check(values()));
  });
  form.addEventListener("change", function () { saveDraft(); if (tried) showErrors(check(values())); });

  /* ---------- address autocomplete (Photon / OpenStreetMap, limited to the North Shore area) ---------- */
  var street = el("street"), list = $("x-street-list");
  var acItems = [], acActive = -1, acTimer = null, acCtrl = null;
  var acClose = function () { list.hidden = true; list.textContent = ""; acItems = []; acActive = -1; street.setAttribute("aria-expanded", "false"); street.removeAttribute("aria-activedescendant"); };
  var acPaint = function () {
    Array.prototype.forEach.call(list.children, function (li, i) { li.setAttribute("aria-selected", i === acActive ? "true" : "false"); });
    if (acActive >= 0) street.setAttribute("aria-activedescendant", "x-ac-" + acActive); else street.removeAttribute("aria-activedescendant");
  };
  var acPick = function (i) {
    var it = acItems[i]; if (!it) return;
    street.value = it.line1;
    if (it.city) el("city").value = it.city;
    el("zip").value = it.zip || "";
    acClose(); saveDraft();
    if (tried) showErrors(check(values()));
  };
  var acShow = function (items) {
    acItems = items; acActive = -1; list.textContent = "";
    if (!items.length) { acClose(); return; }
    items.forEach(function (it, i) {
      var li = document.createElement("li");
      li.id = "x-ac-" + i; li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
      li.textContent = it.line1;
      var sm = document.createElement("small"); sm.textContent = [it.city, it.state, it.zip].filter(Boolean).join(", "); li.appendChild(sm);
      li.addEventListener("mousedown", function (e) { e.preventDefault(); acPick(i); });
      list.appendChild(li);
    });
    list.hidden = false; street.setAttribute("aria-expanded", "true");
  };
  var acSearch = function (q) {
    if (acCtrl) { try { acCtrl.abort(); } catch (e) {} }
    acCtrl = typeof AbortController === "function" ? new AbortController() : null;
    var url = "https://photon.komoot.io/api/?limit=5&lang=en&bbox=-88.35,41.95,-87.55,42.52&q=" + encodeURIComponent(q);
    fetch(url, { signal: acCtrl ? acCtrl.signal : undefined }).then(function (r) { return r.json(); }).then(function (data) {
      var seen = {}, out = [];
      (data.features || []).forEach(function (f) {
        var p = f.properties || {};
        var road = p.street || (p.type === "street" ? p.name : "");
        if (!road) return;
        var line1 = (p.housenumber ? p.housenumber + " " : "") + road;
        var it = { line1: line1, city: p.city || p.town || p.village || p.district || "", state: p.state === "Illinois" ? "IL" : (p.state || ""), zip: (p.postcode || "").slice(0, 5) };
        var key = line1 + "|" + it.city + "|" + it.zip;
        if (!seen[key]) { seen[key] = 1; out.push(it); }
      });
      if (document.activeElement === street) acShow(out);
    }).catch(function () {});
  };
  street.addEventListener("input", function () {
    clearTimeout(acTimer);
    var q = street.value.trim();
    if (q.length < 3) { acClose(); return; }
    acTimer = setTimeout(function () { acSearch(q); }, 250);
  });
  street.addEventListener("keydown", function (e) {
    if (list.hidden || !acItems.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); acActive = (acActive + 1) % acItems.length; acPaint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); acActive = (acActive - 1 + acItems.length) % acItems.length; acPaint(); }
    else if (e.key === "Enter" && acActive >= 0) { e.preventDefault(); acPick(acActive); }
    else if (e.key === "Escape") { acClose(); }
  });
  street.addEventListener("blur", function () { setTimeout(acClose, 150); });

  /* ---------- send ---------- */
  var buildBody = function (d) {
    var b = new URLSearchParams();
    b.append("name", d.name);
    b.append("customer_type", "");
    b.append("phone", fmtPhone(d.phone));
    b.append("email", d.email);
    b.append("street", d.street);
    b.append("city", d.city);
    b.append("state", "IL");
    b.append("zip", d.zip);
    b.append("address", d.street + ", " + d.city + ", IL" + (d.zip ? " " + d.zip : ""));
    b.append("heard_about_us", "");
    b.append("message", d.message);
    b.append("photo_count", "0");
    b.append("service", "Christmas light installation");
    b.append("source", form.getAttribute("data-source") || "Christmas light installation quote form");
    b.append("submitted_at", new Date().toISOString());
    b.append("page", window.location.href);
    return b;
  };
  var busy = false;
  var setSending = function (on) {
    busy = on;
    $("xsubmit").disabled = on;
    form.setAttribute("aria-busy", on ? "true" : "false");
    $("xsubmit-spin").hidden = !on;
    $("xsubmit-label").textContent = on ? "Sending your request…" : "Get my free quote";
  };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    tried = true;
    $("xsend-error").hidden = true;
    var d = values();
    el("phone").value = fmtPhone(d.phone);
    var r = check(d);
    showErrors(r);
    if (!r.all) {
      var first = REQUIRED.filter(function (k) { return !r[k]; })[0];
      if (first) el(first).focus();
      return;
    }
    setSending(true);
    Promise.resolve(buildBody(d)).then(function (body) {
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
      // Airtable's webhook sends no CORS headers: post form-encoded data in no-cors mode; the reply is opaque.
      return fetch(WEBHOOK, { method: "POST", mode: "no-cors", body: body, signal: ctrl ? ctrl.signal : undefined }).then(function (res) {
        clearTimeout(t);
        if (res && res.type !== "opaque" && !res.ok) throw new Error("The server responded with an error (" + res.status + ").");
      }, function (err) {
        clearTimeout(t);
        throw new Error(err && err.name === "AbortError" ? "The request timed out." : "Check your internet connection.");
      });
    }).then(function () {
      setSending(false);
      store.del(DRAFT);
      // successful send: show /thank-you in the address bar (main Christmas page only)
      if (location.pathname === "/christmas-light-installation/") try { history.pushState(null, "", "/christmas-light-installation/thank-you"); } catch (err) {}
      $("xform-wrap").hidden = true;
      var done = $("xdone"); done.hidden = false;
      try { done.scrollIntoView({ behavior: "smooth", block: "center" }); done.focus({ preventScroll: true }); } catch (err) {}
    }, function (err) {
      setSending(false);
      $("xsend-error-msg").textContent = (err && err.message) || "Something went wrong.";
      $("xsend-error").hidden = false;
    });
  });

  $("xagain").addEventListener("click", function () {
    form.reset(); tried = false;
    el("zip").value = "";
    REQUIRED.forEach(function (k) { $("xerr-" + k).hidden = true; el(k).style.borderColor = "#000000"; el(k).setAttribute("aria-invalid", "false"); });
    $("xform-summary").hidden = true;
    $("xdone").hidden = true; $("xform-wrap").hidden = false;
    if (location.pathname === "/christmas-light-installation/thank-you") try { history.replaceState(null, "", "/christmas-light-installation/#quote"); } catch (err) {}
  });
})();
