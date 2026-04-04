# CLAUDE.md — Dancing Group Website (GitHub Pages + Google Calendar)

## Project Overview

This repository contains a static website hosted via GitHub Pages.

The purpose of the site:

* Present our dancing group
* Provide a clear and maintainable event calendar
* Keep everything simple, fast, and editable by non-developers

The site must remain fully static (no backend).

---

## System Architecture

The event management system consists of several connected parts:

```
[Public Website]
    |
    |-- Reads events from --> [Public Google Calendar]
    |-- Links to -----------> [Google Form: Propose Event]
    |-- Links to -----------> [Google Form: Subscribe to Event]

[Google Form: Propose Event]
    |-- Auto-submits to --> [Private Google Sheet: Event Proposals]
                                    |
                            [Google Apps Script]  <-- triggered on new row
                                    |
                                    v
                            [Admin-Only Google Calendar: Proposals]
                                    |
                            Admins review & edit events directly
                            in the calendar UI (no sheet needed)
                                    |
                            Admin moves event to [Public Google Calendar]
                            (by changing which calendar it belongs to)

[Google Form: Subscribe to Event]
    |-- Submits to --> [Private Google Sheet: Subscriptions]
                            |
                       [Admin access only]
```

### Key Principle

The website is read-only and link-based. All data entry and management happens outside the website, via Google Forms, Sheets, Apps Script, and Google Calendar. The website never writes data.

### Admin Workflow (Event Proposals)

1. A proposal form submission automatically lands in the private Sheet
2. An Apps Script trigger fires and creates the event in the **admin-only proposals calendar**
3. Admins work entirely within Google Calendar — they review the event, make any edits directly there
4. To publish: the admin moves the event from the proposals calendar to the **public calendar** (via "Change calendar" in the event editor)
5. To reject: the admin simply deletes the event from the proposals calendar

---

## Core Feature: Event Calendar

The calendar on the website:

* Reads events from a **public Google Calendar** via the Google Calendar API (or public iCal feed)
* Shows upcoming events
* Sorts events by date (ascending)
* Is easy to scan on mobile

---

## Data Source (CRITICAL)

Events are stored in and served from a **public Google Calendar**.

### How events get onto the calendar:

1. Someone fills in the **Propose Event** Google Form
2. Their submission lands in a **private Google Sheet** (admins only)
3. Admins review each row and set a status: `approved`, `denied`, or `pending`
4. A **Google Apps Script** runs on a trigger and:
   - Adds newly approved events to the public Google Calendar
   - Updates calendar events when the sheet row is edited
   - Removes calendar events when a row is deleted or marked `denied`

### Rules:

* Do NOT hardcode events in HTML
* Do NOT use a local YAML or JSON file as the calendar source
* Always fetch events from the Google Calendar (API or iCal)
* The Google Calendar ID and any API keys/config values must be stored in a config file or as constants in the JS — never hardcoded inline across multiple places

---

## Google Calendar Integration (IMPORTANT)

Because this is a static site, calendar data must be fetched client-side.

### Options (in order of preference):

1. **Public iCal feed** — fetch the `.ics` URL from the Google Calendar, parse it in the browser (no API key needed)
2. **Google Calendar API** — use the public calendar's API endpoint with an API key (read-only, no auth needed for public calendars)

### Requirements:

* Do NOT require user login or OAuth
* Do NOT create a backend proxy
* Do NOT introduce a build step
* Use a small CDN library if needed for iCal parsing (e.g., `ical.js`)

### Expected approach (iCal):

1. Fetch the public iCal URL
2. Parse with `ical.js` (or equivalent)
3. Convert into JavaScript objects
4. Filter to upcoming events only
5. Sort by date (ascending)
6. Render to the DOM

### Expected approach (API):

1. Fetch from `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` with API key
2. Filter to upcoming events (`timeMin` = now)
3. Sort by start time
4. Render to the DOM

---

## Google Forms

The website contains two links (not embedded forms — just links):

### 1. Propose an Event

