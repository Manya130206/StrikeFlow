# StrikeFlow Frontend

Next.js 15 frontend for the StrikeFlow Options Analytics Platform.

## Setup

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Pages

| Route        | Description                                      |
|--------------|--------------------------------------------------|
| `/`          | Dashboard — market overview, price chart         |
| `/builder`   | Strategy Builder — legs, payoff, Greeks          |
| `/chain`     | Option Chain — OI, volume, IV per strike         |
| `/analytics` | IV Analytics — skew, surface, term structure     |
| `/scanner`   | Strategy Scanner — ranked opportunities          |
| `/positions` | Positions — portfolio Greeks and P&L             |

## Architecture

- **State**: Zustand with localStorage persistence
- **Pricing**: Client-side Black-Scholes engine (`lib/blackscholes.ts`)
- **Charts**: Recharts (payoff, OI, IV surface, price history)
- **API**: Connects to FastAPI backend; gracefully falls back to mock data
- **Theme**: Dark terminal aesthetic with green profit / red loss conventions
