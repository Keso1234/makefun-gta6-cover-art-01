// Neon Coast cover renderer: multi-panel GTA-style poster art on a 2D canvas.
// Every cover is drawn from `state` alone, so the editor preview, the ?shot=
// scenes and the exported PNGs are the same drawing at different sizes.

/** The six layouts, each with its panel count and a short name for the buttons. */
export const LAYOUTS = [
  { id: 'hero', name: 'Hero + 3', panels: 4 },
  { id: 'grid4', name: 'Four-panel', panels: 4 },
  { id: 'grid9', name: 'Nine-panel', panels: 8 },
  { id: 'full', name: 'Full-bleed', panels: 1 },
  { id: 'tilt', name: 'Tilted snaps', panels: 3 },
  { id: 'triptych', name: 'Triptych', panels: 3 },
];

/** The six sunset grades: a canvas filter, two tint colours and title colours. */
export const GRADES = [
  { id: 'sunset', name: 'Sunset', swatch: 'linear-gradient(135deg,#ff9a3d,#ff2e88,#7a1e6e)', filter: 'saturate(1.3) contrast(1.08) brightness(1.03)', top: 'rgba(255,154,61,0.10)', bottom: 'rgba(255,46,136,0.42)', titleFrom: '#fff7d6', titleTo: '#ffb347', neon: '#ff5e8a', sunFrom: '#ffd166', sunTo: '#ff2e88' },
  { id: 'neon', name: 'Neon Vice', swatch: 'linear-gradient(135deg,#00e5ff,#ff2e88,#7a1e6e)', filter: 'saturate(1.45) contrast(1.1)', top: 'rgba(0,229,255,0.12)', bottom: 'rgba(255,46,136,0.45)', titleFrom: '#e8fbff', titleTo: '#00e5ff', neon: '#00e5ff', sunFrom: '#00e5ff', sunTo: '#ff2e88' },
  { id: 'teal', name: 'Teal Noir', swatch: 'linear-gradient(135deg,#0f766e,#0ea5e9,#1e1b4b)', filter: 'saturate(1.15) contrast(1.14) brightness(0.98)', top: 'rgba(14,165,233,0.10)', bottom: 'rgba(15,23,42,0.5)', titleFrom: '#f0fdfa', titleTo: '#5eead4', neon: '#5eead4', sunFrom: '#5eead4', sunTo: '#0ea5e9' },
  { id: 'pink', name: 'Hot Pink', swatch: 'linear-gradient(135deg,#ff7ad9,#ff2e88,#4c0519)', filter: 'saturate(1.5) contrast(1.06)', top: 'rgba(255,122,217,0.16)', bottom: 'rgba(190,18,60,0.5)', titleFrom: '#fff1f2', titleTo: '#ff7ad9', neon: '#ff7ad9', sunFrom: '#ff7ad9', sunTo: '#ff2e88' },
  { id: 'gold', name: 'Golden Hour', swatch: 'linear-gradient(135deg,#fde68a,#f59e0b,#7c2d12)', filter: 'saturate(1.35) contrast(1.05) brightness(1.05) sepia(0.18)', top: 'rgba(253,230,138,0.14)', bottom: 'rgba(180,83,9,0.42)', titleFrom: '#fffbeb', titleTo: '#fbbf24', neon: '#fbbf24', sunFrom: '#fde68a', sunTo: '#f59e0b' },
  { id: 'noir', name: 'Midnight', swatch: 'linear-gradient(135deg,#a78bfa,#312e81,#0f172a)', filter: 'saturate(0.7) contrast(1.18) brightness(0.95)', top: 'rgba(167,139,250,0.12)', bottom: 'rgba(15,23,42,0.55)', titleFrom: '#ede9fe', titleTo: '#a78bfa', neon: '#c4b5fd', sunFrom: '#c4b5fd', sunTo: '#6d28d9' },
];

