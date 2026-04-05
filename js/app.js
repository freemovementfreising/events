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
  const leadBlanks  = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = todayStr();

  let html = '';
  for (let i = 0; i < leadBlanks; i++) html += '<div class="cal-day cal-day--empty"></div>';

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

  document.querySelectorAll('.cal-day--has-event').forEach(el => {
    el.addEventListener('click', () => {
      const wrapper = document.querySelector('.cal-events-wrapper');
      const target  = document.querySelector(`.event-card[data-date="${el.dataset.date}"]`);
      if (target && wrapper) wrapper.scrollTop = Math.max(0, target.offsetTop - 16);
    });
  });
}

// ── Build one event card ───────────────────────────────────────────────────────
function buildEventCard(e) {
  const d        = eventStartDate(e);
  const isAllDay = !!e.start.date;
  const dateStr  = eventDateStr(e);
  const isPast   = dateStr < todayStr();

  // ── Detect multi-day span ─────────────────────────────────────────────────────
  let endIncl = null;
  if (isAllDay && e.end?.date) {
    const endExcl = new Date(e.end.date + 'T00:00:00');
    const candidate = new Date(endExcl);
    candidate.setDate(candidate.getDate() - 1);
    if (candidate > d) endIncl = candidate; // truly spans multiple days
  } else if (!isAllDay && e.end?.dateTime) {
    const endDt = new Date(e.end.dateTime);
    // Different calendar date = multi-day timed event
    if (endDt.getFullYear() !== d.getFullYear() ||
        endDt.getMonth()    !== d.getMonth()    ||
        endDt.getDate()     !== d.getDate()) {
      endIncl = endDt;
    }
  }
  const isMultiDay = endIncl !== null;

  // ── Date badge ────────────────────────────────────────────────────────────────
  let badgeHtml;
  if (isMultiDay) {
    const endDay     = endIncl.getDate();
    const endMonthSh = endIncl.toLocaleDateString('en-GB', { month: 'short' });
    const sameMonth  = endIncl.getMonth()    === d.getMonth() &&
                       endIncl.getFullYear() === d.getFullYear();
    if (sameMonth) {
      badgeHtml =
        `<span class="event-badge-day-range">${d.getDate()}\u2013${endDay}</span>` +
        `<span class="event-badge-month">${endMonthSh}</span>`;
    } else {
      badgeHtml =
        `<span class="event-badge-range">${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}</span>` +
        `<span class="event-badge-range-arrow">\u2192</span>` +
        `<span class="event-badge-range">${endDay} ${endMonthSh}</span>`;
    }
  } else {
    badgeHtml =
      `<span class="event-badge-day">${d.getDate()}</span>` +
      `<span class="event-badge-month">${d.toLocaleDateString('en-GB', { month: 'short' })}</span>` +
      `<span class="event-badge-weekday">${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>`;
  }

  // ── Date range line shown in event details for multi-day events ───────────────
  let dateRangeHtml = '';
  if (isMultiDay) {
    const fmt      = { day: 'numeric', month: 'long', year: 'numeric' };
    const startFmt = d.toLocaleDateString('en-GB', fmt);
    const endFmt   = endIncl.toLocaleDateString('en-GB', fmt);
    dateRangeHtml  = `<p class="event-meta"><span class="event-icon">&#128197;</span>${startFmt} \u2013 ${endFmt}</p>`;
  }

  // ── Time ──────────────────────────────────────────────────────────────────────
  let timeHtml = '';
  if (!isAllDay) {
    let timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (e.end?.dateTime) {
      timeStr += '\u2013' + new Date(e.end.dateTime)
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    timeHtml = `<p class="event-meta"><span class="event-icon">&#128336;</span>${timeStr}</p>`;
  }

  // ── Location (clickable Maps link) ────────────────────────────────────────────
  const locationHtml = e.location
    ? `<p class="event-meta"><span class="event-icon">&#128205;</span>` +
      `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}" ` +
      `target="_blank" rel="noopener noreferrer" class="event-location-link">${esc(e.location)}</a></p>`
    : '';

  // ── Structured fields (from proposals script) vs raw description fallback ─────
  let roomHtml = '', arrivalHtml = '', organizersHtml = '',
      descHtml = '', bringHtml = '', registerUrl = null;

  if (e.room || e.arrivalTime || e.organizers || e.whatToDo || e.thingsToBring || e.registerUrl) {
    // Structured event from proposals form
    if (e.room)
      roomHtml      = `<p class="event-meta"><span class="event-icon">&#128682;</span>${esc(e.room)}</p>`;
    if (e.arrivalTime)
      arrivalHtml   = `<p class="event-meta"><span class="event-icon">&#9201;</span>Arrive by ${esc(e.arrivalTime)}</p>`;
    if (e.organizers)
      organizersHtml = `<p class="event-meta event-meta--organizers"><span class="event-icon">&#128101;</span>${esc(e.organizers)}</p>`;
    if (e.whatToDo)
      descHtml      = `<p class="event-desc">${esc(e.whatToDo).replace(/\n/g, '<br>')}</p>`;
    if (e.thingsToBring)
      bringHtml     = `<p class="event-bring"><span class="event-bring-label">&#127890; Things to bring</span><br>${esc(e.thingsToBring).replace(/\n/g, '<br>')}</p>`;
    registerUrl = e.registerUrl || null;

  } else if (e.description) {
    // Manually created event — fall back to parsing raw description
    let descCleaned = e.description;
    const m = descCleaned.match(/register here\s*:\s*(https?:\/\/\S+)/i);
    if (m) {
      registerUrl = m[1];
      descCleaned = descCleaned
        .replace(/register here\s*:\s*https?:\/\/\S+[ \t]*(\r?\n)?/i, '')
        .split('\n').filter(line => /\p{L}/u.test(line)).join('\n')
        .replace(/\n{3,}/g, '\n\n').trim();
    }
    if (descCleaned)
      descHtml = `<p class="event-desc">${esc(descCleaned).replace(/\n/g, '<br>')}</p>`;
  }

  // ── Register button ───────────────────────────────────────────────────────────
  const registerHtml = registerUrl
    ? isPast
      ? `<span class="event-register-btn event-register-btn--disabled">Registration closed</span>`
      : `<a href="${esc(registerUrl)}" target="_blank" rel="noopener noreferrer" class="event-register-btn">Register</a>`
    : '';

  return `<div class="event-card" data-date="${dateStr}">` +
    `<div class="event-badge">${badgeHtml}</div>` +
    `<div class="event-info">` +
      `<h4 class="event-title">${esc(e.summary || 'Untitled')}</h4>` +
      dateRangeHtml + timeHtml + locationHtml + roomHtml + arrivalHtml + organizersHtml +
      descHtml + bringHtml + registerHtml +
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
  html += `<div id="cal-upcoming-marker" class="cal-divider${past.length ? '' : ' cal-divider--hidden'}"><span>Upcoming</span></div>`;
  html += upcoming.length ? renderGroups(groupByMonth(upcoming)) : '<p class="cal-empty">No upcoming events.</p>';

  container.innerHTML = html;
}

// ── Scroll events panel to upcoming divider ───────────────────────────────────
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
  document.getElementById('cal-events-list').innerHTML = '<p class="cal-loading">Loading events\u2026</p>';

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
