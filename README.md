# Fintrack 💸

**A fast, beautiful personal finance tracker built for the modern web.**

Track income and expenses across multiple accounts and currencies, set monthly budgets, visualise your spending trends, and keep your finances firmly under control — all in a real-time, offline-capable web app.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)
![InstantDB](https://img.shields.io/badge/InstantDB-realtime-8B5CF6?style=flat-square)
![Version](https://img.shields.io/badge/version-1.2.0-22C55E?style=flat-square)

---

## Features

### Core
- **Transactions** — Add, edit and delete income & expense entries with rich metadata (date, notes, recurring flag)
- **Multiple accounts** — Checking, savings, credit card, cash and investment accounts, each with its own currency
- **Categories** — Fully customisable with any emoji icon and a colour picker; 14 sensible defaults seeded automatically
- **Budgets** — Set monthly spending limits per category with live progress bars and over-budget alerts

### Smart UX
- **Description autocomplete** — Start typing a transaction description and past entries appear; pick one to auto-fill type, category, account and amount
- **Auto-categorisation** — Selecting a past description pre-populates all fields from the most recent matching transaction
- **CSV export** — Export any filtered transaction view with one click

### Dashboard insights
- **Net worth** — Real-time sum of all account balances converted to your base currency
- **Month-over-month deltas** — Arrow badges showing % change vs the previous month on every stat card
- **Spending breakdown** — Pie chart of expense categories for the current month
- **Monthly trend** — Bar chart comparing income vs expenses over the last 6 months
- **Budget alerts** — Highlights any category that has reached ≥80% of its monthly budget
- **Recurring transactions** — Surfaces your active recurring items at a glance

### Settings
- **Base currency** — Choose AED, GBP, USD or EUR; all net worth figures are auto-converted via live exchange rates
- **Live exchange rates** — Fetched from the Open Exchange Rates API, cached for 1 hour, with graceful fallback
- **Light / Dark mode** — Toggle with a single click; preference persisted across sessions
- **Restore default categories** — Re-add any missing defaults without touching existing ones

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev) + [Vite 7](https://vite.dev) |
| Language | TypeScript 5 |
| Database | [InstantDB](https://instantdb.com) — real-time, schemaless |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) (dark mode via `class` strategy) |
| Routing | [React Router 6](https://reactrouter.com) |
| Charts | [Recharts 3](https://recharts.org) |
| Icons | [Lucide React](https://lucide.dev) |
| Emoji picker | [emoji-mart](https://github.com/missive/emoji-mart) |
| Date utilities | [date-fns](https://date-fns.org) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [InstantDB](https://instantdb.com) account and App ID (free tier is fine)

### 1. Clone and install

```bash
git clone https://github.com/your-username/fintrack.git
cd fintrack
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_INSTANT_APP_ID=your-instantdb-app-id
```

You can create a new InstantDB app at [instantdb.com/dash](https://instantdb.com/dash). No schema configuration is needed — the app uses a schemaless setup.

### 3. Run in development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx              # App shell, sidebar nav, mobile topbar
│   └── modals/
│       ├── AccountModal.tsx    # Create / edit accounts
│       ├── CategoryModal.tsx   # Create / edit categories (emoji picker)
│       ├── ConfirmModal.tsx    # Generic confirmation dialog
│       └── TransactionModal.tsx # Create / edit transactions (autocomplete)
├── context/
│   └── SettingsContext.tsx     # Theme + base currency, persisted to localStorage
├── hooks/
│   ├── useExchangeRates.ts     # Live FX rates with 1-hour cache + fallback
│   └── useSeedCategories.ts    # Seeds default categories once on first load
├── pages/
│   ├── Dashboard.tsx           # Net worth, charts, alerts, recurring widget
│   ├── Transactions.tsx        # Full transaction list with filters + CSV export
│   ├── Accounts.tsx            # Account list + balances
│   ├── Categories.tsx          # Category management
│   ├── Budgets.tsx             # Monthly budget setting + progress
│   └── Settings.tsx            # Theme, currency, exchange rates, data tools
├── utils/
│   ├── calculations.ts         # Account balances, category breakdowns
│   ├── currency.ts             # formatCurrency helper
│   ├── dates.ts                # Date formatting and range helpers
│   └── export.ts               # CSV export
├── db.ts                       # InstantDB client + schema definition
├── types.ts                    # TypeScript interfaces + shared constants
└── App.tsx                     # Router setup
```

---

## Configuration

### Currencies

Supported base currencies (configurable in Settings):

| Code | Currency |
|---|---|
| AED | UAE Dirham (default) |
| GBP | British Pound |
| USD | US Dollar |
| EUR | Euro |

Exchange rates are fetched from `open.er-api.com` and cached in `localStorage` for 1 hour. Fallback rates are used if the network request fails.

### Default Categories

On first load, 14 categories are created automatically:

**Expense:** Housing, Groceries, Dining Out, Transport, Utilities, Phone & Internet, Entertainment, Shopping, Health, Travel

**Income:** Salary, Freelance, Investments

**Both:** Transfer

Use **Settings → Restore default categories** to re-add any that were deleted, without touching existing ones.

---

## Roadmap

- [ ] Mobile app (React Native / Expo)
- [ ] Bank import via CSV / OFX
- [ ] Recurring transaction auto-posting
- [ ] Custom date range for charts
- [ ] Multi-user / shared household budgets
- [ ] Savings goals tracker

---

## License

MIT — do whatever you like with it.

---

> Built with React 19, InstantDB, and Tailwind CSS. Designed to be fast, private, and genuinely useful.
