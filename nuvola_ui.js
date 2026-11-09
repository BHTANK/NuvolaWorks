/* nuvola_ui.js - Nuvola's FUNCTIONALITY KIT for generated websites (Tank 2026-11-07:
 * "Increase website builds past the simple, and add more complex functionality").
 * Vendored next to the pages like nuvola_scenes.js; a page asks for a component with a
 * data attribute and this file wires it - the writer never hand-codes the behaviour.
 *
 *   data-tabs            [data-tab="id"] buttons + [data-panel="id"] panels
 *   data-accordion       <details> children; data-accordion="one" = only one open
 *   data-lightbox        click any <img> inside -> full view, arrows, Esc
 *   data-carousel        children are slides; prev/next, dots, data-autoplay="ms"
 *   data-filter-group    [data-filter="tag|all"] buttons + [data-tags="a b"] items
 *   data-search="sel"    on an <input>: live-filters the children of the target
 *   data-validate        on a <form>: messages under fields; valid -> data-success="#el" shown
 *   data-price-toggle    switch; [data-monthly][data-yearly] texts swap, [data-period] label
 *   data-modal-open="#id" / data-modal-close   open / close a <dialog> or element
 *   data-reveal="up|left|right|zoom|fade"      animates in when scrolled into view
 *   data-count="1250"    counts up when visible (data-prefix / data-suffix)
 *   data-countdown="2026-12-31T00:00"          live days / hours / minutes / seconds
 *   data-theme-toggle    light / dark (html[data-theme]), remembered
 *   data-toast="text"    a button that shows a toast; NuvolaUI.toast("text") from code
 *   data-to-top          back-to-top button (appears after scrolling)
 *   data-shrink-header   header gets .nv-shrunk after scrolling
 * Theme with CSS variables on :root - --nv-accent --nv-ink --nv-surface --nv-radius.
 * Keyboard + ARIA on every component; prefers-reduced-motion = no motion.
 * After init: html[data-nv-ui] lists what was wired ("tabs:1 lightbox:1 ...").
 */
