/* nuvola_scenes.js v2 - Nuvola's DEMO IMAGES drawn with three.js (Tank 2026-11-07:
 * "make images for temp demo's on sites that look better than some origami ... using
 * three.js and not imagegen" -> "the demo images should never need a whole lot of GPU to
 * make those images, and they need to have a wide variety of images it can make").
 *
 *   <img data-scene="alpine" data-seed="3" data-mood="dawn" alt="Snowy peaks at sunrise">
 *   <div data-scene="street" data-seed="7" style="height:320px"></div>   (a background)
 *   <script src="three.min.js"></script><script src="nuvola_scenes.js"></script>
 *
 * LIGHT ON THE GPU, by design: ONE shared renderer, each picture drawn ONCE at no more
 * than 720 px wide (the page scales it), pixel ratio 1, no shadow maps (soft contact
 * blobs instead), no environment pre-pass (water is a small sky-reflecting shader), low
 * terrain detail, heights from formulas (no ray casts), textures drawn on tiny 2D canvases.
 * Every picture's draw time is kept in window.NuvolaScenes.times.
 *
 * VARIETY: kinds below x moods (dawn, day, golden, dusk, night, overcast) x seeds - the
 * seed also moves the camera, the palette and the layout. data-accent="#hex" tints
 * products, cars, abstract and neon. NuvolaScenes.kinds lists every kind.
 */
