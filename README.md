
# AEON — Autonomous Enterprise Operations Network

AEON is an AI-assisted procurement governance platform that combines
intelligent supplier recommendations, deterministic policy enforcement,
budget controls, human approval workflows and payment orchestration.

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- AG Grid
- Recharts
- FastAPI backend integration

## Project Structure

```text
AEON_frontend/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
├── .gitignore
├── README.md
└── vercel.json
```

## Local Development

```bash
cd frontend
npm ci
npm run dev
```

## Production Build

```bash
cd frontend
npm run build
```

## Environment Variables

Configure these in the deployment environment:

```env
VITE_API_MODE=backend
VITE_API_BASE_URL=https://your-backend-domain.com
```

Do not place backend secrets, database credentials or PayPal
credentials in frontend environment variables.

## Deployment

The frontend is deployed independently using Vercel.
The FastAPI backend is maintained in a separate repository.
