# Sesizări Sector 3 (unofficial viewer)

Live: https://sesizari-sector3.vercel.app

A website that shows the public incident reports ("sesizări") from Primăria Sector 3's CityCare system
**with the full description and the city's reply**, both of which the official map at
https://iloves3.primarie3.ro/citycareweb/ hides. Every report is archived every 15 minutes in a separate data
repository, [cristi9512/i-love-sector-3-data](https://github.com/cristi9512/i-love-sector-3-data), so the site also has
**history, time-to-close and statistics** the official site doesn't.

Static files (`index.html`, `styles.css`, `js/*.js`). The browser loads the archive straight from the data repository
(GitHub's raw file hosting). `npm run build` (run by Vercel on each deploy) copies the site to `dist/` and generates the
monthly and neighbourhood pages, their preview images, the RSS feeds and the sitemap from the archive.

## Run locally

```bash
python3 -m http.server 8517        # the app, reading the archive from GitHub
npm install && npm run build       # the generated pages, into dist/
```

Then open http://localhost:8517.

## Features

**Map & list**
- Full description, city reply, status, ticket/registration numbers, neighbourhood, "edited" and "deleted by city hall" markers
- Clustered map with the Sector 3 boundary, or a density (heat) view; list ↔ map on mobile
- Periods: 24h, 7/30 days, 3/6 months, custom range up to a year (older than the archive → live API)
- Diacritic-insensitive search with highlighting; exact `CAS-…` lookup (Enter)
- Filters: status, categories, neighbourhood, hide parking, has/has no reply, stuck (open > 7/30 days),
  edited, deleted by city hall, area around a point ("near me" or picked on the map, 100 m–1 km),
  "only what's visible on the map"; active filters shown as removable chips
- Report details: history timeline (status changes, reply, edits, deletion), time until closed,
  approximate address, nearby reports, links to Google Maps / official map / "report a problem here"
- Export the current list as CSV or JSON; every view is a shareable link (filters live in the URL)

**Insights** (follow the same filters)
- KPIs with comparison to the previous period: reports, % resolved, % rejected, still open, % with reply, median time to close
- Reports per day (or hour) by outcome, outcome by category, neighbourhood ranking, hour × weekday heatmap
- Time to close per category (median and 75th percentile) and time to first reply
- Places with repeated problems (same category ≥ 3 times within ~60 m)
- The city hall's template replies and how often each is used
- Latest changes noticed by the archive
- RSS feeds for all of Sector 3 and each neighbourhood

**Other**: Romanian / English, light / dark, installable as an app (PWA), works on phones.

Neighbourhoods are approximate: each report gets the nearest neighbourhood centre from OpenStreetMap
(`place=suburb` inside the sector boundary). The boundary comes from the official site's config.

## How the source API works

Base: `https://iloves3.primarie3.ro/CityCareServicii/`. All endpoints take `application/x-www-form-urlencoded` POSTs.

| Endpoint | Params | Returns |
|---|---|---|
| `IncidentRP.aspx` | `lang=ro`, `state=A\|O\|C` (**required**), `incidentfromdate`/`incidenttodate` as `dd/mm/yyyy` (inclusive), `categorycodelist=2,27,…` (empty = all), `incidentno=CAS-…` (overrides dates), `calltype=P` | incidents (JSON array) |
| `IncidentCategoryRP.aspx` | `lang` | `[{incidentcategoryid, name, cod}]` |
| `Status.aspx` | `lang` | `[{statuscode, name}]` |

Quirks: at most **1500** newest incidents per query (so requests are split into 2-day windows); errors come back as a
bare number (`9` bad date, `10` missing parameter); incidents at almost the same spot come back as nested arrays.
Photos attached to reports are not exposed by any public endpoint.

## Data archive

The archive and the job that fills it live in [cristi9512/i-love-sector-3-data](https://github.com/cristi9512/i-love-sector-3-data);
its README describes the files. The collector code stays here (`scripts/collect.mjs`, `scripts/recurrence.mjs`): the
data repository's workflow checks out this repository and runs it with `DATA_DIR` pointing at its own `data/` folder.

`history` entries are `[time, kind, value?]`: `s` status changed to `value`, `r` reply added/changed, `d` description
edited, `c` category changed, `x` deleted by city hall, `u` published again. Times are when the archive noticed.

Each run refreshes the last 4 days plus a rotating 7-day slice of the 4–180 days before, so every report from the
last ~6 months is rechecked about every 6 hours when run every 15 minutes. Runs with no changes make no commit.

```bash
DATA_DIR=../i-love-sector-3-data/data node scripts/collect.mjs                     # regular run into a local clone
DATA_DIR=../i-love-sector-3-data/data node scripts/collect.mjs --from 2026-01-01    # backfill a range
```

### Triggers

- **Every 15 minutes:** cron-job.org calls the data repository's workflow through the GitHub API (fine-grained token
  with *Actions: Read and write* on that repository only):
  `POST https://api.github.com/repos/cristi9512/i-love-sector-3-data/actions/workflows/collect.yml/dispatches`,
  headers `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`,
  body `{"ref":"main"}` (success = HTTP `204`). GitHub's own hourly schedule is a backup.
- **About once an hour:** the workflow calls a Vercel deploy hook (secret `VERCEL_DEPLOY_HOOK` in the data
  repository), so the site rebuilds its generated pages. Code pushes to `main` here deploy as usual.

## Removal requests

People ask for a report to be removed through the GitHub issue form (*Cerere de eliminare*, label `eliminare`), linked from the site's [Cum funcționează](https://sesizari-sector3.vercel.app/despre) page. To approve one:

1. Add the ticket number to `tickets` in `data/suppressed.json` in the [data repository](https://github.com/cristi9512/i-love-sector-3-data) and push.
2. The site hides it within minutes (also in live data from the city). The next collector run deletes it from `data/incidents/` and `data/changes/` and never stores it again.
3. Close the issue. The report is still in older commits of the git history; removing it from there would mean rewriting history.

