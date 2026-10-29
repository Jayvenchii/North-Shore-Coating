/* North Shore Coating: Christmas light installation quote form. */
(function () {
  "use strict";
  var form = document.getElementById("xmas-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var el = function (n) { return form.elements.namedItem(n); };

  var WEBHOOK = "https://hooks.airtable.com/workflows/v1/genericWebhook/appJld0WSZrARaTkc/wflHBSQ6GT4QTydMk/wtrkZoOfdnMY8Y3Hw";
  // Airtable's webhook accepts at most 100 KB per request, so photos are shrunk in the browser to fit.
  var BODY_LIMIT = 95000;
  var MAX_PHOTOS = 3;
  var DRAFT = "nsc-xmas-draft";
  var TEXT = ["name", "phone", "email", "street", "city", "zip", "heard_about_us"];
  var REQUIRED = ["name", "customer_type", "phone", "email", "street", "city", "zip", "heard_about_us"];
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
  var typeVal = function () { var c = form.querySelector('input[name="customer_type"]:checked'); return c ? c.value : ""; };
  var values = function () {
    return {
      name: String(el("name").value || "").replace(/\s+/g, " ").trim().slice(0, 80),
      customer_type: typeVal(),
      phone: digits(el("phone").value),
      email: String(el("email").value || "").replace(/\s/g, "").slice(0, 100),
      street: String(el("street").value || "").replace(/\s+/g, " ").trim().slice(0, 120),
      city: String(el("city").value || "").replace(/\s+/g, " ").trim().slice(0, 60),
      zip: String(el("zip").value || "").replace(/\D/g, "").slice(0, 5),
      heard_about_us: String(el("heard_about_us").value || "")
    };
  };
  var check = function (d) {
    var r = {
      name: /[A-Za-zÀ-ſ]{2,}\s+[A-Za-zÀ-ſ]/.test(d.name),
      customer_type: d.customer_type === "Residential" || d.customer_type === "Commercial",
      phone: /^[2-9]\d{2}[2-9]\d{6}$/.test(d.phone),
      email: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(d.email),
      street: /^\d{1,6}[A-Za-z]?\s+.*[A-Za-z]{2,}/.test(d.street),
      city: /[A-Za-z]{2,}/.test(d.city),
      zip: /^\d{5}$/.test(d.zip),
      heard_about_us: d.heard_about_us !== ""
    };
    r.all = REQUIRED.every(function (k) { return r[k]; });
    return r;
  };
  var tried = false;
  var showErrors = function (r) {
    REQUIRED.forEach(function (k) {
      var bad = !r[k];
      $("xerr-" + k).hidden = !bad;
      if (k === "customer_type") { $("xseg-type").classList.toggle("nsc-bad", bad); return; }
      el(k).setAttribute("aria-invalid", bad ? "true" : "false");
      el(k).style.borderColor = bad ? "#b00020" : "#000000";
    });
    $("xform-summary").hidden = r.all;
  };

  /* ---------- draft (typed fields only) ---------- */
  var saveDraft = function () {
    var d = {}; TEXT.forEach(function (k) { d[k] = el(k).value; }); d.customer_type = typeVal();
    store.set(DRAFT, JSON.stringify(d));
  };
  (function restore() {
    try {
      var d = JSON.parse(store.get(DRAFT) || "null");
      if (!d) return;
      TEXT.forEach(function (k) { if (typeof d[k] === "string") el(k).value = d[k]; });
      if (d.customer_type) { var r = form.querySelector('input[name="customer_type"][value="' + d.customer_type + '"]'); if (r) r.checked = true; }
    } catch (e) {}
  })();
  form.addEventListener("input", function (e) {
    var t = e.target;
    if (t.name === "phone") { var v = fmtPhone(t.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10)); if (v !== t.value) t.value = v; }
    if (t.name === "zip") { var z = t.value.replace(/\D/g, "").slice(0, 5); if (z !== t.value) t.value = z; }
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
    if (it.zip) el("zip").value = it.zip;
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

  /* ---------- photos (optional) ---------- */
  var photos = []; // { file, url }
  var thumbs = $("x-thumbs"), photoErr = $("x-photo-error");
  var paintThumbs = function () {
    thumbs.textContent = "";
    thumbs.hidden = photos.length === 0;
    photos.forEach(function (p, i) {
      var li = document.createElement("li");
      li.style.cssText = "position: relative; border: 2px solid #000000; border-radius: 10px; overflow: hidden; background: #f2f2f2";
      var img = document.createElement("img");
      img.src = p.url; img.alt = "Photo " + (i + 1) + " you added"; img.style.cssText = "display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover";
      var cap = document.createElement("span");
      cap.textContent = p.file.name; cap.style.cssText = "display: block; padding: 6px 8px; font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis";
      var x = document.createElement("button");
      x.type = "button"; x.className = "nsc-x"; x.textContent = "×"; x.setAttribute("aria-label", "Remove photo " + p.file.name);
      x.addEventListener("click", function () { try { URL.revokeObjectURL(p.url); } catch (e) {} photos.splice(i, 1); photoErr.hidden = true; paintThumbs(); });
      li.appendChild(img); li.appendChild(cap); li.appendChild(x); thumbs.appendChild(li);
    });
  };
  $("x-photos").addEventListener("change", function (e) {
    var problems = [];
    Array.prototype.forEach.call(e.target.files || [], function (f) {
      var isImg = /^image\//.test(f.type || "") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || "");
      if (!isImg) { problems.push(f.name + " isn't a photo."); return; }
      if (f.size > 25 * 1024 * 1024) { problems.push(f.name + " is larger than 25 MB."); return; }
      if (photos.length >= MAX_PHOTOS) { problems.push("You can add up to " + MAX_PHOTOS + " photos."); return; }
      var url = ""; try { url = URL.createObjectURL(f); } catch (err) {}
      photos.push({ file: f, url: url });
    });
    try { e.target.value = ""; } catch (err) {}
    photoErr.textContent = problems.filter(function (p, i) { return problems.indexOf(p) === i; }).join(" ");
    photoErr.hidden = !problems.length;
    paintThumbs();
  });

  // Shrink one photo to a JPEG data URL no wider/taller than `side` px.
  var compressImage = function (file, side, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(file.name + " couldn't be read. Try a JPG or PNG photo.")); };
      img.src = url;
    });
  };
  var shrink = function (file, side, q) { return (window.nscCompressImage || compressImage)(file, side, q); };

  /* ---------- send ---------- */
  var buildBody = function (d, shots) {
    var b = new URLSearchParams();
    b.append("name", d.name);
    b.append("customer_type", d.customer_type);
    b.append("phone", fmtPhone(d.phone));
    b.append("email", d.email);
    b.append("street", d.street);
    b.append("city", d.city);
    b.append("state", "IL");
    b.append("zip", d.zip);
    b.append("address", d.street + ", " + d.city + ", IL " + d.zip);
    b.append("heard_about_us", d.heard_about_us);
    b.append("photo_count", String(shots.length));
    shots.forEach(function (s, i) { b.append("photo_" + (i + 1), s.data); b.append("photo_" + (i + 1) + "_name", s.name); });
    b.append("service", "Christmas light installation");
    b.append("source", form.getAttribute("data-source") || "Christmas light installation quote form");
    b.append("submitted_at", new Date().toISOString());
    b.append("page", window.location.href);
    return b;
  };
  // Try progressively smaller photos until the whole request fits under Airtable's limit.
  var fitPhotos = function (d) {
    if (!photos.length) return Promise.resolve(buildBody(d, []));
    var steps = [[1000, 0.72], [820, 0.66], [680, 0.6], [560, 0.55], [460, 0.5], [380, 0.45], [320, 0.4]];
    var attempt = function (k) {
      var st = steps[k];
      return Promise.all(photos.map(function (p) { return shrink(p.file, st[0], st[1]).then(function (data) { return { data: data, name: p.file.name }; }); }))
        .then(function (shots) {
          var body = buildBody(d, shots);
          if (body.toString().length <= BODY_LIMIT) return body;
          if (k + 1 < steps.length) return attempt(k + 1);
          throw new Error("Your photos are too large to send together. Try removing one.");
        });
    };
    return attempt(0);
  };

  var busy = false;
  var setSending = function (on) {
    busy = on;
    $("xsubmit").disabled = on;
    form.setAttribute("aria-busy", on ? "true" : "false");
    $("xsubmit-spin").hidden = !on;
    $("xsubmit-label").textContent = on ? (photos.length ? "Preparing photos & sending…" : "Sending your request…") : "Get my free quote";
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
      var target = first === "customer_type" ? form.querySelector('input[name="customer_type"]') : el(first);
      if (target && target.focus) target.focus();
      return;
    }
    setSending(true);
    fitPhotos(d).then(function (body) {
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
    photos.forEach(function (p) { try { URL.revokeObjectURL(p.url); } catch (e) {} }); photos = []; paintThumbs();
    REQUIRED.forEach(function (k) { $("xerr-" + k).hidden = true; if (k !== "customer_type") { el(k).style.borderColor = "#000000"; el(k).setAttribute("aria-invalid", "false"); } });
    $("xseg-type").classList.remove("nsc-bad");
    $("xform-summary").hidden = true;
    $("xdone").hidden = true; $("xform-wrap").hidden = false;
  });
})();