(function () {
  "use strict";
  if (typeof THREE === "undefined") { console.warn("nuvola_scenes.js needs three.min.js first"); return; }
  var MAXW = 720;

  // ---- seeded randomness + smooth noise --------------------------------------------
  function rng(seed) { var a = (seed * 2654435761) >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function makeNoise(r) {
    var p = new Uint8Array(512), i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 256; i++) p[i + 256] = p[i];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function grad(h, x, y) { var u = (h & 1) ? x : -x, v = (h & 2) ? y : -y; return (h & 4) ? u + v * 0.5 : u * 0.5 + v; }
    function n2(x, y) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
      var u = fade(x), v = fade(y), a = p[X] + Y, b = p[X + 1] + Y;
      var l1 = grad(p[a], x, y) + u * (grad(p[b], x - 1, y) - grad(p[a], x, y));
      var l2 = grad(p[a + 1], x, y - 1) + u * (grad(p[b + 1], x - 1, y - 1) - grad(p[a + 1], x, y - 1));
      return l1 + v * (l2 - l1);
    }
    var f = function (x, y, oct) { var s = 0, amp = 0.5, fr = 1; for (var o = 0; o < (oct || 5); o++) { s += amp * n2(x * fr, y * fr); fr *= 2.03; amp *= 0.5; } return s; };
    f.ridge = function (x, y, oct) { var s = 0, amp = 0.5, fr = 1; for (var o = 0; o < (oct || 5); o++) { var v = 1 - Math.abs(n2(x * fr, y * fr) * 1.6); s += amp * v * v; fr *= 2.1; amp *= 0.5; } return s; };
    return f;
  }
  function col(h) { return new THREE.Color(h); }
  function mix(a, b, t) { return col(a).lerp(col(b), t); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  var V3 = function (x, y, z) { return new THREE.Vector3(x, y, z); };

  // ---- moods: sky, light, fog ----------------------------------------------------------
  var MOODS = {
    dawn:     { top: "#2c3d6e", mid: "#d99a96", low: "#ffd9b0", sun: "#ffcf9e", sunI: 2.3, amb: 0.75, fog: "#d8b3ac", sunEl: 0.08, deep: "#2a3550", clouds: "#ffd2c0", stars: 0 },
    day:      { top: "#2a6ab8", mid: "#86bde8", low: "#dceffc", sun: "#fff6e6", sunI: 3.0, amb: 0.95, fog: "#bcd7ea", sunEl: 0.55, deep: "#1b4a66", clouds: "#ffffff", stars: 0 },
    golden:   { top: "#3a5aa0", mid: "#f0b27a", low: "#ffe2a8", sun: "#ffc070", sunI: 2.8, amb: 0.8, fog: "#e9c79a", sunEl: 0.14, deep: "#3a3a4a", clouds: "#ffe6c4", stars: 0 },
    dusk:     { top: "#1e1b40", mid: "#b8507e", low: "#ffae6a", sun: "#ff9a50", sunI: 2.4, amb: 0.6, fog: "#8e5e7c", sunEl: 0.05, deep: "#251a32", clouds: "#f2a08c", stars: 0.3 },
    night:    { top: "#03050f", mid: "#0f1836", low: "#22305c", sun: "#a9bcff", sunI: 0.9, amb: 0.45, fog: "#121a34", sunEl: 0.4, deep: "#060a18", clouds: "#3a4670", stars: 1 },
    overcast: { top: "#7b8794", mid: "#aab4be", low: "#d5dbe0", sun: "#eef2f6", sunI: 1.6, amb: 1.25, fog: "#b4bdc6", sunEl: 0.6, deep: "#3e4c56", clouds: "#e6eaee", stars: 0 }
  };

  // ---- shaders share three.js's tone mapping + colour space so they match lit objects --
  var OUT = "\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n";
  function skyDome(S, m, sunDir, sunOn) {
    var mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: true,
      uniforms: { top: { value: col(m.top) }, mid: { value: col(m.mid) }, low: { value: col(m.low) }, sunC: { value: col(m.sun) }, sunD: { value: sunDir.clone().normalize() }, sunOn: { value: sunOn } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top,mid,low,sunC,sunD; uniform float sunOn; varying vec3 vP; void main(){ float h=clamp(vP.y,-0.25,1.0);" +
        "vec3 c = h<0.10 ? mix(low,mid,smoothstep(-0.25,0.10,h)) : mix(mid,top,smoothstep(0.10,0.8,h)); float s=max(dot(vP,normalize(sunD)),0.0);" +
        "c += sunOn*sunC*(pow(s,900.0)*4.0 + pow(s,40.0)*0.45 + pow(s,6.0)*0.12); gl_FragColor=vec4(c,1.0);" + OUT + "}"
    });
    S.scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), mat));
  }
  function lights(S, m, sunDir) {
    S.scene.add(new THREE.HemisphereLight(col(m.mid).lerp(col("#ffffff"), 0.3), col(m.fog).multiplyScalar(0.55), m.amb * 1.5));
    var d = new THREE.DirectionalLight(col(m.sun), m.sunI); d.position.copy(sunDir).multiplyScalar(300); S.scene.add(d);
  }
  function sunFor(m, r, az) { az = (az === undefined) ? (r() - 0.5) * 1.2 : az; return V3(Math.sin(az), m.sunEl + 0.03, -Math.cos(az)).normalize(); }
  function fog(S, m, dens) { S.scene.fog = new THREE.FogExp2(col(m.fog), dens); }

  // tiny canvas textures (2D, cheap, cached per picture)
  function canvasTex(w, h, paint) { var c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function puffTex(r) { return canvasTex(256, 128, function (g, w, h) { for (var i = 0; i < 14; i++) { var x = w * (0.18 + r() * 0.64), y = h * (0.45 + r() * 0.25), rad = h * (0.18 + r() * 0.28); var gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 6.3); g.fill(); } }); }
  function blobTex() { return canvasTex(128, 128, function (g, w) { var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }); }
  function glowTex(c) { return canvasTex(128, 128, function (g, w) { var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, c); gr.addColorStop(0.25, c.replace(/[\d.]+\)$/, "0.45)")); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }); }

  function clouds(S, r, m, n, yLow, yHigh) {
    if (!n) return; var tex = puffTex(r);
    for (var i = 0; i < n; i++) {
      var mat = new THREE.SpriteMaterial({ map: tex, color: col(m.clouds), transparent: true, depthWrite: false, opacity: 0.55 + r() * 0.4, fog: true });
      var s = new THREE.Sprite(mat), dist = 260 + r() * 420, ang = (r() - 0.5) * 2.2;
      s.position.set(Math.sin(ang) * dist, yLow + r() * (yHigh - yLow), -Math.cos(ang) * dist);
      var sc = 90 + r() * 170; s.scale.set(sc * 2, sc, 1); S.scene.add(s);
    }
  }
  function stars(S, r, n, size) {
    var g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var th = r() * 6.283, y = 0.02 + r() * 0.98, rr = Math.sqrt(1 - y * y) * 850; pos[i * 3] = Math.cos(th) * rr; pos[i * 3 + 1] = y * 850; pos[i * 3 + 2] = Math.sin(th) * rr; }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    S.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffffff", size: size || 1.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  }
  function moon(S, r, dir, size) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(size || 14, 24, 16), new THREE.MeshBasicMaterial({ color: "#f3f1e8", fog: false }));
    m.position.copy(dir).multiplyScalar(700); S.scene.add(m);
    var g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(220,228,255,0.9)"), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    g.position.copy(m.position); g.scale.set(180, 180, 1); S.scene.add(g);
  }
  function aurora(S, r) {
    for (var k = 0; k < 3; k++) {
      var geo = new THREE.PlaneGeometry(700, 160, 60, 1), pos = geo.attributes.position, ph = r() * 6.3;
      for (var i = 0; i < pos.count; i++) { var x = pos.getX(i); pos.setZ(i, Math.sin(x * 0.012 + ph) * 60 + Math.sin(x * 0.031 + ph * 2) * 18); }
      var mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
        uniforms: { a: { value: col(pick(r, ["#36ffb0", "#5dff9a", "#3cf0d0"])) }, b: { value: col(pick(r, ["#7a4dff", "#c04dff", "#3f6bff"])) } },
        vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "uniform vec3 a,b; varying vec2 vU; void main(){ float f = smoothstep(0.0,0.25,vU.y)*(1.0-smoothstep(0.35,1.0,vU.y)); float bands = 0.6+0.4*sin(vU.x*90.0); vec3 c = mix(a,b,vU.y); gl_FragColor = vec4(c*f*bands*0.9, 1.0);" + OUT + "}" });
      var m = new THREE.Mesh(geo, mat); m.position.set((r() - 0.5) * 200, 150 + k * 40, -520 - k * 60); m.rotation.x = 0.25; S.scene.add(m);
    }
  }
  function water(S, m, sunDir, y, deep, sunOn) {
    var mat = new THREE.ShaderMaterial({ fog: false,
      uniforms: { t: { value: 0 }, top: { value: col(m.top) }, mid: { value: col(m.mid) }, low: { value: col(m.low) }, deep: { value: col(deep || m.deep) }, sunC: { value: col(m.sun) }, sunD: { value: sunDir.clone().normalize() }, sunOn: { value: sunOn === undefined ? 1 : sunOn }, fogC: { value: col(m.fog) }, fogD: { value: S.scene.fog ? S.scene.fog.density : 0.002 } },
      vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
      fragmentShader: "uniform vec3 top,mid,low,deep,sunC,sunD,fogC; uniform float sunOn,fogD,t; varying vec3 vW; void main(){ vec3 V = normalize(vW-cameraPosition); vec2 p = vW.xz*0.12 + vec2(t*0.05, t*0.03);" +
        "vec3 N = normalize(vec3(sin(p.x*3.1+p.y*1.7)*0.035+sin(p.x*9.3-p.y*6.1)*0.015, 1.0, cos(p.y*3.4-p.x*1.3)*0.035+cos(p.x*7.1+p.y*8.7)*0.015));" +
        "vec3 R = reflect(V,N); float h = clamp(R.y,0.0,1.0); vec3 sky = h<0.10 ? mix(low,mid,h/0.10) : mix(mid,top,smoothstep(0.10,0.8,h));" +
        "float fr = 0.2+0.8*pow(1.0-max(dot(-V,N),0.0),4.0); vec3 c = mix(deep, sky, fr); float s = pow(max(dot(R,normalize(sunD)),0.0),220.0); c += sunC*s*3.0*sunOn;" +
        "float d = length(vW-cameraPosition); c = mix(c, fogC, 1.0-exp(-fogD*fogD*d*d)); gl_FragColor = vec4(c,1.0);" + OUT + "}" });
    var w = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat); w.rotation.x = -Math.PI / 2; w.position.y = y; S.scene.add(w); return mat;
  }

  // ---- terrain from a HEIGHT FUNCTION (trees use the same function - no ray casts) -----
  var SEASON = {
    summer:   { grass: "#4f7a36", dry: "#7d8a4a", rock: "#7a756c", snow: "#f2f5f8", trees: ["#2e5a2c", "#3a6b33", "#26502a", "#4b7a35"], trunk: "#4a3526", flowers: ["#ffd84d", "#ff6b8b", "#ffffff", "#b07dff"] },
    autumn:   { grass: "#7e7a3a", dry: "#9a7a40", rock: "#7d7268", snow: "#f2f5f8", trees: ["#d8792a", "#c4462e", "#e3b23c", "#a9632a", "#4f6b2e"], trunk: "#4a3526", flowers: ["#e3b23c", "#c4462e"] },
    winter:   { grass: "#e8edf2", dry: "#cdd6de", rock: "#6f737a", snow: "#f6f8fb", trees: ["#24402e", "#2c4a35", "#1f3a29"], trunk: "#3d2f25", flowers: [] },
    spring:   { grass: "#6a9a3e", dry: "#8fae58", rock: "#7a756c", snow: "#f2f5f8", trees: ["#f4b6c8", "#f7c9d6", "#ffffff", "#5c8f3a"], trunk: "#4a3526", flowers: ["#ffffff", "#ffd1e0", "#ffe36e"] },
    tropical: { grass: "#3f8a3a", dry: "#d9c08a", rock: "#6d6a5f", snow: "#f2f5f8", trees: ["#2f7d3a", "#3c9441", "#27693a"], trunk: "#8a6b45", flowers: ["#ff4d6d", "#ffb703"] },
    arid:     { grass: "#c9a46a", dry: "#d8b47a", rock: "#a8664a", snow: "#f2f5f8", trees: ["#6b7a3a", "#7d8a48"], trunk: "#6b4f35", flowers: [] },
    savanna:  { grass: "#c2a24e", dry: "#d6b866", rock: "#8a6e52", snow: "#f2f5f8", trees: ["#5f7a32", "#6d8a3a"], trunk: "#4a3526", flowers: [] }
  };
  function terrain(S, hf, cx, cz, w, d, segW, segD, sea, snowLine, maxH) {
    var g = new THREE.PlaneGeometry(w, d, segW, segD); g.rotateX(-Math.PI / 2);
    var pos = g.attributes.position, i;
    for (i = 0; i < pos.count; i++) { pos.setX(i, pos.getX(i) + cx); pos.setZ(i, pos.getZ(i) + cz); pos.setY(i, hf(pos.getX(i), pos.getZ(i))); }
    g.computeVertexNormals();
    var nrm = g.attributes.normal, cols = new Float32Array(pos.count * 3), c = new THREE.Color(), gr = col(sea.grass), dr = col(sea.dry), rk = col(sea.rock), sn = col(sea.snow);
    for (i = 0; i < pos.count; i++) {
      var y = pos.getY(i), ny = nrm.getY(i), t = maxH ? y / maxH : 0;
      c.copy(gr).lerp(dr, smooth(0.15, 0.5, t)).lerp(rk, smooth(0.78, 0.55, ny));
      if (snowLine !== undefined && t > snowLine && ny > 0.55) c.lerp(sn, smooth(snowLine, snowLine + 0.12, t));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); S.scene.add(m); return m;
  }
  function backdrop(noise, base, amp, scale, zNear, zFull, ridge) {   // mountains that rise away from the camera
    return function (x, z) { var n = ridge ? noise.ridge(x * scale, z * scale, 5) : (noise(x * scale, z * scale, 5) + 0.5); return base + n * amp * smooth(zNear, zFull, -z); };
  }

  // ---- vegetation (instanced, flat shaded) ---------------------------------------------
  function instanced(S, geo, mat, n) { var m = new THREE.InstancedMesh(geo, mat, n); S.scene.add(m); return m; }
  var MM = new THREE.Matrix4(), QQ = new THREE.Quaternion(), SS = new THREE.Vector3(), PP = new THREE.Vector3(), UP = V3(0, 1, 0), CC = new THREE.Color();
  function plant(S, r, hf, kind, n, x0, x1, z0, z1, sea, minY, avoid) {
    var trunkG = new THREE.CylinderGeometry(0.1, 0.16, 1, 5); trunkG.translate(0, 0.5, 0);
    var trunkM = new THREE.MeshLambertMaterial({ color: sea.trunk }), leafM = new THREE.MeshLambertMaterial({ flatShading: true });
    // 2026-11-07: a broadleaf canopy was ONE 20-face icosahedron - backlit (every landscape
    // faces its sun) a near tree read as a black hexagon on a stick (Wild Lens gallery,
    // "Meadow Waltz"). Now 3 rounder blobs per tree + a faint lift in EACH TREE'S OWN colour
    // (instance colour = vColor in r160's shader) so the shadow side is deep green, not
    // black. One season colour for the lift turned spring's green trees mauve (first try).
    var broad = kind === "broadleaf", C2 = new THREE.Color();
    if (broad) leafM.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n\ttotalEmissiveRadiance += vColor * 0.18;\n#endif"); };
    var parts = kind === "pine" ? 3 : (kind === "palm" ? 7 : (broad ? 3 : 1));
    var leafG = kind === "pine" ? new THREE.ConeGeometry(1, 1, 7) : (kind === "palm" ? new THREE.ConeGeometry(0.35, 3.4, 4) : (kind === "cactus" ? new THREE.CylinderGeometry(0.32, 0.36, 1, 7) : new THREE.IcosahedronGeometry(1, broad ? 1 : 0)));
    leafG.translate(0, kind === "palm" ? 1.7 : 0.5, 0);
    var trunks = instanced(S, trunkG, trunkM, n), leaves = instanced(S, leafG, leafM, n * parts), k = 0;
    for (var i = 0; i < n; i++) {
      var x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), y = hf(x, z), H = 2.8 + r() * 4.5;
      if ((minY !== undefined && y < minY) || (avoid && avoid(x, z))) H = 0.0001;
      QQ.setFromAxisAngle(UP, r() * 6.28); CC.copy(col(pick(r, sea.trees))).multiplyScalar(0.82 + r() * 0.36);
      if (kind === "cactus") { MM.compose(PP.set(x, y, z), QQ, SS.set(0.001, 0.001, 0.001)); trunks.setMatrixAt(i, MM); MM.compose(PP.set(x, y, z), QQ, SS.set(1, H * 0.7, 1)); leaves.setMatrixAt(k, MM); leaves.setColorAt(k, col("#5d7a3e")); k++; continue; }
      var th = kind === "palm" ? H * 1.25 : (kind === "acacia" ? H * 0.55 : H * 0.35);
      MM.compose(PP.set(x, y, z), QQ, SS.set(1, th, 1)); trunks.setMatrixAt(i, MM);
      if (kind === "pine") {
        for (var t = 0; t < 3; t++) { var w = (1.55 - t * 0.42) * (H / 6); MM.compose(PP.set(x, y + H * 0.22 + t * H * 0.22, z), QQ, SS.set(w, H * (0.5 - t * 0.08), w)); leaves.setMatrixAt(k, MM); leaves.setColorAt(k, CC); k++; }
      } else if (kind === "palm") {
        for (var f = 0; f < 7; f++) { var e = new THREE.Euler(1.2 + r() * 0.35, f * 0.9 + r() * 0.3, 0, "YXZ"); QQ.setFromEuler(e); MM.compose(PP.set(x, y + th, z), QQ, SS.set(1, H / 4.5, 1)); leaves.setMatrixAt(k, MM); leaves.setColorAt(k, CC); k++; }
      } else if (kind === "acacia") {
        MM.compose(PP.set(x, y + th, z), QQ, SS.set(H * 0.55, H * 0.13, H * 0.55)); leaves.setMatrixAt(k, MM); leaves.setColorAt(k, CC); k++;
      } else if (broad) { // a crown of 3 blobs: one high in the middle, two lower at the sides
        var bz = H * 0.36, BO = [[0, 0.95, 0, 0.8, 1.0], [-0.55, 0.55, 0.18, 0.62, 0.9], [0.52, 0.6, -0.2, 0.6, 1.1]];
        for (var b = 0; b < 3; b++) {
          var o = BO[b]; SS.set(o[0] * bz, 0, o[2] * bz).applyQuaternion(QQ); PP.set(x + SS.x, y + th + bz * o[1], z + SS.z);
          MM.compose(PP, QQ, SS.set(bz * o[3], bz * o[3] * 0.9, bz * o[3])); leaves.setMatrixAt(k, MM); leaves.setColorAt(k, C2.copy(CC).multiplyScalar(o[4])); k++;
        }
      } else { // bush / blossom
        var sz = kind === "bush" ? H * 0.22 : H * 0.36;
        MM.compose(PP.set(x, y + th + sz * 0.6, z), QQ, SS.set(sz, sz * 0.9, sz)); leaves.setMatrixAt(k, MM); leaves.setColorAt(k, CC); k++;
      }
    }
    trunks.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true;
  }
  function flowers(S, r, hf, n, x0, x1, z0, z1, palette) {
    if (!palette || !palette.length) return;
    var fl = instanced(S, new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial(), n);
    for (var i = 0; i < n; i++) { var x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); MM.compose(PP.set(x, hf(x, z) + 0.12, z), QQ.identity(), SS.set(1, 1, 1)); fl.setMatrixAt(i, MM); fl.setColorAt(i, col(pick(r, palette))); }
  }
  function camera(S, r, pos, look, fov) {
    var yaw = (r() - 0.5) * 0.35, dx = look.x - pos.x, dz = look.z - pos.z;
    S.camera.fov = fov || (44 + r() * 14); S.camera.updateProjectionMatrix();
    S.camera.position.copy(pos); S.camera.lookAt(pos.x + dx * Math.cos(yaw) - dz * Math.sin(yaw), look.y + (r() - 0.5) * 4, pos.z + dx * Math.sin(yaw) + dz * Math.cos(yaw));
  }

  // ---- landscape: one builder, many kinds -------------------------------------------
  function landscape(S, r, noise, m, o) {
    var sd = sunFor(m, r); skyDome(S, m, sd, m.stars >= 1 ? 0 : 1); lights(S, m, sd); fog(S, m, o.fog || 0.004);
    if (m.stars) stars(S, r, Math.round(1600 * m.stars), 1.1);
    if (o.moon || (m.stars >= 1 && r() < 0.6)) moon(S, r, V3((r() - 0.5) * 0.8, 0.22 + r() * 0.2, -1).normalize(), 12);
    if (o.aurora) aurora(S, r);
    clouds(S, r, m, o.clouds === undefined ? Math.round(3 + r() * 7) : o.clouds, 70, 220);
    var sea = SEASON[o.season || "summer"], H0 = o.height || 70;
    for (var L = 0; L < (o.layers || 2); L++) {
      var hf = backdrop(noise, -2, H0 * (1 + L * 0.45), (o.scale || 0.0055) * (1 - L * 0.18), 120 + L * 60, 260 + L * 110, o.ridge !== false);
      terrain(S, hf, (r() - 0.5) * 200, -340 - L * 170, 1400, 360, 110, 34, sea, o.snow, H0 * (1 + L * 0.45));
    }
    var gy = o.water ? -1 : 0;
    // rolling hills that grow away from the camera, so the near ground is not a flat field
    var hills = o.hills || 6;
    var ground = o.ground || function (x, z) { return (noise(x * 0.012, z * 0.012, 4) * hills + noise(x * 0.06, z * 0.06, 2) * 0.6) * (0.6 + 1.4 * smooth(40, -140, z)) + smooth(60, -200, z) * hills * 0.8; };
    if (o.water) water(S, m, sd, 0, o.deep, m.stars >= 1 ? 0.4 : 1);
    if (!o.noGround) terrain(S, ground, 0, o.groundZ || -60, 900, o.groundD || 260, 90, 50, sea, o.snow, hills * 3);
    if (o.trees) {
      // far trees + a NEAR band so the picture has a foreground, not a lawn (v2 first look)
      plant(S, r, ground, o.trees, o.treeN || 140, -170, 170, (o.groundZ || -60) - 120, (o.groundZ || -60) + 60, sea, o.water ? 0.5 : undefined, o.avoid);
      plant(S, r, ground, o.trees, Math.round((o.treeN || 140) * 0.18), -45, 45, 6, 36, sea, o.water ? 0.5 : undefined, function (x, z) { return Math.abs(x) < 7 || (o.avoid && o.avoid(x, z)); });
    }
    if (o.flowers) flowers(S, r, ground, 1400, -40, 40, 10, 62, sea.flowers);
    var cy = Math.max(ground(0, 70), o.water ? 0 : -50) + (o.camH || 3.5);
    camera(S, r, V3(0, cy, 70), V3(0, cy + (o.lookUp || 22), -150), o.fov);
  }

  var K = {};
  K.mountains = function (S, r, n, m) { landscape(S, r, n, m, { layers: 3, height: 85, snow: 0.72, season: "summer", trees: "pine", treeN: 70, hills: 4 }); };
  K.alpine = function (S, r, n, m) { landscape(S, r, n, m, { layers: 3, height: 120, snow: 0.45, scale: 0.006, season: "summer", trees: "pine", treeN: 120, hills: 5, lookUp: 12 }); };
  K.forest = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 50, season: "summer", trees: pick(r, ["pine", "broadleaf"]), treeN: 260, hills: 7, fog: 0.007, camH: 2.4 }); };
  K.autumn = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 60, season: "autumn", trees: "broadleaf", treeN: 240, hills: 7, fog: 0.006, camH: 2.6 }); };
  K.winter = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 80, snow: 0.0, season: "winter", trees: "pine", treeN: 200, hills: 6, fog: 0.006 }); };
  K.spring = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 45, season: "spring", trees: "broadleaf", treeN: 160, hills: 6, flowers: true }); };
  K.meadow = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 40, season: "summer", trees: "broadleaf", treeN: 40, hills: 5, flowers: true, camH: 1.8, lookUp: 4 }); };
  K.meadow.moods = ["day", "golden", "dawn", "overcast"];   // flowers vanish in a dark mood
  K.jungle = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 70, scale: 0.008, season: "tropical", trees: pick(r, ["broadleaf", "palm"]), treeN: 300, hills: 8, fog: 0.012, camH: 2.2 }); };
  K.savanna = function (S, r, n, m) { landscape(S, r, n, m, { layers: 1, height: 30, season: "savanna", trees: "acacia", treeN: 34, hills: 2.5, clouds: 4, camH: 2 }); };
  K.desert = function (S, r, n, m) { landscape(S, r, n, m, { layers: 1, height: 26, season: "arid", hills: 0.1, clouds: 2, noGround: true, ridge: false }); var hf = function (x, z) { var q = n(x * 0.01, z * 0.015, 3); return Math.pow(Math.abs(Math.sin(x * 0.022 + q * 3.2)), 1.7) * 9 + q * 5; }; terrain(S, hf, 0, -80, 900, 320, 140, 70, { grass: "#d9a764", dry: "#e3b878", rock: "#c08a55", snow: "#fff" }, undefined, 16); if (r() < 0.6) plant(S, r, hf, "cactus", 18, -60, 60, -40, 40, SEASON.arid); camera(S, r, V3(0, hf(0, 70) + 5, 70), V3(0, 6, -150)); };
  // canyon v2.1: stepped MESAS (flat tops, steep faceted walls) either side of a river, seen
  // from up on a rim - the first v2 render put the camera inside smooth brown blobs
  K.canyon = function (S, r, n, m) { landscape(S, r, n, m, { layers: 0, season: "arid", clouds: 3, noGround: true }); var bend = function (z) { return Math.sin(z * 0.008) * 40; }; var hf = function (x, z) { var v = n(x * 0.009, z * 0.009, 3) + 0.55, lv = Math.floor(v * 3.2), fr = v * 3.2 - lv, step = (lv + smooth(0.82, 1.0, fr)) / 3.2; var gorge = smooth(18, 60, Math.abs(x - bend(z))); return 2 + Math.max(0, step) * 58 * gorge * smooth(90, 20, z); }; var g = terrain(S, hf, 0, -260, 900, 600, 150, 110, { grass: "#c46a3b", dry: "#d98a52", rock: "#8e4128", snow: "#fff" }, undefined, 60); g.material.flatShading = true; water(S, m, sunFor(m, r), 2.6, "#2f6070", 1); camera(S, r, V3(bend(80) + 30, 70, 120), V3(bend(-150), 22, -170), 50); };
  K.canyon.moods = ["day", "golden", "dawn", "dusk"];
  K.lake = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 95, snow: 0.6, water: true, noGround: true, trees: null, clouds: undefined }); var shore = function (x, z) { return n(x * 0.02, z * 0.02, 3) * 6 + 2 - smooth(-80, -40, z) * 8; }; terrain(S, shore, 0, -150, 900, 120, 90, 24, SEASON.summer, undefined, 10); plant(S, r, shore, "pine", 130, -260, 260, -200, -110, SEASON.summer, 0.6); camera(S, r, V3(0, 4, 70), V3(0, 14, -150)); };
  K.nightlake = function (S, r, n, m) { K.lake(S, r, n, MOODS.night); };
  K.river = function (S, r, n, m) { var bend = function (z) { return Math.sin(z * 0.018) * 28; }; landscape(S, r, n, m, { layers: 2, height: 70, snow: 0.7, water: true, trees: "pine", treeN: 180, hills: 6, groundZ: -40, avoid: function (x, z) { return Math.abs(x - bend(z)) < 16; }, ground: function (x, z) { var v = Math.abs(x - bend(z)); return smooth(8, 30, v) * (3 + n(x * 0.02, z * 0.02, 3) * 6) - 1.5 + smooth(30, 120, v) * 6; } }); };
  K.beach = function (S, r, n, m) { landscape(S, r, n, m, { layers: 1, height: 40, season: "tropical", water: true, deep: "#0f6a7a", noGround: true, clouds: 6 }); var sand = function (x, z) { return 1.2 - (x - 30) * 0.02 + n(x * 0.03, z * 0.03, 2) * 0.6 - smooth(-10, 30, -x + 20) * 3; }; terrain(S, sand, 60, 0, 160, 320, 60, 80, { grass: "#e8d3a2", dry: "#f0deb0", rock: "#cbb88a", snow: "#fff" }, undefined, 6); plant(S, r, sand, "palm", 22, 30, 120, -120, 50, SEASON.tropical, 0.4); camera(S, r, V3(10, 4, 60), V3(-40, 4, -150)); };
  K.island = function (S, r, n, m) { landscape(S, r, n, m, { layers: 0, season: "tropical", water: true, deep: "#0d5f73", noGround: true, clouds: 7 }); var isl = function (x, z) { var d = Math.sqrt(x * x + (z + 160) * (z + 160)); return (1 - smooth(20, 70, d)) * (12 + n(x * 0.05, z * 0.05, 3) * 10) - 1; }; terrain(S, isl, 0, -160, 180, 180, 70, 70, SEASON.tropical, undefined, 20); plant(S, r, isl, "palm", 26, -45, 45, -205, -115, SEASON.tropical, 1.0); camera(S, r, V3(0, 9, 60), V3(0, 4, -160)); };
  K.coast = function (S, r, n, m) { landscape(S, r, n, m, { layers: 0, water: true, noGround: true, clouds: 6 }); var cliff = function (x, z) { var d = -x - 60 + n(z * 0.01, 0, 3) * 40; return smooth(-20, 30, d) * (30 + n(x * 0.03, z * 0.03, 4) * 16) - 2; }; terrain(S, cliff, -160, -120, 260, 520, 70, 120, SEASON.summer, undefined, 40); plant(S, r, cliff, "pine", 60, -300, -110, -360, 60, SEASON.summer, 12); camera(S, r, V3(20, 8, 70), V3(-10, 6, -150)); };
  K.arctic = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 90, snow: 0.0, season: "winter", water: true, deep: "#173d52", noGround: true }); var floes = function (x, z) { var v = n(x * 0.03, z * 0.03, 3); return v > 0.12 ? 0.8 : -3; }; terrain(S, floes, 0, -40, 500, 240, 120, 60, SEASON.winter, undefined, 2); camera(S, r, V3(0, 5, 70), V3(0, 12, -150)); };
  K.aurora = function (S, r, n, m) { landscape(S, r, n, MOODS.night, { layers: 2, height: 85, snow: 0.0, season: "winter", trees: "pine", treeN: 120, aurora: true, clouds: 0, lookUp: 22 }); };
  K.fields = function (S, r, n, m) { landscape(S, r, n, m, { layers: 1, height: 35, season: "summer", noGround: true, clouds: 6 }); var hf = function (x, z) { return n(x * 0.008, z * 0.008, 3) * 8; }; var g = new THREE.PlaneGeometry(900, 400, 140, 70); g.rotateX(-Math.PI / 2); var pos = g.attributes.position, cols = new Float32Array(pos.count * 3), crops = ["#c9b45a", "#7aa04a", "#a8c060", "#d9c36a", "#5f8a3a"], w = 18 + r() * 10; for (var i = 0; i < pos.count; i++) { var x = pos.getX(i), z = pos.getZ(i) - 80; pos.setZ(i, z); pos.setY(i, hf(x, z)); var band = Math.floor((x + z * 0.4) / w), c = col(crops[((band % 5) + 5) % 5]).multiplyScalar(0.9 + 0.1 * Math.sin(x * 2.2)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; } g.computeVertexNormals(); g.setAttribute("color", new THREE.BufferAttribute(cols, 3)); S.scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }))); plant(S, r, hf, "broadleaf", 30, -200, 200, -250, 40, SEASON.summer); camera(S, r, V3(0, hf(0, 70) + 14, 70), V3(0, 2, -150)); };

  // ---- cities ------------------------------------------------------------------------
  function windowTex(r, lit, dayMode) { return canvasTex(64, 128, function (g, w, h) { g.fillStyle = dayMode ? "#8fa3b5" : "#0b0d18"; g.fillRect(0, 0, w, h); for (var y = 4; y < h - 4; y += 8) for (var x = 4; x < w - 4; x += 8) { var on = r() < lit; g.fillStyle = dayMode ? (on ? "#d7e6f2" : "#55697a") : (on ? pick(r, ["#ffd9a0", "#ffe6c0", "#fff2d8", "#a8d8ff"]) : "#14182a"); g.fillRect(x, y, 5, 5); } }); }
  function towers(S, r, n, dayMode, accent, spreadX, z0, z1, street) {
    var texs = [windowTex(r, dayMode ? 0.5 : 0.35, dayMode), windowTex(r, dayMode ? 0.4 : 0.5, dayMode), windowTex(r, dayMode ? 0.6 : 0.22, dayMode)];
    for (var i = 0; i < n; i++) {
      var x = (r() - 0.5) * spreadX, z = z0 + r() * (z1 - z0); if (street && Math.abs(x) < 16) x += x < 0 ? -18 : 18;
      var w = 6 + r() * 10, h = 12 + Math.pow(r(), 2.0) * (dayMode ? 90 : 120), d = 6 + r() * 10;
      var t = texs[i % 3].clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 12)));
      var mat = dayMode ? new THREE.MeshLambertMaterial({ map: t, color: mix("#c8d2dc", "#9aa8b6", r()) }) : new THREE.MeshLambertMaterial({ color: "#0c0e1a", emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 1.0 });
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, h / 2, z); S.scene.add(b);
      if (!dayMode && accent && r() < 0.18) { var sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, 2.2), new THREE.MeshBasicMaterial({ color: col(pick(r, accent)) })); sign.position.set(x, 6 + r() * h * 0.6, z + d / 2 + 0.1); S.scene.add(sign); }
    }
  }
  K.city = function (S, r, n, m) { var mm = { top: "#04030c", mid: "#1d1544", low: "#4a2160", sun: "#9fb4ff", sunI: 0.5, amb: 0.6, fog: "#2a1d4a", sunEl: 0.3, deep: "#06040e", clouds: "#3a2a5a", stars: 0.6 }; skyDome(S, mm, V3(0, 0.3, -1), 0); S.scene.add(new THREE.HemisphereLight("#8d7bff", "#140c22", 1.2)); fog(S, mm, 0.0055); stars(S, r, 500, 1); var acc = [S.accent || pick(r, ["#ff2a6d", "#05d9e8", "#f9c74f"]), "#ff2a6d", "#05d9e8"]; towers(S, r, 150, false, acc, 420, -420, -60); water(S, mm, V3(0, 0.3, -1), 0.0, "#05040c", 0); camera(S, r, V3(0, 6, 60), V3(0, 34, -150)); };
  K.cityday = function (S, r, n, m) { m = r() < 0.5 ? MOODS.day : MOODS.golden; var sd = sunFor(m, r); skyDome(S, m, sd, 1); lights(S, m, sd); fog(S, m, 0.003); clouds(S, r, m, 8, 120, 260); towers(S, r, 140, true, null, 420, -420, -60); var gr = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: "#6f7a6a" })); gr.rotation.x = -Math.PI / 2; S.scene.add(gr); camera(S, r, V3(0, 8, 60), V3(0, 34, -150)); };
  K.street = function (S, r, n, m) { var mm = { top: "#06040f", mid: "#20123a", low: "#4a1e5a", sun: "#ff5fa2", sunI: 0.4, amb: 0.7, fog: "#2b1640", sunEl: 0.2, deep: "#0a0612", clouds: "#3a2a5a", stars: 0 }; skyDome(S, mm, V3(0, 0.2, -1), 0); S.scene.add(new THREE.HemisphereLight("#a07bff", "#1a0c22", 1.3)); fog(S, mm, 0.008); var acc = [S.accent || "#ff2a6d", "#05d9e8", "#f9f871", "#b04dff"]; towers(S, r, 120, false, acc, 160, -420, 40, true); var road = new THREE.Mesh(new THREE.PlaneGeometry(30, 900), new THREE.MeshStandardMaterial({ color: "#0c0a14", roughness: 0.25, metalness: 0.6 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -200); S.scene.add(road); for (var i = 0; i < 26; i++) { var c = pick(r, acc), g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,255,255,0.9)"), color: col(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.position.set((r() < 0.5 ? -1 : 1) * (15 + r() * 4), 4 + r() * 22, 30 - r() * 380); g.scale.set(10, 10, 1); S.scene.add(g); } for (var j = 0; j < 30; j++) { var lane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4), new THREE.MeshBasicMaterial({ color: "#f9f871" })); lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.05, 40 - j * 14); S.scene.add(lane); } camera(S, r, V3(0, 4, 60), V3(0, 8, -150), 55); };

  // ---- space -------------------------------------------------------------------------
  function bandTex(r, hue) { return canvasTex(256, 128, function (g, w, h) { for (var y = 0; y < h; y++) { var v = 0.35 + 0.3 * Math.sin(y * 0.21 + r() * 0.4) + 0.15 * Math.sin(y * 0.53); g.fillStyle = "hsl(" + Math.round(hue * 360 + y * 0.3) + "," + Math.round(35 + 25 * v) + "%," + Math.round(30 + 40 * v) + "%)"; g.fillRect(0, y, w, 1); } }); }
  function spaceBase(S, r) { S.scene.background = col("#03020a"); stars(S, r, 2200, 1.0); stars(S, r, 160, 2.2); }
  K.space = function (S, r) { spaceBase(S, r); var hue = r(), planet = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 32), new THREE.MeshStandardMaterial({ map: bandTex(r, hue), roughness: 0.9 })); planet.position.set(-6 + r() * 12, -2, -32); planet.rotation.z = 0.3; S.scene.add(planet); if (r() < 0.55) { var ring = new THREE.Mesh(new THREE.RingGeometry(13, 19, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.3, 0.7), transparent: true, opacity: 0.55, side: THREE.DoubleSide })); ring.position.copy(planet.position); ring.rotation.x = 1.25; S.scene.add(ring); } var atm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(140,180,255,0.6)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); atm.position.copy(planet.position); atm.scale.set(30, 30, 1); S.scene.add(atm); var sun = new THREE.DirectionalLight("#fff3dd", 3.4); sun.position.set(30, 12, 10); S.scene.add(sun); S.scene.add(new THREE.AmbientLight("#20243a", 0.5)); camera(S, r, V3(0, 0, 8), V3(planet.position.x * 0.4, 0, -30), 50); };
  K.nebula = function (S, r) { spaceBase(S, r); var tex = puffTex(r), hues = [pick(r, ["#7a3cff", "#3c6bff", "#ff3c8a"]), pick(r, ["#ff7a3c", "#3cffd2", "#c43cff"])]; for (var i = 0; i < 60; i++) { var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col(hues[i % 2]).lerp(col("#ffffff"), r() * 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.05 + r() * 0.09 })); var a = r() * 6.28, rad = 18 + r() * 70; s.position.set(Math.cos(a) * rad * 1.6, Math.sin(a) * rad * 0.6 + (r() - 0.5) * 10, -80 - r() * 60); s.scale.set(40 + r() * 60, 20 + r() * 40, 1); S.scene.add(s); } for (var j = 0; j < 8; j++) { var g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,255,255,0.95)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.position.set((r() - 0.5) * 120, (r() - 0.5) * 50, -70); var sc = 3 + r() * 6; g.scale.set(sc, sc, 1); S.scene.add(g); } camera(S, r, V3(0, 0, 10), V3(0, 0, -80), 55); };
  K.galaxy = K.nebula;
  K.moon = function (S, r, n) { spaceBase(S, r); var hf = function (x, z) { var v = n(x * 0.02, z * 0.02, 5) * 4; for (var k = 0; k < 6; k++) { var cx = Math.sin(k * 12.9 + 1) * 120, cz = -60 - Math.abs(Math.cos(k * 7.7)) * 200, d = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz)), R = 10 + (k % 3) * 12; v += (d < R ? -Math.pow(1 - d / R, 2) * 6 : Math.exp(-Math.pow((d - R) / 4, 2)) * 1.8); } return v; }; terrain(S, hf, 0, -150, 700, 420, 150, 100, { grass: "#9a9a9a", dry: "#b0b0b0", rock: "#6c6c6c", snow: "#ddd" }, undefined, 10); var earth = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 24), new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, function (g, w, h) { g.fillStyle = "#1d4f9a"; g.fillRect(0, 0, w, h); for (var i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? "#3d7a3a" : "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 12, 2 + r() * 6, 0, 0, 6.3); g.fill(); } }), roughness: 1 })); earth.position.set(30, 60, -300); S.scene.add(earth); var sun = new THREE.DirectionalLight("#ffffff", 3); sun.position.set(-80, 40, 30); S.scene.add(sun); S.scene.add(new THREE.AmbientLight("#30344a", 0.35)); camera(S, r, V3(0, 6, 70), V3(0, 14, -150), 50); };

  // ---- vehicles ----------------------------------------------------------------------
  function car(S, r, paint, x, z, ry) {
    var g = new THREE.Group(), body = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.4, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }), dark = new THREE.MeshStandardMaterial({ color: "#14161c", roughness: 0.5 }), glass = new THREE.MeshPhysicalMaterial({ color: "#1c2a3a", metalness: 0.2, roughness: 0.05, clearcoat: 1 });
    var lower = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 1.9), body); lower.position.y = 0.75; g.add(lower);
    var nose = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.86), body); nose.position.set(1.95, 0.85, 0); nose.rotation.z = -0.18; g.add(nose);
    var cab = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 1.75, 4, 1), glass); cab.rotation.set(0, Math.PI / 4, 0); cab.scale.set(1.1, 0.42, 0.72); cab.position.set(-0.3, 1.45, 0); g.add(cab);
    var wg = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16); [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]].forEach(function (p) { var w = new THREE.Mesh(wg, dark); w.rotation.x = Math.PI / 2; w.position.set(p[0], 0.42, p[1]); g.add(w); });
    var hl = new THREE.MeshBasicMaterial({ color: "#fff6dc" }); [0.62, -0.62].forEach(function (zz) { var l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.42), hl); l.position.set(2.6, 0.9, zz); g.add(l); });
    var tl = new THREE.MeshBasicMaterial({ color: "#ff2a3a" }); [0.62, -0.62].forEach(function (zz) { var l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.42), tl); l.position.set(-2.22, 0.95, zz); g.add(l); });
    var sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    g.position.set(x, 0, z); g.rotation.y = ry; S.scene.add(g); return g;
  }
  function road(S, m, len) { var rd = new THREE.Mesh(new THREE.PlaneGeometry(14, len), new THREE.MeshLambertMaterial({ color: "#2b2d33" })); rd.rotation.x = -Math.PI / 2; rd.position.set(0, 0.01, -len / 2 + 40); S.scene.add(rd); for (var j = 0; j < len / 12; j++) { var l = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 4), new THREE.MeshBasicMaterial({ color: "#f2f2f2" })); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.03, 40 - j * 12); S.scene.add(l); } }
  K.car = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 60, season: pick(r, ["summer", "arid", "autumn"]), noGround: true, clouds: 5 }); var gr = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: pick(r, ["#5c6a3e", "#b89a68", "#6b5a3e"]) })); gr.rotation.x = -Math.PI / 2; gr.position.y = -0.02; S.scene.add(gr); road(S, m, 900); car(S, r, S.accent || pick(r, ["#c1121f", "#f77f00", "#0a9396", "#e9d8a6", "#ffb703", "#e5e5e5", "#3a86ff"]), 0.5, 48, 0.55 + (r() - 0.5) * 0.5); var fill = new THREE.DirectionalLight("#ffffff", 1.8); fill.position.set(12, 6, 70); S.scene.add(fill); S.scene.add(new THREE.HemisphereLight("#ffffff", "#444444", 0.6)); camera(S, r, V3(7, 2.2, 56), V3(-1, 1.2, 46), 40); };
  K.road = function (S, r, n, m) { landscape(S, r, n, m, { layers: 2, height: 70, season: pick(r, ["summer", "arid", "autumn", "winter"]), noGround: true }); var gr = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: "#6a7246" })); gr.rotation.x = -Math.PI / 2; gr.position.y = -0.02; S.scene.add(gr); road(S, m, 1200); var sea = SEASON[pick(r, ["summer", "autumn"])], flat = function () { return 0; }; plant(S, r, flat, "broadleaf", 70, -120, -12, -400, 40, sea); plant(S, r, flat, "broadleaf", 70, 12, 120, -400, 40, sea); camera(S, r, V3(0, 2.6, 60), V3(0, 4, -150), 55); };
  K.road.moods = ["day", "golden", "dawn", "overcast", "dusk"];
  K.car.moods = ["day", "golden", "dawn"];

  // ---- objects -----------------------------------------------------------------------
  function studio(S, r, bg) { S.scene.background = col(bg); var floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshLambertMaterial({ color: col(bg).multiplyScalar(0.93) })); floor.rotation.x = -Math.PI / 2; S.scene.add(floor); var key = new THREE.DirectionalLight("#ffffff", 2.8); key.position.set(4, 8, 6); S.scene.add(key); var rim = new THREE.DirectionalLight("#ffe9d6", 2.2); rim.position.set(-6, 5, -6); S.scene.add(rim); S.scene.add(new THREE.HemisphereLight("#ffffff", "#9a9488", 1.1)); }
  function contact(S, x, z, s) { var sh = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(x, 0.01, z); S.scene.add(sh); }
  K.product = function (S, r) { studio(S, r, pick(r, ["#f4f1ea", "#e9eef2", "#efe6dc", "#1e1f24", "#e8e2f0"])); var accent = S.accent || pick(r, ["#ff6a00", "#2d6a4f", "#9d4edd", "#e63946", "#c9a96e", "#118ab2"]); var pts = [[0, 0], [0.55, 0], [0.6, 0.08], [0.6, 1.2], [0.5, 1.42], [0.24, 1.62], [0.2, 1.95], [0.25, 2.02], [0.25, 2.12], [0, 2.12]].map(function (q) { return new THREE.Vector2(q[0], q[1]); }); var shapes = [new THREE.TorusKnotGeometry(1, 0.34, 160, 24), new THREE.SphereGeometry(1.25, 64, 40), new THREE.CapsuleGeometry(0.8, 1.4, 12, 32), new THREE.TorusGeometry(1.1, 0.42, 32, 96), new THREE.LatheGeometry(pts, 48), new THREE.IcosahedronGeometry(1.3, 1)]; var k = Math.floor(r() * shapes.length), obj = new THREE.Mesh(shapes[k], new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.25, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, flatShading: k === 5 })); obj.position.y = k === 4 ? 0 : 1.4; obj.rotation.set(k === 4 ? 0 : r(), r() * 6, 0); S.scene.add(obj); contact(S, 0, 0, 4.2); camera(S, r, V3(0, 2.6, 6), V3(0, 1.2, 0), 40); };
  K.gem = function (S, r) { S.scene.background = col(pick(r, ["#120c1c", "#0b1418", "#1a0f0f"])); var c = S.accent || pick(r, ["#e0115f", "#0f52ba", "#50c878", "#9966cc", "#ffc87c"]); var g = new THREE.Mesh(r() < 0.5 ? new THREE.OctahedronGeometry(1.4, 0) : new THREE.IcosahedronGeometry(1.4, 0), new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.1, roughness: 0.05, clearcoat: 1, flatShading: true, emissive: col(c).multiplyScalar(0.08) })); g.position.y = 1.5; g.rotation.set(r(), r(), r()); S.scene.add(g); [["#ffffff", 3, 6, 4], ["#ffd1e8", -4, 3, 2], ["#a8d8ff", 1, -4, 5]].forEach(function (l) { var d = new THREE.DirectionalLight(l[0], 2.6); d.position.set(l[1], l[2], l[3]); S.scene.add(d); }); var fl = new THREE.Mesh(new THREE.CircleGeometry(20, 40), new THREE.MeshLambertMaterial({ color: S.scene.background.clone().multiplyScalar(1.6) })); fl.rotation.x = -Math.PI / 2; S.scene.add(fl); contact(S, 0, 0, 3.4); camera(S, r, V3(0, 2.4, 5.5), V3(0, 1.4, 0), 40); };
  K.tech = function (S, r) { S.scene.background = col("#05070d"); fog(S, { fog: "#05070d" }, 0.035); var acc = S.accent || pick(r, ["#05d9e8", "#7b5cff", "#39ff88"]); for (var i = 0; i < 70; i++) { var s = 0.6 + r() * 1.6, b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: "#0d1220", roughness: 0.4, metalness: 0.6 })); b.position.set((r() - 0.5) * 30, (r() - 0.5) * 14, -r() * 30); b.rotation.set(r(), r(), r()); S.scene.add(b); var e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({ color: acc })); e.position.copy(b.position); e.rotation.copy(b.rotation); S.scene.add(e); } S.scene.add(new THREE.HemisphereLight(acc, "#05070d", 0.8)); var p = new THREE.PointLight(acc, 60, 40, 2); p.position.set(0, 2, 4); S.scene.add(p); camera(S, r, V3(0, 0, 12), V3(0, 0, -10), 55); };
  K.room = function (S, r) { S.scene.background = col("#d9cfc2"); var wallC = pick(r, ["#e8e1d6", "#d8e0e3", "#efe7dc", "#cfd8cc"]), floorC = pick(r, ["#a0764e", "#c9a77c", "#7a5a3e"]); var floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshLambertMaterial({ color: floorC })); floor.rotation.x = -Math.PI / 2; S.scene.add(floor); var back = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshLambertMaterial({ color: wallC })); back.position.set(0, 3.5, -5); S.scene.add(back); var side = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), new THREE.MeshLambertMaterial({ color: col(wallC).multiplyScalar(0.92) })); side.rotation.y = Math.PI / 2; side.position.set(-6, 3.5, 1); S.scene.add(side); var win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshBasicMaterial({ color: "#fff7e6" })); win.position.set(2.2, 3.6, -4.98); S.scene.add(win); var sofaC = pick(r, ["#3d5a80", "#9c6644", "#6b705c", "#a5484a", "#2f3e46"]), sm = new THREE.MeshLambertMaterial({ color: sofaC }); var seat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 1.5), sm); seat.position.set(-1, 0.55, -3.6); S.scene.add(seat); var backr = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.4), sm); backr.position.set(-1, 1.2, -4.3); S.scene.add(backr); [-2.95, 0.95].forEach(function (x) { var a = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 1.5), sm); a.position.set(x, 0.85, -3.6); S.scene.add(a); }); var table = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 32), new THREE.MeshLambertMaterial({ color: "#3b2f2a" })); table.position.set(-1, 0.5, -1.8); S.scene.add(table); var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.55, 16), new THREE.MeshLambertMaterial({ color: "#c2b8a8" })); pot.position.set(2.6, 0.28, -3.8); S.scene.add(pot); var leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshLambertMaterial({ color: "#4f7a3a", flatShading: true })); leaves.position.set(2.6, 1.2, -3.8); leaves.scale.y = 1.4; S.scene.add(leaves); contact(S, -1, -3.5, 5.5); var sunL = new THREE.DirectionalLight("#fff1d8", 2.4); sunL.position.set(3, 5, -9); S.scene.add(sunL); S.scene.add(new THREE.HemisphereLight("#fff6ea", "#8a7a6a", 1.4)); camera(S, r, V3(2.5, 2.4, 5), V3(-0.6, 1.2, -3), 52); };

  // ---- abstract ----------------------------------------------------------------------
  K.abstract = function (S, r) { var base = new THREE.Color().setHSL(r(), 0.35, 0.12); S.scene.background = base; for (var i = 0; i < 9; i++) { var c = new THREE.Color().setHSL((r() + i * 0.07) % 1, 0.6, 0.5); var b = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + r() * 2.2, 3), new THREE.MeshPhysicalMaterial({ color: S.accent && i === 0 ? col(S.accent) : c, roughness: 0.18, clearcoat: 1 })); b.position.set((r() - 0.5) * 12, (r() - 0.5) * 6, -r() * 8); S.scene.add(b); } var a = new THREE.DirectionalLight("#ffffff", 2.6); a.position.set(3, 5, 6); S.scene.add(a); S.scene.add(new THREE.HemisphereLight("#ffffff", base, 0.8)); camera(S, r, V3(0, 0, 10), V3(0, 0, -2), 50); };
  K.waves = function (S, r) { var h = r(); S.scene.background = new THREE.Color().setHSL(h, 0.45, 0.07); for (var k = 0; k < 46; k++) { var pts = [], ph = r() * 6, amp = 0.6 + r() * 1.4; for (var x = -16; x <= 16; x += 0.4) pts.push(V3(x, Math.sin(x * 0.35 + ph + k * 0.08) * amp + k * 0.12 - 3, -k * 0.25)); var c = new THREE.Color().setHSL((h + k / 140) % 1, 0.8, 0.45 + k / 200); S.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: S.accent && k === 23 ? col(S.accent) : c }))); } camera(S, r, V3(0, 0, 13), V3(0, 0, -4), 50); };
  K.rings = function (S, r) { S.scene.background = col(pick(r, ["#0e0f14", "#f3efe8", "#101826"])); var lightBg = S.scene.background.getHSL({}).l > 0.5; for (var i = 0; i < 12; i++) { var t = new THREE.Mesh(new THREE.TorusGeometry(1 + i * 0.45, 0.06 + r() * 0.08, 12, 96), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((0.55 + i * 0.03 + r() * 0.05) % 1, 0.7, lightBg ? 0.45 : 0.6), metalness: 0.5, roughness: 0.3 })); t.rotation.set(r() * 1.2, r() * 1.2, 0); S.scene.add(t); } var d = new THREE.DirectionalLight("#ffffff", 3); d.position.set(4, 6, 8); S.scene.add(d); S.scene.add(new THREE.HemisphereLight("#ffffff", "#333333", 1)); camera(S, r, V3(0, 0, 14), V3(0, 0, 0), 48); };
  K.grid = function (S, r) { var mm = { top: "#120328", mid: "#3a0a5a", low: "#ff5fa2", sun: "#ffd319", sunI: 1, amb: 0.5, fog: "#2a0a40", sunEl: 0.06 }; skyDome(S, mm, V3(0, 0.08, -1), 0); var sunDisc = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.ShaderMaterial({ transparent: true, fog: false, uniforms: { a: { value: col("#ffd319") }, b: { value: col("#ff2a6d") } }, vertexShader: "varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }", fragmentShader: "uniform vec3 a,b; varying vec2 vU; void main(){ float stripe = step(0.5, fract(vU.y*14.0)) + step(0.55, vU.y); if (stripe < 0.5 && vU.y < 0.55) discard; gl_FragColor = vec4(mix(b,a,vU.y),1.0);" + OUT + "}" })); sunDisc.position.set(0, 60, -600); S.scene.add(sunDisc); var grid = new THREE.GridHelper(1200, 80, S.accent || "#ff2ad4", S.accent || "#ff2ad4"); grid.position.y = 0; S.scene.add(grid); var hf = backdrop(makeNoise(r), -1, 60, 0.012, 150, 300, true); var mt = new THREE.Mesh(new THREE.PlaneGeometry(1400, 300, 70, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#5a1aff", wireframe: true })); var p = mt.geometry.attributes.position; for (var i = 0; i < p.count; i++) { p.setZ(i, p.getZ(i) - 400); p.setY(i, hf(p.getX(i), p.getZ(i))); } S.scene.add(mt); fog(S, mm, 0.0022); camera(S, r, V3(0, 6, 60), V3(0, 10, -150), 60); };
  K.gradient = function (S, r) { var a = new THREE.Color().setHSL(r(), 0.7, 0.55), b = new THREE.Color().setHSL(r(), 0.75, 0.45), c = new THREE.Color().setHSL(r(), 0.6, 0.35); var pl = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.ShaderMaterial({ uniforms: { a: { value: a }, b: { value: b }, c: { value: c }, k: { value: r() * 10 } }, vertexShader: "varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }", fragmentShader: "uniform vec3 a,b,c; uniform float k; varying vec2 vU; void main(){ float f = sin(vU.x*3.0+k)*0.5+0.5, g = sin(vU.y*4.0+vU.x*2.0-k)*0.5+0.5; vec3 col = mix(mix(a,b,f), c, g*0.6); gl_FragColor = vec4(col,1.0);" + OUT + "}" })); S.scene.add(pl); camera(S, r, V3(0, 0, 18), V3(0, 0, 0), 50); };

  // ---- linework: tattoo flash / line art (Tank 2026-11-08 "yes") ---------------------
  // Ink and Iron's gallery of tattoo styles had pastel spheres (the kit had nothing
  // tattoo-like). Five designs - mandala, sacred geometry, sigil, compass rose, botanical -
  // in three styles: "fine" (fine line), "bold" (blackwork: heavy lines, solid fills,
  // dotwork) and "colour" (bold outline over traditional tattoo colours, data-accent first).
  // The ink is drawn on a 2D canvas (real line widths, round caps, stippling) and laid on
  // a lit, slightly tilted sheet: paper (a flash sheet), skin, or - mood night - a dark
  // ground with bone-white or neon (data-accent) ink. One canvas, one plane, one draw.
  function inkPath(g, pts, close) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (close) g.closePath(); }
  function inkCircle(g, x, y, rad) { g.beginPath(); g.arc(x, y, Math.max(0.5, rad), 0, Math.PI * 2); }
  function inkPetal(g, a, r0, r1, wd) {
    let ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, mid = (r0 + r1) / 2, w = (r1 - r0) * wd;
    g.beginPath(); g.moveTo(ca * r0, sa * r0);
    g.quadraticCurveTo(ca * mid + px * w, sa * mid + py * w, ca * r1, sa * r1);
    g.quadraticCurveTo(ca * mid - px * w, sa * mid - py * w, ca * r0, sa * r0); g.closePath();
  }
  function inkPoly(g, n, rad, rot) { let p = []; for (let i = 0; i < n; i++) { let a = rot + i * Math.PI * 2 / n; p.push([Math.cos(a) * rad, Math.sin(a) * rad]); } inkPath(g, p, true); }
  // paint the current path: k picks the fill (colour style cycles the palette, bold fills
  // every other shape solid, fine never fills); the outline is always drawn on top
  function inkPaint(g, st, k, solid) {
    if (st.style === "colour" && k >= 0) { g.fillStyle = st.cols[k % st.cols.length]; g.fill(); }
    else if (st.style === "bold" && (solid || (k >= 0 && k % 2 === 0))) { g.fillStyle = st.ink; g.fill(); }
    g.stroke();
  }
  function inkDots(g, r, st, r0, r1, n, size) { // dotwork shading in a ring band
    g.fillStyle = st.ink;
    for (let i = 0; i < n; i++) { let a = r() * Math.PI * 2, t = Math.pow(r(), 1.6), rr = r0 + (r1 - r0) * t; inkCircle(g, Math.cos(a) * rr, Math.sin(a) * rr, size * (0.5 + r() * 0.7)); g.fill(); }
  }
  function inkMandala(g, r, s, st) {
    let n = pick(r, [8, 10, 12, 16]), bands = 3 + Math.floor(r() * 2), lw = g.lineWidth;
    inkCircle(g, 0, 0, s); g.stroke(); inkCircle(g, 0, 0, s * 0.94); g.stroke();
    for (let b = 0; b < bands; b++) {
      let r1 = s * (0.9 - b * 0.21), r0 = r1 - s * 0.19, nn = b === 0 ? n * 2 : n, off = (b % 2) * Math.PI / nn;
      for (let i = 0; i < nn; i++) { inkPetal(g, off + i * Math.PI * 2 / nn, r0, r1, b === 0 ? 0.32 : 0.45); inkPaint(g, st, i + b, false); }
      if (st.style !== "colour") { g.lineWidth = lw * 0.6; inkCircle(g, 0, 0, r0); g.stroke(); g.lineWidth = lw; }
      if (b === 1 && st.style !== "colour") inkDots(g, r, st, r0 * 0.98, r1 * 0.92, st.style === "bold" ? 420 : 160, lw * 0.55);
    }
    let core = s * (0.9 - bands * 0.21);
    if (core > s * 0.05) { inkPoly(g, n / 2, core * 0.9, -Math.PI / 2); inkPaint(g, st, 1, false); inkCircle(g, 0, 0, core * 0.35); inkPaint(g, st, 2, true); }
    for (let d = 0; d < n * 2; d++) { let a = d * Math.PI / n; inkCircle(g, Math.cos(a) * s * 1.06, Math.sin(a) * s * 1.06, lw * (d % 2 ? 0.8 : 1.5)); g.fillStyle = st.ink; g.fill(); }
  }
  function inkGeometry(g, r, s, st) {
    let lw = g.lineWidth, R = s * 0.92;
    inkCircle(g, 0, 0, s); g.stroke(); inkCircle(g, 0, 0, R); g.stroke();
    for (let t = 0; t < 72; t++) { let a = t * Math.PI / 36, l = t % 6 === 0 ? 0.05 : 0.025; inkPath(g, [[Math.cos(a) * R, Math.sin(a) * R], [Math.cos(a) * (R - s * l), Math.sin(a) * (R - s * l)]]); g.stroke(); }
    let hex = []; for (let h = 0; h < 6; h++) { let ha = -Math.PI / 2 + h * Math.PI / 3; hex.push([Math.cos(ha) * R * 0.5, Math.sin(ha) * R * 0.5]); }
    inkPath(g, hex, true); inkPaint(g, st, 0, false);
    inkPoly(g, 3, R * 0.86, -Math.PI / 2); inkPaint(g, st, -1, false); inkPoly(g, 3, R * 0.86, Math.PI / 2); inkPaint(g, st, -1, false);
    let fr = R * 0.25; g.lineWidth = lw * 0.7;
    inkCircle(g, 0, 0, fr); inkPaint(g, st, 1, false);
    for (let f = 0; f < 6; f++) { let fa = f * Math.PI / 3; inkCircle(g, Math.cos(fa) * fr, Math.sin(fa) * fr, fr); g.stroke(); }
    g.lineWidth = lw;
    for (let p = 0; p < 6; p++) { let pa = -Math.PI / 2 + p * Math.PI / 3; inkCircle(g, Math.cos(pa) * R * 0.86, Math.sin(pa) * R * 0.86, s * 0.045); inkPaint(g, st, p + 2, true); }
    if (st.style !== "colour") inkDots(g, r, st, R * 0.62, R * 0.8, st.style === "bold" ? 520 : 200, lw * 0.5);
    inkCircle(g, 0, 0, s * 0.035); g.fillStyle = st.ink; g.fill();
  }
  function inkSigil(g, r, s, st) {
    // drawn at 0.8 (it reaches from the crescent to the dot trail, taller than the frame
    // at full size - the first render cut it off top and bottom); restored at the end
    g.save(); g.scale(0.8, 0.8); g.lineWidth = g.lineWidth / 0.8;
    let lw = g.lineWidth;
    inkPath(g, [[0, -s * 0.78], [0, s * 0.9]]); g.stroke();
    // a crescent moon, horns up, sitting on the staff (the first try read as headphones)
    g.beginPath(); g.arc(0, -s * 0.95, s * 0.17, 0, Math.PI, false); g.arc(0, -s * 1.0, s * 0.14, Math.PI, 0, true); g.closePath(); inkPaint(g, st, 0, true);
    let bars = 2 + Math.floor(r() * 2);
    for (let b = 0; b < bars; b++) {
      let y = -s * 0.45 + b * s * 0.42, w = s * (0.62 - b * 0.12) * (0.8 + r() * 0.4);
      inkPath(g, [[-w, y], [w, y]]); g.stroke();
      let end = Math.floor(r() * 3);
      [-1, 1].forEach(function (side) {
        let x = side * w;
        if (end === 0) { inkCircle(g, x, y, s * 0.06); inkPaint(g, st, b + 1, false); }
        else if (end === 1) { inkPath(g, [[x, y - s * 0.075], [x + s * 0.06, y], [x, y + s * 0.075], [x - s * 0.06, y]], true); inkPaint(g, st, b + 2, true); }
        else { inkPath(g, [[x, y - s * 0.07], [x, y + s * 0.07]]); g.stroke(); inkCircle(g, x + side * s * 0.05, y, s * 0.025); g.fillStyle = st.ink; g.fill(); }
      });
    }
    inkPath(g, [[0, -s * 0.2], [s * 0.13, 0], [0, s * 0.2], [-s * 0.13, 0]], true); inkPaint(g, st, 3, false);
    inkCircle(g, 0, 0, s * 0.045); g.fillStyle = st.ink; g.fill();
    inkCircle(g, 0, s * 0.9, s * 0.1); inkPaint(g, st, 4, false); inkCircle(g, 0, s * 0.9, s * 0.03); g.fillStyle = st.ink; g.fill();
    g.beginPath(); g.arc(0, s * 0.15, s * 0.72, 0.62 * Math.PI, 0.38 * Math.PI, true); g.lineWidth = lw * 0.6; g.stroke(); g.lineWidth = lw;
    for (let d = 0; d < 9; d++) { inkCircle(g, 0, s * (1.08 + d * 0.035), lw * (1.2 - d * 0.1)); g.fillStyle = st.ink; g.fill(); }
    g.restore();
  }
  function inkCompass(g, r, s, st) {
    let lw = g.lineWidth;
    inkCircle(g, 0, 0, s * 0.78); g.stroke(); inkCircle(g, 0, 0, s * 0.7); g.stroke();
    for (let t = 0; t < 64; t++) { let a = t * Math.PI / 32, l = t % 8 === 0 ? 0.07 : 0.035; inkPath(g, [[Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78], [Math.cos(a) * s * (0.78 - l), Math.sin(a) * s * (0.78 - l)]]); g.stroke(); }
    let pts = [[8, 0.98, 0.1], [8, 0.55, 0.07]];
    pts.forEach(function (q, row) {
      for (let i = 0; i < 4 * (row + 1); i++) {
        if (row === 1 && i % 2 === 0) continue;
        let a = -Math.PI / 2 + i * Math.PI / (2 * (row + 1)) + (row === 1 ? 0 : 0), len = s * q[1], w = s * q[2];
        let tip = [Math.cos(a) * len, Math.sin(a) * len], lft = [Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w], rgt = [Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w];
        inkPath(g, [[0, 0], lft, tip], true); inkPaint(g, st, i, true);
        inkPath(g, [[0, 0], rgt, tip], true); inkPaint(g, st, -1, false);
      }
    });
    inkCircle(g, 0, 0, s * 0.09); inkPaint(g, st, 2, false); inkCircle(g, 0, 0, s * 0.03); g.fillStyle = st.ink; g.fill();
    if (st.style !== "colour") inkDots(g, r, st, s * 0.82, s * 0.98, st.style === "bold" ? 360 : 140, lw * 0.5);
  }
  function inkBotanical(g, r, s, st) {
    let lw = g.lineWidth, bend = (r() - 0.5) * s * 0.6;
    let P = function (t) { let u = 1 - t; return [u * u * (-s * 0.05) + 2 * u * t * bend + t * t * (s * 0.05), u * u * s + 2 * u * t * 0 + t * t * (-s * 0.62)]; };
    let stem = []; for (let i = 0; i <= 40; i++) stem.push(P(i / 40));
    inkPath(g, stem); g.stroke();
    let nl = 6 + Math.floor(r() * 3);
    for (let k = 0; k < nl; k++) {
      let t = 0.1 + k * (0.78 / nl), p = P(t), q = P(t + 0.01), dir = Math.atan2(q[1] - p[1], q[0] - p[0]), side = k % 2 ? 1 : -1;
      let a = dir + side * (0.75 + r() * 0.25), len = s * (0.42 - t * 0.25);
      g.save(); g.translate(p[0], p[1]); inkPetal(g, a, 0, len, 0.32); inkPaint(g, st, k, false);
      g.lineWidth = lw * 0.5; inkPath(g, [[0, 0], [Math.cos(a) * len * 0.85, Math.sin(a) * len * 0.85]]); g.stroke(); g.lineWidth = lw; g.restore();
    }
    let top = P(1), np = 5 + Math.floor(r() * 3);
    g.save(); g.translate(top[0], top[1]);
    for (let f = 0; f < np; f++) { inkPetal(g, f * Math.PI * 2 / np - Math.PI / 2, s * 0.04, s * 0.27, 0.55); inkPaint(g, st, f + 1, false); }
    inkCircle(g, 0, 0, s * 0.06); inkPaint(g, st, 0, true);
    if (st.style !== "colour") inkDots(g, r, st, s * 0.06, s * 0.13, st.style === "bold" ? 120 : 50, lw * 0.45);
    g.restore();
  }
  let INK_MOTIFS = [inkMandala, inkGeometry, inkSigil, inkCompass, inkBotanical];
  function linework(S, r, m, style) {
    let dark = m === MOODS.night, surf = dark ? "dark" : (r() < 0.55 ? "paper" : "skin");
    let ground = surf === "dark" ? pick(r, ["#111014", "#141218", "#0f1114"]) : surf === "paper" ? pick(r, ["#efe6d4", "#f2ece1", "#e8dcc6"]) : pick(r, ["#e9c6a8", "#dcae8a", "#c58b66", "#94603f"]);
    let ink = surf === "dark" ? (S.accent || pick(r, ["#ece5d3", "#ece5d3", "#ff2a6d", "#05d9e8"])) : (surf === "skin" ? "#1c1f2a" : "#17161b");
    let cols = ["#b8322a", "#1f7a7a", "#d9a12b", "#3d7a3a", "#7a3b8a"];
    if (S.accent && surf !== "dark") cols.unshift(S.accent);
    let st = { style: style, ink: ink, cols: cols.slice(Math.floor(r() * 2)) };
    // the DESIGN follows the seed (seeds 1..5 = all five designs; each style starts at a
    // different one): left to chance, nearby seeds came out as near-copies - seeds 3, 4, 5
    // all drew the same flower and 9 of 20 pictures were the sigil. Chance varies the rest.
    let nm = INK_MOTIFS.length, mi = ((((S.seed || 1) - 1 + (style === "fine" ? 2 : style === "colour" ? 4 : 0)) % nm) + nm) % nm;
    let T = 1024, s = T * 0.17, motif = INK_MOTIFS[mi];
    let tex = canvasTex(T, T, function (g, w, h) {
      g.fillStyle = ground; g.fillRect(0, 0, w, h);
      // grain: ONE small noise tile, repeated (14,000 single dots each with its own
      // colour made the first render so slow that 21 of 25 pictures never finished)
      let gc = col(ground).getHSL({}).l > 0.5 ? [60, 40, 20] : [255, 255, 255];
      let tile = document.createElement("canvas"); tile.width = tile.height = 128;
      let tg = tile.getContext("2d"), id = tg.createImageData(128, 128);
      for (let p = 0; p < id.data.length; p += 4) { id.data[p] = gc[0]; id.data[p + 1] = gc[1]; id.data[p + 2] = gc[2]; id.data[p + 3] = r() < 0.35 ? Math.floor(r() * 22) : 0; }
      tg.putImageData(id, 0, 0); g.fillStyle = g.createPattern(tile, "repeat"); g.fillRect(0, 0, w, h);
      if (surf === "skin") for (let k = 0; k < 40; k++) { let mx = r() * w, my = r() * h, mr = 40 + r() * 140, gr = g.createRadialGradient(mx, my, 0, mx, my, mr); gr.addColorStop(0, "rgba(120,60,40,0.06)"); gr.addColorStop(1, "rgba(120,60,40,0)"); g.fillStyle = gr; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2); }
      g.save(); g.translate(w / 2, h / 2); g.rotate((r() - 0.5) * 0.25);
      g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = "round"; g.lineJoin = "round";
      g.lineWidth = s * (style === "fine" ? 0.009 : style === "bold" ? 0.03 : 0.024);
      if (surf === "skin") { g.shadowColor = "rgba(20,25,40,0.45)"; g.shadowBlur = 3; }
      if (surf === "dark" && ink !== "#ece5d3") { g.shadowColor = ink; g.shadowBlur = 10; }
      motif(g, r, s, st);
      g.restore();
      // the light is PAINTED (a soft key from the top left, a falloff to the corners): lit
      // through the renderer's tone mapping the cream paper came out grey and the skin mud
      let kg = g.createLinearGradient(0, 0, w, h);
      kg.addColorStop(0, "rgba(255,248,235,0.10)"); kg.addColorStop(0.55, "rgba(0,0,0,0)"); kg.addColorStop(1, "rgba(0,0,0,0.12)");
      g.fillStyle = kg; g.fillRect(0, 0, w, h);
      let vg = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.62);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, surf === "dark" ? "rgba(0,0,0,0.35)" : "rgba(40,25,10,0.22)");
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
    });
    tex.anisotropy = 4;
    S.scene.background = col(ground).multiplyScalar(0.7);
    let sheet = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    sheet.rotation.set((r() - 0.5) * 0.22, (r() - 0.5) * 0.22, 0); S.scene.add(sheet);
    let aspect = S.camera.aspect || 1.5, dist = 14 * Math.max(1, 0.95 / aspect);
    S.camera.fov = 40; S.camera.updateProjectionMatrix(); S.camera.position.set((r() - 0.5) * 0.6, (r() - 0.5) * 0.6, dist); S.camera.lookAt(0, 0, 0);
  }
  K.linework = function (S, r, n, m) { linework(S, r, m, pick(r, ["fine", "bold", "colour"])); };
  K.blackwork = function (S, r, n, m) { linework(S, r, m, "bold"); };
  K.fineline = function (S, r, n, m) { linework(S, r, m, "fine"); };
  K.colourwork = function (S, r, n, m) { linework(S, r, m, "colour"); };
  K.linework.moods = K.blackwork.moods = K.fineline.moods = K.colourwork.moods = ["day", "overcast", "day", "night"];

  // aliases people will type
  var ALIAS = { mountain: "mountains", peaks: "alpine", snow: "winter", woods: "forest", trees: "forest", fall: "autumn", flowers: "meadow", garden: "spring", blossom: "spring", rainforest: "jungle", tropical: "beach", ocean: "coast", sea: "coast", cliffs: "coast", sunset: "coast", dunes: "desert", ice: "arctic", northernlights: "aurora", farm: "fields", farmland: "fields", night: "city", skyline: "city", downtown: "cityday", neon: "street", cyberpunk: "street", planet: "space", stars: "nebula", lunar: "moon", vehicle: "car", cars: "car", highway: "road", studio: "product", shop: "product", jewel: "gem", jewelry: "gem", circuit: "tech", technology: "tech", interior: "room", home: "room", lines: "waves", synthwave: "grid", retro: "grid", tattoo: "linework", tattoos: "linework", flash: "linework", sigil: "linework", ink: "linework", lineart: "linework", mandala: "linework", dotwork: "blackwork", colorwork: "colourwork", colourtattoo: "colourwork", colortattoo: "colourwork", traditional: "colourwork" };

  // ==== LIVE HEROES (Tank 2026-11-07: "yes build the live hero") =========================
  // <section data-hero="fireflies" data-accent="#ffd36b" data-seed="3"> ...text... </section>
  // The writer never writes WebGL: a hand-coded hero failed three ways in one day (a div as
  // the canvas, a script drawing into a 0-height box, a page canvas nobody used). The kit
  // puts a TRANSPARENT canvas behind the section's own content (the section keeps its CSS
  // background, so the hero matches the look), sizes it, and animates it cheaply: pixel
  // ratio <= 1.25, no antialias, ~30 frames a second, paused when off screen or the tab is
  // hidden, one frame only for prefers-reduced-motion, and at most 2 live heroes a page
  // (more become stills). A hero with no height gets min-height 60vh.
  var HEROES = {};
  function sRGB(r, g, b) { return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); }
  function bgOf(el) { var c = getComputedStyle(el).backgroundColor || "", mm = c.match(/rgba?\(([^)]+)\)/); if (!mm) return null; var p = mm[1].split(",").map(parseFloat); if (p.length === 4 && p[3] === 0) return null; return sRGB(p[0], p[1], p[2]); }
  function accentOf(H, dflt) { return H.accent ? col(H.accent) : col(dflt); }
  function glowPoints(H, n, spread, color, size, additive) {
    var g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { pos[i * 3] = (H.r() - 0.5) * spread[0]; pos[i * 3 + 1] = (H.r() - 0.5) * spread[1]; pos[i * 3 + 2] = -H.r() * spread[2]; }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex("rgba(255,255,255,1)"), color: color, size: size, transparent: true, depthWrite: false, blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending }));
    H.scene.add(p); return { geo: g, pos: pos, pts: p };
  }
  HEROES.fireflies = function (H) {
    var base = H.bg || col("#14301f"), dark = base.clone().multiplyScalar(0.35);
    for (var L = 0; L < 3; L++) {
      var n = 30 - L * 7, g = new THREE.ConeGeometry(1, 1, 5); g.translate(0, 0.5, 0);
      var inst = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: base.clone().lerp(dark, 0.3 + L * 0.32) }), n);
      for (var i = 0; i < n; i++) { var hgt = 3.5 + H.r() * 6 + L * 1.8; MM.compose(PP.set((H.r() - 0.5) * (44 + L * 8), -7.5 + L * 0.6 - H.r() * 1.2, -16 + L * 6), QQ.identity(), SS.set(0.9 + H.r() * 0.9, hgt, 1)); inst.setMatrixAt(i, MM); }
      H.scene.add(inst);
    }
    var f = glowPoints(H, 150, [40, 13, 16], accentOf(H, "#ffd36b"), 1.25), base0 = f.pos.slice(), sd = [];
    for (var j = 0; j < 150; j++) { base0[j * 3 + 1] = -3.5 + H.r() * 10; sd.push([H.r() * 6.28, 0.35 + H.r() * 0.7]); }
    H.camera.position.set(0, 0, 12); H.camera.lookAt(0, 0, 0);
    return function (t) { for (var k = 0; k < 150; k++) { var s = sd[k]; f.pos[k * 3] = base0[k * 3] + Math.sin(t * 0.3 * s[1] + s[0]) * 1.3; f.pos[k * 3 + 1] = base0[k * 3 + 1] + Math.sin(t * 0.5 * s[1] + s[0] * 2) * 0.9; } f.geo.attributes.position.needsUpdate = true; f.pts.material.opacity = 0.7 + 0.3 * Math.sin(t * 1.6); };
  };
  HEROES.starfield = function (H) {
    if (!H.bg) H.scene.background = col("#04030c");
    var f = glowPoints(H, 2200, [90, 56, 110], col("#ffffff"), 1.0);
    H.camera.position.set(0, 0, 5);
    return function (t, dt) { for (var i = 0; i < 2200; i++) { f.pos[i * 3 + 2] += dt * 7; if (f.pos[i * 3 + 2] > 5) f.pos[i * 3 + 2] -= 110; } f.geo.attributes.position.needsUpdate = true; };
  };
  HEROES.particles = function (H) {
    var N = 80, acc = accentOf(H, "#7aa2ff"), f = glowPoints(H, N, [30, 16, 6], acc, 0.6), vel = [];
    for (var i = 0; i < N; i++) { f.pos[i * 3 + 2] += 3; vel.push([(H.r() - 0.5) * 0.7, (H.r() - 0.5) * 0.7]); }
    var maxL = 420, lpos = new Float32Array(maxL * 6), lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
    H.scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: acc, transparent: true, opacity: 0.3 })));
    H.camera.position.set(0, 0, 18);
    return function (t, dt) {
      var p = f.pos; for (var i = 0; i < N; i++) { p[i * 3] += vel[i][0] * dt; p[i * 3 + 1] += vel[i][1] * dt; if (Math.abs(p[i * 3]) > 15) vel[i][0] *= -1; if (Math.abs(p[i * 3 + 1]) > 8) vel[i][1] *= -1; }
      f.geo.attributes.position.needsUpdate = true; var k = 0;
      for (var a = 0; a < N && k < maxL; a++) for (var b = a + 1; b < N && k < maxL; b++) { var dx = p[a * 3] - p[b * 3], dy = p[a * 3 + 1] - p[b * 3 + 1]; if (dx * dx + dy * dy < 11) { lpos[k * 6] = p[a * 3]; lpos[k * 6 + 1] = p[a * 3 + 1]; lpos[k * 6 + 2] = p[a * 3 + 2]; lpos[k * 6 + 3] = p[b * 3]; lpos[k * 6 + 4] = p[b * 3 + 1]; lpos[k * 6 + 5] = p[b * 3 + 2]; k++; } }
      lg.setDrawRange(0, k * 2); lg.attributes.position.needsUpdate = true;
    };
  };
  HEROES.aurora = function (H) {
    skyDome(H, MOODS.night, V3(0, 0.3, -1), 0); stars(H, H.r, 1200, 1.1); var mats = [];
    for (var k = 0; k < 3; k++) {
      var mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
        uniforms: { a: { value: col(pick(H.r, ["#36ffb0", "#5dff9a", "#3cf0d0"])) }, b: { value: col(pick(H.r, ["#7a4dff", "#c04dff", "#3f6bff"])) }, t: { value: 0 }, ph: { value: H.r() * 6.3 } },
        vertexShader: "uniform float t,ph; varying vec2 vU; void main(){ vU=uv; vec3 p=position; p.z += sin(p.x*0.012+ph+t*0.22)*60.0 + sin(p.x*0.031+ph*2.0+t*0.37)*18.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }",
        fragmentShader: "uniform vec3 a,b; uniform float t; varying vec2 vU; void main(){ float f=smoothstep(0.0,0.25,vU.y)*(1.0-smoothstep(0.35,1.0,vU.y)); float bands=0.55+0.45*sin(vU.x*90.0+t*0.7); gl_FragColor=vec4(mix(a,b,vU.y)*f*bands*0.9,1.0);" + OUT + "}" });
      mats.push(mat); var m = new THREE.Mesh(new THREE.PlaneGeometry(700, 160, 80, 1), mat); m.position.set((H.r() - 0.5) * 200, 150 + k * 40, -520 - k * 60); m.rotation.x = 0.25; H.scene.add(m);
    }
    var mt = terrain(H, backdrop(makeNoise(H.r), -2, 90, 0.006, 120, 260, true), 0, -340, 1400, 360, 110, 34, SEASON.winter, 0.0, 90); mt.material = new THREE.MeshBasicMaterial({ color: "#070a14" });
    H.camera.position.set(0, 8, 70); H.camera.lookAt(0, 58, -200);
    return function (t) { for (var i = 0; i < mats.length; i++) mats[i].uniforms.t.value = t; };
  };
  HEROES.city = function (H) {
    var mm = { top: "#04030c", mid: "#1d1544", low: "#4a2160", sun: "#9fb4ff", sunI: 0.5, amb: 0.6, fog: "#2a1d4a", sunEl: 0.3, deep: "#06040e", clouds: "#3a2a5a", stars: 0.6 };
    skyDome(H, mm, V3(0, 0.3, -1), 0); H.scene.add(new THREE.HemisphereLight("#8d7bff", "#140c22", 1.2)); fog(H, mm, 0.0055); stars(H, H.r, 400, 1);
    towers(H, H.r, 110, false, [H.accent || "#ff2a6d", "#05d9e8", "#f9c74f"], 420, -420, -60); water(H, mm, V3(0, 0.3, -1), 0, "#05040c", 0);
    return function (t) { H.camera.position.set(Math.sin(t * 0.05) * 25, 6 + Math.sin(t * 0.07) * 1.5, 60); H.camera.lookAt(0, 34, -150); };
  };
  HEROES.rain = function (H) {
    var N = 520, pos = new Float32Array(N * 6), sp = [];
    for (var i = 0; i < N; i++) { var x = (H.r() - 0.5) * 40, y = (H.r() - 0.5) * 24, z = -H.r() * 14, l = 0.4 + H.r() * 0.8; pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x - 0.08; pos[i * 6 + 4] = y - l; pos[i * 6 + 5] = z; sp.push(8 + H.r() * 8); }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    H.scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: accentOf(H, "#9ad8ff"), transparent: true, opacity: 0.45 })));
    H.camera.position.set(0, 0, 12);
    return function (t, dt) { for (var i = 0; i < N; i++) { var d = sp[i] * dt; pos[i * 6 + 1] -= d; pos[i * 6 + 4] -= d; if (pos[i * 6 + 1] < -12) { pos[i * 6 + 1] += 24; pos[i * 6 + 4] += 24; } } g.attributes.position.needsUpdate = true; };
  };
  HEROES.snow = function (H) {
    var N = 700, f = glowPoints(H, N, [40, 24, 20], col("#ffffff"), 0.5, false), sp = [];
    for (var i = 0; i < N; i++) sp.push(0.6 + H.r() * 1.4);
    H.camera.position.set(0, 0, 12);
    return function (t, dt) { for (var i = 0; i < N; i++) { f.pos[i * 3 + 1] -= sp[i] * dt; f.pos[i * 3] += Math.sin(t * 0.6 + i) * 0.004; if (f.pos[i * 3 + 1] < -12) f.pos[i * 3 + 1] += 24; } f.geo.attributes.position.needsUpdate = true; };
  };
  HEROES.waves = function (H) {
    var g = new THREE.PlaneGeometry(80, 40, 110, 55); g.rotateX(-Math.PI / 2);
    var mat = new THREE.ShaderMaterial({ wireframe: true, transparent: true, uniforms: { t: { value: 0 }, c: { value: accentOf(H, "#7a5cff") } },
      vertexShader: "uniform float t; varying float vH; void main(){ vec3 p=position; p.y = sin(p.x*0.25+t)*0.9 + cos(p.z*0.3+t*0.8)*0.7; vH=p.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }",
      fragmentShader: "uniform vec3 c; varying float vH; void main(){ gl_FragColor=vec4(c*(0.65+vH*0.25),0.6);" + OUT + "}" });
    H.scene.add(new THREE.Mesh(g, mat)); H.camera.position.set(0, 6, 18); H.camera.lookAt(0, 0, -6);
    return function (t) { mat.uniforms.t.value = t; };
  };
  HEROES.bokeh = function (H) {
    var tex = glowTex("rgba(255,255,255,0.9)"), sp = [], pal = H.accent ? [col(H.accent)] : [col("#ffd6a5"), col("#ffadad"), col("#caffbf"), col("#9bf6ff"), col("#bdb2ff")];
    for (var i = 0; i < 38; i++) { var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: pal[i % pal.length], transparent: true, depthWrite: false, opacity: 0.12 + H.r() * 0.25, blending: THREE.AdditiveBlending })); var sc = 1.5 + H.r() * 5; s.scale.set(sc, sc, 1); s.position.set((H.r() - 0.5) * 30, (H.r() - 0.5) * 16, -H.r() * 10); H.scene.add(s); sp.push([s, H.r() * 6.28, 0.2 + H.r() * 0.4]); }
    H.camera.position.set(0, 0, 14);
    return function (t) { for (var i = 0; i < sp.length; i++) { var q = sp[i]; q[0].position.y += Math.sin(t * q[2] + q[1]) * 0.004; q[0].position.x += Math.cos(t * q[2] * 0.7 + q[1]) * 0.003; } };
  };
  HEROES.ocean = function (H) {
    var m = H.mood || MOODS[pick(H.r, ["dusk", "golden", "dawn"])], sd = sunFor(m, H.r, 0.0);
    skyDome(H, m, sd, 1); lights(H, m, sd); fog(H, m, 0.003); clouds(H, H.r, m, 7, 60, 200);
    var wm = water(H, m, sd, 0, null, 1); H.camera.position.set(0, 5, 60); H.camera.lookAt(0, 8, -150);
    return function (t) { wm.uniforms.t.value = t; };
  };
  HEROES.synthwave = function (H) {
    K.grid(H, H.r); var grid = null; H.scene.traverse(function (o) { if (o.type === "GridHelper") grid = o; });
    return function (t) { if (grid) grid.position.z = (t * 10) % 15; };
  };
  var HALIAS = { fireflys: "fireflies", forest: "fireflies", nature: "fireflies", night: "fireflies", stars: "starfield", space: "starfield", galaxy: "starfield", network: "particles", tech: "particles", dots: "particles", northernlights: "aurora", skyline: "city", cyberpunk: "rain", neon: "rain", winter: "snow", grid: "synthwave", retro: "synthwave", lights: "bokeh", luxury: "bokeh", sea: "ocean", water: "ocean", beach: "ocean", music: "waves" };
  var live = 0;
  function startHero(el) {
    if (el.getAttribute("data-hero-done")) return;
    el.setAttribute("data-hero-done", "1");
    var kind = (el.getAttribute("data-hero") || "particles").toLowerCase().replace(/[^a-z]/g, ""); kind = HALIAS[kind] || kind;
    var fn = HEROES[kind] || HEROES.particles;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    if (el.clientHeight < 120) el.style.minHeight = "60vh";
    var cv = document.createElement("canvas"); cv.className = "nv-hero-canvas"; cv.setAttribute("aria-hidden", "true"); el.insertBefore(cv, el.firstChild);
    var rd = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: "low-power" });
    rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); rd.outputColorSpace = THREE.SRGBColorSpace; rd.toneMapping = THREE.ACESFilmicToneMapping; rd.setClearColor(0x000000, 0);
    var seed = parseInt(el.getAttribute("data-seed") || "1", 10) || 1;
    var H = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, 1, 0.1, 2500), r: rng(seed * 6007 + kind.length * 31), accent: el.getAttribute("data-accent"), bg: bgOf(el), mood: MOODS[(el.getAttribute("data-mood") || "").toLowerCase()] };
    var update = fn(H) || function () {};
    function size() { var w = Math.max(1, Math.min(el.clientWidth, 1600)), h = Math.max(1, el.clientHeight); rd.setSize(w, h, false); H.camera.aspect = w / h; H.camera.updateProjectionMatrix(); }
    size(); update(0.8, 0); rd.render(H.scene, H.camera);
    live++;
    var still = live > 2 || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still) return;   // one finished frame stays on the canvas
    var visible = true, start = performance.now(), lastR = start;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(el);
    window.addEventListener("resize", size);
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { lastR = now; return; }
      if (now - lastR < 33) return;            // ~30 frames a second is plenty behind text
      var dt = Math.min(0.1, (now - lastR) / 1000); lastR = now;
      update((now - start) / 1000 + 0.8, dt); rd.render(H.scene, H.camera);
    })(start);
  }
  function heroStyle() {
    if (document.getElementById("nv-hero-style")) return;
    var st = document.createElement("style"); st.id = "nv-hero-style";
    st.textContent = "[data-hero]{isolation:isolate}[data-hero]>canvas.nv-hero-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block}";
    (document.head || document.documentElement).appendChild(st);
  }

  // ---- one renderer draws them all, small and once ------------------------------------
  var renderer = null, times = [];
  function draw(el) {
    var t0 = performance.now();
    var kind = (el.getAttribute("data-scene") || "abstract").toLowerCase().replace(/[^a-z]/g, ""); kind = ALIAS[kind] || kind;
    var fn = K[kind] || K.abstract;
    var seed = parseInt(el.getAttribute("data-seed") || "1", 10) || 1, r = rng(seed * 7919 + kind.length * 104729);
    var cw = el.clientWidth || parseInt(el.getAttribute("width") || "640", 10), ch = el.clientHeight || parseInt(el.getAttribute("height") || "0", 10) || cw * 0.66;
    var scale = Math.min(1, MAXW / Math.max(64, cw)), w = Math.max(64, Math.round(cw * scale)), h = Math.max(48, Math.round(ch * scale));
    if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
    renderer.setSize(w, h, false);
    var S = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, w / h, 0.1, 2500), accent: el.getAttribute("data-accent"), seed: seed };
    var mk = (el.getAttribute("data-mood") || "").toLowerCase(), m = MOODS[mk] || MOODS[pick(r, fn.moods || ["dawn", "day", "day", "golden", "dusk", "overcast"])];
    fn(S, r, makeNoise(r), m);
    renderer.render(S.scene, S.camera);
    var url = renderer.domElement.toDataURL("image/jpeg", 0.88);
    el.style.transition = "opacity .6s ease"; el.style.opacity = "0";
    if (el.tagName === "IMG") el.src = url; else { el.style.backgroundImage = "url(" + url + ")"; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; }
    el.setAttribute("data-scene-done", "1");
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.opacity = "1"; }); });
    S.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) { if (mt.map) mt.map.dispose(); if (mt.emissiveMap) mt.emissiveMap.dispose(); mt.dispose(); }); } });
    times.push({ kind: kind, ms: Math.round(performance.now() - t0), w: w, h: h });
  }
  // TIME TO LOAD (Tank 2026-11-07): pictures waiting their turn shimmer, then fade in
  var BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  function shimmer() {
    if (document.getElementById("nv-scene-shimmer")) return;
    var st = document.createElement("style"); st.id = "nv-scene-shimmer";
    st.textContent = "[data-scene]:not([data-scene-done]){background-color:rgba(128,128,128,.18);background-image:linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.22) 50%,rgba(255,255,255,0) 70%);background-size:200% 100%;animation:nvShimmer 1.3s linear infinite}@keyframes nvShimmer{from{background-position:150% 0}to{background-position:-50% 0}}@media (prefers-reduced-motion: reduce){[data-scene]:not([data-scene-done]){animation:none}}";
    (document.head || document.documentElement).appendChild(st);
  }
  function fill() {
    heroStyle();
    Array.prototype.slice.call(document.querySelectorAll("[data-hero]:not([data-hero-done])")).forEach(function (el) { try { startHero(el); } catch (e) { console.warn("nuvola_scenes hero: " + e.message); } });
    shimmer();
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-scene]:not([data-scene-done])"));
    els.forEach(function (el) { if (el.tagName === "IMG" && !el.getAttribute("src")) el.src = BLANK; });
    // DONE SIGNAL (Tank 2026-11-08 "I still see nuvola closing pages before the images
    // load"): the eyes waited a GUESSED time (5 s + 1.5 s a picture, at most 30 s). When the
    // last picture is drawn the kit now says so - <html data-nv-scenes-done="N"> and one
    // console line the eyes read from the browser log: "nuvola_scenes: all N pictures drawn
    // in T ms". The eyes wait for that line before they look.
    var total = els.length, t0 = performance.now();
    (function next() {
      var el = els.shift();
      if (!el) {
        // said on EVERY page that loads the kit, even one with 0 pictures: the hands (nav
        // check) wait for the page they opened to say it, not only the eyes
        document.documentElement.setAttribute("data-nv-scenes-done", String(total));
        console.info("nuvola_scenes: all " + total + " pictures drawn in " + Math.round(performance.now() - t0) + " ms on " + (location.pathname.split("/").pop() || "page"));
        return;
      }
      try { draw(el); } catch (e) { console.warn("nuvola_scenes: " + e.message); el.setAttribute("data-scene-done", "error"); }
      requestAnimationFrame(next);
    })();
  }
  window.NuvolaScenes = { fill: fill, draw: draw, kinds: Object.keys(K).concat(Object.keys(ALIAS)), heroes: Object.keys(HEROES).concat(Object.keys(HALIAS)), times: times };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})();
