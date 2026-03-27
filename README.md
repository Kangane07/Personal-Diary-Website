# Personal Diary Website

A lightweight, browser-based multi-user diary app built as a single-page static website.

## Overview

This project lets multiple local users keep diary entries in the same browser profile while keeping each user's entries separated. It supports draft and final entries, search, stats, theme switching, and JSON export.

Because it is a static app, no backend or database setup is required.

## Features

- **Multi-user profiles (local):** create, switch, and delete users.
- **Per-user journal entries:** each entry is scoped to the currently signed-in user.
- **Draft and final workflow:** save entries either as draft or final, and finalize drafts later.
- **Search support:** search finalized entries and drafts independently.
- **Entry statistics:** total final entries, draft entries, and word count.
- **Theme toggle:** light/dark mode with saved preference.
- **Local JSON export:** export current user entries to a downloadable file.
- **Local data migration:** basic migration from older v2 localStorage keys to v3 keys.

## Tech Stack

- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript
- Browser `localStorage` for persistence

## Project Structure

```text
.
├── index.html   # Complete app (HTML + CSS + JS)
├── README.md    # Project documentation
```

## Getting Started

### Prerequisites

- Any modern web browser (Chrome, Edge, Firefox, Safari)

### Run Locally

Since this is a static project, you can run it directly:

1. Clone/download the repository.
2. Open `index.html` in your browser.

Optional: serve it through a local HTTP server (recommended for consistency):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## How to Use

1. **Create a user** on the landing screen.
2. **Write an entry** in the Write tab.
3. Choose **Save as Final** or **Save as Draft**.
4. Open **Drafts** to finalize or delete draft entries.
5. Open **Home** to browse/search finalized entries.
6. Use **Export JSON** to download current user data.
7. Use **Switch User** to return to user selection.

## Data Storage

All data is stored in browser `localStorage` on the current device/profile.

Current keys used:

- `pj_users_v3`
- `pj_entries_v3`
- `pj_selected_user_v3`
- `pj_theme_v1`

Migration support exists for:

- `pj_users_v2`
- `pj_entries_v2`
- `pj_selected_user_v2`

## Limitations

- Data is local to one browser profile and device.
- Clearing browser storage removes app data.
- There is currently export support but no import UI.
- No authentication/encryption (intended for local personal use).

## Roadmap Ideas

- Split monolithic file into `styles.css` and `app.js`.
- Add JSON import with schema validation and merge/replace options.
- Add resilient storage error handling (quota/private-mode failures).
- Add linting and minimal automated tests.