(function () {
  "use strict";
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var counts = {};
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function tally(name) { counts[name] = (counts[name] || 0) + 1; }
  function once(el, key) { var k = "nvUi" + key; if (el.dataset[k]) return false; el.dataset[k] = "1"; return true; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var CSS = [
    ":root{--nv-accent:#c8553d;--nv-ink:#1d1d1f;--nv-surface:#ffffff;--nv-radius:12px}",
    ".nv-hidden{display:none!important}",
    "[data-tabs] [role=tab]{cursor:pointer}",
    "[data-tabs] [role=tab][aria-selected=true]{color:var(--nv-accent);border-color:var(--nv-accent)}",
    ".nv-lb{position:fixed;inset:0;z-index:9999;background:rgba(10,10,12,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;opacity:0;transition:opacity .2s}",
    ".nv-lb.nv-open{opacity:1}",
    ".nv-lb img{max-width:90vw;max-height:80vh;border-radius:var(--nv-radius);box-shadow:0 20px 60px rgba(0,0,0,.5)}",
    ".nv-lb figcaption{color:#eee;font:15px/1.4 system-ui,sans-serif;max-width:80vw;text-align:center}",
    ".nv-lb button{position:absolute;background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:50%;width:48px;height:48px;font-size:24px;cursor:pointer}",
    ".nv-lb button:hover,.nv-lb button:focus-visible{background:rgba(255,255,255,.28);outline:2px solid #fff}",
    ".nv-lb .nv-x{top:20px;right:20px}.nv-lb .nv-prev{left:20px;top:50%}.nv-lb .nv-next{right:20px;top:50%}",
    "[data-carousel]{position:relative;overflow:hidden}",
    ".nv-track{display:flex;transition:transform .5s cubic-bezier(.2,.7,.2,1)}",
    ".nv-track>*{flex:0 0 100%;min-width:0}",
    ".nv-car-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:2;background:rgba(0,0,0,.45);color:#fff;border:0;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px}",
    ".nv-car-btn:focus-visible{outline:2px solid var(--nv-accent)}",
    ".nv-car-prev{left:12px}.nv-car-next{right:12px}",
    ".nv-dots{position:absolute;bottom:12px;left:0;right:0;display:flex;justify-content:center;gap:8px;z-index:2}",
    ".nv-dots button{width:10px;height:10px;border-radius:50%;border:0;background:rgba(255,255,255,.55);cursor:pointer;padding:0}",
    ".nv-dots button[aria-current=true]{background:#fff;transform:scale(1.25)}",
    "[data-tags]{transition:opacity .25s,transform .25s}",
    "[data-filter][aria-pressed=true]{color:var(--nv-accent);border-color:var(--nv-accent)}",
    ".nv-error{color:#b3261e;font-size:.85em;margin-top:4px}",
    "[aria-invalid=true]{border-color:#b3261e!important;outline-color:#b3261e}",
    "[data-reveal]{transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}",
    "[data-reveal].nv-pre{opacity:0}",
    "[data-reveal=up].nv-pre{transform:translateY(28px)}[data-reveal=left].nv-pre{transform:translateX(-36px)}",
    "[data-reveal=right].nv-pre{transform:translateX(36px)}[data-reveal=zoom].nv-pre{transform:scale(.92)}",
    ".nv-toasts{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:8px;align-items:center}",
    ".nv-toast{background:var(--nv-ink);color:var(--nv-surface);padding:12px 18px;border-radius:var(--nv-radius);box-shadow:0 10px 30px rgba(0,0,0,.25);font:15px/1.3 system-ui,sans-serif;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s}",
    ".nv-toast.nv-open{opacity:1;transform:none}",
    "[data-to-top]{position:fixed;right:20px;bottom:20px;z-index:50;opacity:0;pointer-events:none;transition:opacity .25s}",
    "[data-to-top].nv-show{opacity:1;pointer-events:auto}",
    ".nv-cd{display:inline-flex;gap:14px;font-variant-numeric:tabular-nums}",
    ".nv-cd span{display:flex;flex-direction:column;align-items:center}.nv-cd b{font-size:2em;line-height:1}.nv-cd small{opacity:.7;font-size:.75em;text-transform:uppercase;letter-spacing:.08em}",
    "@media (prefers-reduced-motion: reduce){.nv-track,[data-reveal],.nv-lb,.nv-toast{transition:none!important}}"
  ].join("\n");

  function styles() {
    if (document.querySelector("style[data-nuvola-ui]")) return;
    var s = document.createElement("style"); s.setAttribute("data-nuvola-ui", ""); s.textContent = CSS;
    document.head.insertBefore(s, document.head.firstChild);   /* first, so the site's own CSS wins */
  }

  /* ---- tabs ---------------------------------------------------------------------- */
  function tabs() {
    all("[data-tabs]").forEach(function (box) {
      if (!once(box, "Tabs")) return;
      var btns = all("[data-tab]", box), panels = all("[data-panel]", box);
      if (!btns.length) return;
      var list = btns[0].parentElement; list.setAttribute("role", "tablist");
      function show(id, focus) {
        btns.forEach(function (b) {
          var on = b.getAttribute("data-tab") === id;
          b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
          if (on && focus) b.focus();
        });
        panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== id; });
      }
      btns.forEach(function (b, i) {
        var id = b.getAttribute("data-tab");
        b.setAttribute("role", "tab"); b.id = b.id || ("nv-tab-" + id);
        b.addEventListener("click", function () { show(id, false); });
        b.addEventListener("keydown", function (e) {
          var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : -2;
          if (j === -2) return; e.preventDefault(); j = (j + btns.length) % btns.length; show(btns[j].getAttribute("data-tab"), true);
        });
      });
      panels.forEach(function (p) { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "nv-tab-" + p.getAttribute("data-panel")); p.tabIndex = 0; });
      var first = box.getAttribute("data-active") || btns[0].getAttribute("data-tab");
      show(first, false); tally("tabs");
    });
  }

  /* ---- accordion (native <details>) ---------------------------------------------- */
  function accordion() {
    all("[data-accordion]").forEach(function (box) {
      if (!once(box, "Acc")) return;
      var items = all("details", box);
      if (box.getAttribute("data-accordion") === "one") {
        items.forEach(function (d) { d.addEventListener("toggle", function () { if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; }); }); });
      }
      tally("accordion");
    });
  }

  /* ---- lightbox ---------------------------------------------------------------------- */
  function lightbox() {
    all("[data-lightbox]").forEach(function (box) {
      if (!once(box, "Lb")) return;
      var imgs = all("img", box); if (!imgs.length) return;
      imgs.forEach(function (img, i) {
        img.style.cursor = "zoom-in"; img.tabIndex = 0; img.setAttribute("role", "button");
        img.setAttribute("aria-label", "Open image: " + (img.alt || ("picture " + (i + 1))));
        img.addEventListener("click", function () { open(i); });
        img.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); } });
      });
      function caption(img) { var f = img.closest("figure"); var c = f && f.querySelector("figcaption"); return (c && c.textContent.trim()) || img.alt || ""; }
      function open(i) {
        var idx = i, last = document.activeElement;
        var ov = el("div", "nv-lb"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Image viewer");
        var fig = el("figure"); fig.style.margin = "0"; var big = el("img"); var cap = el("figcaption");
        fig.appendChild(big); fig.appendChild(cap);
        var x = el("button", "nv-x", "\u00d7"); x.setAttribute("aria-label", "Close");
        var p = el("button", "nv-prev", "\u2039"); p.setAttribute("aria-label", "Previous image");
        var n = el("button", "nv-next", "\u203a"); n.setAttribute("aria-label", "Next image");
        ov.appendChild(fig); ov.appendChild(x);
        if (imgs.length > 1) { ov.appendChild(p); ov.appendChild(n); }
        function set(k) { idx = (k + imgs.length) % imgs.length; big.src = imgs[idx].currentSrc || imgs[idx].src; big.alt = imgs[idx].alt || ""; cap.textContent = caption(imgs[idx]); }
        function close() { document.removeEventListener("keydown", key); ov.remove(); if (last && last.focus) last.focus(); }
        function key(e) { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") set(idx + 1); else if (e.key === "ArrowLeft") set(idx - 1); }
        x.addEventListener("click", close); p.addEventListener("click", function () { set(idx - 1); }); n.addEventListener("click", function () { set(idx + 1); });
        ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
        document.addEventListener("keydown", key);
        set(idx); document.body.appendChild(ov); x.focus();
        requestAnimationFrame(function () { ov.classList.add("nv-open"); });
      }
      tally("lightbox");
    });
  }

  /* ---- carousel ---------------------------------------------------------------------- */
  function carousel() {
    all("[data-carousel]").forEach(function (box) {
      if (!once(box, "Car")) return;
      var slides = Array.prototype.slice.call(box.children); if (slides.length < 2) return;
      var track = el("div", "nv-track"); slides.forEach(function (s) { track.appendChild(s); }); box.appendChild(track);
      box.setAttribute("role", "region"); box.setAttribute("aria-roledescription", "carousel");
      box.tabIndex = box.tabIndex >= 0 ? box.tabIndex : 0;
      var i = 0, timer = null;
      var prev = el("button", "nv-car-btn nv-car-prev", "\u2039"), next = el("button", "nv-car-btn nv-car-next", "\u203a");
      prev.setAttribute("aria-label", "Previous slide"); next.setAttribute("aria-label", "Next slide");
      var dots = el("div", "nv-dots");
      slides.forEach(function (s, k) {
        s.setAttribute("role", "group"); s.setAttribute("aria-roledescription", "slide"); s.setAttribute("aria-label", (k + 1) + " of " + slides.length);
        var d = el("button"); d.setAttribute("aria-label", "Go to slide " + (k + 1)); d.addEventListener("click", function () { go(k); }); dots.appendChild(d);
      });
      box.appendChild(prev); box.appendChild(next); box.appendChild(dots);
      function go(k) {
        i = (k + slides.length) % slides.length; track.style.transform = "translateX(" + (-100 * i) + "%)";
        all("button", dots).forEach(function (d, j) { d.setAttribute("aria-current", j === i ? "true" : "false"); });
        slides.forEach(function (s, j) { s.setAttribute("aria-hidden", j === i ? "false" : "true"); });
        box.setAttribute("data-nv-slide", String(i));
      }
      prev.addEventListener("click", function () { go(i - 1); }); next.addEventListener("click", function () { go(i + 1); });
      box.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); });
      var ms = parseInt(box.getAttribute("data-autoplay") || "0", 10);
      function play() { if (ms > 0 && !RM && !timer) timer = setInterval(function () { go(i + 1); }, ms); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      box.addEventListener("mouseenter", stop); box.addEventListener("mouseleave", play);
      box.addEventListener("focusin", stop); box.addEventListener("focusout", play);
      go(0); play(); tally("carousel");
    });
  }

  /* ---- filter + search ---------------------------------------------------------------- */
  function filters() {
    /* forgiving (2026-11-07, Ink and Iron): filter buttons outside any data-filter-group get the
       nearest wrapper that also holds the tagged items as their group */
    all("[data-filter]").forEach(function (b) {
      if (b.closest("[data-filter-group]")) return;
      var g = b.parentElement;
      while (g && !g.querySelector("[data-tags]")) g = g.parentElement;
      if (g) g.setAttribute("data-filter-group", "");
    });
    all("[data-filter-group]").forEach(function (box) {
      if (!once(box, "Flt")) return;
      var btns = all("[data-filter]", box), items = all("[data-tags]", box);
      function apply(tag) {
        btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === tag ? "true" : "false"); });
        items.forEach(function (it) {
          var tags = (" " + it.getAttribute("data-tags").toLowerCase() + " ");
          it.hidden = !(tag === "all" || tags.indexOf(" " + tag.toLowerCase() + " ") >= 0);
        });
        box.setAttribute("data-nv-filter", tag);
      }
      btns.forEach(function (b) { b.addEventListener("click", function () { apply(b.getAttribute("data-filter")); }); });
      apply(box.getAttribute("data-active") || "all"); tally("filter");
    });
    all("input[data-search]").forEach(function (inp) {
      if (!once(inp, "Srch")) return;
      var target = document.querySelector(inp.getAttribute("data-search")); if (!target) return;
      inp.setAttribute("role", "searchbox");
      inp.addEventListener("input", function () {
        var q = inp.value.trim().toLowerCase(), shown = 0;
        Array.prototype.forEach.call(target.children, function (c) { var hit = !q || c.textContent.toLowerCase().indexOf(q) >= 0; c.hidden = !hit; if (hit) shown++; });
        target.setAttribute("data-nv-shown", String(shown));
      });
      tally("search");
    });
  }

  /* ---- form validation ------------------------------------------------------------------ */
  function validate() {
    all("form[data-validate]").forEach(function (form) {
      if (!once(form, "Val")) return;
      form.noValidate = true;
      function msg(f) {
        if (f.validity.valueMissing) return (f.getAttribute("data-msg-required") || "Please fill this in.");
        if (f.validity.typeMismatch && f.type === "email") return (f.getAttribute("data-msg-email") || "Please enter a valid email address.");
        if (f.validity.tooShort) return "Please use at least " + f.minLength + " characters.";
        if (f.validity.patternMismatch) return (f.getAttribute("data-msg-pattern") || "Please match the requested format.");
        return f.validationMessage || "";
      }
      function check(f) {
        var bad = !f.checkValidity(), id = (f.id || f.name || "f") + "-nv-err";
        var old = document.getElementById(id); if (old) old.remove();
        f.setAttribute("aria-invalid", bad ? "true" : "false");
        if (bad) { let m = el("div", "nv-error", msg(f)); m.id = id; m.setAttribute("role", "alert"); f.setAttribute("aria-describedby", id); f.insertAdjacentElement("afterend", m); }
        return !bad;
      }
      var fields = all("input,textarea,select", form).filter(function (f) { return f.type !== "submit" && f.type !== "button" && f.type !== "hidden"; });
      fields.forEach(function (f) { f.addEventListener("blur", function () { if (f.value) check(f); }); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true, firstBad = null;
        fields.forEach(function (f) { if (!check(f)) { ok = false; if (!firstBad) firstBad = f; } });
        if (!ok) { firstBad.focus(); form.setAttribute("data-nv-valid", "no"); return; }
        form.setAttribute("data-nv-valid", "yes");
        var succ = form.getAttribute("data-success") && document.querySelector(form.getAttribute("data-success"));
        if (succ) { succ.hidden = false; succ.classList.remove("nv-hidden"); succ.setAttribute("role", "status"); form.hidden = true; if (succ.focus) { succ.tabIndex = -1; succ.focus(); } }
        else toast(form.getAttribute("data-success-text") || "Thank you - your message is on its way.");
      });
      tally("validate");
    });
  }

  /* ---- price toggle ---------------------------------------------------------------------- */
  function priceToggle() {
    all("[data-price-toggle]").forEach(function (sw) {
      if (!once(sw, "Pt")) return;
      var scope = sw.closest("[data-price-scope]") || document;
      sw.setAttribute("role", "switch");
      function set(yearly) {
        sw.setAttribute("aria-checked", yearly ? "true" : "false");
        all("[data-monthly][data-yearly]", scope).forEach(function (p) { p.textContent = p.getAttribute(yearly ? "data-yearly" : "data-monthly"); });
        all("[data-period]", scope).forEach(function (l) { l.textContent = yearly ? (l.getAttribute("data-period-yearly") || "per year") : (l.getAttribute("data-period-monthly") || "per month"); });
        document.documentElement.setAttribute("data-nv-period", yearly ? "yearly" : "monthly");
      }
      sw.addEventListener("click", function () { set(sw.getAttribute("aria-checked") !== "true"); });
      set(sw.getAttribute("data-price-toggle") === "yearly"); tally("price");
    });
  }

  /* ---- modal ---------------------------------------------------------------------- */
  function modals() {
    all("[data-modal-open]").forEach(function (b) {
      if (!once(b, "Mo")) return;
      var m = document.querySelector(b.getAttribute("data-modal-open")); if (!m) return;
      b.addEventListener("click", function () {
        if (m.showModal) m.showModal(); else { m.hidden = false; m.setAttribute("open", ""); }
        var f = m.querySelector("button,[href],input,select,textarea"); if (f) f.focus();
      });
      all("[data-modal-close]", m).forEach(function (c) { c.addEventListener("click", function () { if (m.close) m.close(); else { m.hidden = true; m.removeAttribute("open"); } b.focus(); }); });
      tally("modal");
    });
  }

  /* ---- reveal + count-up (when scrolled into view) -------------------------------------- */
  function inView(nodes, fn) {
    if (!("IntersectionObserver" in window)) { nodes.forEach(fn); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }); }, { threshold: 0.15 });
    nodes.forEach(function (n) { io.observe(n); });
  }
  function reveal() {
    var nodes = all("[data-reveal]").filter(function (n) { return once(n, "Rv"); });
    if (!nodes.length) return;
    if (!RM) { nodes.forEach(function (n) { n.classList.add("nv-pre"); }); inView(nodes, function (n) { n.classList.remove("nv-pre"); }); }
    counts.reveal = (counts.reveal || 0) + nodes.length;
  }
  function countUp() {
    var nodes = all("[data-count]").filter(function (n) { return once(n, "Cu"); });
    nodes.forEach(function (n) {
      var to = parseFloat(n.getAttribute("data-count")) || 0, pre = n.getAttribute("data-prefix") || "", suf = n.getAttribute("data-suffix") || "";
      var dec = (String(n.getAttribute("data-count")).split(".")[1] || "").length;
      function fmt(v) { return pre + v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; }
      n.setAttribute("aria-label", fmt(to));
      if (RM) { n.textContent = fmt(to); return; }
      n.textContent = fmt(0);
      inView([n], function () {
        var t0 = performance.now(), dur = 1400;
        (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); n.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); })(t0);
      });
    });
    if (nodes.length) counts.count = (counts.count || 0) + nodes.length;
  }

  /* ---- countdown ---------------------------------------------------------------------- */
  function countdowns() {
    all("[data-countdown]").forEach(function (n) {
      if (!once(n, "Cd")) return;
      var end = new Date(n.getAttribute("data-countdown")).getTime(); if (isNaN(end)) return;
      n.classList.add("nv-cd"); n.setAttribute("role", "timer");
      var parts = [["d", "days"], ["h", "hours"], ["m", "min"], ["s", "sec"]].map(function (p) { var s = el("span"); var b = el("b", null, "0"); s.appendChild(b); s.appendChild(el("small", null, p[1])); n.appendChild(s); return b; });
      function tick() {
        var left = Math.max(0, end - Date.now()), s = Math.floor(left / 1000);
        var v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
        parts.forEach(function (b, k) { b.textContent = (k ? String(v[k]).padStart(2, "0") : String(v[k])); });
        if (left <= 0) { clearInterval(iv); n.setAttribute("data-nv-done", "yes"); }
      }
      var iv = setInterval(tick, 1000); tick(); tally("countdown");
    });
  }

  /* ---- theme toggle, toasts, to-top, shrinking header --------------------------------- */
  function theme() {
    var saved = null; try { saved = localStorage.getItem("nv-theme"); } catch (e) { saved = null; }
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    all("[data-theme-toggle]").forEach(function (b) {
      if (!once(b, "Th")) return;
      function label() { var dark = document.documentElement.getAttribute("data-theme") === "dark"; b.setAttribute("aria-pressed", dark ? "true" : "false"); }
      b.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next); try { localStorage.setItem("nv-theme", next); } catch (e) { /* private window */ }
        label();
      });
      label(); tally("theme");
    });
  }
  function toast(text) {
    var box = document.querySelector(".nv-toasts"); if (!box) { box = el("div", "nv-toasts"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    var t = el("div", "nv-toast", text); box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("nv-open"); });
    setTimeout(function () { t.classList.remove("nv-open"); setTimeout(function () { t.remove(); }, 300); }, 3200);
    return t;
  }
  function toasts() { all("[data-toast]").forEach(function (b) { if (!once(b, "To")) return; b.addEventListener("click", function () { toast(b.getAttribute("data-toast")); }); tally("toast"); }); }
  function scrollers() {
    var top = all("[data-to-top]"), heads = all("[data-shrink-header]");
    top.forEach(function (b) { if (!once(b, "Tt")) return; b.setAttribute("aria-label", b.getAttribute("aria-label") || "Back to top"); b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); }); tally("totop"); });
    heads.forEach(function (h) { if (once(h, "Sh")) tally("shrink"); });
    if (!top.length && !heads.length) return;
    function on() { var y = window.scrollY || 0; top.forEach(function (b) { b.classList.toggle("nv-show", y > 400); }); heads.forEach(function (h) { h.classList.toggle("nv-shrunk", y > 40); }); }
    window.addEventListener("scroll", on, { passive: true }); on();
  }

  function init() {
    styles();
    [tabs, accordion, lightbox, carousel, filters, validate, priceToggle, modals, reveal, countUp, countdowns, theme, toasts, scrollers].forEach(function (f) {
      try { f(); } catch (e) { if (window.console) console.error("nuvola_ui: " + f.name + ": " + e.message); }
    });
    document.documentElement.setAttribute("data-nv-ui", Object.keys(counts).map(function (k) { return k + ":" + counts[k]; }).join(" ") || "none");
  }
  window.NuvolaUI = { init: init, toast: toast, version: "1.0" };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
