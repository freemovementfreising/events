# CLAUDE.md — Dancing Group Website (GitHub Pages + YAML Calendar)

## Project Overview

This repository contains a static website hosted via GitHub Pages.

The purpose of the site:

* Present our dancing group
* Provide a clear and maintainable event calendar
* Keep everything simple, fast, and editable by non-developers

The site must remain fully static (no backend).

---

## Core Feature: Event Calendar

We maintain a list of dance events and display them on the website.

Each event includes:

* Title
* Date
* Time
* Location
* Optional description

The calendar should:

* Show upcoming events
* Sort events by date (ascending)
* Be easy to scan on mobile
* Be easy to maintain via a YAML file

---

## Data Source (CRITICAL)

All events are stored in:

/data/events.yaml

### Example format:

```yaml
- title: Salsa Night
  date: 2026-04-10
  organizers:
    - Anna
    - Ben
  meet_time: "18:45"
  start_time: "19:00"
  end_time: "22:00"
  location: Community Hall
  description: Beginner-friendly social dance
  price: 5
  things_required:
    - Water bottle
  things_optional:
    - Comfortable shoes
```

### Rules:

* Always use this structure
* Do NOT hardcode events in HTML
* Always read from the YAML file
* Dates must be in ISO format: YYYY-MM-DD
* Times must be strings in HH:MM format
* `organizers` is a list of names (can be one or many)
* `things_required` and `things_optional` are separate lists (can be empty or omitted)
* `meet_time`, `end_time`, `description`, `price`, `things_required`, and `things_optional` are optional
* `price` must be a plain number (e.g. `5`), no currency symbol or text

---

## YAML Parsing (IMPORTANT)

Because this is a static site, YAML must be parsed in the browser.

### Requirements:

* Use `js-yaml` via CDN
* Do NOT create a custom parser
* Do NOT introduce a build step

### Expected approach:

1. Fetch `/data/events.yaml`
2. Parse with `js-yaml`
3. Convert into JavaScript objects
4. Render to the DOM

---

## Tech Constraints

This is a lightweight static site.

### Allowed:

* HTML
* CSS
* Vanilla JavaScript

### Allowed (with care):

* Small CDN libraries (like js-yaml)

### NOT allowed (unless explicitly approved):

* React / Vue / Angular
* Build tools (Webpack, Vite, etc.)
* Backend services
* Databases

---

## File Structure

Keep the project organized:

* `/index.html` → main page
* `/css/` → styles
* `/js/` → JavaScript
* `/data/` → YAML data files

Do not reorganize the structure unless asked.

---

## Calendar Implementation Guidelines

When implementing or modifying the calendar:

1. Load events from `/data/events.yaml`
2. Parse YAML using js-yaml
3. Validate data (basic checks)
4. Sort events by date (ascending)
5. Render into a dedicated container

### Rendering rules:

* Show date clearly
* Show title prominently
* Show location and time
* Show description if present
* Handle empty state (e.g., "No upcoming events")

---

## UI / UX Guidelines

* Clean and minimal design
* Mobile-first (responsive)
* Readable typography
* Avoid visual clutter

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

  * Missing YAML file
  * Invalid YAML format
  * Empty event list

* Never crash the page

* Log helpful errors in console

---

## Testing Requirements

Before finishing any task:

* Open site locally (file:// or simple server)
* Ensure:

  * No console errors
  * Events render correctly
  * Layout works on mobile
  * YAML changes reflect correctly

---

## Optional Features (Only When Requested)

* Month grouping
* Event filtering
* Calendar grid view
* Google Calendar integration
* ICS download support

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
