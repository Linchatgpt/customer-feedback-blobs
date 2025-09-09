# Netlify Feedback + Blobs (MVP)

Minimal feedback form + Netlify Functions writing to **Netlify Blobs**.

## Quick Start
1) Install deps (optional for local dev)
```
npm install
netlify dev
```
2) Connect repo to Netlify
- Publish directory: `public`
- Functions directory: `functions`

3) (Optional) Environment variables
- `BLOBS_STORE` (default: `customer-feedback`)
- `ADMIN_KEY` (for `feedback-list` API)

4) Deploy
```
netlify deploy --prod
```

## APIs
- `POST /.netlify/functions/feedback-submit`
- `GET  /.netlify/functions/feedback-list` with header `x-admin-key: <ADMIN_KEY>`


## Admin UI
- Open `/admin.html`
- Paste `ADMIN_KEY` then click **載入資料**
- Filter by keyword/category/rating, and **匯出 CSV**
