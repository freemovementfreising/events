// ── Guidelines modal ──────────────────────────────────────────────────────────

const guidelinesModal   = document.getElementById('guidelines-modal');
const guidelinesContent = document.getElementById('guidelines-content');
let guidelinesLoaded = false;

async function openGuidelines() {
  guidelinesModal.hidden = false;
  document.body.style.overflow = 'hidden';

  if (guidelinesLoaded) return;

  guidelinesContent.innerHTML = '<p style="color:#aaa;padding:1rem 0">Loading…</p>';

  try {
    const res = await fetch('data/guidelines.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    guidelinesContent.innerHTML = marked.parse(text);
    guidelinesLoaded = true;
  } catch (err) {
    console.error('Could not load guidelines:', err);
    guidelinesContent.innerHTML = '<p style="color:#c00">Could not load guidelines.</p>';
  }
}

function closeGuidelines() {
  guidelinesModal.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('guidelines-btn').addEventListener('click', openGuidelines);
document.querySelector('.modal-close').addEventListener('click', closeGuidelines);
document.querySelector('.modal-backdrop').addEventListener('click', closeGuidelines);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !guidelinesModal.hidden) closeGuidelines();
});