/** Looks a grade up by id, falling back to the first grade. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Looks a layout up by id, falling back to the first layout. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

function rect(x, y, w, h, rotate = 0) {
  return { x, y, w, h, rotate };
}

// Panel rectangles and the title area for a layout, in fractions of the cover.
// The panel area is the top 76% of the cover; the title strip is the bottom 24%,
// except the nine-panel grid, whose centre cell is its title block.
export function layoutRects(layoutId, w, h) {
  const m = 0.018; // outer frame margin, fraction of width
  const g = 0.012; // gutter between panels, fraction of width
  const top = m;
  const panelH = 0.76 - m;
  const strip = { x: 0, y: 0.76, w: 1, h: 0.24 };
  if (layoutId === 'hero') {
    const heroW = 0.60;
    const sideX = m + heroW + g;
    const sideW = 1 - m - sideX;
    const third = (panelH - 2 * g) / 3;
    return { panels: [rect(m, top, heroW, panelH), rect(sideX, top, sideW, third), rect(sideX, top + third + g, sideW, third), rect(sideX, top + 2 * (third + g), sideW, third)], title: { kind: 'strip', ...strip }, sun: { x: 0.5, y: 0.88, r: 0.16 } };
  }
  if (layoutId === 'grid4') {
    const cw = (1 - 2 * m - g) / 2;
    const ch = (panelH - g) / 2;
    return { panels: [rect(m, top, cw, ch), rect(m + cw + g, top, cw, ch), rect(m, top + ch + g, cw, ch), rect(m + cw + g, top + ch + g, cw, ch)], title: { kind: 'strip', ...strip }, sun: { x: 0.5, y: 0.88, r: 0.16 } };
  }
  if (layoutId === 'grid9') {
    // Nine-panel fills the whole cover: its centre cell is the title block,
    // so there is no separate title strip and no empty band at the foot.
    const fullH = 0.964 - m;
    const cw = (1 - 2 * m - 2 * g) / 3;
    const ch = (fullH - 2 * g) / 3;
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(rect(m + c * (cw + g), top + r * (ch + g), cw, ch));
    const centre = cells.splice(4, 1)[0];
    return { panels: cells, title: { kind: 'centre', ...centre }, sun: { x: centre.x + centre.w / 2, y: centre.y + centre.h / 2, r: centre.h * 0.62 } };
  }
  if (layoutId === 'full') {
    return { panels: [rect(m, top, 1 - 2 * m, 0.964 - m)], title: { kind: 'overlay', x: 0, y: 0.68, w: 1, h: 0.32 }, sun: { x: 0.82, y: 0.2, r: 0.13 } };
  }
  if (layoutId === 'tilt') {
    const pw = 0.34;
    const ph = panelH * 0.92;
    return { panels: [rect(0.03, top + 0.02, pw, ph, -0.10), rect(0.33, top, pw, ph, 0.05), rect(0.63, top + 0.03, pw, ph, 0.12)], title: { kind: 'strip', ...strip }, sun: { x: 0.5, y: 0.88, r: 0.16 } };
  }
  // triptych: three tall panels side by side.
  const cw = (1 - 2 * m - 2 * g) / 3;
  return { panels: [rect(m, top, cw, panelH), rect(m + cw + g, top, cw, panelH), rect(m + 2 * (cw + g), top, cw, panelH)], title: { kind: 'strip', ...strip }, sun: { x: 0.5, y: 0.88, r: 0.16 } };
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
export function drawPhotoPanel(ctx, img, panelRect, panel, grade) {
  const { x, y, w, h } = panelRect;
  ctx.save();
  if (panelRect.rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(panelRect.rotate);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (img) {
    const zoom = panel?.zoom ?? 1.15;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    ctx.filter = grade.filter;
    ctx.drawImage(img, (w - pw) / 2 + (panel?.ox ?? 0) * w, (h - ph) / 2 + (panel?.oy ?? 0) * h, pw, ph);
    ctx.filter = 'none';
  } else {
    const missing = ctx.createLinearGradient(0, 0, w, h);
    missing.addColorStop(0, '#3b1d5e');
    missing.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = missing;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.max(14, h * 0.06)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('YOUR PHOTO HERE', w / 2, h / 2);
  }
  const tint = ctx.createLinearGradient(0, 0, 0, h);
  tint.addColorStop(0, grade.top);
  tint.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // White poster frame around the panel, with a thin dark keyline inside it.
  ctx.save();
  if (panelRect.rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(panelRect.rotate);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  ctx.lineWidth = Math.max(3, w * 0.014);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - 2, h - 2);
  ctx.restore();
}

/** Draws the retro striped sun: a gradient disc with horizontal gaps cut out. */
export function drawRetroSun(ctx, cx, cy, r, grade, bg) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, grade.sunFrom);
  sun.addColorStop(1, grade.sunTo);
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = bg;
  let yy = cy + r * 0.05;
  let thick = r * 0.03;
  while (yy < cy + r) {
    ctx.fillRect(cx - r, yy, r * 2, thick);
    yy += thick + r * 0.11;
    thick += r * 0.028;
  }
  ctx.restore();
}

