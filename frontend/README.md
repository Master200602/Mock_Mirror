# MockMirror - Frontend

The frontend for MockMirror, an AI-powered interview simulator.

## Technologies Used
- React 19
- Vite
- React Router v6
- Axios
- Lucide React (Icons)
- Vanilla CSS with CSS Variables and Glassmorphism

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Directory Structure
- `src/components/` - Reusable UI components
- `src/pages/` - Application pages (Routing)
- `src/services/` - API integration

## Environment Variables
Copy `.env.example` to `.env` and configure as needed. Default configuration points to the Vite proxy `/api` which redirects to `http://localhost:5000`.
