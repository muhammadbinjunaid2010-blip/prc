import createGlobe from "cobe";

const MOVEMENT_DAMPING = 350;
const MAX_THETA = 1.2;
const CLICK_DRAG_PX = 8;

const ACTIVE_COLOR = [91 / 255, 141 / 255, 239 / 255]; // brand primary

const GLOBE_CONFIG = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [30.3753, 69.3451], size: 0.08 }, // Pakistan
    { location: [23.8859, 45.0792], size: 0.09 }, // Saudi Arabia
    { location: [23.4241, 53.8478], size: 0.09 }, // UAE
    { location: [28.0, 40.5], size: 0.08 }, // Middle East cluster
    { location: [52.3555, -1.1743], size: 0.08 }, // England
    { location: [56.1304, -106.3468], size: 0.09 }, // Canada
    { location: [37.0902, -95.7129], size: 0.09 }, // USA
  ],
};

const COUNTRY_INDEX = ["Pakistan", "Saudi Arabia", "UAE", "Middle East", "England", "Canada", "USA"];

function normalize3(v) {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// globe-space direction of a lat/lng (same layout as cobe's marker array)
function latLngToGlobe(lat, lng) {
  const la = (lat * Math.PI) / 180;
  const ln = (lng * Math.PI) / 180 - Math.PI;
  const S = Math.cos(la);
  return [-S * Math.cos(ln), Math.sin(la), S * Math.sin(ln)];
}

// view -> globe: i = h * L(theta, phi) with cobe's column-major matrix
function hToGlobe(h, theta, phi) {
  const c = Math.cos(theta), d = Math.cos(phi), e = Math.sin(theta), f = Math.sin(phi);
  const col0 = [d, f * e, -f * c];
  const col1 = [0, c, e];
  const col2 = [f, d * -e, d * c];
  return [
    h[0] * col0[0] + h[1] * col0[1] + h[2] * col0[2],
    h[0] * col1[0] + h[1] * col1[1] + h[2] * col1[2],
    h[0] * col2[0] + h[1] * col2[1] + h[2] * col2[2],
  ];
}

// globe -> view (inverse of hToGlobe for the same theta/phi)
function globeToView(g, theta, phi) {
  const c = Math.cos(theta), d = Math.cos(phi), e = Math.sin(theta), f = Math.sin(phi);
  const col0 = [d, f * e, -f * c];
  const col1 = [0, c, e];
  const col2 = [f, d * -e, d * c];
  return [
    g[0] * col0[0] + g[1] * col1[0] + g[2] * col2[0],
    g[0] * col0[1] + g[1] * col1[1] + g[2] * col2[1],
    g[0] * col0[2] + g[1] * col1[2] + g[2] * col2[2],
  ];
}

// view direction -> container pixel (mirrors cobe's shader for a unit view dir)
function viewToPixel(v, cssW, cssH, dpr) {
  const ar = cssW / cssH;
  const hx = v[0], hy = v[1], hz = v[2];
  if (hz <= 0) return null; // back hemisphere
  const bx = 0.8 * hx, by = 0.8 * hy;
  const b0x = bx / ar, b0y = by;
  const fx = (b0x + 1) / 2, fy = (b0y + 1) / 2;
  if (fx < -0.05 || fx > 1.05 || fy < -0.05 || fy > 1.05) return null;
  return { x: fx * cssW, y: (1 - fy) * cssH };
}

// screenshot/top-down pixel -> view unit direction (disk radius 0.8 in b-space)
function pxToH(px, py, W, H) {
  let bx = (px * 2 / W - 1) * (W / H);
  let by = 1 - (py * 2 / H);
  const cval = bx * bx + by * by;
  if (cval > 0.64) return null;
  const w = Math.sqrt(0.64 - cval);
  return normalize3([bx, by, w]);
}

export function initGlobeMount(container) {
  if (!container) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "globe-canvas";
  container.appendChild(canvas);

  const pin = document.createElement("div");
  pin.className = "globe-pin";
  pin.setAttribute("aria-hidden", "true");
  pin.innerHTML = '<span class="globe-pin-icon"></span><span class="globe-pin-label"></span>';
  container.appendChild(pin);

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = container.offsetWidth || 800;
  let height = container.offsetHeight || width;
  let activeIdx = 0;
  let builtMarkers = null;
  // Start facing the default country so its "you are here" pin is visible immediately
  const startS = latLngToGlobe(...GLOBE_CONFIG.markers[activeIdx].location);
  let phi = Math.atan2(-startS[0], startS[2]);
  let theta = GLOBE_CONFIG.theta;
  let pointerStartX = null;
  let pointerStartY = null;
  let dragPhi = 0;
  let dragTheta = 0;
  let dragged = false;
  let focus = null; // { phi, theta } tween targets while feeding to a marker
  let lastT = 0;

  function markersFor(active) {
    if (builtMarkers && builtMarkers._active === active) return builtMarkers.list;
    builtMarkers = {
      _active: active,
      list: GLOBE_CONFIG.markers.map((m, i) => {
        const on = active === i;
        return {
          location: m.location,
          size: on ? m.size * 1.9 : m.size,
          color: on ? ACTIVE_COLOR : undefined,
        };
      }),
    };
    return builtMarkers.list;
  }

  function updatePin() {
    if (activeIdx < 0) {
      pin.classList.remove("visible");
      return;
    }
    const s = latLngToGlobe(...GLOBE_CONFIG.markers[activeIdx].location);
    const v = globeToView(s, theta + dragTheta, phi + dragPhi);
    const px = viewToPixel(v, width, height);
    if (!px) {
      pin.classList.remove("visible");
      return;
    }
    pin.style.transform = "translate(-50%, -100%)";
    pin.style.left = px.x + "px";
    pin.style.top = px.y + "px";
    pin.querySelector(".globe-pin-label").textContent = COUNTRY_INDEX[activeIdx];
    pin.classList.add("visible");
  }

  const globe = createGlobe(canvas, {
    ...GLOBE_CONFIG,
    width: width * 2,
    height: height * 2,
    onRender: (state) => {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.00001, (now - lastT) / 1000));
      lastT = now;

      if (focus) {
        const wrap = Math.atan2(Math.sin(focus.phi - phi), Math.cos(focus.phi - phi));
        phi += wrap * Math.min(1, dt * 6);
        theta += (focus.theta - theta) * Math.min(1, dt * 6);
        if (Math.abs(wrap) < 0.003 && Math.abs(focus.theta - theta) < 0.003) focus = null;
      } else if (pointerStartX === null && !prefersReduced) {
        phi += 0.005;
      }

      state.phi = phi + dragPhi;
      state.theta = theta + dragTheta;
      state.width = width * 2;
      state.height = height * 2;
      state.markers = markersFor(activeIdx);
      updatePin();
    },
  });
  canvas.classList.add("ready");

  const onResize = () => {
    width = container.offsetWidth || 800;
    height = container.offsetHeight || width;
  };
  window.addEventListener("resize", onResize);

  const handleClick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const h = pxToH(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (!h) return;
    const g = hToGlobe(h, theta, phi);
    let best = -1, bestAng = Infinity;
    for (let i = 0; i < GLOBE_CONFIG.markers.length; i++) {
      const s = latLngToGlobe(...GLOBE_CONFIG.markers[i].location);
      const dot = Math.max(-1, Math.min(1, g[0] * s[0] + g[1] * s[1] + g[2] * s[2]));
      const ang = Math.acos(dot);
      if (ang < bestAng) { bestAng = ang; best = i; }
    }
    if (best >= 0 && bestAng < 0.16) {
      setActive(best);
      container.dispatchEvent(new CustomEvent("globe:country", { detail: { country: COUNTRY_INDEX[best] } }));
    }
  };

  const endDrag = (e) => {
    if (pointerStartX === null) return;
    phi += dragPhi;
    theta = Math.max(-MAX_THETA, Math.min(MAX_THETA, theta + dragTheta));
    const wasClick = !dragged;
    dragPhi = 0;
    dragTheta = 0;
    dragged = false;
    pointerStartX = null;
    pointerStartY = null;
    canvas.style.cursor = "grab";
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    if (wasClick) handleClick(e);
  };

  const cancelDrag = () => {
    pointerStartX = null;
    pointerStartY = null;
    dragPhi = 0;
    dragTheta = 0;
    dragged = false;
    canvas.style.cursor = "grab";
  };

  function setActive(i) {
    activeIdx = i;
    updatePin();
  }

  canvas.addEventListener("pointerdown", (e) => {
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    dragPhi = 0;
    dragTheta = 0;
    dragged = false;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pointerStartX === null) return;
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;
    if (Math.abs(dx) > CLICK_DRAG_PX || Math.abs(dy) > CLICK_DRAG_PX) dragged = true;
    dragPhi = dx / MOVEMENT_DAMPING;
    dragTheta = -dy / MOVEMENT_DAMPING;
  });
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", cancelDrag);
  canvas.addEventListener("pointerleave", (e) => { if (pointerStartX !== null) endDrag(e); });

  return {
    destroy() {
      globe.destroy();
      window.removeEventListener("resize", onResize);
      canvas.remove();
      pin.remove();
    },
    focusCountry(name) {
      const i = COUNTRY_INDEX.indexOf(name);
      if (i < 0) return;
      setActive(i);
      const s = latLngToGlobe(...GLOBE_CONFIG.markers[i].location);
      // pick the phi that brings the marker to the front (+z, horizontally centered)
      const rawPhi = Math.atan2(-s[0], s[2]);
      const targetTheta = Math.max(-MAX_THETA, Math.min(MAX_THETA, Math.atan2(-s[1], Math.sqrt(s[0] * s[0] + s[2] * s[2]))));
      let targetPhi = rawPhi, bestD = Infinity;
      [rawPhi, rawPhi + 2 * Math.PI, rawPhi - 2 * Math.PI].forEach((c) => {
        const d = Math.abs(c - phi);
        if (d < bestD) { bestD = d; targetPhi = c; }
      });
      focus = { phi: targetPhi, theta: targetTheta };
      setTimeout(() => { focus = null; }, 1200);
    },
    setActiveCountry(name) {
      const i = COUNTRY_INDEX.indexOf(name);
      if (i >= 0) setActive(i);
    },
  };
}