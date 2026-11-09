/* nuvola_flair.js - Nuvola's EYE-CANDY KIT for generated websites (Tank 2026-11-07: "eye
 * candy potential if a customer wants it. Artistic borders and Page name Characters, and
 * so on."). Used ONLY when the request asks for that kind of flair (the look library's
 * [FLAIR] section says when). Vendored next to the pages, with its fonts.
 *
 *   data-border="deco|gilded|vine|ornate|corners|double|film|stitch|brush|wave|torn|ticket|neon|aurora"
 *        data-border-color="#hex"  - an artistic frame around any box, redrawn when it resizes
 *   data-title-fx="rise|wave|typewriter|glitch|split|neon|3d|long-shadow|outline|gradient|chrome|gold|engraved|stamp|script"
 *        data-title-color="#hex"  data-title-colors="#a,#b,#c"  data-title-font="script|bookman|gothic|palatino"
 *        - the page-name characters; the heading keeps its real text for readers + the eyes
 *   data-divider="wave|zigzag|scallop|mountains|ornament|dots|flourish|deco|brush"
 *        data-divider-color="#hex"  data-divider-flip  - a section separator
 *   data-dropcap        a big decorative first letter (data-dropcap="script|serif")
 *   data-tilt           3D tilt toward the pointer      data-spotlight   a light that follows the pointer
 *   data-bg="grain|dots|grid|mesh|aurora"               a decorative background layer
 *   data-marquee        a band of text that scrolls sideways
 * prefers-reduced-motion = everything still, nothing moves. Pure ASCII source.
 * After init: html[data-nv-flair] lists what was drawn ("border:deco title:neon ...").
 */
