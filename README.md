# AEON — Frontend Control Plane

The web-based administration and governance console for **AEON (Autonomous Enterprise Operations Network)**, an AI-assisted procurement governance and payment orchestration platform.

This interface enables procurement officers, finance admins, and platform operators to govern autonomous AI agents, inspect financial transactions, configure policy rules, review multi-tier approval workflows, and orchestrate PayPal settlements.

---

## Features & Capabilities

- **Executive Analytics & KPI Dashboard:** Real-time visibility into overall enterprise spend, policy enforcement pass/block rates, active budget reservations, and pending approval queues.
- **High-Performance Transaction Ledger:** Enterprise-grade transaction grid powered by **AG Grid**, featuring real-time column sorting, multi-criteria filtering, transaction detail modals, and audit receipt generation.
- **Day 2 Operations & Human-in-the-Loop Workbench:** Review purchase requests flagged by policy engines (`REQUIRES_APPROVAL`), inspect ML supplier recommendations and risk explanations, and authorize or reject transactions with explicit audit trails.
- **Agent Governance & Credential Lifecycle:** Provision, monitor, activate, suspend, or revoke AI agents, and issue cryptographically secure API keys (`aeon_live_*`).
- **Policy Management:** Inspect active and historical procurement policies governing single-transaction thresholds, monthly category limits, supplier allowlists/blocklists, and mandatory approver tiers.
- **PayPal Sandbox Checkout & Settlement Panel:** End-to-end payment capture panel handling buyer redirect returns (`/payments/success`, `/payments/cancel`), state verification, server-to-server captures, and idempotency safeguards.
- **Dual Operating Modes:** Operates seamlessly against the live FastAPI backend or runs as a self-contained, zero-dependency browser simulation with `demo` mode.

---

## Technology Stack

- **Framework:** React 18 & TypeScript
- **Bundler & Tooling:** Vite 6
- **Styling:** Tailwind CSS & PostCSS
- **Data Grids:** AG Grid Community (`ag-grid-react`, `ag-grid-community`)
- **Visualizations:** Recharts
- **Icons:** Custom SVG Icon library
- **Deployment:** Vercel (configured via `vercel.json`)

---

## Project Structure

```text
AEON_frontend/
├── .env.example              # Consolidated environment template
├── .gitattributes
├── .gitignore
├── README.md                 # Project documentation
├── vercel.json               # Vercel deployment configuration
└── frontend/                 # Vite application root
    ├── index.html            # HTML entry point
    ├── package.json          # Node dependencies and scripts
    ├── package-lock.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vite.config.ts        # Vite configuration & dev proxy
    └── src/
        ├── App.tsx           # Main application shell & tab routing
        ├── main.tsx          # React application bootstrapping
        ├── index.css         # Global design tokens and styles
        ├── types.ts          # TypeScript domain interfaces
        ├── components/       # UI modules & view controllers
        │   ├── AgentDirectory.tsx      # Agent provisioning & key rotation
        │   ├── AuthScreen.tsx          # Administrator JWT login view
        │   ├── DashboardMetrics.tsx    # Spend graphs and metric KPIs
        │   ├── Day2Workbench.tsx       # Purchase request & approval workbench
        │   ├── Header.tsx              # Top navigation bar
        │   ├── MetricCard.tsx          # Stat card component
        │   ├── PaymentReturnPanel.tsx  # PayPal buyer return & capture flow
        │   ├── PaymentStatusPanel.tsx  # Real-time payment reconciliation state
        │   ├── PoliciesDirectory.tsx   # Policy rules & version browser
        │   ├── RecentActivity.tsx      # Chronological audit event log
        │   ├── Sidebar.tsx             # Main dashboard navigation menu
        │   └── TransactionLedger.tsx   # AG Grid transaction table
        └── services/         # API clients and transport layers
            ├── api.ts                  # REST API client for AEON backend
            ├── config.ts               # Environment configuration resolver
            ├── demoStore.ts            # Client-side demo database state
            └── mockTransport.ts        # Standalone mock transport handler
```

---

## Environment Variables

The application uses Vite environment variables loaded from the root `.env` file. Create your `.env` in the repository root by copying `.env.example`:

```bash
cp .env.example .env
```

*(Note: Vite is configured via `envDir` in `vite.config.ts` to automatically read `.env` from the repository root).*

### Configuration Options