* A link to a public Google Form where anyone can suggest a new event
* The form collects: title, date, time, location, description, organizer name/contact, etc.
* Responses go to a **private Google Sheet** visible only to admins

### 2. Subscribe to an Event

* A link to a public Google Form where someone can express interest in attending an event
* The form collects: name, contact info, which event
* Responses go to a **private Google Sheet** visible only to admins

### Rules:

* Store the form URLs as constants in the JS or as `data-` attributes in the HTML — never scattered inline
* Do not embed the forms as iframes unless explicitly requested

---

## Google Apps Script (Out of Scope for Website Code)

The Apps Script lives in Google Sheets, not this repository. Document its expected behavior here for reference:

* Trigger: `onFormSubmit` — fires automatically when a new proposal row is added
* Reads the new row from the Event Proposals sheet
* Creates an event in the **admin-only proposals calendar** with all submitted details
* Writes the resulting calendar event ID back into the sheet row (for traceability)

### What the script does NOT do:

* It does not touch the public calendar — that is the admin's manual action
* It does not poll for updates or deletions — once the event is in the proposals calendar, admins own it

### Admin action (no script needed):

* **Approve**: open the event in the proposals calendar → "More options" → change the calendar to the public one → save
* **Reject**: delete the event from the proposals calendar

This script is maintained separately. The website only consumes the resulting public calendar.

---

## Tech Constraints

This is a lightweight static site.

### Allowed:

* HTML
* CSS
* Vanilla JavaScript

### Allowed (with care):

* Small CDN libraries (e.g., `ical.js` for iCal parsing)
* Google Calendar public API (read-only, no auth)

### NOT allowed (unless explicitly approved):

* React / Vue / Angular
* Build tools (Webpack, Vite, etc.)
* Backend services
* Databases
* OAuth or any user login

---

## File Structure

Keep the project organized:

* `/index.html` → main page
* `/css/` → styles
* `/js/` → JavaScript
* `/config.js` (or similar) → calendar ID, form URLs, and other config constants

Do not reorganize the structure unless asked.

---

## Calendar Implementation Guidelines

When implementing or modifying the calendar:

1. Fetch events from the public Google Calendar (iCal or API)
2. Validate/filter to upcoming events only
3. Sort events by date (ascending)
4. Render into a dedicated container

### Rendering rules:

* Show date clearly
* Show title prominently
* Show location and time
* Show description if present
* Handle empty state (e.g., "No upcoming events")
* Handle fetch failure gracefully (e.g., "Could not load events")

---

## UI / UX Guidelines

* Clean and minimal design
* Mobile-first (responsive)
* Readable typography
* Avoid visual clutter
* The "Propose Event" and "Subscribe" links should be clearly visible

### Nice-to-have (only if simple):

* Group events by month
* Highlight next upcoming event

---

## Safety & Development Rules

### DO:

* Make small, incremental changes
* Follow existing code style
* Keep things simple and readable
* Explain changes before applying them

### DO NOT:

* Do not rewrite the entire project
* Do not introduce complex frameworks
* Do not install dependencies without approval
* Do not delete or overwrite unrelated files
* Do not break existing layout or content

---

## Error Handling

* Gracefully handle:

  * Google Calendar unreachable or rate-limited
  * Invalid or empty calendar response
  * Empty event list

* Never crash the page

* Log helpful errors in console

---

## Testing Requirements

Before finishing any task:

* Open site locally (file:// or simple server)
* Ensure:

  * No console errors
  * Events render correctly (or empty state shows)
  * Layout works on mobile
  * Form links open correctly

---

## Optional Features (Only When Requested)

* Month grouping
* Event filtering
* Calendar grid view
* ICS download support
* Embedded Google Form (instead of link)

---

## Communication Instructions

When working on this project:

* First explain what you plan to do
* Then implement step-by-step
* Ask before making major structural or design changes
* Prefer safe, reversible changes

---

## Guiding Principle

Keep it:

* Simple
* Static
* Maintainable by non-developers

This is more important than adding advanced features.
