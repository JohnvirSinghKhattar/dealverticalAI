# DealVertical AI

Real estate Exposé analysis SaaS for the **Cursor AI Hackathon Hamburg 2026**.

Private investors upload German Exposé PDFs and receive institutional-style reports: financial analysis, pros/cons, and neighborhood intel (local news with sentiment analysis).

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Nuxt 3 | Full-stack Vue.js framework with SSR |
| **Styling** | TailwindCSS | Utility-first CSS via `@nuxtjs/tailwindcss` |
| **Database** | Turso (LibSQL) | Serverless SQLite-compatible database |
| **ORM** | Drizzle ORM | Type-safe SQL with `drizzle-orm/libsql` |
| **PDF Analysis** | Manus.im API | AI-powered document analysis |
| **News** | NewsAPI | Local news with sentiment classification |
| **Geocoding** | Nominatim (OSM) | Free address-to-coordinates lookup |
| **PDF Export** | jsPDF + jspdf-autotable | Client-side report PDF generation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Nuxt 3 Frontend                         │
│  pages/upload.vue → pages/report/[id].vue → pages/dashboard │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Nuxt Server (Nitro)                       │
│  server/api/upload.post.ts                                  │
│  server/api/analyses/[id]/run.post.ts                       │
│  server/api/analyses/[id]/poll.get.ts                       │
└─────────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
    ┌─────────┐   ┌──────────┐    ┌───────────┐
    │  Turso  │   │  Manus   │    │  NewsAPI  │
    │   DB    │   │   API    │    │           │
    └─────────┘   └──────────┘    └───────────┘
```

---

## Database Schema (Drizzle + Turso)

```typescript
// server/db/schema.ts
analyses: {
  id: integer (PK, auto-increment)
  address: text (nullable)
  fileName: text (required)
  fileData: text (PDF as base64)
  manusTaskId: text (nullable)
  status: text ('uploaded' | 'processing' | 'completed' | 'failed')
  resultJson: text (Manus analysis result)
  neighborhoodJson: text (news data)
  createdAt: timestamp
}
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### Required Environment Variables

```env
# Turso Database (required)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Manus API (required for analysis)
NUXT_MANUS_API_KEY=your-manus-api-key

# NewsAPI (optional, for neighborhood news)
NUXT_NEWS_API_KEY=your-newsapi-key
```

### Run Development Server

```bash
npm run dev
```

### Try with Sample Data

The upload page includes sample data for testing:
1. Download the sample exposé PDF (button on upload page)
2. Click "Use Sample Address" to fill in: `Finkenschlag 13-15, 21109 Hamburg`
3. Upload the PDF and start analysis

---

## Project Structure

```
├── pages/
│   ├── index.vue          # Landing page
│   ├── upload.vue         # PDF upload + address input
│   ├── dashboard.vue      # List of analyses
│   └── report/[id].vue    # Analysis report view
├── server/
│   ├── api/
│   │   ├── upload.post.ts           # Handle PDF upload
│   │   ├── health.get.ts            # Health check
│   │   └── analyses/
│   │       ├── index.get.ts         # List analyses
│   │       └── [id]/
│   │           ├── index.get.ts     # Get single analysis
│   │           ├── run.post.ts      # Trigger Manus analysis
│   │           └── poll.get.ts      # Poll for completion
│   ├── db/
│   │   ├── index.ts                 # Drizzle + Turso client
│   │   └── schema.ts                # Database schema
│   ├── plugins/
│   │   └── db-init.ts               # Auto-create tables
│   └── utils/
│       ├── manus.ts                 # Manus API client
│       ├── news.ts                  # NewsAPI client
│       └── geocode.ts               # Nominatim geocoding
├── public/
│   └── SAMPLE-EXPOSE.pdf            # Sample PDF for testing
└── assets/
    └── SAMPLE-EXPOSE.pdf            # Source sample file
```

---

## Current Features 

- [x] **PDF Upload** – Upload German property exposés (max 10 MB)
- [x] **AI Analysis (Manus)** – Extract financials, pros/cons, investment recommendation
- [x] **Structured Report** – Property details, financial KPIs, risk assessment
- [x] **Local News** – Fetch regional news with sentiment classification (positive/negative/neutral)
- [x] **Geocoding** – Address to coordinates via Nominatim
- [x] **PDF Export** – Download analysis as PDF report
- [x] **Dashboard** – View all past analyses
- [x] **Sample Data** – Try the app with included sample exposé

---

## Roadmap: Institutional-Level KPIs 

The following APIs and data sources could enhance the analysis to institutional investor standards:

### Market & Valuation Data
- [ ] **Immobilienscout24 API** – Comparable listings, price trends, days-on-market
- [ ] **Sprengnetter / vdp** – Official property valuations, price indices
- [ ] **Europace / Interhyp** – Mortgage rates, financing conditions
- [ ] **Bulwiengesa** – Commercial real estate market data

### Demographic & Economic Indicators
- [ ] **Destatis (Federal Statistics)** – Population growth, age distribution, migration
- [ ] **Bundesagentur für Arbeit** – Unemployment rates, job market data
- [ ] **GfK Purchasing Power** – Regional purchasing power indices
- [ ] **INKAR (BBSR)** – Infrastructure, accessibility, regional development

### Risk & Location Intelligence
- [ ] **PKS Crime Statistics** – Police crime statistics by region (BKA/LKA)
- [ ] **Flood Risk Maps** – ZÜRS (Zonierungssystem für Überschwemmung)
- [ ] **Environmental Data** – Air quality, noise pollution (UBA)
- [ ] **School Quality Ratings** – Education rankings by district

### Infrastructure & Development
- [ ] **OpenStreetMap Overpass** – POIs, amenities, transport links
- [ ] **Deutsche Bahn API** – Public transport connectivity scores
- [ ] **Building Permits Data** – New construction activity in area
- [ ] **Urban Development Plans** – Bebauungspläne, zoning changes

### Financial Metrics to Add
- [ ] **Cap Rate Benchmarks** – Compare to market averages
- [ ] **DCF Analysis** – Discounted cash flow projections
- [ ] **Sensitivity Analysis** – Interest rate / vacancy scenarios
- [ ] **Comparable Transaction Data** – Recent sales in area

---

## API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| Turso | Database | [turso.tech](https://turso.tech) |
| Manus | PDF Analysis | [open.manus.im](https://open.manus.im/docs) |
| NewsAPI | Local News | [newsapi.org](https://newsapi.org) |

---

## License

MIT – Built for Cursor AI Hackathon Hamburg 2026
