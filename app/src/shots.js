// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the exported cover alone, drawn by the app
// itself at the export size. Query keys: layout, grade, size (1080x1080,
// 1080x1350 or 1920x1080), photo (boulevard or pier), caption (the title),
// subtitle, badge and heat. window.__shotReady is set once painted.
export async function runShot(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    layout: query.get('layout') ?? (shot === 'cover' ? 'hero' : 'hero'),
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1920x1080',
    photo: query.get('photo') ?? 'boulevard',
    title: query.get('caption') ?? 'NEON SHORE',
    subtitle: query.get('subtitle') ?? 'Vice City nights',
    badge: query.get('badge') ?? 'EST. 2026',
    heat: Number(query.get('heat') ?? '4'),
  };
  await applyScene(scene);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