(function () {
  "use strict";
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var SVGNS = "http://www.w3.org/2000/svg";
  var done = [];
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/[^\/]*$/, "") : "";
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function once(el, key) { var k = "nvFl" + key; if (el.dataset[k]) return false; el.dataset[k] = "1"; return true; }
  function accent(el) { var c = getComputedStyle(el).getPropertyValue("--nv-accent").trim(); return c || "#c9a227"; }
  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function hashStr(t) { let h = 7; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 2147483647; return h || 7; }
  function shade(hex, k) {   /* darken (k<1) or lighten (k>1) a #rrggbb colour */
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)))); }
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  var FONTS = { script: ["Nuvola Script", "nuvola-script.otf", "'Z003', cursive"], bookman: ["Nuvola Bookman", "nuvola-bookman.otf", "'URW Bookman', Georgia, serif"],
                gothic: ["Nuvola Gothic", "nuvola-gothic.otf", "'URW Gothic', 'Century Gothic', sans-serif"], palatino: ["Nuvola Palatino", "nuvola-palatino.otf", "'P052', 'Palatino Linotype', Palatino, serif"] };
  function fontStack(name) { var f = FONTS[name]; return f ? "'" + f[0] + "', " + f[2] : ""; }

  var CSS = [
    "@keyframes nv-rise{from{opacity:0;transform:translateY(.7em) rotate(4deg)}to{opacity:1;transform:none}}",
    "@keyframes nv-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-.18em)}}",
    "@keyframes nv-type{from{opacity:0}to{opacity:1}}",
    "@keyframes nv-caret{50%{border-color:transparent}}",
    "@keyframes nv-flicker{0%,19%,21%,23%,25%,54%,56%,100%{opacity:1}20%,24%,55%{opacity:.55}}",
    "@keyframes nv-glitch1{0%,100%{clip-path:inset(0 0 60% 0);transform:translate(-2px,-1px)}50%{clip-path:inset(40% 0 20% 0);transform:translate(2px,1px)}}",
    "@keyframes nv-glitch2{0%,100%{clip-path:inset(65% 0 0 0);transform:translate(2px,1px)}50%{clip-path:inset(10% 0 55% 0);transform:translate(-2px,0)}}",
    "@keyframes nv-spin{to{--nv-angle:360deg}}",
    "@keyframes nv-marquee{to{transform:translateX(-50%)}}",
    "@property --nv-angle{syntax:'<angle>';inherits:false;initial-value:0deg}",
    ".nv-chars{display:inline}.nv-ch{display:inline-block;white-space:pre}",
    ".nv-fx-rise .nv-ch{animation:nv-rise .7s cubic-bezier(.2,.7,.2,1) both}",
    ".nv-fx-wave .nv-ch{animation:nv-wave 2.4s ease-in-out infinite}",
    ".nv-fx-typewriter .nv-ch{animation:nv-type .01s steps(1) both}",
    ".nv-fx-typewriter{border-right:.08em solid currentColor;padding-right:.05em;animation:nv-caret 1s steps(1) infinite}",
    ".nv-fx-glitch,.nv-fx-split{position:relative;display:inline-block}",
    ".nv-fx-glitch::before,.nv-fx-glitch::after,.nv-fx-split::before,.nv-fx-split::after{content:attr(data-nv-text);position:absolute;inset:0;pointer-events:none}",
    ".nv-fx-glitch::before{color:#ff2a6d;animation:nv-glitch1 2.2s infinite steps(2)}.nv-fx-glitch::after{color:#05d9e8;animation:nv-glitch2 2.6s infinite steps(2)}",
    ".nv-fx-split{color:transparent}.nv-fx-split::before{color:var(--nv-t1);clip-path:inset(0 0 50% 0)}.nv-fx-split::after{color:var(--nv-t2);clip-path:inset(50% 0 0 0);transform:translateX(.06em)}",
    ".nv-fx-outline{color:transparent;-webkit-text-stroke:2px var(--nv-t1)}",
    ".nv-fx-gradient,.nv-fx-chrome,.nv-fx-gold{-webkit-background-clip:text;background-clip:text;color:transparent}",
    ".nv-fx-stamp{display:inline-block;text-transform:uppercase;letter-spacing:.12em;border:.12em solid currentColor;padding:.05em .35em;transform:rotate(-3deg);border-radius:.08em}",
    ".nv-framed{position:relative}",
    ".nv-frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:0}",
    ".nv-framed>*:not(.nv-frame){position:relative;z-index:1}",
    /* the ring only: a masked layer ON TOP (first try painted the gradient under the content but
       over the box's own background - the whole card turned into the gradient) */
    ".nv-b-aurora{position:relative}",
    ".nv-b-aurora::before{content:'';position:absolute;inset:0;padding:3px;border-radius:inherit;pointer-events:none;background:conic-gradient(from var(--nv-angle),var(--nv-c1),var(--nv-c2),var(--nv-c3),var(--nv-c1));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:nv-spin 6s linear infinite}",
    ".nv-divider{display:block;width:100%;line-height:0}.nv-divider svg{display:block;width:100%}",
    ".nv-dropcap::first-letter{float:left;font-size:3.6em;line-height:.82;padding:.06em .1em 0 0;color:var(--nv-dc,#c9a227)}",
    "[data-tilt]{transform-style:preserve-3d;transition:transform .2s ease;will-change:transform}",
    "[data-spotlight]{position:relative;overflow:hidden}",
    "[data-spotlight]::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(260px circle at var(--nv-mx,50%) var(--nv-my,50%),rgba(255,255,255,.18),transparent 60%);opacity:0;transition:opacity .25s}",
    "[data-spotlight]:hover::after{opacity:1}",
    ".nv-marquee{overflow:hidden;white-space:nowrap}.nv-marquee-track{display:inline-block;animation:nv-marquee 22s linear infinite}",
    "@media (prefers-reduced-motion: reduce){.nv-ch,.nv-fx-typewriter,.nv-fx-glitch::before,.nv-fx-glitch::after,.nv-b-aurora::before,.nv-marquee-track,.nv-neon{animation:none!important}.nv-fx-glitch::before,.nv-fx-glitch::after{display:none}}"
  ].join("\n");

  function styles() {
    if (document.querySelector("style[data-nuvola-flair]")) return;
    // 2026-11-08: a font entry that is already a data: URL is used as it is - the API key
    // door's viewing copy carries the fonts inside this file (a Nuvola server cannot send
    // binary files: its reply body is a C string)
    var faces = Object.keys(FONTS).map(function (k) { var u = FONTS[k][1].indexOf("data:") === 0 ? FONTS[k][1] : BASE + FONTS[k][1]; return "@font-face{font-family:'" + FONTS[k][0] + "';src:url('" + u + "') format('opentype');font-display:swap}"; }).join("\n");
    var s = document.createElement("style"); s.setAttribute("data-nuvola-flair", ""); s.textContent = faces + "\n" + CSS;
    document.head.insertBefore(s, document.head.firstChild);
  }

  /* ---- artistic borders -------------------------------------------------------------- */
  function svgEl(w, h) { var s = document.createElementNS(SVGNS, "svg"); s.setAttribute("class", "nv-frame"); s.setAttribute("aria-hidden", "true"); s.setAttribute("viewBox", "0 0 " + w + " " + h); s.setAttribute("preserveAspectRatio", "none"); return s; }
  function rectPath(x, y, w, h) { return "M" + x + " " + y + "H" + (x + w) + "V" + (y + h) + "H" + x + "Z"; }
  function cornerFlourish(c, size) {   /* one scroll ornament, drawn for the top-left corner */
    var s = size;
    return "<path d='M4 " + s + " C4 " + (s * .45) + " " + (s * .2) + " 4 " + s + " 4' fill='none' stroke='" + c + "' stroke-width='1.6'/>" +
      "<path d='M10 " + (s * .78) + " C12 " + (s * .4) + " " + (s * .35) + " 12 " + (s * .78) + " 10' fill='none' stroke='" + c + "' stroke-width='1.1'/>" +
      "<path d='M" + (s * .32) + " " + (s * .32) + " c-6 -2 -9 4 -4 7 c4 2 8 -2 5 -6' fill='none' stroke='" + c + "' stroke-width='1.2'/>" +
      "<circle cx='" + (s * .55) + "' cy='" + (s * .14) + "' r='1.8' fill='" + c + "'/><circle cx='" + (s * .14) + "' cy='" + (s * .55) + "' r='1.8' fill='" + c + "'/>";
  }
  function fourCorners(inner, w, h) {   /* repeat a top-left drawing in all four corners */
    return "<g>" + inner + "</g><g transform='translate(" + w + " 0) scale(-1 1)'>" + inner + "</g>" +
      "<g transform='translate(0 " + h + ") scale(1 -1)'>" + inner + "</g><g transform='translate(" + w + " " + h + ") scale(-1 -1)'>" + inner + "</g>";
  }
  var BORDERS = {
    double: function (w, h, c) { return "<path d='" + rectPath(3, 3, w - 6, h - 6) + "' fill='none' stroke='" + c + "' stroke-width='2'/><path d='" + rectPath(9, 9, w - 18, h - 18) + "' fill='none' stroke='" + c + "' stroke-width='1'/>"; },
    deco: function (w, h, c) {
      var s = 16, st = function (x, y, sx, sy) { return "M" + x + " " + (y + sy * s) + "h" + (sx * 6) + "v" + (-sy * 6) + "h" + (sx * 5) + "v" + (-sy * 5) + "h" + (sx * 5); };
      var fan = "<path d='M12 12 L12 44 M12 12 L44 12 M12 12 L36 28 M12 12 L28 36' stroke='" + c + "' stroke-width='1' fill='none'/>";
      return "<path d='" + rectPath(4, 4, w - 8, h - 8) + "' fill='none' stroke='" + c + "' stroke-width='2.5'/>" +
        "<path d='M" + (18 + s) + " 12 H" + (w - 18 - s) + " M" + (18 + s) + " " + (h - 12) + " H" + (w - 18 - s) + " M12 " + (18 + s) + " V" + (h - 18 - s) + " M" + (w - 12) + " " + (18 + s) + " V" + (h - 18 - s) + "' stroke='" + c + "' stroke-width='1'/>" +
        fourCorners("<path d='" + st(12, 12, 1, 1) + "' fill='none' stroke='" + c + "' stroke-width='1.3'/>" + fan, w, h);
    },
    gilded: function (w, h, c, id) {
      var g = "url(#" + id + ")";
      var ros = "<circle cx='14' cy='14' r='7' fill='none' stroke='" + g + "' stroke-width='2'/><circle cx='14' cy='14' r='2.4' fill='" + g + "'/>" +
        [0, 60, 120, 180, 240, 300].map(function (a) { return "<ellipse cx='14' cy='5' rx='2' ry='3.6' fill='" + g + "' transform='rotate(" + a + " 14 14)'/>"; }).join("");
      return "<defs><linearGradient id='" + id + "' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='" + shade(c, 1.45) + "'/><stop offset='.35' stop-color='" + c + "'/><stop offset='.55' stop-color='" + shade(c, 1.6) + "'/><stop offset='1' stop-color='" + shade(c, .6) + "'/></linearGradient></defs>" +
        "<path d='" + rectPath(3, 3, w - 6, h - 6) + "' fill='none' stroke='" + g + "' stroke-width='4'/><path d='" + rectPath(11, 11, w - 22, h - 22) + "' fill='none' stroke='" + g + "' stroke-width='1.2'/>" + fourCorners(ros, w, h);
    },
    vine: function (w, h, c, id, r) {
      var out = "<path d='" + rectPath(10, 10, w - 20, h - 20) + "' fill='none' stroke='" + c + "' stroke-width='1.4'/>", x, y, k = 0;
      function leaf(px, py, ang) { return "<path d='M0 0 C4 -6 12 -6 16 0 C12 6 4 6 0 0Z' fill='" + c + "' opacity='.85' transform='translate(" + px.toFixed(1) + " " + py.toFixed(1) + ") rotate(" + ang + ")'/>"; }
      for (x = 34; x < w - 34; x += 38) { k++; out += leaf(x, 10, k % 2 ? -35 : 215) + leaf(x + 6, h - 10, k % 2 ? 35 : 145); }
      for (y = 34; y < h - 34; y += 38) { k++; out += leaf(10, y, k % 2 ? 55 : 125) + leaf(w - 10, y + 6, k % 2 ? -55 : 235); }
      return out + fourCorners("<path d='M10 30 C10 14 14 10 30 10 M18 18 c-6 -6 -12 2 -6 6 c4 3 9 -1 6 -5' fill='none' stroke='" + c + "' stroke-width='1.6'/>", w, h);
    },
    ornate: function (w, h, c) { return "<path d='" + rectPath(14, 14, w - 28, h - 28) + "' fill='none' stroke='" + c + "' stroke-width='1'/>" + fourCorners(cornerFlourish(c, Math.min(64, Math.min(w, h) / 3)), w, h); },
    corners: function (w, h, c) { var L = Math.min(48, Math.min(w, h) / 4); return fourCorners("<path d='M6 " + L + " V6 H" + L + "' fill='none' stroke='" + c + "' stroke-width='3'/><path d='M14 14 l6 -6 l6 6 l-6 6z' fill='" + c + "'/>", w, h); },
    film: function (w, h, c) {
      var band = 22, out = "<rect x='0' y='0' width='" + w + "' height='" + band + "' fill='" + c + "'/><rect x='0' y='" + (h - band) + "' width='" + w + "' height='" + band + "' fill='" + c + "'/>";
      for (let x = 10; x < w - 14; x += 26) out += "<rect x='" + x + "' y='6' width='14' height='10' rx='2.5' fill='#f5f1e8'/><rect x='" + x + "' y='" + (h - 16) + "' width='14' height='10' rx='2.5' fill='#f5f1e8'/>";
      return out;
    },
    stitch: function (w, h, c) { return "<rect x='9' y='9' width='" + (w - 18) + "' height='" + (h - 18) + "' rx='12' fill='none' stroke='" + c + "' stroke-width='2.2' stroke-dasharray='7 6' stroke-linecap='round'/>"; },
    brush: function (w, h, c, id, r) {
      function wob(x, y, ww, hh, amp) {
        var p = "M" + (x + r() * amp) + " " + (y + r() * amp), seg = 9, i;
        for (i = 1; i <= seg; i++) p += " L" + (x + ww * i / seg).toFixed(1) + " " + (y + (r() - .5) * amp).toFixed(1);
        for (i = 1; i <= seg; i++) p += " L" + (x + ww + (r() - .5) * amp).toFixed(1) + " " + (y + hh * i / seg).toFixed(1);
        for (i = seg - 1; i >= 0; i--) p += " L" + (x + ww * i / seg).toFixed(1) + " " + (y + hh + (r() - .5) * amp).toFixed(1);
        for (i = seg - 1; i >= 1; i--) p += " L" + (x + (r() - .5) * amp).toFixed(1) + " " + (y + hh * i / seg).toFixed(1);
        return p + "Z";
      }
      return "<path d='" + wob(6, 6, w - 12, h - 12, 5) + "' fill='none' stroke='" + c + "' stroke-width='4' stroke-linejoin='round' opacity='.85'/>" +
        "<path d='" + wob(8, 8, w - 16, h - 16, 4) + "' fill='none' stroke='" + c + "' stroke-width='1.5' stroke-linejoin='round' opacity='.6'/>";
    },
    wave: function (w, h, c) {
      var a = 7, out = "M8 8", x, y;
      for (x = 8; x < w - 8; x += 2 * a) out += " q" + a + " -" + a + " " + (2 * a) + " 0";
      for (y = 8; y < h - 8; y += 2 * a) out += " q" + a + " " + a + " 0 " + (2 * a);
      for (x = w - 8; x > 8; x -= 2 * a) out += " q-" + a + " " + a + " -" + (2 * a) + " 0";
      for (y = h - 8; y > 8; y -= 2 * a) out += " q-" + a + " -" + a + " 0 -" + (2 * a);
      return "<path d='" + out + "' fill='none' stroke='" + c + "' stroke-width='1.8'/>";
    }
  };
  function drawFrame(el, kind, c, id, seed) {
    var w = Math.max(40, Math.round(el.clientWidth)), h = Math.max(40, Math.round(el.clientHeight));
    var old = el.querySelector(":scope > svg.nv-frame"); if (old) old.remove();
    var s = svgEl(w, h); s.innerHTML = BORDERS[kind](w, h, c, id, rng(seed)); el.insertBefore(s, el.firstChild);
  }
  function borders() {
    all("[data-border]").forEach(function (el, n) {
      if (!once(el, "Bd")) return;
      var kind = (el.getAttribute("data-border") || "").toLowerCase().trim(), c = el.getAttribute("data-border-color") || accent(el);
      var pad = parseFloat(getComputedStyle(el).paddingTop) || 0;
      if (kind === "neon") {
        el.classList.add("nv-neon");
        el.style.border = "2px solid " + c; el.style.borderRadius = el.style.borderRadius || "14px";
        el.style.boxShadow = "0 0 6px " + c + ",0 0 18px " + c + ",inset 0 0 10px " + c;
        if (!RM) el.style.animation = "nv-flicker 6s infinite";
      } else if (kind === "aurora") {
        el.classList.add("nv-b-aurora");
        let cs = (el.getAttribute("data-border-colors") || (c + "," + shade(c, 1.5) + ",#7b5cff")).split(",");
        el.style.setProperty("--nv-c1", cs[0]); el.style.setProperty("--nv-c2", cs[1] || cs[0]); el.style.setProperty("--nv-c3", cs[2] || cs[0]);
        if (getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)") el.style.backgroundColor = getComputedStyle(document.body).backgroundColor || "#fff";
        el.style.borderRadius = el.style.borderRadius || "16px";
      } else if (kind === "torn") {
        let r = rng(hashStr(el.textContent || "torn") + n), pts = ["0% 4%"], x;
        for (x = 4; x <= 100; x += 4) pts.push(x + "% " + (r() * 3.5).toFixed(2) + "%");
        pts.push("100% 96%");
        for (x = 96; x >= 0; x -= 4) pts.push(x + "% " + (100 - r() * 3.5).toFixed(2) + "%");
        el.style.clipPath = "polygon(" + pts.join(",") + ")";
        if (pad < 20) el.style.paddingTop = el.style.paddingBottom = "28px";
      } else if (kind === "ticket") {
        let m = "radial-gradient(circle at 0 50%,transparent 14px,#000 15px) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent 14px,#000 15px) right/51% 100% no-repeat";
        el.style.webkitMask = m; el.style.mask = m;
        el.style.borderRadius = el.style.borderRadius || "10px";
      } else if (BORDERS[kind]) {
        el.classList.add("nv-framed");
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        if (pad < 24) el.style.padding = (kind === "film" ? "38px 24px" : "32px");
        let id = "nvg" + n + Math.floor(Math.random() * 1e6), seed = hashStr(kind + n);
        drawFrame(el, kind, c, id, seed);
        if ("ResizeObserver" in window) { let t = null; new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { drawFrame(el, kind, c, id, seed); }, 60); }).observe(el); }
      } else return;
      done.push("border:" + kind);
    });
  }

  /* ---- page-name characters ------------------------------------------------------------ */
  function splitChars(el, cls) {
    var text = el.textContent; el.setAttribute("aria-label", text.trim()); el.textContent = "";
    var wrap = document.createElement("span"); wrap.className = "nv-chars " + cls; wrap.setAttribute("aria-hidden", "true");
    var i = 0;
    text.split(/(\s+)/).forEach(function (word) {
      if (/^\s+$/.test(word)) { wrap.appendChild(document.createTextNode(" ")); return; }
      var w = document.createElement("span"); w.style.display = "inline-block"; w.style.whiteSpace = "nowrap";
      Array.prototype.forEach.call(word, function (ch) { var s = document.createElement("span"); s.className = "nv-ch"; s.textContent = ch; s.style.setProperty("--i", i); w.appendChild(s); i++; });
      wrap.appendChild(w);
    });
    el.appendChild(wrap); return wrap;
  }
  function titles() {
    all("[data-title-fx],[data-title-font]").forEach(function (el) {
      if (!once(el, "Ti")) return;
      var fx = (el.getAttribute("data-title-fx") || "").toLowerCase().trim();
      var c = el.getAttribute("data-title-color") || accent(el);
      var cs = (el.getAttribute("data-title-colors") || (c + "," + shade(c, 1.5))).split(",");
      var font = el.getAttribute("data-title-font") || (fx === "script" ? "script" : "");
      if (font && fontStack(font)) el.style.fontFamily = fontStack(font);
      var text = el.textContent.trim(), wrap;
      el.style.setProperty("--nv-t1", cs[0]); el.style.setProperty("--nv-t2", cs[1] || cs[0]);
      switch (fx) {
        case "rise": wrap = splitChars(el, "nv-fx-rise"); all(".nv-ch", wrap).forEach(function (s, i) { s.style.animationDelay = (i * 0.04) + "s"; }); break;
        case "wave": wrap = splitChars(el, "nv-fx-wave"); all(".nv-ch", wrap).forEach(function (s, i) { s.style.animationDelay = (i * 0.09) + "s"; }); break;
        case "typewriter": wrap = splitChars(el, "nv-fx-typewriter"); all(".nv-ch", wrap).forEach(function (s, i) { s.style.animationDelay = (RM ? 0 : i * 0.07) + "s"; }); break;
        case "glitch": case "split": {
          el.innerHTML = ""; el.setAttribute("aria-label", text);
          const g = document.createElement("span"); g.className = "nv-fx-" + fx; g.setAttribute("data-nv-text", text); g.textContent = text; el.appendChild(g); break;
        }
        case "neon": el.style.color = shade(c, 1.55); el.style.textShadow = "0 0 4px " + c + ",0 0 11px " + c + ",0 0 22px " + c + ",0 0 42px " + c; if (!RM) el.style.animation = "nv-flicker 7s infinite"; el.classList.add("nv-neon"); break;
        case "3d": el.style.color = c; el.style.textShadow = [1, 2, 3, 4, 5, 6, 7].map(function (k) { return k + "px " + k + "px 0 " + shade(c, 0.78 - k * 0.05); }).join(",") + ",8px 10px 14px rgba(0,0,0,.35)"; break;
        case "long-shadow": { el.style.color = c; const ls = []; for (let k = 1; k <= 36; k++) ls.push(k + "px " + k + "px 0 rgba(0,0,0," + (0.22 * (1 - k / 37)).toFixed(3) + ")"); el.style.textShadow = ls.join(","); break; }
        case "outline": el.classList.add("nv-fx-outline"); break;
        case "gradient": el.classList.add("nv-fx-gradient"); el.style.backgroundImage = "linear-gradient(100deg," + cs.join(",") + ")"; break;
        case "chrome": el.classList.add("nv-fx-chrome"); el.style.backgroundImage = "linear-gradient(180deg,#fdfdfd 0%,#b9bec7 38%,#5d636e 50%,#e8ebef 62%,#9aa1ac 100%)"; el.style.filter = "drop-shadow(0 2px 2px rgba(0,0,0,.35))"; break;
        case "gold": el.classList.add("nv-fx-gold"); el.style.backgroundImage = "linear-gradient(180deg,#fff3b0 0%,#e3b23c 40%,#9a6b12 52%,#f2cf6b 70%,#b07d1c 100%)"; el.style.filter = "drop-shadow(0 2px 1px rgba(60,40,0,.45))"; break;
        case "engraved": el.style.color = shade(c, 0.85); el.style.textShadow = "0 1px 0 rgba(255,255,255,.55),0 -1px 0 rgba(0,0,0,.45)"; break;
        case "stamp": { el.innerHTML = ""; el.setAttribute("aria-label", text); const st = document.createElement("span"); st.className = "nv-fx-stamp"; st.textContent = text; st.style.color = c; el.appendChild(st); break; }
        case "script": el.style.fontWeight = "normal"; el.style.letterSpacing = "0"; if (!el.style.fontSize) el.style.fontSize = "clamp(2.6rem, 7vw, 5.5rem)"; break;
        default: if (!font) return;
      }
      done.push("title:" + (fx || "font-" + font));
    });
  }

  /* ---- dividers ---------------------------------------------------------------------- */
  var DIVIDERS = {
    wave: function (c) { return ["0 0 1200 60", "<path d='M0 30 C150 0 300 60 450 30 S750 0 900 30 S1050 60 1200 30 V60 H0Z' fill='" + c + "'/>"]; },
    zigzag: function (c) { let p = "M0 40"; for (let x = 0; x <= 1200; x += 40) p += " L" + (x + 20) + " 10 L" + (x + 40) + " 40"; return ["0 0 1200 50", "<path d='" + p + " V50 H0Z' fill='" + c + "'/>"]; },
    scallop: function (c) { let p = "M0 40"; for (let x = 0; x < 1200; x += 60) p += " a30 30 0 0 1 60 0"; return ["0 0 1200 50", "<path d='" + p + " V50 H0Z' fill='" + c + "'/>"]; },
    mountains: function (c) { return ["0 0 1200 90", "<path d='M0 90 L140 30 L230 70 L360 12 L470 60 L600 22 L720 66 L850 18 L980 62 L1090 34 L1200 70 V90Z' fill='" + c + "' opacity='.55'/><path d='M0 90 L110 60 L260 78 L400 46 L560 80 L700 52 L860 82 L1010 56 L1200 84 V90Z' fill='" + c + "'/>"]; },
    ornament: function (c) { return ["0 0 1200 40", "<line x1='160' y1='20' x2='540' y2='20' stroke='" + c + "' stroke-width='1.5'/><line x1='660' y1='20' x2='1040' y2='20' stroke='" + c + "' stroke-width='1.5'/><text x='600' y='29' text-anchor='middle' font-size='30' fill='" + c + "' font-family='DejaVu Sans, serif'>\u2766</text><circle cx='160' cy='20' r='3' fill='" + c + "'/><circle cx='1040' cy='20' r='3' fill='" + c + "'/>"]; },
    dots: function (c) { let o = ""; for (let x = 420; x <= 780; x += 30) o += "<circle cx='" + x + "' cy='15' r='" + (x === 600 ? 6 : 3) + "' fill='" + c + "'/>"; return ["0 0 1200 30", o]; },
    flourish: function (c) { return ["0 0 1200 50", "<path d='M300 25 C420 25 460 5 540 18 C580 25 590 38 600 25 C610 38 620 25 660 18 C740 5 780 25 900 25' fill='none' stroke='" + c + "' stroke-width='2'/><path d='M560 25 c10 -14 30 -14 40 0 c10 -14 30 -14 40 0' fill='none' stroke='" + c + "' stroke-width='1.4'/><circle cx='600' cy='12' r='3.5' fill='" + c + "'/>"]; },
    deco: function (c) { return ["0 0 1200 40", "<path d='M200 20 H520 M680 20 H1000 M240 12 H500 M700 12 H960 M240 28 H500 M700 28 H960' stroke='" + c + "' stroke-width='1.4'/><path d='M600 4 L616 20 L600 36 L584 20Z' fill='none' stroke='" + c + "' stroke-width='2'/><path d='M600 12 L608 20 L600 28 L592 20Z' fill='" + c + "'/>"]; },
    brush: function (c) { return ["0 0 1200 40", "<path d='M80 24 C300 10 520 30 700 18 C860 8 1000 26 1120 16 L1122 22 C1000 32 860 16 700 26 C520 36 300 18 82 30Z' fill='" + c + "' opacity='.9'/>"]; }
  };
  function dividers() {
    all("[data-divider]").forEach(function (el) {
      if (!once(el, "Dv")) return;
      var kind = (el.getAttribute("data-divider") || "").toLowerCase().trim(); if (!DIVIDERS[kind]) return;
      var c = el.getAttribute("data-divider-color") || accent(el), d = DIVIDERS[kind](c);
      el.classList.add("nv-divider"); el.setAttribute("role", "separator"); el.setAttribute("aria-hidden", "true");
      var flip = el.hasAttribute("data-divider-flip") ? " style='transform:scaleY(-1)'" : "";
      el.innerHTML = "<svg viewBox='" + d[0] + "' preserveAspectRatio='none' height='" + d[0].split(" ")[3] + "'" + flip + " xmlns='" + SVGNS + "'>" + d[1] + "</svg>";
      done.push("divider:" + kind);
    });
  }

  /* ---- drop caps, tilt, spotlight, backgrounds, marquee --------------------------------- */
  function extras() {
    all("[data-dropcap]").forEach(function (p) {
      if (!once(p, "Dc")) return;
      p.classList.add("nv-dropcap"); p.style.setProperty("--nv-dc", p.getAttribute("data-dropcap-color") || accent(p));
      var st = document.createElement("style"), id = "nvdc" + Math.floor(Math.random() * 1e6); p.setAttribute("data-nv-dc", id);
      st.textContent = "[data-nv-dc='" + id + "']::first-letter{font-family:" + (p.getAttribute("data-dropcap") === "serif" ? fontStack("palatino") : fontStack("script")) + "}";
      document.head.appendChild(st); done.push("dropcap");
    });
    all("[data-tilt]").forEach(function (c) {
      if (!once(c, "Tl") || RM) return;
      var max = parseFloat(c.getAttribute("data-tilt")) || 8;
      c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = "perspective(800px) rotateX(" + (-y * max).toFixed(2) + "deg) rotateY(" + (x * max).toFixed(2) + "deg)"; });
      c.addEventListener("pointerleave", function () { c.style.transform = ""; });
      done.push("tilt");
    });
    all("[data-spotlight]").forEach(function (c) {
      if (!once(c, "Sp")) return;
      c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); c.style.setProperty("--nv-mx", (e.clientX - r.left) + "px"); c.style.setProperty("--nv-my", (e.clientY - r.top) + "px"); });
      done.push("spotlight");
    });
    all("[data-bg]").forEach(function (b) {
      if (!once(b, "Bg")) return;
      var k = b.getAttribute("data-bg"), c = accent(b), layer = "";
      if (k === "grain") layer = "url(\"data:image/svg+xml;utf8,<svg xmlns='" + SVGNS + "' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
      else if (k === "dots") layer = "radial-gradient(" + c + "33 1.2px, transparent 1.6px) 0 0/18px 18px";
      else if (k === "grid") layer = "linear-gradient(" + c + "22 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg," + c + "22 1px,transparent 1px) 0 0/28px 28px";
      else if (k === "mesh") layer = "radial-gradient(at 20% 20%," + c + "55,transparent 50%),radial-gradient(at 80% 30%," + shade(c, 1.5) + "55,transparent 50%),radial-gradient(at 50% 90%,#7b5cff44,transparent 55%)";
      else if (k === "aurora") layer = "linear-gradient(120deg," + c + "33,transparent 40%),linear-gradient(240deg,#05d9e833,transparent 45%),linear-gradient(0deg,#7b5cff22,transparent 60%)";
      else return;
      b.style.backgroundImage = layer + (getComputedStyle(b).backgroundImage !== "none" ? "," + getComputedStyle(b).backgroundImage : "");
      done.push("bg:" + k);
    });
    all("[data-marquee]").forEach(function (m) {
      if (!once(m, "Mq")) return;
      var html = m.innerHTML; m.classList.add("nv-marquee"); m.setAttribute("aria-label", m.textContent.trim());
      m.innerHTML = "<span class='nv-marquee-track' aria-hidden='true'>" + html + "\u2003\u2003" + html + "\u2003\u2003</span>";
      done.push("marquee");
    });
  }

  function init() {
    styles();
    [borders, titles, dividers, extras].forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error("nuvola_flair: " + f.name + ": " + e.message); } });
    document.documentElement.setAttribute("data-nv-flair", done.join(" ") || "none");
  }
  window.NuvolaFlair = { init: init, borders: Object.keys(BORDERS).concat(["neon", "aurora", "torn", "ticket"]), dividers: Object.keys(DIVIDERS), fonts: Object.keys(FONTS), version: "1.0" };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
