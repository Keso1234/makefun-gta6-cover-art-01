// Neon Coast editor: wires the controls to the cover renderer (./cover.js),
// keeps an undo history, and lets each panel's photo be dragged, zoomed and
// swapped. A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
import { drawCover, layoutById, gradeById, layoutRects, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080 },
  { id: '1080x1350', w: 1080, h: 1350 },
  { id: '1920x1080', w: 1920, h: 1080 },
];

/** The photos the panels draw from, keyed by id: samples and user uploads. */
const photos = {};
const photoLabels = { boulevard: 'Boulevard', pier: 'Pier' };
let uploadCount = 0;

/** Builds a fresh default cover state for a layout. */
export function defaultState(layoutId = 'hero') {
  const count = layoutById(layoutId).panels;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push({ src: i % 2 === 0 ? 'boulevard' : 'pier', zoom: 1.15 + (i % 3) * 0.08, ox: 0, oy: 0 });
  }
  return {
    layout: layoutId, grade: 'sunset', title: 'NEON SHORE', subtitle: 'Vice City nights',
    badge: 'EST. 2026', heat: 4, titleFont: 'Anton',
    grain: true, vignette: true, halftone: true, sun: true, panels,
  };
}

let state = defaultState('hero');
let selectedPanel = 0;
let past = [];
let future = [];
let committed = JSON.stringify(state);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Waits for the vendored poster fonts so canvas lettering draws in them. */
export async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }
}

/** Redraws the preview canvas from the current state. */
export function redraw() {
  drawCover(canvas, photos, state);
  window.__coverReady = true;
}

/** Records the last committed state so the new one can be undone. */
export function commitHistory() {
  past.push(committed);
  if (past.length > 60) past.shift();
  future = [];
  committed = JSON.stringify(state);
  syncUndoButtons();
}

/** Steps one state back through the undo history. */
export function undoCover() {
  if (!past.length) return;
  future.push(committed);
  committed = past.pop();
  state = JSON.parse(committed);
  clampSelection();
  syncControls();
  redraw();
}

/** Steps one state forward through the redo history. */
export function redoCover() {
  if (!future.length) return;
  past.push(committed);
  committed = future.pop();
  state = JSON.parse(committed);
  clampSelection();
  syncControls();
  redraw();
}

function syncUndoButtons() {
  document.getElementById('undoBtn').disabled = past.length === 0;
  document.getElementById('redoBtn').disabled = future.length === 0;
}

function clampSelection() {
  const count = layoutById(state.layout).panels;
  if (selectedPanel >= count) selectedPanel = 0;
}

/** Makes sure the panel list matches the current layout's panel count. */
export function ensurePanels() {
  const count = layoutById(state.layout).panels;
  while (state.panels.length < count) {
    const i = state.panels.length;
    state.panels.push({ src: i % 2 === 0 ? 'boulevard' : 'pier', zoom: 1.15, ox: 0, oy: 0 });
  }
  state.panels.length = count;
  clampSelection();
}

/** The panel rectangles of the preview canvas, in canvas pixels. */
export function previewPanelRects() {
  const layout = layoutRects(state.layout, canvas.width, canvas.height);
  return layout.panels.map((r) => ({ x: r.x * canvas.width, y: r.y * canvas.height, w: r.w * canvas.width, h: r.h * canvas.height, rotate: r.rotate }));
}

/** Finds the topmost panel under a point in canvas pixels, or -1. */
export function panelAt(px, py) {
  const rects = previewPanelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

function buildLayoutButtons() {
  const grid = document.getElementById('layoutGrid');
  grid.innerHTML = '';
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = layout.name;
    button.dataset.layout = layout.id;
    button.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      state.layout = layout.id;
      ensurePanels();
      syncControls();
      redraw();
      commitHistory();
      status.textContent = `Layout: ${layout.name}.`;
    });
    grid.appendChild(button);
  }
}

function buildGradeButtons() {
  const grid = document.getElementById('gradeGrid');
  grid.innerHTML = '';
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'grade-swatch';
    swatch.style.background = grade.swatch;
    button.appendChild(swatch);
    button.appendChild(document.createTextNode(grade.name));
    button.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      state.grade = grade.id;
      syncControls();
      redraw();
      commitHistory();
      status.textContent = `Grade: ${grade.name}.`;
    });
    grid.appendChild(button);
  }
}

