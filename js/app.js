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

  const firstDow    = new Date(year, month, 1).getDay();
  const leadBlanks  = (firstDow + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = todayStr();

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
    if (isToday)            cls += ' cal-day--today';
    if (hasEvent)           cls += ' cal-day--has-event';
    if (isPast && !isToday) cls += ' cal-day--past';

    html += `<div class="${cls}"${hasEvent ? ` data-date="${dateStr}"` : ''}>` +
      `<span class="cal-day-num">${d}</span>` +
      (hasEvent ? '<span class="cal-dot"></span>' : '') +
      '</div>';
  }

  document.getElementById('cal-days').innerHTML = html;

  // Click any day with an event → scroll to it inside the events panel
  document.querySelectorAll('.cal-day--has-event').forEach(el => {
    el.addEventListener('click', () => {
      const wrapper = document.querySelector('.cal-events-wrapper');
      const target  = document.querySelector(`.event-card[data-date="${el.dataset.date}"]`);
      if (target && wrapper) {
        wrapper.scrollTop = Math.max(0, target.offsetTop - 16);
      }
    });
  });
}

// ── Build one event card HTML ─────────────────────────────────────────────────
function buildEventCard(e) {
  const d        = eventStartDate(e);
  const isAllDay = !!e.start.date;
  const dateStr  = eventDateStr(e);

  const dayNum  = d.getDate();
  const monthSh = d.toLocaleDateString('en-GB', { month: 'short' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });

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

  // Extract "Register here: <url>" (handles URL on same line or next line)
  let registerUrl = null;
  let descCleaned = e.description || '';
  const registerMatch = descCleaned.match(/register here\s*:\s*(https?:\/\/\S+)/i);
  if (registerMatch) {
    registerUrl = registerMatch[1];
    descCleaned = descCleaned
      .replace(/register here\s*:\s*https?:\/\/\S+[ \t]*(\r?\n)?/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const descHtml = descCleaned
    ? `<p class="event-desc">${esc(descCleaned).replace(/\n/g, '<br>')}</p>`
    : '';

  const isPast = eventDateStr(e) < todayStr();
  const registerHtml = registerUrl
    ? isPast
      ? `<span class="event-register-btn event-register-btn--disabled">Registration closed</span>`
      : `<a href="${esc(registerUrl)}" target="_blank" rel="noopener noreferrer" class="event-register-btn">Register</a>`
    : '';

  return `<div class="event-card" data-date="${dateStr}">` +
    `<div class="event-badge">` +
      `<span class="event-badge-day">${dayNum}</span>` +
      `<span class="event-badge-month">${monthSh}</span>` +
      `<span class="event-badge-weekday">${weekday}</span>` +
    `</div>` +
    `<div class="event-info">` +
      `<h4 class="event-title">${esc(e.summary || 'Untitled')}</h4>` +
      timeHtml + locationHtml + descHtml + registerHtml +
    `</div>` +
  `</div>`;
}

// ── Event List ────────────────────────────────────────────────────────────────
function renderEventList(events) {
  const container = document.getElementById('cal-events-list');
  const today     = todayStr();

  if (!events.length) {
    container.innerHTML = '<p class="cal-empty">No events found.</p>';
    return;
  }

  const past     = events.filter(e => eventDateStr(e) <  today);
  const upcoming = events.filter(e => eventDateStr(e) >= today);

  // Helper: group an array of events into a Map keyed by "Month YYYY"
  function groupByMonth(evts) {
    const groups = new Map();
    for (const e of evts) {
      const key = eventStartDate(e).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    return groups;
  }

  function renderGroups(groups) {
    let html = '';
    for (const [label, evts] of groups) {
      html += `<h3 class="cal-group-heading">${label}</h3>`;
      for (const e of evts) html += buildEventCard(e);
    }
    return html;
  }

  let html = renderGroups(groupByMonth(past));

  // Divider — only shown visually when there are past events
  html += `<div id="cal-upcoming-marker" class="cal-divider${past.length ? '' : ' cal-divider--hidden'}">` +
    `<span>Upcoming</span></div>`;

  if (upcoming.length) {
    html += renderGroups(groupByMonth(upcoming));
  } else {
    html += '<p class="cal-empty">No upcoming events.</p>';
  }

  container.innerHTML = html;
}

// ── Scroll the events panel to the upcoming divider ───────────────────────────
function scrollToUpcoming() {
  const wrapper = document.querySelector('.cal-events-wrapper');
  const marker  = document.getElementById('cal-upcoming-marker');
  if (!marker || !wrapper) return;
  wrapper.scrollTop = Math.max(0, marker.offsetTop - 16);
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
  document.getElementById('cal-today').addEventListener('click', () => {
    viewMonth = new Date();
    viewMonth.setDate(1);
    viewMonth.setHours(0, 0, 0, 0);
    renderGrid(allEvents);
    scrollToUpcoming();
  });

  renderGrid([]);
  document.getElementById('cal-events-list').innerHTML =
    '<p class="cal-loading">Loading events\u2026</p>';

  fetchEvents()
    .then(events => {
      allEvents = events;
      renderGrid(events);
      renderEventList(events);
      scrollToUpcoming();
    })
    .catch(err => {
      console.error('Calendar error:', err);
      document.getElementById('cal-events-list').innerHTML =
        '<p class="cal-error">Could not load events. Please try again later.</p>';
    });
}

init();
