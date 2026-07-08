// ── OKLCH / OKLab → RGB conversion for html2canvas compatibility ──
// html2canvas cannot parse oklch()/oklab() color functions, producing
// blank/broken output. These functions convert any such values to rgb().

function oklabToLinearRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n * 255)));
}

function oklabToRgbString(L, a, b) {
  const lin = oklabToLinearRgb(L, a, b);
  return `rgb(${clampByte(linearToSrgb(lin.r))}, ${clampByte(linearToSrgb(lin.g))}, ${clampByte(linearToSrgb(lin.b))})`;
}

/** Converts an "oklch(...)" string to "rgb(...)" */
export function oklchToRgb(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return null;
  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]);
  const hRad = (H * Math.PI) / 180;
  return oklabToRgbString(L, C * Math.cos(hRad), C * Math.sin(hRad));
}

/** Converts an "oklab(...)" string to "rgb(...)" */
export function oklabToRgb(str) {
  const m = str.match(/oklab\(\s*([\d.]+)\s+([\d.-]+)\s+([\d.-]+)/);
  if (!m) return null;
  const L = parseFloat(m[1]);
  const a = parseFloat(m[2]);
  const b = parseFloat(m[3]);
  return oklabToRgbString(L, a, b);
}

/** Replaces all oklch()/oklab() occurrences in a CSS color string with rgb() */
export function convertColorString(val) {
  if (!val || typeof val !== 'string') return val;
  if (!val.includes('oklch') && !val.includes('oklab')) return val;
  return val
    .replace(/oklch\([^)]+\)/g, (m) => oklchToRgb(m) || m)
    .replace(/oklab\([^)]+\)/g, (m) => oklabToRgb(m) || m);
}

const COLOR_PROPS = [
  'background-color', 'color', 'border-color',
  'border-top-color', 'border-bottom-color',
  'border-left-color', 'border-right-color',
  'fill', 'stroke', 'box-shadow', 'outline-color',
];

/**
 * Walks all elements in a cloned document and replaces oklch/oklab colors
 * (from computed styles) with rgb equivalents via inline overrides.
 * Pass this as the `onclone` callback to html2canvas.
 */
export function convertOklchColors(clonedDoc) {
  if (!clonedDoc) return;
  const win = clonedDoc.defaultView || clonedDoc.parentWindow || window;
  const els = clonedDoc.querySelectorAll('*');
  els.forEach((el) => {
    let cs;
    try { cs = win.getComputedStyle(el); } catch { return; }
    if (!cs) return;
    for (const prop of COLOR_PROPS) {
      let val;
      try { val = cs.getPropertyValue(prop); } catch { continue; }
      if (!val || (!val.includes('oklch') && !val.includes('oklab'))) continue;
      const converted = convertColorString(val);
      if (converted && converted !== val) {
        el.style.setProperty(prop, converted, 'important');
      }
    }
  });
}