function buildPanelChips() {
  const chips = document.getElementById('panelChips');
  chips.innerHTML = '';
  const count = layoutById(state.layout).panels;
  for (let i = 0; i < count; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Panel ${i + 1}`;
    button.classList.toggle('active', i === selectedPanel);
    button.addEventListener('click', () => { selectPanel(i); });
    chips.appendChild(button);
  }
}

function buildPanelPhotoRow() {
  const row = document.getElementById('panelPhotoRow');
  row.innerHTML = '';
  for (const key of Object.keys(photos)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb-btn';
    button.textContent = photoLabels[key] ?? key;
    button.classList.toggle('active', state.panels[selectedPanel]?.src === key);
    button.addEventListener('click', () => {
      state.panels[selectedPanel].src = key;
      redraw();
      commitHistory();
      buildPanelPhotoRow();
    });
    row.appendChild(button);
  }
}

/** Selects a panel and refreshes the panel inspector for it. */
export function selectPanel(i) {
  selectedPanel = i;
  syncPanelInspector();
  buildPanelChips();
  buildPanelPhotoRow();
}

function syncPanelInspector() {
  const panel = state.panels[selectedPanel];
  document.getElementById('panelLabel').textContent = `Panel ${selectedPanel + 1} — ${photoLabels[panel?.src] ?? panel?.src ?? 'no photo'}. Drag it in the preview to move its photo.`;
  if (!panel) return;
  document.getElementById('zoomInput').value = panel.zoom;
  document.getElementById('panXInput').value = panel.ox;
  document.getElementById('panYInput').value = panel.oy;
}

/** Syncs every control from the current state (after undo, redo or a shot). */
export function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('badgeInput').value = state.badge;
  document.getElementById('titleFont').value = state.titleFont;
  document.getElementById('heatInput').value = state.heat;
  document.getElementById('heatValue').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  document.getElementById('grainToggle').checked = state.grain;
  document.getElementById('vignetteToggle').checked = state.vignette;
  document.getElementById('halftoneToggle').checked = state.halftone;
  document.getElementById('sunToggle').checked = state.sun;
  document.querySelectorAll('#layoutGrid button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeGrid button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  syncPanelInspector();
  buildPanelChips();
  buildPanelPhotoRow();
  syncUndoButtons();
}

/** Renders the cover at an export size and downloads it as a PNG. */
export function exportCover(size) {
  return new Promise((resolve) => {
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off, photos, state);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${size.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      status.textContent = `Saved neon-coast-${size.id}.png (${size.w} x ${size.h}).`;
      resolve();
    }, 'image/png');
  });
}

/** Exports the cover at all three post sizes, one after another. */
export async function exportAllSizes() {
  for (const size of EXPORT_SIZES) await exportCover(size);
  status.textContent = 'Saved all 3 sizes: 1080 x 1080, 1080 x 1350, 1920 x 1080.';
}

/** Applies a screenshot scene (?shot=): layout, grade, size, words and photos. */
export async function applyShotScene(scene) {
  const size = EXPORT_SIZES.find((s) => s.id === scene.size) ?? EXPORT_SIZES[2];
  canvas.width = size.w;
  canvas.height = size.h;
  state = defaultState(scene.layout ?? 'hero');
  state.layout = scene.layout ?? 'hero';
  state.grade = scene.grade ?? 'sunset';
  state.title = scene.title ?? 'NEON SHORE';
  state.subtitle = scene.subtitle ?? 'Vice City nights';
  state.badge = scene.badge ?? 'EST. 2026';
  state.heat = scene.heat ?? 4;
  ensurePanels();
  if (!photos.boulevard) photos.boulevard = await loadImage('samples/boulevard.jpg');
  if (!photos.pier) photos.pier = await loadImage('samples/pier.jpg');
  if (scene.photo === 'pier') state.panels.forEach((p, i) => { p.src = i % 2 === 0 ? 'pier' : 'boulevard'; });
  committed = JSON.stringify(state);
  past = [];
  future = [];
  selectedPanel = 0;
  syncControls();
  redraw();
}

function wireControls() {
  document.getElementById('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  document.getElementById('titleInput').addEventListener('change', commitHistory);
  document.getElementById('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('subtitleInput').addEventListener('change', commitHistory);
  document.getElementById('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  document.getElementById('badgeInput').addEventListener('change', commitHistory);
  document.getElementById('titleFont').addEventListener('change', (e) => { state.titleFont = e.target.value; redraw(); commitHistory(); });
  document.getElementById('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    document.getElementById('heatValue').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    redraw();
  });
  document.getElementById('heatInput').addEventListener('change', commitHistory);
  for (const [id, key] of [['grainToggle', 'grain'], ['vignetteToggle', 'vignette'], ['halftoneToggle', 'halftone'], ['sunToggle', 'sun']]) {
    document.getElementById(id).addEventListener('change', (e) => { state[key] = e.target.checked; redraw(); commitHistory(); });
  }
  document.getElementById('zoomInput').addEventListener('input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value); redraw(); });
  document.getElementById('zoomInput').addEventListener('change', commitHistory);
  document.getElementById('panXInput').addEventListener('input', (e) => { state.panels[selectedPanel].ox = Number(e.target.value); redraw(); });
  document.getElementById('panXInput').addEventListener('change', commitHistory);
  document.getElementById('panYInput').addEventListener('input', (e) => { state.panels[selectedPanel].oy = Number(e.target.value); redraw(); });
  document.getElementById('panYInput').addEventListener('change', commitHistory);
  document.getElementById('resetCrop').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    panel.zoom = 1.15; panel.ox = 0; panel.oy = 0;
    syncPanelInspector();
    redraw();
    commitHistory();
  });
  document.getElementById('exportPng').addEventListener('click', () => {
    const picked = document.querySelector('input[name="exportSize"]:checked').value;
    exportCover(EXPORT_SIZES.find((s) => s.id === picked) ?? EXPORT_SIZES[2]);
  });
  document.getElementById('exportAll').addEventListener('click', exportAllSizes);
  document.getElementById('undoBtn').addEventListener('click', undoCover);
  document.getElementById('redoBtn').addEventListener('click', redoCover);
  document.getElementById('shuffleBtn').addEventListener('click', () => {
    const layouts = LAYOUTS.filter((l) => l.id !== state.layout);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)].id;
    const grades = GRADES.filter((g) => g.id !== state.grade);
    state.grade = grades[Math.floor(Math.random() * grades.length)].id;
    ensurePanels();
    state.panels.forEach((p) => { p.src = Math.random() < 0.5 ? 'boulevard' : 'pier'; p.zoom = 1.05 + Math.random() * 0.5; });
    syncControls();
    redraw();
    commitHistory();
    status.textContent = `Shuffled: ${layoutById(state.layout).name} + ${gradeById(state.grade).name}.`;
  });
  document.getElementById('fillAll').addEventListener('click', () => {
    state.panels.forEach((p, i) => { p.src = i % 2 === 0 ? 'boulevard' : 'pier'; });
    redraw();
    commitHistory();
    buildPanelPhotoRow();
    status.textContent = 'Every panel filled with the samples.';
  });
  document.getElementById('sampleBoulevard').addEventListener('click', async () => {
    if (!photos.boulevard) photos.boulevard = await loadImage('samples/boulevard.jpg');
    state.panels[selectedPanel].src = 'boulevard';
    redraw(); commitHistory(); buildPanelPhotoRow();
  });
  document.getElementById('samplePier').addEventListener('click', async () => {
    if (!photos.pier) photos.pier = await loadImage('samples/pier.jpg');
    state.panels[selectedPanel].src = 'pier';
    redraw(); commitHistory(); buildPanelPhotoRow();
  });
  document.getElementById('photoUpload').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      uploadCount += 1;
      const key = `upload-${uploadCount}`;
      photoLabels[key] = file.name.replace(/\.[^.]+$/, '').slice(0, 14) || `Upload ${uploadCount}`;
      photos[key] = await loadImage(URL.createObjectURL(file));
      state.panels[selectedPanel].src = key;
    }
    buildPanelPhotoRow();
    redraw();
    commitHistory();
    status.textContent = `${e.target.files.length} photo(s) added — stored only in this page.`;
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undoCover(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redoCover(); }
  });
}

function wireCanvasDrag() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const toCanvas = (e) => {
    const box = canvas.getBoundingClientRect();
    return { x: (e.clientX - box.left) * (canvas.width / box.width), y: (e.clientY - box.top) * (canvas.height / box.height) };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const point = toCanvas(e);
    const hit = panelAt(point.x, point.y);
    if (hit === -1) return;
    selectPanel(hit);
    dragging = true;
    lastX = point.x;
    lastY = point.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const point = toCanvas(e);
    const rects = previewPanelRects();
    const r = rects[selectedPanel];
    const panel = state.panels[selectedPanel];
    panel.ox += (point.x - lastX) / r.w;
    panel.oy += (point.y - lastY) / r.h;
    panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox));
    panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy));
    lastX = point.x;
    lastY = point.y;
    syncPanelInspector();
    redraw();
  });
  const endDrag = () => { if (dragging) { dragging = false; commitHistory(); } };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncPanelInspector();
    redraw();
  }, { passive: false });
}

buildLayoutButtons();
buildGradeButtons();
wireControls();
wireCanvasDrag();
syncControls();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  (async () => {
    await ensureFonts();
    await runShot(shot, params, applyShotScene);
  })();
} else {
  (async () => {
    await ensureFonts();
    photos.boulevard = await loadImage('samples/boulevard.jpg');
    photos.pier = await loadImage('samples/pier.jpg');
    buildPanelPhotoRow();
    redraw();
  })();
}