/** Draws a halftone dot field inside a rect, for the title block. */
export function drawHalftone(ctx, x, y, w, h, colour) {
  const step = Math.max(10, w * 0.028);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = colour;
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const r = step * 0.16 * (0.5 + 0.5 * Math.sin(row * 0.9 + col * 0.4));
      ctx.beginPath();
      ctx.arc(x + col * step + step / 2, y + row * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

let noisePattern = null;
/** Returns a repeating film-grain pattern, built once per page. */
export function grainPattern(ctx) {
  if (noisePattern) return noisePattern;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 42;
  }
  tctx.putImageData(data, 0, 0);
  noisePattern = ctx.createPattern(tile, 'repeat');
  return noisePattern;
}

/** Fits a one-line title to a width, returning the font size that fits. */
export function fitTitleFont(ctx, text, fontFamily, maxWidth, maxSize) {
  let size = maxSize;
  ctx.font = `${size}px "${fontFamily}", sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px "${fontFamily}", sans-serif`;
  }
  return size;
}

/** Wraps a title into at most two lines that fit a width. */
export function wrapTitle(ctx, text, fontFamily, maxWidth, maxSize) {
  let size = maxSize;
  const words = text.split(/\s+/).filter(Boolean);
  const linesFor = (s) => {
    ctx.font = `${s}px "${fontFamily}", sans-serif`;
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  };
  let lines = linesFor(size);
  while (size > 12 && lines.length > 2) { size -= 2; lines = linesFor(size); }
  return { lines, size };
}

/** Draws a five-point star path centred at (cx, cy) with radius r. */
export function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Draws the heat meter: a HEAT label, then five stars, filled up to `heat`. */
export function drawHeatMeter(ctx, cx, cy, starR, heat) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${starR * 1.5}px "Bebas Neue", sans-serif`;
  const labelWidth = ctx.measureText('HEAT').width;
  const gap = starR * 1.4;
  const step = starR * 2.4;
  const starsWidth = step * 4 + starR * 2;
  const total = labelWidth + gap + starsWidth;
  let lx = cx - total / 2;
  ctx.fillStyle = '#ffd166';
  ctx.fillText('HEAT', lx, cy);
  const firstStar = lx + labelWidth + gap + starR;
  for (let i = 0; i < 5; i++) {
    starPath(ctx, firstStar + i * step, cy, starR);
    if (i < heat) { ctx.fillStyle = '#ffd166'; ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1.5, starR * 0.12); ctx.stroke(); }
  }
  ctx.restore();
}

/** Draws the title, subtitle and heat meter inside a title strip. */
export function drawTitleStrip(ctx, area, state, grade, w) {
  const { x, y, h } = area;
  const title = (state.title || 'NEON SHORE').toUpperCase();
  const fontFamily = state.titleFont || 'Anton';
  if (state.sun) drawRetroSun(ctx, area.x + area.w * 0.5, y + h * 0.30, h * 0.30, grade, '#1a0b2e');
  if (state.halftone) drawHalftone(ctx, x, y, area.w, h, 'rgba(255,94,138,0.16)');
  const grad = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  const size = fitTitleFont(ctx, title, fontFamily, area.w * 0.92, h * 0.52);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px "${fontFamily}", sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = size * 0.14;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeStyle = '#12081f';
  const ty = y + h * 0.34;
  ctx.strokeText(title, x + area.w / 2, ty);
  ctx.fillStyle = grad;
  ctx.fillText(title, x + area.w / 2, ty);
  ctx.restore();
  if (state.subtitle) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subSize = Math.max(14, h * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.neon;
    ctx.shadowColor = grade.neon;
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillText(state.subtitle, x + area.w / 2, y + h * 0.66);
    ctx.restore();
  }
  drawHeatMeter(ctx, x + area.w / 2, y + h * 0.88, Math.max(7, h * 0.07), state.heat ?? 4);
}

/** Draws the title inside the nine-panel grid's centre cell. */
export function drawCentreTitle(ctx, area, state, grade) {
  const { x, y, w, h } = area;
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(x, y, w, h);
  if (state.sun) drawRetroSun(ctx, x + w / 2, y + h * 0.30, h * 0.28, grade, '#1a0b2e');
  if (state.halftone) drawHalftone(ctx, x, y, w, h, 'rgba(255,94,138,0.20)');
  const title = (state.title || 'NEON SHORE').toUpperCase();
  const fontFamily = state.titleFont || 'Anton';
  const { lines, size } = wrapTitle(ctx, title, fontFamily, w * 0.86, h * 0.26);
  const grad = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px "${fontFamily}", sans-serif`;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeStyle = '#12081f';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.12;
  const startY = y + h * 0.34 - ((lines.length - 1) * size * 0.55);
  lines.forEach((line, i) => {
    const ly = startY + i * size * 1.1;
    ctx.strokeText(line, x + w / 2, ly);
    ctx.fillStyle = grad;
    ctx.fillText(line, x + w / 2, ly);
  });
  ctx.restore();
  if (state.subtitle) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subSize = Math.max(11, h * 0.11);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.neon;
    ctx.shadowColor = grade.neon;
    ctx.shadowBlur = subSize * 0.6;
    ctx.fillText(state.subtitle, x + w / 2, y + h * 0.68);
    ctx.restore();
  }
  drawHeatMeter(ctx, x + w / 2, y + h * 0.88, Math.max(5, h * 0.055), state.heat ?? 4);
  ctx.lineWidth = Math.max(3, w * 0.014);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x, y, w, h);
}

