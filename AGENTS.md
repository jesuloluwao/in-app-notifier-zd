# InAppNotifier — Agent Instructions

App that lets agents configure and trigger custom modal dialogs on Zendesk tickets.

## Tech stack

- Zendesk Apps Framework v2
- React 18, Vite 6
- Zendesk Garden component library
- `react-quill` for rich-text editing

## Manifest

`src/manifest.json` registers three locations under `support`:
- `ticket_sidebar`
- `new_ticket_sidebar`
- `nav_bar`

It declares no required parameters by default. Any future external API integration must be added via secure `parameters` and a corresponding `domainWhitelist` entry; both are supplied at install time in the Zendesk admin UI — never hardcode secrets in source.

## Commands

From the repo root:

```bash
npm install
npm start               # zcli dev server, default port 4567
npm run dev             # Vite HMR on port 3000 (for iframe-less iteration)
npm run watch           # vite build --watch --mode development
npm run build           # production build to dist/
npm test                # vitest
npm run lint            # eslint, max-warnings 0
```

For concurrent dev alongside other apps: `npx zcli apps:server src --port 4567`.

## Source layout

- `src/app/locations/` — one file per Zendesk location (`TicketSideBar.jsx`, `NewTicketSideBar.jsx`, `Modal.jsx`)
- `src/app/components/` — shared UI (`RuleEditor`, `RuleList`, `RulePreview`, `TicketModal`)
- `src/app/utils/` — `customObjectStorage.js`, `conditionEvaluator.js`
- `src/app/contexts/`, `src/app/hooks/` — React plumbing

## Testing

`vitest` with `jsdom`. Prefer testing pure functions in `utils/` and component behaviour via `@testing-library/react`.

## Gotchas

- `manifest.json` uses `"url": "http://localhost:3000/index.html"` for dev. Marketplace builds must rewrite these to `"assets/index.html"` — tracked in a separate spec.
- `"private": true` in the manifest is the dev-install flag; it must be removed/false for marketplace.
- `domainWhitelist` is empty by default. Any new external host must be added here AND the app must be re-installed for `client.request()` to reach it.
