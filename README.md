# CampusSync Frontend

Frontend application for CampusSync, built with React, TypeScript, Vite, and Tailwind CSS.

## Prerequisites

- Node.js 22.12 or later
- npm

## Install and run

```bash
npm install
npm run dev
```

Vite will display the local application URL, usually `http://localhost:5173`.

## Environment configuration

The local frontend API base URL is defined in `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5050/api
```

Vite exposes only environment variables that begin with `VITE_` to frontend code. Access the URL with:

```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
```

`.env.local` is ignored by Git because local configuration can differ by developer. Do not place secrets in it: values prefixed with `VITE_` are visible in the browser.

## Useful commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Project structure

```text
src/
  components/
    common/       # Shared reusable UI components
    layout/       # Page layout components
  context/        # Application context, including authentication state
  hooks/          # Reusable React hooks
  pages/          # Login, dashboard, and not-found pages
  routes/         # Application route definitions
  services/       # API client and authentication requests
  types/          # Shared TypeScript types
  App.tsx         # Root application component
  main.tsx        # React application entry point
  index.css       # Global CSS and Tailwind import
```
