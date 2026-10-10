# Reliable Services — Admin & Operational Lead panel

React + Vite frontend for the admin / supervisor and operational lead (OL) panels.
The executive mobile app and the Node.js backend come next; this panel already runs
end to end against a mock API so every screen can be reviewed now.

## Run

The panel now talks to the Node backend in `reliable-api` (start that first — see its README).

```bash
npm install
npm run dev        # http://localhost:5173  (proxies /api and /uploads to http://localhost:4000)
npm run build      # production build in dist/
```

If the API runs somewhere else, set `VITE_DEV_API=http://host:port` (dev) or
`VITE_API_URL=https://api.example.com` (production build).

Logins come from the backend: the admin in `reliable-api/.env`, and after `npm run seed:demo`
the OL `kavya@reliable.in / Demo@123`. In dev the login page has quick-fill buttons for these.

## What's in it

| Screen | Admin | OL |
|---|---|---|
| Dashboard — in TAT / out of TAT / QA pending / closed, executive load, bank-wise status | ✓ | ✓ |
| New case — auto date, bank, customer, product, Local 8h / OGL 24h, one or more verifications (combined case), map link or lat/lng, from → to + km, trigger, executive per location, document uploads (min 6) | ✓ | ✓ |
| Cases — tabs (in process / pending out of TAT / QA / closed), filters by bank, type, executive, TAT, outcome, date; CSV export | ✓ | ✓ |
| Case detail — live TAT timer (red + overdue count), per-location status, reassign, findings + auto remarks, QA checklist and final status (+ve / -ve / Risk / CNV / Refer), feedback link | ✓ | ✓ |
| Final report — the 5-section bank report from the sample PDF; print / save as PDF. Combined cases produce one report | ✓ | ✓ |
| Reports — bank performance (PDF) and closed case reports | ✓ | ✓ |
| Sampling logins — executive app sessions, device, GPS, hours | ✓ | ✓ |
| Banks | add / edit | view |
| Operational leads | add / edit | — |
| Field executives | add / edit | view |
| `/feedback/:token` — public customer feedback page (no login) | | |

**Combined cases:** a case holds `legs[]` — one per verification/location, each with its own
address, map, route, km and executive. "Resi-cum-office" is the separate single-location type
from your form list (business run from the residence).

**TAT:** clock starts at case creation, stops when the last executive submits.
Local = 8h, OGL = 24h. Past the deadline the case is "Pending · out of TAT" (red, counting extra time).

**Demo buttons** on case detail ("Demo: start visit / submit visit") stand in for the
executive app; they need `ENABLE_DEMO_TOOLS=true` on the backend. Turn them off with
`DEMO_TOOLS = false` in `src/pages/CaseDetail.jsx`.

## Where to change things

- `src/config/verification.js` — verification types, executive questionnaire fields and
  dropdowns (from your form list), photo slots, outcomes, TAT hours, report reviewer name.
  The mobile app and backend should use this same structure.
- `src/utils/remarks.js` — turns executive answers into the report's remarks paragraphs.
- `src/api/index.js` — the only file that talks to the backend (fetch + JWT).

## Backend

Endpoints, roles and data rules are documented in `reliable-api/README.md`.