/** Draws the badge ribbon: a tilted gold pill in the cover's top-right corner. */
export function drawBadge(ctx, state, w, h) {
  const badge = (state.badge || '').trim();
  if (!badge) return;
  ctx.save();
  const bw = Math.max(90, w * 0.16);
  const bh = Math.max(22, h * 0.045);
  ctx.translate(w - bw / 2 - w * 0.02, bh * 0.9);
  ctx.rotate(0.06);
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#12081f';
  ctx.lineWidth = Math.max(2, bh * 0.08);
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#12081f';
  ctx.font = `${Math.max(11, bh * 0.52)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`★ ${badge.toUpperCase()} ★`, 0, 1);
  ctx.restore();
}

/** Draws the whole cover onto `canvas` at its own pixel size. */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.grade);
  const layout = layoutRects(state.layout, w, h);
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, w, h);
  // Tilted snapshots sit on a sunset sky, not on the dark panel field.
  if (state.layout === 'tilt') {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.76);
    sky.addColorStop(0, '#ff9a3d');
    sky.addColorStop(0.55, '#ff2e88');
    sky.addColorStop(1, '#2b0f4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.76);
    if (state.sun) drawRetroSun(ctx, w * 0.5, h * 0.34, h * 0.2, grade, '#ff2e88');
  }
  layout.panels.forEach((panelRect, i) => {
    const panel = state.panels[i] ?? { src: 'boulevard', zoom: 1.15, ox: 0, oy: 0 };
    const px = { x: panelRect.x * w, y: panelRect.y * h, w: panelRect.w * w, h: panelRect.h * h, rotate: panelRect.rotate };
    drawPhotoPanel(ctx, photos[panel.src] ?? null, px, panel, grade);
  });
  const title = layout.title;
  const titlePx = { x: title.x * w, y: title.y * h, w: title.w * w, h: title.h * h };
  if (title.kind === 'strip') {
    ctx.fillStyle = '#1a0b2e';
    ctx.fillRect(titlePx.x, titlePx.y, titlePx.w, titlePx.h);
    drawTitleStrip(ctx, titlePx, state, grade, w);
  } else if (title.kind === 'centre') {
    drawCentreTitle(ctx, titlePx, state, grade);
  } else {
    // Full-bleed: a dark scrim at the foot, then the title over the photo.
    const scrim = ctx.createLinearGradient(0, titlePx.y - h * 0.1, 0, h);
    scrim.addColorStop(0, 'rgba(18,8,31,0)');
    scrim.addColorStop(0.35, 'rgba(18,8,31,0.72)');
    scrim.addColorStop(1, 'rgba(18,8,31,0.92)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, titlePx.y - h * 0.1, w, h - titlePx.y + h * 0.1);
    drawTitleStrip(ctx, { x: 0, y: titlePx.y, w, h: titlePx.h }, state, grade, w);
  }
  drawBadge(ctx, state, w, h);
  // Outer white poster frame.
  ctx.lineWidth = Math.max(4, w * 0.008);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  if (state.vignette) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
