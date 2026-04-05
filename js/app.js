// ── State ─────────────────────────────────────────────────────────────────────
let allEvents = [];
let viewMonth = new Date();
viewMonth.setDate(1);
viewMonth.setHours(0, 0, 0, 0);

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eventDateStr(event) {
  // Returns YYYY-MM-DD
  return (event.start.date || event.start.dateTime).slice(0, 10);
}

function eventStartDate(event) {
  const raw = event.start.date || event.start.dateTime;
  return new Date(event.start.date ? raw + 'T00:00:00' : raw);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function padded(n) {
  return String(n).padStart(2, '0');
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchEvents() {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// ── Calendar Grid ─────────────────────────────────────────────────────────────
function renderGrid(events) {
  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  document.getElementById('cal-month-label').textContent =
    new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const eventDates = new Set(events.map(eventDateStr));

  // Lead blanks: week starts Monday (Mon=0)
  const firstDow   = new Date(year, month, 1).getDay();
  const leadBlanks = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  let html = '';

  for (let i = 0; i < leadBlanks; i++) {
    html += '<div class="cal-day cal-day--empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${year}-${padded(month + 1)}-${padded(d)}`;
    const isToday  = dateStr === today;
    const hasEvent = eventDates.has(dateStr);
    const isPast   = dateStr < today;

    let cls = 'cal-day';
    if (isToday)           cls += ' cal-day--today';
    if (hasEvent)          cls += ' cal-day--has-event';
    if (isPast && !isToday) cls += ' cal-day--past';

    html += `<div class="${cls}"${hasEvent ? ` data-date="${dateStr}"` : ''}>` +
      `<span class="cal-day-num">${d}</span>` +
      (hasEvent ? '<span class="cal-dot"></span>' : '') +
      '</div>';
  }

  document.getElementById('cal-days').innerHTML = html;

  // Click a day with an event → scroll to it in the list
  document.querySelectorAll('.cal-day--has-event').forEach(el => {
    el.addEventListener('click', () => {
      const target = document.querySelector(`.event-card[data-date="${el.dataset.date}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Event List ────────────────────────────────────────────────────────────────
function renderEventList(events) {
  const container = document.getElementById('cal-events-list');

  if (!events.length) {
    container.innerHTML = '<p class="cal-empty">No upcoming events.</p>';
    return;
  }

  // Group by month label
  const groups = new Map();
  for (const e of events) {
    const d   = eventStartDate(e);
    const key = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  let html = '';

  for (const [monthLabel, monthEvents] of groups) {
    html += `<h3 class="cal-group-heading">${monthLabel}</h3>`;

    for (const e of monthEvents) {
      const d        = eventStartDate(e);
      const isAllDay = !!e.start.date;
      const dateStr  = eventDateStr(e);

      const dayNum   = d.getDate();
      const monthSh  = d.toLocaleDateString('en-GB', { month: 'short' });
      const weekday  = d.toLocaleDateString('en-GB', { weekday: 'short' });

      let timeHtml = '';
      if (!isAllDay) {
        let timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        if (e.end?.dateTime) {
          timeStr += '\u2013' + new Date(e.end.dateTime)
            .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        timeHtml = `<p class="event-meta"><span class="event-icon">&#128336;</span>${timeStr}</p>`;
      }

      const locationHtml = e.location
        ? `<p class="event-meta"><span class="event-icon">&#128205;</span>${esc(e.location)}</p>`
        : '';

      const descHtml = e.description
        ? `<p class="event-desc">${esc(e.description).replace(/\n/g, '<br>')}</p>`
        : '';

      html +=
        `<div class="event-card" data-date="${dateStr}">` +
          `<div class="event-badge">` +
            `<span class="event-badge-day">${dayNum}</span>` +
            `<span class="event-badge-month">${monthSh}</span>` +
            `<span class="event-badge-weekday">${weekday}</span>` +
          `</div>` +
          `<div class="event-info">` +
            `<h4 class="event-title">${esc(e.summary || 'Untitled')}</h4>` +
            timeHtml + locationHtml + descHtml +
          `</div>` +
        `</div>`;
    }
  }

  container.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    viewMonth.setMonth(viewMonth.getMonth() - 1);
    renderGrid(allEvents);
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    viewMonth.setMonth(viewMonth.getMonth() + 1);
    renderGrid(allEvents);
  });

  // Render grid immediately (empty) so layout isn't blank
  renderGrid([]);
  document.getElementById('cal-events-list').innerHTML =
    '<p class="cal-loading">Loading events\u2026</p>';

  fetchEvents()
    .then(events => {
      allEvents = events;
      renderGrid(events);
      renderEventList(events);
    })
    .catch(err => {
      console.error('Calendar error:', err);
      document.getElementById('cal-events-list').innerHTML =
        '<p class="cal-error">Could not load events. Please try again later.</p>';
    });
}

init();