| Variable | Required | Default | Allowed Values | Description |
| :--- | :---: | :---: | :---: | :--- |
| `VITE_API_MODE` | No | `backend` | `backend`, `demo` | Controls API transport mode. `backend` communicates with the live FastAPI service; `demo` runs client-side with mock data and `localStorage`. |
| `VITE_API_BASE_URL` | No | `http://127.0.0.1:8000` | Full URL | The base URL of the AEON FastAPI control plane API. Used when `VITE_API_MODE=backend`. |
| `AEON_API_PROXY_TARGET` | No | `http://127.0.0.1:8000` | Full URL | Target backend used by Vite dev server reverse proxy for `/api`, `/health`, `/live`, and `/ready`. Do not put backend credentials or PayPal secrets here. |

### Security Boundaries

> [!WARNING]
> **Client-Side Exposure:** Any variable prefixed with `VITE_` is baked into the browser bundle and is publicly accessible to any client.
>
> **Do not** place sensitive backend credentials in the frontend environment, such as:
> - Backend `SECRET_KEY` (JWT signing secret)
> - Database connection strings (`DATABASE_URL`)
> - PayPal client secrets (`PAYPAL_CLIENT_SECRET`)
> - Agent live master API keys (`aeon_live_*`)

---

## Local Development

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **AEON Backend** (Optional if using `demo` mode)

### Mode 1: Running with Live AEON Backend

1. **Start the AEON Backend:**
   In your `AEON` backend repository:
   ```bash
   # From the AEON repository root
   uvicorn app.main:create_application --reload --port 8000
   ```
   Ensure the backend `.env` includes the frontend origin in `CORS_ORIGINS`:
   ```env
   CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
   ```

2. **Configure the Frontend:**
   Create `.env` at the root of `AEON_frontend`:
   ```bash
   cp .env.example .env
   ```
   Inside `.env`:
   ```env
   VITE_API_MODE=backend
   VITE_API_BASE_URL=http://127.0.0.1:8000
   AEON_API_PROXY_TARGET=http://127.0.0.1:8000
   ```

3. **Install Dependencies & Launch Dev Server:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Console:**
   Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser. Log in using your seeded backend administrator credentials.

---

### Mode 2: Running in Standalone Demo Mode (Zero Backend Required)

To inspect the UI, test AG Grid features, or run a demonstration without running PostgreSQL or the FastAPI server:

1. In the root `.env`:
   ```env
   VITE_API_MODE=demo
   ```

2. Run the dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open [http://127.0.0.1:5173](http://127.0.0.1:5173). In Demo mode, you can sign in with any email and password (e.g. `admin@aeon.internal` / `password`). Synthetic agents, policies, transactions, and approvals will load instantly from mock local storage.

---

## PayPal Sandbox Integration & Return URLs

When executing purchases through PayPal, AEON initiates checkout orders via PayPal Orders v2 API and directs users to PayPal for authorization. Upon approval or cancellation, PayPal redirects the browser back to the frontend:

- **Success Return URL:** `http://localhost:5173/payments/success?token={ORDER_ID}&PayerID={PAYER_ID}`
- **Cancel Return URL:** `http://localhost:5173/payments/cancel?token={ORDER_ID}`

In production, ensure these URLs match the `PAYPAL_RETURN_URL` and `PAYPAL_CANCEL_URL` configured in your backend `.env`:

```env
# Backend .env configuration
PAYPAL_RETURN_URL="https://your-frontend.vercel.app/payments/success"
PAYPAL_CANCEL_URL="https://your-frontend.vercel.app/payments/cancel"
```

The frontend [`PaymentReturnPanel`](file:///c:/Users/gaumi/Documents/GitHub/AEON_frontend/frontend/src/components/PaymentReturnPanel.tsx) handles the return callback, displays order status, and triggers authoritative server-to-server capture requests (`POST /api/v1/payments/capture`).

---

## Production Build & Deployment

### Build Locally

```bash
cd frontend
npm run build
```

This generates optimized static production assets into `frontend/dist/`. To test the production build locally:

```bash
npm run preview
```

### Vercel Deployment

This repository is pre-configured for automated deployment on Vercel via [`vercel.json`](file:///c:/Users/gaumi/Documents/GitHub/AEON_frontend/vercel.json):

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm ci",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Configuring Environment Variables on Vercel:

In the Vercel Dashboard under **Project Settings > Environment Variables**, configure:

- `VITE_API_MODE`: `backend`
- `VITE_API_BASE_URL`: `https://your-aeon-backend.onrender.com` (Your deployed backend API URL)
