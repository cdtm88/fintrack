# Fintrack — Personal Finance Tracker

A fast, multi-currency personal finance app built with React 19, InstantDB, and Tailwind CSS. Track accounts, transactions, budgets and investments across AED, GBP, USD and EUR with live exchange rates.

---

## Features

- **Multiple accounts** — Checking, savings, credit cards, cash and investment accounts
- **Multi-currency** — AED, GBP, USD and EUR with live rates from [open.er-api.com](https://open.er-api.com)
- **Transactions** — Income, expenses and transfers with categories and recurring support
- **Budgets** — Monthly spending limits per category with progress tracking and alerts
- **Investments** — Stocks, ETFs, crypto and funds with live prices via Yahoo Finance and CoinGecko
- **Dashboard** — Net worth, spending charts, category breakdown and budget alerts
- **Smart autocomplete** — Fills amount, category and account from your transaction history
- **Dark mode** — System-aware theme with instant toggle
- **Mobile-first** — Responsive layout, no-zoom inputs, bottom-sheet modals on touch devices

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 |
| Routing | React Router v7 |
| Database / Auth | [InstantDB](https://instantdb.com) |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Icons | Lucide React |
| Emoji picker | Emoji Mart |
| Dates | date-fns |
| Build | Vite 7 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [InstantDB](https://instantdb.com) app (free tier is sufficient)

### Setup

```bash
git clone https://github.com/cdtm88/fintrack.git
cd fintrack

# Install — legacy-peer-deps is required for @emoji-mart/react + React 19
npm install --legacy-peer-deps
```

Add your InstantDB App ID to `.env.local`:

```
VITE_INSTANT_APP_ID=your-instantdb-app-id-here
```

### Development

```bash
npm run dev
```

The dev server includes a local Yahoo Finance proxy that handles CORS and session crumb tokens for stock price lookups.

### Production build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx              # Sidebar + mobile topbar shell
│   ├── EmojiPicker.tsx         # Wrapped emoji-mart picker
│   └── modals/
│       ├── AccountModal.tsx
│       ├── CategoryModal.tsx
│       ├── ConfirmModal.tsx
│       ├── HoldingModal.tsx
│       ├── TransactionModal.tsx
│       └── TransferModal.tsx
├── context/
│   ├── SettingsContext.tsx     # Theme + base currency, persisted per user
│   └── UserContext.tsx         # Authenticated user context
├── hooks/
│   ├── useAssetPrices.ts       # Live prices: Yahoo Finance (stocks/ETFs) + CoinGecko (crypto)
│   ├── useExchangeRates.ts     # Live FX rates from open.er-api.com, cached 1 hour
│   └── useSeedCategories.ts   # One-time default category seeding on first login
├── pages/
│   ├── Accounts.tsx
│   ├── Budgets.tsx
│   ├── Categories.tsx
│   ├── Dashboard.tsx
│   ├── Investments.tsx
│   ├── Login.tsx
│   ├── Onboarding.tsx
│   ├── Settings.tsx
│   └── Transactions.tsx
├── utils/
│   ├── calculations.ts         # Account balance + category breakdown
│   ├── currency.ts             # formatCurrency helper
│   ├── dates.ts                # Date utilities and chart data generators
│   └── export.ts               # CSV export for transactions
├── App.tsx                     # Auth gate + onboarding flow
├── db.ts                       # InstantDB schema and client initialisation
├── main.tsx
└── types.ts                    # Shared interfaces, constants and default data
```

---

## Deployment (Vercel)

The `.npmrc` file sets `legacy-peer-deps=true` to resolve the `@emoji-mart/react` peer dependency conflict with React 19.

The Yahoo Finance stock proxy in `vite.config.ts` is **development-only**. In production, Yahoo Finance price lookups require a serverless function or edge route (e.g. `api/yf/[...path].ts`) to add crumb tokens and forward requests server-side.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_INSTANT_APP_ID` | Yes | Your InstantDB application ID |

---

## Changelog

### v1.3.0
- Mobile-first overhaul: bottom-sheet modals, zoom-prevention inputs, always-visible action buttons on touch
- Page headers compact on small screens — secondary buttons become icon-only
- Investment table hides low-priority columns (Qty, Price, P&L) on mobile
- Bundle code-split into vendor chunks — eliminates the >500 kB build warning
- Onboarding skipped automatically for existing accounts (e.g. new device, cleared storage)

### v1.2.0
- Investment portfolio with live prices (Yahoo Finance + CoinGecko)
- Cross-currency transfer with implied exchange rate display
- Credit card payment shortcut
- Category restore in Settings
- Recurring transaction support with weekly/monthly/yearly intervals

### v1.1.0
- Multi-currency support with live exchange rates (1-hour cache)
- Budget tracking with monthly limits, progress bars and alerts
- CSV export for filtered transactions
- Dark mode

### v1.0.0
- Initial release — accounts, transactions, categories, dashboard charts
