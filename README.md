# DapurKita frontend

React, TypeScript, Vite and Tailwind foundation. The approved OpenAPI contract is copied to `openapi.yaml` and is the only source for generated API types.

## Setup

```sh
npm install
npm run generate:api
npm run dev
```

Set `VITE_API_BASE_URL=/api/v1`. The Vite dev server proxies `/api` to `http://localhost:8080`. Set `VITE_ENABLE_MOCKS=true` to start the MSW mock worker; set it to `false` to use the backend. To exercise the shared refresh-and-retry path with mocks, temporarily set `VITE_MOCK_TOKEN_EXPIRED_ONCE=true`; the first authenticated request then returns `TOKEN_EXPIRED` once. Both mock flags are off in the checked-in development environment for backend integration.

## Contract workflow

After an approved OpenAPI change, update `openapi.yaml` and run `npm run generate:api`. Do not edit `src/api/generated/openapi.ts` by hand. The typed client imports its `paths` and `components` directly.

Access tokens live only in module memory. The app waits for `POST /auth/refresh` before mounting routes and fetching recipe data. Authentication requests include credentials; a single shared refresh request handles concurrent `TOKEN_EXPIRED` responses.
