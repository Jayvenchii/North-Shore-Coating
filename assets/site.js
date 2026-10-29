/* North Shore Coating: homepage behavior (menu, before/after slider, blog arrows, estimate form). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- seasonal banner + footer year (kept current without a rebuild) ---------- */
  var now = new Date(), m = now.getMonth() + 1;
  var banner = $("season-banner"), year = $("copy-year");
  if (banner) banner.textContent = m === 2 ? "PLAN AHEAD & SAVE · LOCK IN EARLY-BIRD PRICING BEFORE OUR SPRING CALENDAR FILLS"
    : m === 3 ? "SPRING IS HERE! · LOCK IN EARLY-BIRD PRICING BEFORE OUR SPRING CALENDAR FILLS"
    : m === 4 ? "NOW BOOKING · RESTORE & PROTECT YOUR ASPHALT AFTER WINTER WEAR"
    : m === 5 ? "SUMMER IS ALMOST HERE! · RESTORE & PROTECT YOUR ASPHALT AFTER WINTER WEAR"
    : m === 6 ? "SUMMER IS HERE! · GET A FLAWLESS, JET-BLACK FINISH BEFORE THE 4TH OF JULY"
    : m === 7 || m === 8 ? "MID-SUMMER BLACKTOP DRIVEWAYS · RESTORE & PROTECT YOUR DRIVEWAY"
    : m === 9 ? "PRE-WINTER ASPHALT DEFENSE · BEAT THE WINTER DAMAGE"
    : m === 10 ? "THE COLD IS APPROACHING! · PROTECT YOUR DRIVEWAY BEFORE SALT & PLOW SEASON"
    : "SEASON CLOSED FOR APPLICATION · GET YOUR SPRING QUOTE NOW TO BE FIRST ON THE SCHEDULE";
  if (year) year.textContent = String(now.getFullYear());

  /* ---------- seasonal menu link: Christmas lights, August through January ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-season="xmas"]'), function (a) { a.hidden = !(m >= 8 || m === 1); });

  /* ---------- mobile / tablet menu ---------- */
  var menuBtn = $("menu-btn"), mnav = $("nsc-mnav");
  function setMenu(open) {
    if (!menuBtn || !mnav) return;
    mnav.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuBtn.querySelector(".ic-open").hidden = open;
    menuBtn.querySelector(".ic-close").hidden = !open;
  }
  if (menuBtn && mnav) {
    menuBtn.addEventListener("click", function () { setMenu(mnav.hidden); });
    mnav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !mnav.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---------- before / after sliders (hero + any in articles) ---------- */
  var slider = function (range, after, line, knob) {
    if (!range || !after) return;
    var paint = function () {
      var v = Number(range.value);
      after.style.clipPath = "inset(0 0 0 " + v + "%)";
      if (line) line.style.left = v + "%";
      if (knob) knob.style.left = v + "%";
    };
    range.addEventListener("input", paint);
    paint();
  };
  slider($("ba-range"), $("ba-after"), $("ba-line"), $("ba-knob"));
  Array.prototype.forEach.call(document.querySelectorAll(".nsc-ba"), function (box) {
    slider(box.querySelector(".nsc-ba-range"), box.querySelector(".nsc-ba-after"), box.querySelector(".nsc-ba-line"), box.querySelector(".nsc-ba-knob"));
  });

  /* ---------- blog arrows ---------- */
  var track = $("blog-track");
  if (track) {
    var step = function (dir) {
      var card = track.querySelector(".nsc-card");
      var w = card ? card.getBoundingClientRect().width + 22 : track.clientWidth;
      var max = track.scrollWidth - track.clientWidth - 2;
      if (dir > 0 && track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: "smooth" });
      else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
      else track.scrollBy({ left: dir * w, behavior: "smooth" });
    };
    $("blog-prev").addEventListener("click", function () { step(-1); });
    $("blog-next").addEventListener("click", function () { step(1); });
  }

  /* ---------- service-area map: box around every town we serve ---------- */
  var mapEl = $("area-map");
  // Service-area outline: inland edge around the towns we serve, lakeshore on the east (lat, lng).
  var AREA = [
    [42.4920, -87.7980], [42.4920, -87.9300], [42.4300, -87.9800], [42.3600, -88.0000], [42.3000, -88.0550],
    [42.2350, -88.0350], [42.1650, -88.0150], [42.1100, -88.0300], [42.0550, -88.0050], [42.0150, -87.9350],
    [41.9950, -87.8400], [42.0000, -87.7600], [42.0200, -87.6700],
    [42.0600, -87.6640], [42.0800, -87.6800], [42.0950, -87.6960], [42.1150, -87.7110], [42.1450, -87.7360],
    [42.1800, -87.7590], [42.2100, -87.7740], [42.2500, -87.7880], [42.2850, -87.8030], [42.3250, -87.8040],
    [42.3650, -87.7990], [42.4200, -87.7930], [42.4650, -87.7960]
  ];
  var drawMap = function () {
    if (!mapEl || !window.L || mapEl._drawn) return;
    mapEl._drawn = true;
    var L = window.L;
    var map = L.map(mapEl, { scrollWheelZoom: false });
    map.attributionControl.setPrefix(false); // drop the optional "Leaflet" link; the OpenStreetMap credit is required by its license
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    var area = L.polygon(AREA, { color: "#000000", weight: 4, fillColor: document.body.getAttribute("data-accent") || "#dbbb36", fillOpacity: 0.18, interactive: false, lineJoin: "round" }).addTo(map);
    map.fitBounds(area.getBounds(), { padding: [14, 14] });
  };
  if (mapEl) {
    var startMap = function () { if (window.L) drawMap(); else window.addEventListener("load", drawMap); };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); startMap(); } }, { rootMargin: "300px" });
      io.observe(mapEl);
    } else startMap();
  }

  /* ---------- estimate form ---------- */
  var form = $("estimate-form");
  if (!form) return;
  var WEBHOOK = "https://hooks.airtable.com/workflows/v1/genericWebhook/appOoleKFcb2PRDCr/wflIzKgHukqWeZItH/wtrUc45ohf8qs3x18";
  var DRAFT = "nsc-estimate-draft";
  var PROC_MS = 8000;
  var F = ["name", "phone", "email", "street", "city", "zip"];
  var el = function (n) { return form.elements.namedItem(n); };
  var towns = Array.prototype.map.call(el("city").options, function (o) { return o.value; }).filter(Boolean);
  var store = { get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
                del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} } };

  var digits = function (s) { var d = String(s || "").replace(/\D/g, ""); if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1); return d.slice(0, 10); };
  var fmtPhone = function (d) {
    if (!d) return "";
    if (d.length < 4) return "(" + d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  };
  var clean = function () {
    var cityRaw = String(el("city").value || "").trim().toLowerCase();
    return {
      name: String(el("name").value || "").replace(/[^A-Za-zÀ-ſ' .\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60),
      phone: digits(el("phone").value),
      email: String(el("email").value || "").replace(/\s/g, "").slice(0, 80),
      street: String(el("street").value || "").replace(/[^A-Za-z0-9 .,'#\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80),
      city: towns.filter(function (t) { return t.toLowerCase() === cityRaw; })[0] || "",
      zip: String(el("zip").value || "").replace(/\D/g, "").slice(0, 5),
      msg: String(el("message").value || "").slice(0, 600)
    };
  };
  var check = function (d) {
    var r = {
      name: /[A-Za-zÀ-ſ]{2,}\s+[A-Za-zÀ-ſ]/.test(d.name),
      phone: /^[2-9]\d{2}[2-9]\d{6}$/.test(d.phone),
      email: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(d.email),
      street: /^\d{1,6}[A-Za-z]?\s+(?=.*[A-Za-z]{2,})[A-Za-z0-9 .,'#\-]{2,}$/.test(d.street),
      city: towns.indexOf(d.city) !== -1,
      zip: /^6[0-2]\d{3}$/.test(d.zip)
    };
    r.all = F.every(function (k) { return r[k]; });
    return r;
  };

  // light input clean-up as people type (same rules as the design)
  var tidy = {
    name: function (v) { return v.replace(/[^A-Za-zÀ-ſ' .\-]/g, "").replace(/\s{2,}/g, " ").slice(0, 60); },
    phone: function (v) { return fmtPhone(v.replace(/\D/g, "").replace(/^1/, "").slice(0, 10)); },
    email: function (v) { return v.replace(/\s/g, "").slice(0, 80); },
    street: function (v) { return v.replace(/[^A-Za-z0-9 .,'#\-]/g, "").replace(/\s{2,}/g, " ").slice(0, 80); },
    zip: function (v) { return v.replace(/\D/g, "").slice(0, 5); }
  };
  var tried = false;
  var saveDraft = function () {
    var d = {}; F.concat("message").forEach(function (k) { d[k] = el(k).value; });
    store.set(DRAFT, JSON.stringify(d));
  };
  form.addEventListener("input", function (e) {
    var t = e.target, fix = tidy[t.name];
    if (fix) { var v = fix(t.value); if (v !== t.value) t.value = v; }
    saveDraft();
    if (tried) showErrors(check(clean()));
  });
  form.addEventListener("change", function () { saveDraft(); if (tried) showErrors(check(clean())); });
  (function restore() {
    try {
      var d = JSON.parse(store.get(DRAFT) || "null");
      if (d) F.concat("message").forEach(function (k) { if (typeof d[k] === "string") el(k).value = d[k]; });
    } catch (e) {}
  })();

  var showErrors = function (r) {
    F.forEach(function (k) {
      var bad = !r[k];
      el(k).setAttribute("aria-invalid", bad ? "true" : "false");
      el(k).style.borderColor = bad ? "#b00020" : "#000000";
      $("err-" + k).hidden = !bad;
    });
    $("form-summary").hidden = r.all;
  };

  var busy = false;
  var setSending = function (on) {
    busy = on;
    var b = $("submit-btn");
    b.disabled = on;
    form.setAttribute("aria-busy", on ? "true" : "false");
    $("submit-spin").hidden = !on;
    $("submit-label").textContent = on ? "Sending your request…" : "Get my free estimate";
  };

  var send = function (d) {
    var body = new URLSearchParams();
    body.append("name", d.name);
    body.append("phone", fmtPhone(d.phone));
    body.append("email", d.email);
    body.append("street", d.street);
    body.append("city", d.city);
    body.append("state", "IL");
    body.append("zip", d.zip);
    body.append("address", d.street + ", " + d.city + ", IL " + d.zip);
    body.append("message", d.msg);
    body.append("photo_count", "0");
    body.append("photo_names", "");
    body.append("source", form.getAttribute("data-source") || "Website estimate form");
    body.append("submitted_at", new Date().toISOString());
    body.append("page", window.location.href);
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
    // Airtable's webhook sends no CORS headers, so post form-encoded data in no-cors mode (no preflight);
    // the reply is opaque, and reaching Airtable is the success signal.
    return fetch(WEBHOOK, { method: "POST", mode: "no-cors", body: body, signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        clearTimeout(timer);
        if (res && res.type !== "opaque" && !res.ok) throw new Error("The server responded with an error (" + res.status + ").");
      }, function (err) {
        clearTimeout(timer);
        throw new Error(err && err.name === "AbortError" ? "The request timed out." : "Check your internet connection.");
      });
  };

  var lastSent = null;
  var MSGS = ["Submission received!", "Organizing your driveway details…", "Getting your request ready for our team…", "Wrapping up…"];
  var timers = [];
  var reveal = function () { var q = $("quote"); if (q && q.scrollIntoView) q.scrollIntoView({ behavior: "smooth", block: "start" }); };
  var runProcessing = function () {
    $("form-wrap").hidden = true;
    $("proc").hidden = false;
    $("done").hidden = true;
    var bar = $("proc-bar");
    bar.classList.remove("nsc-fill"); void bar.offsetWidth; bar.classList.add("nsc-fill");
    MSGS.forEach(function (m, i) {
      timers.push(setTimeout(function () { $("proc-msg").textContent = m; $("proc-step").textContent = "Step " + (i + 1) + " of 4"; }, i * PROC_MS / 4));
    });
    timers.push(setTimeout(function () {
      $("proc").hidden = true;
      $("done").hidden = false;
      reveal();
    }, PROC_MS));
    reveal();
  };

  var submit = function (e) {
    if (e) e.preventDefault();
    if (busy || $("form-wrap").hidden) return;
    tried = true;
    $("send-error").hidden = true;
    var d = clean();
    // write cleaned values back so what was validated is what's shown
    el("name").value = d.name; el("phone").value = fmtPhone(d.phone); el("email").value = d.email;
    el("street").value = d.street; el("zip").value = d.zip; if (d.city) el("city").value = d.city;
    var r = check(d);
    showErrors(r);
    if (!r.all) {
      var first = F.filter(function (k) { return !r[k]; })[0];
      if (first) el(first).focus();
      return;
    }
    setSending(true);
    send(d).then(function () {
      setSending(false);
      store.del(DRAFT);
      lastSent = d;
      runProcessing();
    }, function (err) {
      setSending(false);
      $("send-error-msg").textContent = (err && err.message) || "Something went wrong.";
      $("send-error").hidden = false;
    });
  };
  form.addEventListener("submit", submit);

  $("details-btn").addEventListener("click", function () {
    var box = $("nsc-details"), open = box.hidden;
    if (open && lastSent) {
      var rows = [["Name", lastSent.name], ["Phone", fmtPhone(lastSent.phone)], ["Email", lastSent.email],
        ["Address", lastSent.street + ", " + lastSent.city + ", IL " + lastSent.zip], ["Notes", lastSent.msg || "None"]];
      var dl = $("details-list"); dl.textContent = "";
      rows.forEach(function (r) {
        var dt = document.createElement("dt"); dt.style.fontWeight = "800"; dt.textContent = r[0];
        var dd = document.createElement("dd"); dd.style.margin = "0"; dd.style.fontWeight = "600"; dd.style.overflowWrap = "anywhere"; dd.textContent = r[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
    }
    box.hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false");
    this.textContent = open ? "Hide submitted details" : "View submitted details";
  });
  $("again-btn").addEventListener("click", function () {
    timers.forEach(clearTimeout); timers = [];
    form.reset(); tried = false; lastSent = null;
    F.forEach(function (k) { el(k).setAttribute("aria-invalid", "false"); el(k).style.borderColor = "#000000"; $("err-" + k).hidden = true; });
    $("form-summary").hidden = true;
    $("nsc-details").hidden = true;
    $("details-btn").setAttribute("aria-expanded", "false"); $("details-btn").textContent = "View submitted details";
    $("done").hidden = true; $("proc").hidden = true; $("form-wrap").hidden = false;
    reveal();
  });
})();
