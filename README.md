# Sesizări Sector 3 (unofficial viewer)

Live: https://sesizari-sector3.vercel.app

A static website that shows the public incident reports ("sesizări") from Primăria Sector 3's
CityCare system **with the full description and the city's reply**, both of which the official
map at https://iloves3.primarie3.ro/citycareweb/ hides.

No backend and no build step: `index.html` + `styles.css` + `app.js`. The browser calls the public API
directly (it sends `Access-Control-Allow-Origin: *`).

## Run locally

```bash
python3 -m http.server 8517
```

Then open http://localhost:8517. Any static host works (GitHub Pages, Netlify, Cloudflare Pages).

## How the source API works

Base: `https://iloves3.primarie3.ro/CityCareServicii/`. All endpoints take `application/x-www-form-urlencoded` POSTs.

| Endpoint | Params | Returns |
|---|---|---|
| `IncidentRP.aspx` | `lang=ro`, `state=A\|O\|C` (**required**), `incidentfromdate`/`incidenttodate` as `dd/mm/yyyy` (inclusive), `categorycodelist=2,27,…` (empty = all), `incidentno=CAS-…` (overrides dates), `calltype=P` | incidents (JSON array) |
| `IncidentCategoryRP.aspx` | `lang` | `[{incidentcategoryid, name, cod}]` |
| `Status.aspx` | `lang` | `[{statuscode, name}]` |

Incident fields: `incidentid, ticketnumber, infocetnumber, titlu, category, categoryid, description,
isedited, latitude, longitude, createdon ("dd.mm.yyyy HH:MM:SS"), status ("O|Deschisă. În lucru"),
resolvereason` (the city's reply, usually prefixed with `Nespecificat Registratura`).

Quirks:
- At most **1500** newest incidents per query. The app fetches 2-day windows (4 in parallel) and
  splits a window further if it still hits the cap.
- Errors come back as a bare number in the body (`9` = bad date format, `10` = missing parameter, …).
- Incidents at almost the same location are returned as nested arrays.

## Features

- Full description + city reply, status, ticket and registration numbers, "edited" flag
- Clustered map (OpenStreetMap + Leaflet), colored by outcome; list ↔ map on mobile
- Date presets (24h → 3 months) and custom range up to one year
- Diacritic-insensitive search with highlighting; exact `CAS-…` lookup outside the loaded range (press Enter)
- Category filter, "hide parking" toggle (parking reports are ~65% of all reports)
- Clickable stats: totals, % resolved/rejected, % with a public reply
- Detail view: mini map, approximate address (Nominatim), nearby reports within 75 m, shareable link
- Filters stored in the URL hash, so views can be shared
- Light/dark mode

## Data archive (`data/`)

`scripts/collect.mjs` saves every incident into the repo so history survives and status changes can be measured.

| File | Contents |
|---|---|
| `data/incidents/YYYY-MM.json` | All incidents created that month, current state (one per line). Adds `firstSeen`, `lastChanged`, and `removedAt` if the city deletes one. |
| `data/changes/YYYY-MM.jsonl` | One line per detected change: `{at, ticket, field, from, to}` (status, reply, description, edited, category, location, removed). |
| `data/meta.json` | Last run time, stats and totals. Only rewritten when data changed. |

Each regular run refreshes the last 4 days plus one rotating 7-day slice of the 4–180 days before, so every
report from the last ~6 months is rechecked about once a day (when run hourly). Runs with no changes make no commit.

```bash
node scripts/collect.mjs                                   # regular run
node scripts/collect.mjs --from 2026-01-01 --to 2026-03-31 # backfill a range
```

### Hourly trigger (cron-job.org)

The workflow `.github/workflows/collect.yml` has no GitHub schedule; it is started from outside through the GitHub API.

1. Create a **fine-grained personal access token** at https://github.com/settings/personal-access-tokens/new
   - Repository access: *Only select repositories* → this repo
   - Permissions → Repository → **Actions: Read and write** (nothing else)
2. In cron-job.org create a job:
   - URL: `https://api.github.com/repos/<owner>/<repo>/actions/workflows/collect.yml/dispatches`
   - Schedule: every hour
   - Method: `POST`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `Content-Type: application/json`
   - Body: `{"ref":"main"}`
   - Success = HTTP `204`

Backfills can be started by hand from the repo's **Actions** tab ("Run workflow", with from/to dates).
