const today = new Date();
today.setHours(0, 0, 0, 0);

let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let allEvents = [];

// ── Load & bootstrap ────────────────────────────────────────────────────────

async function loadEvents() {
  try {
    const res = await fetch('data/events.yaml');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const raw = jsyaml.load(text);

    if (!Array.isArray(raw)) throw new Error('events.yaml must be a list');

    allEvents = raw
      .filter(e => e && e.date)
      .map(e => {
        // js-yaml may parse YAML dates as JS Date objects already
        const d = e.date instanceof Date
          ? new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate())
          : new Date(String(e.date) + 'T00:00:00');
        return { ...e, dateObj: d };
      })
      .sort((a, b) => a.dateObj - b.dateObj);

  } catch (err) {
    console.error('Could not load events:', err);
    document.getElementById('event-list').innerHTML =
      '<p class="empty-state">Could not load events. Check the console for details.</p>';
    return;
  }

  renderCalendar();
  renderUpcomingList();
  renderPastList();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the number of days between a date and today (negative = past).
 * @param {Date} dateObj
 * @returns {number}
 */
function daysDiff(dateObj) {
  return Math.round((dateObj - today) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Date as a readable string, e.g. "Friday, 27 March 2026".
 * @param {Date} dateObj
 * @returns {string}
 */
function formatDate(dateObj) {
  return dateObj.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/**
 * Builds a time string from meet/start/end fields.
 * @param {object} event
 * @returns {string}
 */
function buildTimeString(event) {
  const parts = [];
  if (event.meet_time) parts.push(`Meet: ${event.meet_time}`);
  const range = [event.start_time, event.end_time].filter(Boolean).join(' – ');
  if (range) parts.push(range);
  return parts.join(' · ');
}

// ── Calendar ─────────────────────────────────────────────────────────────────

function renderCalendar() {
  const label = document.getElementById('calendar-month-label');
  const grid = document.getElementById('calendar-grid');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  label.textContent = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Collect event days in this month
  const eventDates = new Set(
    allEvents
      .filter(e => e.dateObj.getFullYear() === year && e.dateObj.getMonth() === month)
      .map(e => e.dateObj.getDate())
  );

  // Monday-first offset
  const firstDayRaw = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDayRaw + 6) % 7;                  // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Header row
  let headerHtml = '<div class="calendar-grid-header">';
  DAY_NAMES.forEach(d => { headerHtml += `<div class="cal-day-name">${d}</div>`; });
  headerHtml += '</div>';

  // Body
  let bodyHtml = '<div class="calendar-grid-body">';
  for (let i = 0; i < offset; i++) bodyHtml += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (year === today.getFullYear() && month === today.getMonth() && d === today.getDate());
    const hasEvent = eventDates.has(d);
    let cls = 'cal-cell';
    if (isToday) cls += ' today';
    if (hasEvent) cls += ' has-event';
    const dot = hasEvent ? '<span class="event-dot"></span>' : '';
    bodyHtml += `<div class="${cls}">${d}${dot}</div>`;
  }

  bodyHtml += '</div>';
  grid.innerHTML = headerHtml + bodyHtml;
}

// ── Event cards ───────────────────────────────────────────────────────────────

/**
 * Builds the HTML for a single event card.
 * @param {object} event
 * @param {boolean} isPast
 * @param {boolean} isNextUpcoming  – marks the very next upcoming event
 * @returns {string}
 */
function buildEventCard(event, isPast, isNextUpcoming) {
  const diff = daysDiff(event.dateObj);
  const isToday = diff === 0;

  // Card class
  let cardCls = 'event-card';
  if (isToday) cardCls += ' is-today';
  else if (isNextUpcoming) cardCls += ' is-next';

  // Badge
  let badge = '';
  if (isToday) {
    badge = '<span class="badge badge-today">Today</span>';
  } else if (!isPast) {
    if (isNextUpcoming) {
      badge = `<span class="badge badge-next">Next · in ${diff} day${diff === 1 ? '' : 's'}</span>`;
    } else {
      badge = `<span class="badge badge-days">in ${diff} day${diff === 1 ? '' : 's'}</span>`;
    }
  }

  const timeStr = buildTimeString(event);

  let html = `<div class="${cardCls}">
    <div class="event-top">
      <span class="event-date-label">${formatDate(event.dateObj)}</span>
      ${badge}
    </div>
    <div class="event-title">${event.title || 'TBD'}</div>`;

  if (event.organizers && event.organizers.length) {
    const label = event.organizers.length > 1 ? 'Organizers' : 'Organizer';
    html += `<div class="event-meta"><span class="meta-icon">&#128100;</span>${label}: ${event.organizers.join(', ')}</div>`;
  }

  if (timeStr) {
    html += `<div class="event-meta"><span class="meta-icon">&#128336;</span>${timeStr}</div>`;
  }

  if (event.location) {
    html += `<div class="event-meta"><span class="meta-icon">&#128205;</span>${event.location}</div>`;
  }

  if (event.price != null && event.price !== '') {
    html += `<div class="event-meta"><span class="meta-icon">&#128176;</span>${event.price} €</div>`;
  }

  if (event.description) {
    html += `<div class="event-description">${event.description}</div>`;
  }

  if (event.things_required && event.things_required.length) {
    html += `<div class="event-things"><strong>Bring:</strong> ${event.things_required.join(', ')}</div>`;
  }

  if (event.things_optional && event.things_optional.length) {
    html += `<div class="event-things"><strong>Optional:</strong> ${event.things_optional.join(', ')}</div>`;
  }

  html += '</div>';
  return html;
}

// ── Render lists ─────────────────────────────────────────────────────────────

function renderUpcomingList() {
  const container = document.getElementById('event-list');
  const upcoming = allEvents.filter(e => daysDiff(e.dateObj) >= 0);

  if (!upcoming.length) {
    container.innerHTML = '<p class="empty-state">No upcoming events.</p>';
    return;
  }

  container.innerHTML = upcoming
    .map((e, i) => buildEventCard(e, false, i === 0))
    .join('');
}

function renderPastList() {
  const container = document.getElementById('past-event-list');
  const past = allEvents.filter(e => daysDiff(e.dateObj) < 0).reverse();

  if (!past.length) {
    container.innerHTML = '<p class="empty-state">No past events yet.</p>';
    return;
  }

  container.innerHTML = past.map(e => buildEventCard(e, true, false)).join('');
}

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Calendar navigation ───────────────────────────────────────────────────────

document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadEvents();
